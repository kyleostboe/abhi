-- Create meditations table to store user generated meditations
CREATE TABLE IF NOT EXISTS meditations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  timeline JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE meditations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own meditations" ON meditations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
