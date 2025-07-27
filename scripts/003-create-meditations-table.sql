-- Create meditations table for storing user's saved meditations
CREATE TABLE IF NOT EXISTS meditations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('adjuster', 'encoder')),
    audio_url TEXT NOT NULL,
    original_duration REAL,
    processed_duration REAL,
    target_duration INTEGER,
    settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE meditations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own meditations
CREATE POLICY "Users can view own meditations" ON meditations
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own meditations
CREATE POLICY "Users can insert own meditations" ON meditations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own meditations
CREATE POLICY "Users can update own meditations" ON meditations
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own meditations
CREATE POLICY "Users can delete own meditations" ON meditations
    FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for meditation audio files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('meditation-audio', 'meditation-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
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
