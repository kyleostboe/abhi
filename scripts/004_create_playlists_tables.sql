-- Create playlists table for storing user-created playlists
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for playlist-meditation relationships
CREATE TABLE IF NOT EXISTS public.playlist_meditations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES public.playlists(id) ON DELETE CASCADE,
  meditation_id UUID REFERENCES public.meditations(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, meditation_id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_meditations ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for now (no auth required)
CREATE POLICY "Allow all operations on playlists" ON public.playlists
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on playlist_meditations" ON public.playlist_meditations
  FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS playlists_created_at_idx ON public.playlists(created_at DESC);
CREATE INDEX IF NOT EXISTS playlist_meditations_playlist_id_idx ON public.playlist_meditations(playlist_id);
CREATE INDEX IF NOT EXISTS playlist_meditations_meditation_id_idx ON public.playlist_meditations(meditation_id);
