# CLAUDE.md

Guidance for working in this repository.

## What this is

`abhī` — a Next.js (App Router) meditation app with two audio tools, a library, and a journal.
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

**The timer schedules bells on the AudioContext clock, in advance.** `setTimeout` does not
survive a locked screen — background tabs get clamped to ~1 tick/sec — so `lib/timer-schedule.ts`
computes every bell up front and `lib/timer-audio.ts` hands them all to the audio clock at start.
The countdown interval is display only. If you add anything audible to the timer, schedule it the
same way.

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
