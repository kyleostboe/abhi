-- Create a table to store user-saved meditation sessions
CREATE TABLE IF NOT EXISTS public.meditations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    title text NOT NULL,
    duration_seconds integer NOT NULL,
    -- Store timeline events as JSONB for flexibility
    timeline_events jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Set up Row Level Security (RLS) for the meditations table
ALTER TABLE public.meditations ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own meditations
CREATE POLICY "Users can view their own meditations." ON public.meditations
FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own meditations
CREATE POLICY "Users can insert their own meditations." ON public.meditations
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own meditations
CREATE POLICY "Users can update their own meditations." ON public.meditations
FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete their own meditations
CREATE POLICY "Users can delete their own meditations." ON public.meditations
FOR DELETE USING (auth.uid() = user_id);

-- Optional: Function to update 'updated_at' timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update 'updated_at' on each row update
DROP TRIGGER IF EXISTS update_meditations_updated_at ON public.meditations;
CREATE TRIGGER update_meditations_updated_at
BEFORE UPDATE ON public.meditations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
