-- A length variant is not a second meditation.
--
-- Variants get their own `meditations` row, linked back through `metadata.linkedParentId`, and
-- 022 counted rows. The Library groups them under one card, so the number on screen and the
-- number in the limit had no visible relationship: with the default quick-adjust presets
-- (10m/30m/1h) one meditation is four rows, and an allowance of fifteen ran out at the fourth
-- meditation someone actually named.
--
-- That is the failure that makes a limit feel dishonest rather than merely low. A person counting
-- their own library has to be able to reproduce the number, and the only number they can see is
-- the card. So the count is cards now: a variant rides free.
--
-- Variants still cost storage, and that is fine — `storage_quota_bytes` is what bounds bytes. The
-- count exists to be understood; the quota exists to be enforced. Asking one number to do both is
-- what broke it.

/*
 * The parent id in a meditation's metadata, or NULL when there isn't a usable one.
 *
 * `linkedParentId` is client-written JSON, so it can be absent, empty, or not a UUID at all. Any
 * of those mean "this is not a variant" rather than an error worth failing a save over.
 */
CREATE OR REPLACE FUNCTION public.meditation_parent_id(meta JSONB)
RETURNS UUID
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  raw TEXT;
BEGIN
  raw := NULLIF(TRIM(COALESCE(meta ->> 'linkedParentId', '')), '');
  IF raw IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN raw::UUID;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

/*
 * Refuses to *sync* past the allowance, counting meditations rather than rows.
 *
 * A row is a variant only when its parent is a real meditation on the same account. Without that
 * check, "has a linkedParentId" would be a way to skip the limit by writing an arbitrary string —
 * the byte quota would still bound the damage, but there is no reason to leave the door open.
 *
 * Variants are capped per parent purely as a safety bound. Nobody reaches twenty lengths of one
 * meditation by hand; a loop that has gone wrong reaches it immediately.
 */
CREATE OR REPLACE FUNCTION public.enforce_meditation_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_limit INTEGER;
  current_count INTEGER;
  is_recording BOOLEAN;
  parent_id UUID;
  variant_count INTEGER;
  max_variants CONSTANT INTEGER := 20;
BEGIN
  -- Nothing is being synced by this statement, so there is nothing to limit.
  IF NEW.audio_key IS NULL THEN
    RETURN NEW;
  END IF;

  -- An update that leaves the key as it was is a title change, a metadata rewrite, or a re-render
  -- replacing the audio in place. None of those add to the count.
  IF TG_OP = 'UPDATE' AND OLD.audio_key IS NOT NULL THEN
    RETURN NEW;
  END IF;

  is_recording := NEW.source = 'recording';
  parent_id := public.meditation_parent_id(NEW.metadata);

  IF parent_id IS NOT NULL AND parent_id <> NEW.id THEN
    IF EXISTS (
      SELECT 1 FROM public.meditations m
      WHERE m.id = parent_id AND m.profile_id = NEW.profile_id
    ) THEN
      SELECT COUNT(*) INTO variant_count
      FROM public.meditations m
      WHERE m.profile_id = NEW.profile_id
        AND m.id <> NEW.id
        AND public.meditation_parent_id(m.metadata) = parent_id;

      IF variant_count >= max_variants THEN
        RAISE EXCEPTION
          USING
            MESSAGE = 'Too many length variants for one meditation.',
            ERRCODE = 'check_violation',
            HINT = 'abhi_variant_limit';
      END IF;

      -- A length of something already in the library. It does not take a slot.
      RETURN NEW;
    END IF;
  END IF;

  SELECT
    CASE
      WHEN is_recording THEN COALESCE(e.recording_limit, public.tier_recording_limit(e.tier))
      ELSE COALESCE(e.synced_meditation_limit, public.tier_meditation_limit(e.tier))
    END
  INTO effective_limit
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

  -- Synced, not a variant, and not this row: what the person sees as a card in their library.
  SELECT COUNT(*) INTO current_count
  FROM public.meditations m
  WHERE m.profile_id = NEW.profile_id
    AND m.audio_key IS NOT NULL
    AND (m.source = 'recording') = is_recording
    AND m.id <> NEW.id
    AND public.meditation_parent_id(m.metadata) IS NULL;

  IF current_count >= effective_limit THEN
    RAISE EXCEPTION
      USING
        MESSAGE = CASE
          WHEN is_recording THEN 'Recording sync limit reached for this account.'
          ELSE 'Synced meditation limit reached for this account.'
        END,
        -- Caught by name in the client, which turns it into a choice rather than a database
        -- error. 'P0001' would be indistinguishable from any other RAISE.
        ERRCODE = 'check_violation',
        HINT = 'abhi_entitlement_limit';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_meditation_limit_trigger ON public.meditations;
CREATE TRIGGER enforce_meditation_limit_trigger
  BEFORE INSERT OR UPDATE OF audio_key ON public.meditations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_meditation_limit();

-- The count now also filters on the parent id, which is an expression rather than a column.
CREATE INDEX IF NOT EXISTS meditations_profile_base_synced_idx
  ON public.meditations(profile_id, source)
  WHERE audio_key IS NOT NULL AND public.meditation_parent_id(metadata) IS NULL;
