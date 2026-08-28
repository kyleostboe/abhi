-- Supersedes 018_recordings_as_library_items.sql, which fails standalone on this database.
--
-- PRs #180/#190 renamed the Creator's `source` value from 'encoder' to 'creator' in code, but
-- never migrated existing rows — mapRow's `row.source === "encoder" ? "creator" : row.source`
-- fallback in lib/meditation-library.ts has been quietly covering for this at read time ever
-- since. 018 tried to move the CHECK constraint straight to ('adjuster', 'creator', 'recording')
-- without accounting for that drift, and failed with 23514 on the two rows still carrying
-- 'encoder'.
--
-- The old constraint — CHECK (source IN ('adjuster', 'encoder')) — permits 'encoder' but not
-- 'creator', so the UPDATE that fixes those rows is itself rejected while that constraint is
-- still attached: the row cannot become compliant with the new rule until the old rule is gone,
-- which is why this has to be drop -> update -> add, in that order, in one transaction.

BEGIN;

ALTER TABLE public.meditations DROP CONSTRAINT IF EXISTS meditations_source_check;

UPDATE public.meditations SET source = 'creator' WHERE source = 'encoder';

ALTER TABLE public.meditations
ADD CONSTRAINT meditations_source_check CHECK (source IN ('adjuster', 'creator', 'recording'));

-- Listing the recordings for the Creator's picker is its own query, and it runs every time the
-- picker opens.
CREATE INDEX IF NOT EXISTS idx_meditations_profile_source
  ON public.meditations (profile_id, source, created_at DESC);

COMMENT ON COLUMN public.meditations.source IS
  'Where the row came from: adjuster and creator are meditations; recording is a reusable voice clip, which is stored here to reuse the same audio pipeline but is excluded from meditation listings.';

COMMIT;
