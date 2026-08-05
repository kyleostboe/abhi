-- The practice log, as its own thing.
--
-- Until now a sit was inferred from the journal: playback wrote a journal_entries row, and the
-- Sessions view was that table filtered to rows carrying a meditation_id. That conflated three
-- separate facts — that you sat, what you sat with, and what you wrote about it — and it could
-- only ever describe sits that went through the library player. It also recorded on play-start,
-- so a three-second mis-tap and a forty-minute sit were indistinguishable afterwards.
--
-- This table records the sit. The journal keeps recording the writing, and a note may point at a
-- session, but neither depends on the other existing.

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Null for a timer sit, which has no meditation behind it. The title is denormalised so the
  -- log still reads correctly after a meditation is deleted — the practice happened either way,
  -- and ON DELETE SET NULL would otherwise silently rewrite history.
  meditation_id UUID REFERENCES public.meditations(id) ON DELETE SET NULL,
  meditation_title TEXT,

  source TEXT NOT NULL DEFAULT 'guided' CHECK (source IN ('guided', 'timer')),

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Null while the sit is in progress. A row with no ended_at that has stopped being updated is
  -- an interrupted sit, reconciled from last_position rather than discarded — see
  -- reconcileAbandonedSession in lib/sessions.ts.
  ended_at TIMESTAMPTZ,

  -- What was asked for, in seconds. Null for an open-ended sit, where there is no target to be
  -- a fraction of.
  duration_planned INTEGER,

  -- Time actually spent sitting, in seconds. Deliberately not wall-clock elapsed: a sit paused
  -- for five minutes should not earn five minutes of practice.
  duration_actual INTEGER NOT NULL DEFAULT 0,

  -- How far into the audio the sit had got, in seconds. Drives resume, and is the fallback the
  -- reconciliation above reads when a session was never closed.
  last_position INTEGER NOT NULL DEFAULT 0,

  completed BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- The log is always read newest-first for one profile, and resume looks up the latest session
-- for one meditation.
CREATE INDEX IF NOT EXISTS idx_sessions_profile_started ON public.sessions(profile_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_profile_meditation ON public.sessions(profile_id, meditation_id, started_at DESC);

-- Finding sits that were never closed, so they can be reconciled on next load.
CREATE INDEX IF NOT EXISTS idx_sessions_open ON public.sessions(profile_id, ended_at) WHERE ended_at IS NULL;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sessions" ON public.sessions;
CREATE POLICY "Users can view their own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can insert their own sessions" ON public.sessions;
CREATE POLICY "Users can insert their own sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can update their own sessions" ON public.sessions;
CREATE POLICY "Users can update their own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.sessions;
CREATE POLICY "Users can delete their own sessions"
  ON public.sessions FOR DELETE
  USING (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------------------------
-- Backfill from the journal
-- ---------------------------------------------------------------------------------------------
-- Every existing journal entry that names a meditation was, at the time, the only record that a
-- sit happened — so each becomes a session. What those rows cannot tell us is how long the sit
-- ran: playback wrote them on play-start and never revisited them. Rather than invent a
-- duration, duration_actual is left at 0 and completed at false, which reads correctly as "we
-- know this happened, we do not know how long it lasted".
--
-- The practical effect is that backfilled sits appear in the log and on the calendar but do not
-- feed streaks, which require a real duration. That is the honest outcome: the data to support a
-- streak claim about the past does not exist.
INSERT INTO public.sessions (
  profile_id, meditation_id, meditation_title, source, started_at, ended_at,
  duration_planned, duration_actual, last_position, completed, created_at
)
SELECT
  je.profile_id,
  je.meditation_id,
  COALESCE(je.meditation_title, m.title),
  'guided',
  je.played_at,
  je.played_at,
  NULLIF(m.duration, 0),
  0,
  0,
  FALSE,
  COALESCE(je.created_at, je.played_at)
FROM public.journal_entries je
LEFT JOIN public.meditations m ON m.id = je.meditation_id
WHERE je.meditation_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.profile_id = je.profile_id
      AND s.started_at = je.played_at
      AND s.meditation_id IS NOT DISTINCT FROM je.meditation_id
  );

-- ---------------------------------------------------------------------------------------------
-- Notes point at sessions
-- ---------------------------------------------------------------------------------------------
-- A note about a sit can now name it directly instead of the two being matched by timestamp.
-- Nullable and ON DELETE SET NULL: a standalone note has no session, and deleting a session
-- should not delete what someone wrote.
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_journal_entries_session ON public.journal_entries(session_id);

UPDATE public.journal_entries je
SET session_id = s.id
FROM public.sessions s
WHERE je.session_id IS NULL
  AND je.meditation_id IS NOT NULL
  AND s.profile_id = je.profile_id
  AND s.started_at = je.played_at
  AND s.meditation_id IS NOT DISTINCT FROM je.meditation_id;
