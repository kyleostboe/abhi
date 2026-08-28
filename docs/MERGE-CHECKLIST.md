# Merge checklist

Everything on this branch was built without a Supabase project or working audio output
available, so it was verified by typecheck, unit tests, a production build, and a headless
browser that could only ever see the signed-out state. This is the list of what that could not
reach.

Ordered by how expensive the failure is if it's real.

## 1. Migrations — applied to production, 2026

`016_create_sessions.sql`, `017_user_settings.sql`, and `019_backfill_encoder_source.sql` have
all been run against production and verified. **`018_recordings_as_library_items.sql` should not
be run — it is superseded by 019** (018 fails standalone with a check-constraint violation on any
database carrying pre-rename `source = 'encoder'` rows; 019 does what 018 does plus the backfill
018 was missing). If you are applying these to a *different* database than the one already
migrated, run 016, 017, 019 in that order — skip 018 entirely.

Confirmed on the production run:

- [x] 017 applied cleanly (repairs the `010` policies that used the unsupported
      `create policy if not exists` syntax).
- [x] 016's backfill produced 2 session rows, matching the pre-existing journal entries with
      meditations, with `duration_actual = 0` as designed.
- [x] 019 found and fixed 2 `meditations` rows still carrying the pre-`012` `source = 'encoder'`
      value (PRs #180/#190 renamed it to `'creator'` in code but never migrated existing rows —
      `lib/meditation-library.ts` had been silently covering for this at read time ever since).
      Distinct `source` values after 019: `adjuster`, `creator` — zero `encoder` remaining.
- [x] `journal_entries.session_id` exists; `sessions` table exists with 4 RLS policies;
      `user_settings` exists with 4 RLS policies.
- [x] App verified: `/journal` loads, note creation works, Sessions tab renders correctly with
      the 2 backfilled sits at zero duration and a streak of 0 — correct per 016's intent, since
      those rows never recorded how long the sit actually ran.

Remaining first-run items, if you have not done these yet:

- [ ] **016's backfill did not duplicate on a second run**, if you ever ran it more than once.
      Check: `select count(*) from sessions where duration_actual = 0;` — should equal your
      pre-existing journal entries with meditations, not a multiple of it.
- [ ] **Backfilled sessions show in the log but do not feed streaks.** They have
      `duration_actual = 0` deliberately — those rows never knew how long the sit ran. If your
      streak reads 0 right after migrating, that is correct, not a bug.
- [ ] `journal_entries.session_id` was added and populated where timestamps matched.

## 2. Sessions — the core of the branch

- [ ] Play a meditation for over a minute, stop. A row appears in Journal → Sessions with a
      plausible duration.
- [ ] Play for three seconds and stop. It should **not** count toward the streak
      (`MIN_COUNTED_SECONDS` is 60), though it will still appear in the log.
- [ ] Pause for a few minutes mid-sit, then resume. The recorded duration should count the
      pause as *not* practised — practice time is wall-clock-while-playing.
- [ ] Seek forward. It should earn no practice time.
- [ ] **Kill the tab mid-sit.** Reopen the app. The open session should close itself on load,
      with a duration matching roughly where you got to, not the wall-clock since you started.
      This is `reconcileAbandonedSession` and it is the least-tested important path here.
- [ ] Two sits on one day count as one day for the streak, not two.
- [ ] Play something, then check the Library sort "Recently played" puts it first.

## 3. The timer

- [ ] Bells actually ring — opening, interval, closing. I have never heard them; they are
      synthesised from oscillators and the envelope maths is unverified by ear.
- [ ] **Lock the phone mid-sit and leave it.** The closing bell should still ring at the right
      time. This is the entire reason bells are scheduled on the AudioContext clock in advance,
      and it is the single most important thing on this page to confirm.
- [ ] Same test with the tab merely backgrounded on desktop.
- [ ] The silent keep-alive element does not show up as audible playback anywhere odd (media
      controls, other tabs pausing).
