-- Create a table to store metadata about user-uploaded ambient sound files
CREATE TABLE IF NOT EXISTS public.user_ambient_sounds (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    -- This will store the URL from Supabase Storage
    storage_path text NOT NULL UNIQUE,
    volume numeric DEFAULT 0.5 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Set up Row Level Security (RLS) for the user_ambient_sounds table
ALTER TABLE public.user_ambient_sounds ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own ambient sounds
CREATE POLICY "Users can view their own ambient sounds." ON public.user_ambient_sounds
FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own ambient sounds
CREATE POLICY "Users can insert their own ambient sounds." ON public.user_ambient_sounds
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own ambient sounds
CREATE POLICY "Users can update their own ambient sounds." ON public.user_ambient_sounds
FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete their own ambient sounds
CREATE POLICY "Users can delete their own ambient sounds." ON public.user_ambient_sounds
FOR DELETE USING (auth.uid() = user_id);
