-- Create a table to store user journal entries
CREATE TABLE IF NOT EXISTS public.journal_entries (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    entry_date date DEFAULT now() NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Set up Row Level Security (RLS) for the journal_entries table
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- Policy for users to view their own journal entries
CREATE POLICY "Users can view their own journal entries." ON public.journal_entries
FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to insert their own journal entries
CREATE POLICY "Users can insert their own journal entries." ON public.journal_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy for users to update their own journal entries
CREATE POLICY "Users can update their own journal entries." ON public.journal_entries
FOR UPDATE USING (auth.uid() = user_id);

-- Policy for users to delete their own journal entries
CREATE POLICY "Users can delete their own journal entries." ON public.journal_entries
FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update 'updated_at' on each row update
DROP TRIGGER IF EXISTS update_journal_entries_updated_at ON public.journal_entries;
CREATE TRIGGER update_journal_entries_updated_at
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
