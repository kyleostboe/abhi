# CLAUDE.md

Guidance for working in this repository.

## What this is

`abhī` — a Next.js (App Router) meditation app with three tools, a library, and a journal.
See README.md for the feature-level description and environment variables.

## Commands

```bash
pnpm dev                # development server
pnpm build              # production build — typechecks and lints, and will fail on either
pnpm test               # vitest, run once
pnpm test:watch         # vitest, watch mode
pnpm typecheck          # tsc --noEmit
pnpm lint               # eslint
```

Use **pnpm**. Both `pnpm-lock.yaml` and `package-lock.json` are committed; if you change
dependencies, regenerate both (`pnpm install`, then `npm install --package-lock-only`) so they
do not drift.

## Architecture

**Audio never touches the server.** Decoding, silence detection, time-stretching and encoding
all happen in the browser (Web Audio API, Tone.js, mediabunny, a Web Worker for encoding). The
server's only role in audio is minting short-lived presigned R2 URLs.

**`lib/storage.ts` is `server-only`.** It holds the R2 client and the `R2_*` credentials.
Importing it from client code fails the build — that is the guarantee keeping those keys out of
the client bundle. Client code reaches R2 through the routes under `app/api/storage/`.

**The database is an index, not the source of truth,** for journal notes. Each note is a
markdown file in R2 with complete YAML frontmatter; the Postgres row exists to make listing and
searching fast. `lib/journal-frontmatter.ts` and `lib/journal-markdown.ts` define that contract
— if a block cannot round-trip through them, it must not ship.

**A sit is a `sessions` row, not a journal entry.** `lib/sessions.ts` owns the model — day
boundaries, streaks, what counts as practice, how an interrupted sit is reconciled — and is pure
so all of that is testable. Rows are written when a sit *starts* and updated as it runs, which is
what makes a crash or a closed tab survivable; nothing writes only on completion. Practice time
is wall-clock-while-playing, not distance through the audio, so seeking earns nothing.

**The timer is a tool, not a destination.** It lives in the home page's mode switch next to the
Adjuster and Creator (`ToolMode` in `app/page.tsx`), and like them it runs without an account —
signing in only buys somewhere for the sit to be recorded. `components/timer-tool.tsx` holds it,
rather than the page, because `app/page.tsx` is already too large.

**The timer schedules bells on the AudioContext clock, in advance.** `setTimeout` does not
survive a locked screen — background tabs get clamped to ~1 tick/sec — so `lib/timer-schedule.ts`
computes every bell up front and `lib/timer-audio.ts` hands them all to the audio clock at start.
The countdown interval is display only. If you add anything audible to the timer, schedule it the
same way.

**Preferences live in `user_settings`, not `localStorage`.** `lib/user-settings.ts` owns the
shape — the column is schemaless jsonb, so `normalizeSettings` is the only thing enforcing it and
is deliberately total: any stored value yields a complete settings object, so nothing downstream
null-checks a preference. Signed-out users get the defaults and cannot change them.

**Recordings share the `meditations` table but are not meditations.** `source: "recording"` is a
reusable voice clip; it lives there to inherit the whole audio pipeline (R2 upload, presigned
playback, backup, deletion) rather than needing a parallel one, and every meditation listing
filters it out. `MeditationLibrary.getAllMeditations()` excludes them; `getRecordings()` is the
other half.

**Two timeline models, deliberately.** `TimelineItem` (in `lib/types.ts`) is the richer
editor-side row; `TimelineEvent` is what is persisted. They also use different field names for
the same thing — in-memory `soundCueSrc` is stored as `soundSrc`. Mixing them up has caused a
real bug before; check which side you are on.

**Auth.** Supabase, with RLS on every table. API routes still filter by `profile_id` explicitly
rather than relying on RLS alone, and every route re-checks `supabase.auth.getUser()`.

## Conventions

