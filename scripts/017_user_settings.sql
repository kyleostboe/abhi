-- Makes user_settings actually usable.
--
-- The table was introduced in migration 010 and has never been read or written since — every
-- preference in the app is either hardcoded or kept in localStorage. Two things stood in the way
-- of just using it.
--
-- First, 010 declared its policies with `create policy if not exists`, which Postgres does not
-- support, so that migration would have failed at the first policy and left the table with RLS
-- enabled and no policy — which denies everything. Second, 011 dropped and rebuilt `profiles`
-- with CASCADE, which took the foreign key with it.
--
-- Everything here is idempotent, so it repairs a half-applied 010 and creates the table outright
-- if 010 never landed at all.

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Re-attach the foreign key if 011's CASCADE removed it, and make profile_id NOT NULL if the
-- 010 version of the table left it nullable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_settings_profile_id_fkey'
      AND table_name = 'user_settings'
  ) THEN
    ALTER TABLE public.user_settings
      ADD CONSTRAINT user_settings_profile_id_fkey
      FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

DELETE FROM public.user_settings WHERE profile_id IS NULL;
ALTER TABLE public.user_settings ALTER COLUMN profile_id SET NOT NULL;
ALTER TABLE public.user_settings ALTER COLUMN settings SET NOT NULL;
ALTER TABLE public.user_settings ALTER COLUMN settings SET DEFAULT '{}'::jsonb;

-- One row per account. The client upserts on this, so it has to be a real unique constraint.
CREATE UNIQUE INDEX IF NOT EXISTS user_settings_profile_id_key ON public.user_settings(profile_id);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Replaces the never-created policies from 010, and the permissive test-profile escape hatch it
-- intended, which has no business existing now that auth is real.
DROP POLICY IF EXISTS "user_settings_owner_access" ON public.user_settings;

DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
CREATE POLICY "Users can view their own settings"
  ON public.user_settings FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
CREATE POLICY "Users can insert their own settings"
  ON public.user_settings FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
CREATE POLICY "Users can update their own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;
CREATE POLICY "Users can delete their own settings"
  ON public.user_settings FOR DELETE
  USING (auth.uid() = profile_id);

COMMENT ON COLUMN public.user_settings.settings IS
  'Schemaless preference blob. The shape is enforced client-side by normalizeSettings in lib/user-settings.ts, which is total — any stored value yields a complete, valid settings object.';
