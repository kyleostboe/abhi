-- Meditations' processed audio can now be persisted to Cloudflare R2 so authenticated
-- users can play their library back from any device, not just the browser that saved it.
-- Existing rows have no audio_key and keep loading from the client's local IndexedDB cache.
ALTER TABLE public.meditations
ADD COLUMN IF NOT EXISTS audio_key TEXT;

COMMENT ON COLUMN public.meditations.audio_key IS
  'Cloudflare R2 object key for the processed meditation audio, keyed as {profile_id}/{uuid}.{ext}. Null for rows saved before R2 storage was added, which still play back from the local IndexedDB cache.';
