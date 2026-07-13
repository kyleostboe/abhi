-- The "Encoder" tool was renamed to "Creator". Update stored meditation
-- source values and the check constraint to match.

ALTER TABLE public.meditations DROP CONSTRAINT IF EXISTS meditations_source_check;

UPDATE public.meditations
SET source = 'creator'
WHERE source = 'encoder';

ALTER TABLE public.meditations
ADD CONSTRAINT meditations_source_check CHECK (source IN ('adjuster', 'creator'));
