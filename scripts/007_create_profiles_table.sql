-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (since we don't have auth yet)
CREATE POLICY "Allow all operations on profiles" ON public.profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Insert test profile
INSERT INTO public.profiles (id, email, username, display_name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test@example.com',
  'testuser',
  'Test User'
)
ON CONFLICT (id) DO NOTHING;
