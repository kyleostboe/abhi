-- Migration 020: Standardize RLS policies and columns on journal_entries.
--
-- Why:
-- In migration 009, policies on `journal_entries` were written using
-- `current_setting('jwt.claims.profile_id')`. Supabase Auth populates `auth.uid()`,
-- not `jwt.claims.profile_id`. As a result, inserts fail with code 42501
-- ("new row violates row-level security policy for table journal_entries").
--
-- This migration drops any legacy policies and installs standard `auth.uid() = profile_id`
-- policies, while ensuring all note columns are present and nullable where expected.

-- 1. Ensure table and expected columns exist
ALTER TABLE IF EXISTS public.journal_entries
  ALTER COLUMN meditation_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.journal_entries
  ALTER COLUMN meditation_title DROP NOT NULL;

ALTER TABLE IF EXISTS public.journal_entries
  ADD COLUMN IF NOT EXISTS content_md TEXT,
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS preview TEXT,
  ADD COLUMN IF NOT EXISTS note_key TEXT,
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.journal_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS practice_type TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS font TEXT,
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private';

-- 2. Ensure RLS is enabled
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing and competing policies
DROP POLICY IF EXISTS "Users can view their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can insert their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can update their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Users can delete their own journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_owner_access" ON public.journal_entries;

-- 4. Recreate clean RLS policies tied to Supabase auth.uid()
CREATE POLICY "Users can view their own journal entries"
  ON public.journal_entries FOR SELECT
  USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert their own journal entries"
  ON public.journal_entries FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can update their own journal entries"
  ON public.journal_entries FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY "Users can delete their own journal entries"
  ON public.journal_entries FOR DELETE
  USING (auth.uid() = profile_id);
