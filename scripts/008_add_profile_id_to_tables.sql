-- Add profile_id column to meditations table
ALTER TABLE public.meditations 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add profile_id column to playlists table
ALTER TABLE public.playlists 
ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_meditations_profile_id ON public.meditations(profile_id);
CREATE INDEX IF NOT EXISTS idx_playlists_profile_id ON public.playlists(profile_id);

-- Set all existing meditations to the test profile
UPDATE public.meditations 
SET profile_id = '00000000-0000-0000-0000-000000000001'
WHERE profile_id IS NULL;

-- Set all existing playlists to the test profile
UPDATE public.playlists 
SET profile_id = '00000000-0000-0000-0000-000000000001'
WHERE profile_id IS NULL;
