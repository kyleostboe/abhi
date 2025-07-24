-- Create a public 'users' table to store additional user profile information
-- This table is separate from Supabase's built-in 'auth.users' but can be linked via RLS.
CREATE TABLE IF NOT EXISTS public.users (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email text UNIQUE,
    display_name text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Set up Row Level Security (RLS) for the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own profile
CREATE POLICY "Users can view their own profile." ON public.users
FOR SELECT USING (auth.uid() = id);

-- Policy for users to insert their own profile
CREATE POLICY "Users can insert their own profile." ON public.users
FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy for users to update their own profile
CREATE POLICY "Users can update their own profile." ON public.users
FOR UPDATE USING (auth.uid() = id);

-- Optional: Create a function to automatically create a public.users entry on new auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the function on new auth.users creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_user();
