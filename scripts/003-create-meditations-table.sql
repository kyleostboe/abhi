-- This script creates the 'meditations' table and associated RLS policies and storage bucket.
-- The table structure matches the user's provided schema.
-- RLS and storage bucket creation are included to ensure application functionality for saving/loading meditations.
-- If you manage RLS or storage buckets externally, you may remove those sections.

-- Enable uuid-ossp extension if not already enabled (needed for gen_random_uuid() if used elsewhere)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create meditations table
CREATE TABLE public.meditations (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  title text NOT NULL,
  description text,
  audio_url text NOT NULL,
  duration_seconds integer,
  is_public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT meditations_pkey PRIMARY KEY (id),
  CONSTRAINT meditations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
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

-- Create storage bucket for meditation audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('meditation-audio', 'meditation-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for the meditation-audio bucket
CREATE POLICY "Users can upload their own meditation audio" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'meditation-audio' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own meditation audio" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'meditation-audio' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own meditation audio" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'meditation-audio' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );
