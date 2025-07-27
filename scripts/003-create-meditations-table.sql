CREATE TABLE IF NOT EXISTS meditations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  duration_seconds INTEGER,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE meditations ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own meditations
CREATE POLICY "Users can view their own meditations." ON meditations
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own meditations
CREATE POLICY "Users can insert their own meditations." ON meditations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own meditations
CREATE POLICY "Users can update their own meditations." ON meditations
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete their own meditations
CREATE POLICY "Users can delete their own meditations." ON meditations
  FOR DELETE USING (auth.uid() = user_id);
