-- Create a table for meditation entries
CREATE TABLE meditations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) for the meditations table
ALTER TABLE meditations ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to view public meditations
CREATE POLICY "Public meditations are viewable by authenticated users." ON meditations
  FOR SELECT USING (is_public = TRUE AND auth.role() = 'authenticated');

-- Policy to allow users to view their own private meditations
CREATE POLICY "Users can view their own private meditations." ON meditations
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow authenticated users to create meditations
CREATE POLICY "Authenticated users can create meditations." ON meditations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own meditations
CREATE POLICY "Users can update their own meditations." ON meditations
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own meditations
CREATE POLICY "Users can delete their own meditations." ON meditations
  FOR DELETE USING (auth.uid() = user_id);
