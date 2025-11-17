-- Drop old tables and rebuild with correct schema for metadata-only storage
-- Audio is stored in IndexedDB client-side only

-- Drop existing tables (cascades will handle foreign keys)
DROP TABLE IF EXISTS playlist_meditations CASCADE;
DROP TABLE IF EXISTS playlists CASCADE;
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS meditations CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create profiles table (references auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'display_name', new.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Meditations table (metadata only, NO audio_url)
CREATE TABLE meditations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  original_filename TEXT,
  duration INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('adjuster', 'encoder')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on meditations
ALTER TABLE meditations ENABLE ROW LEVEL SECURITY;

-- Meditations policies
CREATE POLICY "Users can view their own meditations"
  ON meditations FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own meditations"
  ON meditations FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own meditations"
  ON meditations FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own meditations"
  ON meditations FOR DELETE
  USING (auth.uid() = profile_id);

-- Playlists table
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on playlists
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;

-- Playlists policies
CREATE POLICY "Users can view their own playlists"
  ON playlists FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own playlists"
  ON playlists FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own playlists"
  ON playlists FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own playlists"
  ON playlists FOR DELETE
  USING (auth.uid() = profile_id);

-- Playlist meditations junction table
CREATE TABLE playlist_meditations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  meditation_id UUID NOT NULL REFERENCES meditations(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, meditation_id)
);

-- Enable RLS on playlist_meditations
ALTER TABLE playlist_meditations ENABLE ROW LEVEL SECURITY;

-- Playlist meditations policies (check ownership through foreign keys)
CREATE POLICY "Users can view their playlist meditations"
  ON playlist_meditations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_meditations.playlist_id
      AND playlists.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert into their playlists"
  ON playlist_meditations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_meditations.playlist_id
      AND playlists.profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete from their playlists"
  ON playlist_meditations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_meditations.playlist_id
      AND playlists.profile_id = auth.uid()
    )
  );

-- Journal entries table
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meditation_id UUID NOT NULL REFERENCES meditations(id) ON DELETE CASCADE,
  meditation_title TEXT NOT NULL,
  note TEXT,
  played_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on journal_entries
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Journal entries policies
CREATE POLICY "Users can view their own journal entries"
  ON journal_entries FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own journal entries"
  ON journal_entries FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own journal entries"
  ON journal_entries FOR UPDATE
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own journal entries"
  ON journal_entries FOR DELETE
  USING (auth.uid() = profile_id);

-- Create indexes for better performance
CREATE INDEX idx_meditations_profile_id ON meditations(profile_id);
CREATE INDEX idx_meditations_created_at ON meditations(created_at DESC);
CREATE INDEX idx_playlists_profile_id ON playlists(profile_id);
CREATE INDEX idx_journal_entries_profile_id ON journal_entries(profile_id);
CREATE INDEX idx_journal_entries_meditation_id ON journal_entries(meditation_id);
CREATE INDEX idx_journal_entries_played_at ON journal_entries(played_at DESC);
