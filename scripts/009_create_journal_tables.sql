-- Create journal_entries table
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meditation_id UUID REFERENCES public.meditations(id) ON DELETE SET NULL,
  meditation_title TEXT,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_journal_entries_profile_id ON public.journal_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_meditation_id ON public.journal_entries(meditation_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_played_at ON public.journal_entries(played_at);
CREATE INDEX IF NOT EXISTS idx_journal_entries_profile_played_at ON public.journal_entries(profile_id, played_at);

-- Enable Row Level Security
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own journal entries"
  ON public.journal_entries
  FOR SELECT
  USING (profile_id = current_setting('jwt.claims.profile_id')::uuid);

CREATE POLICY "Users can insert their own journal entries"
  ON public.journal_entries
  FOR INSERT
  WITH CHECK (profile_id = current_setting('jwt.claims.profile_id')::uuid);

CREATE POLICY "Users can update their own journal entries"
  ON public.journal_entries
  FOR UPDATE
  USING (profile_id = current_setting('jwt.claims.profile_id')::uuid);

CREATE POLICY "Users can delete their own journal entries"
  ON public.journal_entries
  FOR DELETE
  USING (profile_id = current_setting('jwt.claims.profile_id')::uuid);
