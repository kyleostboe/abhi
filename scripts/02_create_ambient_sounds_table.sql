-- Create ambient_sounds table
-- This stores the library of available ambient sounds
CREATE TABLE IF NOT EXISTS ambient_sounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT, -- URL to the audio file (can be null for synthetic sounds)
  is_synthetic BOOLEAN DEFAULT false, -- true for procedurally generated sounds
  synthetic_config JSONB, -- Configuration for synthetic sound generation
  category TEXT DEFAULT 'nature' CHECK