- [ ] The countdown display stays roughly in sync with the bells over a long sit. If it drifts,
      the display is wrong, not the bells.
- [ ] Ending a sit early records the time actually sat.
- [ ] Timer works signed out, and records nothing.
- [ ] Settings persist: configure a sit, begin it, reload, and the settings are as you left them.

## 4. The note offered after a sit

- [ ] Finish a sit → open Journal. A draft is waiting, titled with what you sat.
- [ ] **Type nothing, navigate away, come back.** No note should exist. This is the specific
      behaviour you asked for and the lazy-create path is the fiddliest code in the branch.
- [ ] Press "Not now" → the offer disappears and does not return.
- [ ] Type one character → a note is created, with the right meditation and the sit's timestamp.
- [ ] The note's title derives from what you wrote, not from a placeholder.
- [ ] Two sits in a row: the second offer replaces the first rather than queueing.

## 5. Backup export/import — test on a throwaway account

This rewrites rows on import. Do not test it on data you care about.

- [ ] Export produces a zip containing `meditations.json`, `sessions.json`, `notes.json`,
      `folders.json`, `playlists.json`, `settings.json`, a `notes/` folder of `.md` files, and
      the audio.
- [ ] The `.md` files contain actual note bodies, not empty files. Bodies come from R2 via the
      API route; if that fetch fails it falls back to the indexed copy, which may be stale.
- [ ] Import into a *different* account restores notes, sessions and settings, and the notes
      open with their content intact (bodies are re-uploaded and `note_key` re-minted).
- [ ] Nothing in the imported account points at the exporting account's storage.

## 6. Things that changed behaviour, not just added it

- [ ] **Playback no longer creates a journal entry.** The Library's journal-history dialog now
      only shows notes you actually wrote. If you were relying on it as a play history, that is
      now the Sessions tab.
- [ ] **Signed-out users have no library.** They can upload, adjust, download and use the timer,
      but not save. Confirm the sign-in prompts appear where saving used to.
- [ ] `SOUND_CUES_LIBRARY` is now empty. Confirm nothing in the Creator UI renders an empty cue
      list awkwardly. (Nothing referenced it for selection when I checked, but I could not
      exercise the Creator with a real meditation loaded.)
- [ ] The Creator's speech-recognition flow is gone. It was dead code, but confirm nothing you
      wanted was in it.

## 7. Visual — I could only see signed-out pages

- [ ] Journal → Sessions: the practice calendar renders, the streak numbers look right, and the
      grid does not overflow horizontally on mobile.
- [ ] Library: the sort dropdown sits sensibly among the filter chips at narrow widths.
- [ ] Settings: the day-boundary buttons.
- [ ] The timer's fullscreen sit view on an actual phone.

## 8. Known-unfixed, carried over

- [ ] `buildDurationModeFromStored` in `lib/library-durations.ts` still resets a persisted
      `playbackRate` to 1, so a variant whose length came only from that rate plays wrong. There
      is a test pinning the current behaviour. Untouched by this branch.

## 9. Flagged during migration, not yet done

Raised while diagnosing the `encoder`/`creator` drift in #1 — real gaps, not part of this branch.

- [ ] **Audit other enum-ish columns for the same code-renamed-but-data-not pattern.** Checked so
      far: `meditations.source` had the drift (fixed by 019); `journal_attachments.kind`
      (`'image'`/`'audio'`) and `sessions.source` (`'guided'`/`'timer'`, new, no history) do not.
      That's every `CHECK (... IN (...))` constraint in `scripts/*.sql` as of 019 — re-run this
      audit after adding any new one.
- [ ] **No migration-tracking table exists**, which is how three migrations (016/017/018→019)
      sat unapplied until a runtime error surfaced them. Either add a `schema_migrations` table
      migrations insert themselves into, or move to the Supabase CLI's migration system
      (`supabase migration`), which tracks this automatically. Worth doing before the next batch
      of `scripts/*.sql` ships.
