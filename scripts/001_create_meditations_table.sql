-- Create meditations table for storing processed meditation audio
CREATE TABLE IF NOT EXISTS public.meditations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration INTEGER, -- duration in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) - for now allow all operations since we don't have auth
ALTER TABLE public.meditations ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations for now (no auth required)
CREATE POLICY "Allow all operations on meditations" ON public.meditations
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS meditations_created_at_idx ON public.meditations(created_at DESC);
