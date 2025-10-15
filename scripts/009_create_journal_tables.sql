-- Create journal_entries table
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meditation_id UUID REFERENCES meditations(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  play_time TIMESTAMP WITH TIME ZONE,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_journal_entries_profile_id ON journal_entries(profile_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_meditation_id ON journal_entries(meditation_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_profile_date ON journal_entries(profile_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_journal_entries_profile_meditation ON journal_entries(profile_id, meditation_id);

-- Enable Row Level Security
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for journal_entries
CREATE POLICY "Users can view their own journal entries"
  ON journal_entries FOR SELECT
  USING (profile_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Users can insert their own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (profile_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Users can update their own journal entries"
  ON journal_entries FOR UPDATE
  USING (profile_id = '00000000-0000-0000-0000-000000000001'::uuid);

CREATE POLICY "Users can delete their own journal entries"
  ON journal_entries FOR DELETE
  USING (profile_id = '00000000-0000-0000-0000-000000000001'::uuid);
