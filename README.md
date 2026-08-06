# abhī

A meditation tool that adjusts the length of guided meditations by intelligently re-spacing
silence, lets you build custom meditations from instructions, sound cues and your own voice, and
sits with you on a plain bell timer when you want no recording at all.

## Features

### Adjuster

- Upload an audio file (MP3, WAV, OGG, M4A).
- Set a target duration.
- The tool detects silence and re-spaces it to reach that duration, optionally time-stretching
  speech (WSOLA) when the target is shorter than the pauses alone can absorb.
- Advanced settings for silence threshold, minimum pause length and pacing preservation.
- Feasibility is computed up front, so an unreachable target is rejected before any audio work.

### Creator

- Build a meditation on a timeline from scratch.
- Add instructions from a library or as custom text.
- Place musical notes and sound cues (sampled piano, synth, chimes, bells).
- Record voice instructions in the browser.
- Mix background ambience with adjustable volumes.
- Export as Opus, AAC, WAV or MP3.

### Timer

- A third tool alongside the Adjuster and Creator, and like them it works without an account.
- A sit with no recording behind it: fixed length or open-ended.
- Opening, closing and interval bells, with a settling period before the sit begins.
- Bells are synthesised and scheduled on the audio clock in advance, so a sit keeps its bells
  when the screen goes off.
- Signed in, every sit is recorded to the practice log.

### Library

- Everything saved, grouped by meditation with its length variants.
- Quick-adjust presets (10m / 30m / 1h, editable) to re-cut a meditation to a new length.
- Playlists and per-account storage usage.
- Backup export/import covering the whole account — audio, notes (as markdown), the practice
  log, folders, playlists and settings.
- Sort by recently added, recently played, most played, longest unplayed, length or title — the
  play-based orders read from the practice log.

### Journal

- Markdown notes, optionally attached to a meditation you have just sat.
- A Sessions tab showing the practice log — every sit, guided or timer, grouped by day, with
  streaks and a practice calendar.
- Folders, tags, images and voice notes.
- Notes are stored as self-describing markdown files (see [Storage](#storage)).
- After a sit, a note is offered but not created — nothing is written until you write something.

### Settings

- Account details, storage usage and sign-out.
- When the practice day starts, so a late-night sit counts toward the day that is ending.

## Getting started

```bash
pnpm install
pnpm dev
```

| Script           | Purpose                                 |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | Development server                      |
| `pnpm build`     | Production build (typechecks and lints) |
| `pnpm test`      | Vitest unit tests                       |
| `pnpm typecheck` | `tsc --noEmit` on its own               |
| `pnpm lint`      | ESLint on its own                       |

### Environment

| Variable                        | Purpose                              |
| ------------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key                    |
| `R2_ENDPOINT`                   | Cloudflare R2 S3-compatible endpoint |
| `R2_BUCKET`                     | R2 bucket name                       |
| `R2_ACCESS_KEY_ID`              | R2 access key (server only)          |
| `R2_SECRET_ACCESS_KEY`          | R2 secret key (server only)          |

The `R2_*` credentials are read only by `lib/storage.ts`, which is marked `server-only` so that
importing it from client code fails the build.

The SQL in `scripts/` is applied in numeric order against the Supabase project.

## Storage

Audio bytes never pass through the Next.js server. The server mints short-lived presigned URLs,
and the browser uploads to and downloads from R2 directly.

Journal content is laid out as a vault rather than a blob store:

```
{userId}/notes/{slug}.md
{userId}/attachments/{filename}
```

`notes/` and `attachments/` are siblings so that `![[attachments/photo.jpg]]` inside a note
resolves as written — the bucket prefix is already a working Obsidian vault, and every note file
carries complete YAML frontmatter. The database is an *index*, not the source of truth: listing
the prefix and parsing those headers reconstructs it.

## Tech

Next.js (App Router) · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Framer Motion ·
Tone.js and the Web Audio API · mediabunny for encoding · Supabase (auth + Postgres) ·
Cloudflare R2 · TipTap for the journal editor · Vitest.

## Project structure

- `app/` — App Router pages, layouts and API routes.
- `components/` — React components, including the shadcn/ui primitives in `components/ui/`.
- `hooks/` — custom React hooks.
- `lib/` — audio processing, storage clients, and the pure logic the tests cover.
- `workers/` — Web Worker for audio encoding.
- `scripts/` — ordered SQL migrations.
- `public/` — static assets.

## Tests

```bash
pnpm test
```

The suite covers the pure logic only — markdown and frontmatter serialization, the adjuster's
pause-scaling and feasibility maths, and the Library's duration handling. Those modules are kept
free of React, DOM and network access precisely so they can be tested directly.