- **Never call `console` directly.** Use `log` from `lib/log.ts`: `log.debug` and `log.warn` are
  development-only, `log.error` always emits. ESLint enforces this. Prefix messages with a
  bracketed namespace (`[storage]`, `[journal]`).
- **Comments explain why, not what.** The existing comments in `lib/storage.ts` and
  `app/api/journal/note/route.ts` are the house style — match that register. Do not narrate code
  that speaks for itself.
- **Keep pure logic pure.** Anything in `lib/` that can avoid React, the DOM and the network
  should, because that is what makes it testable. New pure helpers get tests.
- Path alias is `@/*` from the repo root.

## Testing

Vitest, node environment, `lib/**/*.test.ts`. The suite covers pure logic only — there is no
component or integration testing set up. When adding a pure helper, add cases for the boundaries
(empty input, non-finite numbers, missing optional fields), not just the happy path.

## Known rough edges

- **Signed out, the Library and Journal show a switch that does nothing.** The header is
  unconditional chrome now — deliberately, because hiding it on those two routes made a signed-out
  swipe lose the logo and the switch entirely. The cost is that those pages are a sign-in prompt
  either way, so Meditations/Playlists change a persisted preference and nothing on screen.
- **All three screens are mounted at once** (`components/screen-strip.tsx`), rendered by the
  layout's chrome and never unmounted. `app/page.tsx`, `app/library/page.tsx` and
  `app/journal/page.tsx` are stubs that return `null`; they exist for the URL, deep links and the
  back button. A swipe is therefore a transform on DOM that is already painted: both screens are
  genuinely on screen during the drag, and the frozen window between lifting your finger and the
  slide starting is **33ms** in production, down from 68–111ms. `components/swipe-navigator.tsx`
  keeps the gesture rules and nothing else — no View Transitions API, no `flushSync`, no snapshot
  handshake. All of that existed to fake a second page when only one was mounted.
  `docs/page-transition-refactor.md` records what it looked like and the five defects it took to
  get it working at all; read it before touching this, because the traps it names (`backdrop-filter`
  blanking a snapshot, a `position: fixed` ancestor becoming a containing block under a transform)
  are still real for anything that reintroduces a transform above the page.
- **An off-screen screen must not paint.** A mounted screen renders everything it would render
  alone, including what escapes its own column: the Library's full-screen player and the Timer's
  running-sit overlay are both `position: fixed; inset: 0`, and `PageBefore` portals content above
  the card. Off-screen columns get `content-visibility: hidden` and `inert`, and `PageBefore`
  consults `components/screen-active.tsx`. Without the latter, Home's debug button appeared on the
  other two screens.
- **The switch and the Adjuster's tabs both move on a measured pill**, and everything a navigation
  does to the switch — the labels changing, the trough resizing, the pill travelling — runs on one
  clock: 260ms, `cubic-bezier(0.22, 0.61, 0.36, 1)`, the same as the page slide. The labels fade in
  sequence and do not travel; the width animation is the only thing in the switch that moves.
  `PAGE_SLIDE_MS` in `lib/swipe-motion.ts`, `LABEL_SLIDE` in `components/mode-switch.tsx` and the
  `page-content` rules in `app/globals.css` are three copies of that one number and nothing links
  them.
- `app/page.tsx` (~4.3k lines) and `app/library/page.tsx` (~3.8k) are still very large, with 70
  and 60 `useState` calls respectively. Self-contained pieces have been extracted; the remaining
  reduction needs the state model reworked, which is a behavioral change.
- ~105 ESLint warnings remain, mostly unused caught errors and `any` in the audio and Supabase
  paths. Zero errors — the count should only go down.
- `buildDurationModeFromStored` in `lib/library-durations.ts` assigns a fallback audio URL before
  `normalizeDurationMode` runs, so a persisted duration mode always looks like it has its own
  rendered audio and its stored `playbackRate` is reset to 1. If that rate was the only thing
  setting the variant's length, the variant plays at the wrong length. Documented by a test that
  asserts current behavior; not yet fixed.
