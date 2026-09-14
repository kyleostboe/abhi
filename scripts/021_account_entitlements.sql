-- Per-account entitlements, and the two limits that have to hold even when the client is lying.
--
-- This lives in its own table rather than as columns on `profiles` for one reason: `profiles`
-- already has an owner-scoped UPDATE policy, and Postgres RLS is row-level, not column-level. A
-- tier column there would be writable by the account it governs, which is not a subscription.
--
-- So: SELECT for the owner, and no INSERT, UPDATE or DELETE policy at all. RLS denies what it has
-- no policy for, which leaves the service role — the Stripe webhook — as the only writer. A
-- missing row is not an error state; it means "free", and `entitlementsFor` in
-- lib/entitlements.ts is total precisely so that nothing has to special-case it.

CREATE TABLE IF NOT EXISTS public.account_entitlements (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free',

  -- NULL means "use the tier's default". These exist so a comped account, a founding-tier
  -- promise, or an account that needs clamping can be handled with an UPDATE instead of a deploy.
  synced_meditation_limit INTEGER,
  recording_limit INTEGER,
  storage_quota_bytes BIGINT,
  max_upload_bytes BIGINT,
  journal_attachments BOOLEAN,

  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  -- What the subscription is doing, straight from Stripe. `tier` is the decision derived from it;
  -- keeping both means a webhook that arrives out of order can be reconciled against the truth.
  subscription_status TEXT,
  current_period_end TIMESTAMPTZ,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.account_entitlements
  DROP CONSTRAINT IF EXISTS account_entitlements_tier_check;
ALTER TABLE public.account_entitlements
  ADD CONSTRAINT account_entitlements_tier_check CHECK (tier IN ('free', 'supporter'));

CREATE INDEX IF NOT EXISTS account_entitlements_stripe_customer_idx
  ON public.account_entitlements(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

ALTER TABLE public.account_entitlements ENABLE ROW LEVEL SECURITY;

-- Readable by its owner so the app can show what the account is entitled to. Deliberately the
-- only policy on the table.
DROP POLICY IF EXISTS "Users can view their own entitlements" ON public.account_entitlements;
CREATE POLICY "Users can view their own entitlements"
  ON public.account_entitlements FOR SELECT
  USING (auth.uid() = profile_id);

COMMENT ON TABLE public.account_entitlements IS
  'Subscription tier and per-account limit overrides. Owner-readable, service-role-writable only — a row here must never be writable by the account it governs. A missing row means the free tier.';

-- ---------------------------------------------------------------------------------------------
-- The free-tier defaults, mirrored from lib/entitlements.ts.
--
-- Two copies of these numbers, and nothing links them. That is the cost of enforcing the limit
-- where it cannot be bypassed: meditation rows are inserted by the client straight through
-- Supabase, so there is no server route to put the check in, and a check that only runs in the
-- browser is a suggestion. If you change a free-tier default, change it in both places — the
-- TypeScript is what the UI counts down from, this is what actually stops the INSERT.
-- ---------------------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tier_meditation_limit(tier TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  -- NULL is unlimited, matching the Infinity that `entitlementsFor` hands a supporter.
  SELECT CASE WHEN tier = 'supporter' THEN NULL ELSE 15 END;
$$;

CREATE OR REPLACE FUNCTION public.tier_recording_limit(tier TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE WHEN tier = 'supporter' THEN NULL ELSE 10 END;
$$;

/*
 * Refuses an INSERT that would take an account past its synced-meditation limit.
 *
 * Recordings are counted separately. They share this table to inherit the whole audio pipeline
 * but are not meditations — every listing already filters them out — so letting them consume
 * meditation slots would mean building a reusable instruction set quietly costs you the library
 * you came for.
 *
 * INSERT only. An account that drops from supporter to free keeps everything it already has:
 * making existing rows fail to update, or disappear, is how you turn a lapsed subscription into
 * lost practice.
 */
CREATE OR REPLACE FUNCTION public.enforce_meditation_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_tier TEXT;
  effective_limit INTEGER;
  current_count INTEGER;
  is_recording BOOLEAN;
BEGIN
  is_recording := NEW.source = 'recording';

  SELECT
    e.tier,
    CASE
      WHEN is_recording THEN COALESCE(e.recording_limit, public.tier_recording_limit(e.tier))
      ELSE COALESCE(e.synced_meditation_limit, public.tier_meditation_limit(e.tier))
    END
  INTO account_tier, effective_limit
  FROM public.account_entitlements e
  WHERE e.profile_id = NEW.profile_id;

  -- No row means a free account that has never been touched by billing.
  IF NOT FOUND THEN
    effective_limit := CASE
      WHEN is_recording THEN public.tier_recording_limit('free')
      ELSE public.tier_meditation_limit('free')
    END;
  END IF;

  IF effective_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO current_count
  FROM public.meditations m
  WHERE m.profile_id = NEW.profile_id
    AND (m.source = 'recording') = is_recording;

  IF current_count >= effective_limit THEN
    RAISE EXCEPTION
      USING
        MESSAGE = CASE
          WHEN is_recording THEN 'Recording limit reached for this account.'
          ELSE 'Synced meditation limit reached for this account.'
        END,
        -- Caught by name in the client so it can offer the subscription rather than showing a
        -- database error. 'P0001' would be indistinguishable from any other RAISE.
        ERRCODE = 'check_violation',
        HINT = 'abhi_entitlement_limit';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_meditation_limit_trigger ON public.meditations;
CREATE TRIGGER enforce_meditation_limit_trigger
  BEFORE INSERT ON public.meditations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_meditation_limit();
