-- Superseded by 019_backfill_encoder_source.sql — do not run this file standalone.
--
-- This ran clean against a fresh schema, but fails with a check constraint violation (23514) on
-- any database still carrying rows from before PRs #180/#190 renamed the Creator's `source` value
-- from 'encoder' to 'creator' in code without migrating existing data. 019 does what this file
-- does, but drops the old constraint, rewrites those rows, and only then adds the new one — the
-- old constraint has to be gone before the UPDATE, or the UPDATE itself is rejected by the
-- constraint it's trying to become compliant with.
--
-- Left in place, unmodified below, as the record of what 019 supersedes.

-- Lets a voice recording be a library item in its own right.
--
-- Recordings made in the Creator are currently trapped in the meditation they were made for:
-- your own voice saying "return to the breath" has to be re-recorded every time you build
-- something new. Making a recording a `meditations` row with its own source means it inherits
-- everything that already works — R2 upload, presigned playback, backup export, deletion — with
-- no parallel storage path to keep in sync.
--
-- They are not meditations, and the app filters them out of the meditation lists accordingly.
-- Sharing the table is a storage decision, not a claim that they are the same kind of thing.

ALTER TABLE public.meditations DROP CONSTRAINT IF EXISTS meditations_source_check;

ALTER TABLE public.meditations
ADD CONSTRAINT meditations_source_check CHECK (source IN ('adjuster', 'creator', 'recording'));

-- Listing the recordings for the Creator's picker is its own query, and it runs every time the
-- picker opens.
CREATE INDEX IF NOT EXISTS idx_meditations_profile_source
  ON public.meditations (profile_id, source, created_at DESC);

COMMENT ON COLUMN public.meditations.source IS
  'Where the row came from: adjuster and creator are meditations; recording is a reusable voice clip, which is stored here to reuse the same audio pipeline but is excluded from meditation listings.';
