-- Create ambient_sounds table
-- This stores the library of available ambient sounds
CREATE TABLE IF NOT EXISTS ambient_sounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT, -- URL to the audio file (can be null for synthetic sounds)
  is_synthetic BOOLEAN DEFAULT false, -- true for procedurally generated sounds
  synthetic_config JSONB, -- Configuration for synthetic sound generation
  category TEXT DEFAULT 'nature' CHECK (category IN ('nature', 'music', 'meditation', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE ambient_sounds ENABLE ROW LEVEL SECURITY;

-- Policies for ambient_sounds
-- All users can view ambient sounds
CREATE POLICY "All users can view ambient sounds" ON ambient_sounds
  FOR SELECT USING (TRUE);

-- Only authenticated users can insert new ambient sounds (e.g., admins or content creators)
CREATE POLICY "Authenticated users can insert ambient sounds" ON ambient_sounds
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can update ambient sounds
CREATE POLICY "Authenticated users can update ambient sounds" ON ambient_sounds
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Only authenticated users can delete ambient sounds
CREATE POLICY "Authenticated users can delete ambient sounds" ON ambient_sounds
  FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger to update updated_at timestamp for ambient_sounds
CREATE TRIGGER update_ambient_sounds_updated_at
  BEFORE UPDATE ON ambient_sounds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
