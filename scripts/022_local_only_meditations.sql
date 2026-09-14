-- Limit what is *synced*, not what exists.
--
-- 021 counted every row, so the sixteenth meditation on a free account was refused outright. That
-- is the wrong shape for this app. The allowance is about what the server stores on someone's
-- behalf, and a meditation whose audio stays in the browser that made it costs nothing to host —
-- there is no reason for the app to refuse to remember that it exists.
--
-- So the row is always allowed and `audio_key` is what the limit governs. Past the allowance a
-- save still writes its row, still keeps its title, duration, timeline and every other thing that
-- makes the library a library, and simply does not upload its audio. The account keeps a complete
-- index of itself, which is what lets a second device say "twenty-eight of these have their audio
-- on your iPhone" rather than either hiding them or pretending they are broken.

ALTER TABLE public.meditations
  ADD COLUMN IF NOT EXISTS audio_device_label TEXT;

COMMENT ON COLUMN public.meditations.audio_device_label IS
  'Coarse name of the device holding this meditation''s audio when it was not uploaded (e.g. "iPhone", "Mac"). Null once audio_key is set, since synced audio is not on any one device. A signpost for the UI, not telemetry: no model, no version, nothing distinguishing two phones of the same kind.';

/*
 * Refuses to *sync* past the allowance, rather than refusing to save.
 *
 * Fires on INSERT and on UPDATE, because the limit is on a column that can be filled in later: a
 * row inserted with a null audio_key and updated to carry one afterwards would otherwise be a way
 * past the check that the insert passed honestly.
 *
 * Only ever looks at a statement that is trying to set a key. Clearing one, or updating a title,
 * is never refused — and an account that drops from supporter to free keeps every synced row it
 * already has, because taking audio away from someone for lapsing is not a downgrade, it is a
 * deletion.
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

  -- Only synced rows count. The local-only ones are the whole point of this migration.
  SELECT COUNT(*) INTO current_count
  FROM public.meditations m
  WHERE m.profile_id = NEW.profile_id
    AND m.audio_key IS NOT NULL
    AND (m.source = 'recording') = is_recording
    AND m.id <> NEW.id;

  IF current_count >= effective_limit THEN
    RAISE EXCEPTION
      USING
        MESSAGE = CASE
          WHEN is_recording THEN 'Recording sync limit reached for this account.'
          ELSE 'Synced meditation limit reached for this account.'
        END,
        -- Caught by name in the client, which falls back to saving the audio locally rather than
        -- surfacing a database error. 'P0001' would be indistinguishable from any other RAISE.
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

-- Counting synced rows is now on the hot path of every sync-bound save.
CREATE INDEX IF NOT EXISTS meditations_profile_synced_idx
  ON public.meditations(profile_id, source)
  WHERE audio_key IS NOT NULL;
