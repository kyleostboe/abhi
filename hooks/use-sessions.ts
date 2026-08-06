"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { log } from "@/lib/log"
import { saveSessionNoteDraft } from "@/lib/storage/session-note-draft"
import {
  MIN_COUNTED_SECONDS,
  type PracticeSession,
  type PracticeSessionSource,
  isEffectivelyComplete,
  reconcileAbandonedSession,
  resumePosition,
} from "@/lib/sessions"

const SESSION_COLUMNS =
  "id, meditation_id, meditation_title, source, started_at, ended_at, duration_planned, duration_actual, last_position, completed"

type SessionRow = {
  id: string
  meditation_id: string | null
  meditation_title: string | null
  source: string | null
  started_at: string
  ended_at: string | null
  duration_planned: number | null
  duration_actual: number | null
  last_position: number | null
  completed: boolean | null
}

const asSource = (value: string | null): PracticeSessionSource => (value === "timer" ? "timer" : "guided")

const mapRow = (row: SessionRow): PracticeSession => ({
  id: row.id,
  meditationId: row.meditation_id,
  meditationTitle: row.meditation_title,
  source: asSource(row.source),
  startedAt: row.started_at,
  endedAt: row.ended_at,
  durationPlanned: row.duration_planned,
  durationActual: row.duration_actual ?? 0,
  lastPosition: row.last_position ?? 0,
  completed: row.completed ?? false,
})

const wholeSeconds = (value: number | null | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 0
  return Math.round(value)
}

export type StartSessionInput = {
  meditationId?: string | null
  meditationTitle?: string | null
  source?: PracticeSessionSource
  durationPlanned?: number | null
}

export type SessionProgress = {
  lastPosition?: number
  durationActual?: number
}

/**
 * Session lifecycle: open one when a sit starts, report progress while it runs, close it when it
 * ends.
 *
 * The row is written at the start rather than the end on purpose. It is what makes an interrupted
 * sit survivable — if the tab closes, the browser crashes, or the phone never wakes up, the
 * practice is still on record and gets closed out from its last reported position the next time
 * the app loads. Recording only on completion would lose exactly the sits that were most
 * disrupted.
 */
export function useSessions() {
  const supabase = useMemo(() => createClient(), [])
  const { isAuthenticated, userId } = useAuth()
  const [sessions, setSessions] = useState<PracticeSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const sessionsRef = useRef(sessions)

  useEffect(() => {
    sessionsRef.current = sessions
  }, [sessions])

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      setSessions([])
      setIsLoading(false)
      return
    }

    let isActive = true
    setIsLoading(true)

    const loadSessions = async () => {
      try {
        const { data, error } = await supabase
          .from("sessions")
          .select(SESSION_COLUMNS)
          .eq("profile_id", userId)
          .order("started_at", { ascending: false })

        if (!isActive) return

        if (error) {
          log.error("[sessions] Failed to load sessions:", error)
          setSessions([])
          return
        }

        const loaded = Array.isArray(data) ? data.map(mapRow) : []

        // Close out anything that was left open by a crash or a closed tab, and persist the
        // reconciliation so the next load does not have to redo it.
        const now = new Date()
        const reconciled = loaded.map((session) => reconcileAbandonedSession(session, { now }))
        setSessions(reconciled)

        const repaired = reconciled.filter((session, index) => session !== loaded[index])
        for (const session of repaired) {
          const { error: repairError } = await supabase
            .from("sessions")
            .update({
              ended_at: session.endedAt,
              duration_actual: wholeSeconds(session.durationActual),
              completed: session.completed,
              updated_at: new Date().toISOString(),
            })
            .eq("id", session.id)
            .eq("profile_id", userId)

          if (repairError) {
            log.warn("[sessions] Failed to close an interrupted session:", repairError)
          }
        }
      } catch (error) {
        if (isActive) {
          log.error("[sessions] Unexpected error loading sessions:", error)
          setSessions([])
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    void loadSessions()

    return () => {
      isActive = false
    }
  }, [supabase, isAuthenticated, userId])

  const startSession = useCallback(
    async (input: StartSessionInput): Promise<PracticeSession | null> => {
      if (!isAuthenticated || !userId) return null

      const startedAt = new Date().toISOString()
      const planned = wholeSeconds(input.durationPlanned)

      const { data, error } = await supabase
        .from("sessions")
        .insert({
          profile_id: userId,
          meditation_id: input.meditationId ?? null,
          meditation_title: input.meditationTitle ?? null,
          source: input.source ?? "guided",
          started_at: startedAt,
          duration_planned: planned > 0 ? planned : null,
          duration_actual: 0,
          last_position: 0,
          completed: false,
        })
        .select(SESSION_COLUMNS)
        .single()

      if (error || !data) {
        log.error("[sessions] Failed to start session:", error)
        return null
      }

      const session = mapRow(data)
      setSessions((previous) => [session, ...previous])
      return session
    },
    [supabase, isAuthenticated, userId],
  )

  /**
   * Reports how far a running sit has got. Called often, so it writes without reloading and
   * tolerates failure silently — losing one progress ping costs at most a few seconds of
   * accuracy, and the next one corrects it.
   */
  const reportProgress = useCallback(
    async (sessionId: string, progress: SessionProgress) => {
      if (!isAuthenticated || !userId) return

      const lastPosition = wholeSeconds(progress.lastPosition)
      const durationActual = wholeSeconds(progress.durationActual)

      setSessions((previous) =>
        previous.map((session) =>
          session.id === sessionId
            ? {
                ...session,
                lastPosition: progress.lastPosition !== undefined ? lastPosition : session.lastPosition,
                durationActual:
                  progress.durationActual !== undefined
                    ? Math.max(session.durationActual, durationActual)
                    : session.durationActual,
              }
            : session,
        ),
      )

      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (progress.lastPosition !== undefined) patch.last_position = lastPosition
      if (progress.durationActual !== undefined) patch.duration_actual = durationActual

      const { error } = await supabase.from("sessions").update(patch).eq("id", sessionId).eq("profile_id", userId)

      if (error) {
        log.warn("[sessions] Failed to report session progress:", error)
      }
    },
    [supabase, isAuthenticated, userId],
  )

  const endSession = useCallback(
    async (sessionId: string, progress: SessionProgress = {}): Promise<PracticeSession | null> => {
      if (!isAuthenticated || !userId) return null

      const existing = sessionsRef.current.find((session) => session.id === sessionId)
      if (!existing) return null

      const durationActual = Math.max(
        existing.durationActual,
        wholeSeconds(progress.durationActual ?? progress.lastPosition),
      )
      const lastPosition =
        progress.lastPosition !== undefined ? wholeSeconds(progress.lastPosition) : existing.lastPosition
      const completed = isEffectivelyComplete({ durationPlanned: existing.durationPlanned, durationActual })
      const endedAt = new Date().toISOString()

      const closed: PracticeSession = { ...existing, endedAt, durationActual, lastPosition, completed }
      setSessions((previous) => previous.map((session) => (session.id === sessionId ? closed : session)))

      // Offer a note for a sit that actually happened. Nothing is written yet — the draft only
      // becomes a note if something is typed into it.
      if (durationActual >= MIN_COUNTED_SECONDS) {
        saveSessionNoteDraft({
          sessionId: closed.id,
          meditationId: closed.meditationId,
          meditationTitle: closed.meditationTitle,
          startedAt: closed.startedAt,
          durationActual,
          source: closed.source,
        })
      }

      const { error } = await supabase
        .from("sessions")
        .update({
          ended_at: endedAt,
          duration_actual: durationActual,
          last_position: lastPosition,
          completed,
          updated_at: endedAt,
        })
        .eq("id", sessionId)
        .eq("profile_id", userId)

      if (error) {
        log.error("[sessions] Failed to end session:", error)
      }

      return closed
    },
    [supabase, isAuthenticated, userId],
  )

  /** Where to pick a meditation back up, or null if there is nothing worth resuming. */
  const resumeFor = useCallback(
    (meditationId: string): number | null => {
      const latest = sessionsRef.current.find((session) => session.meditationId === meditationId)
      if (!latest) return null
      return resumePosition(latest)
    },
    [],
  )

  const deleteSession = useCallback(
    async (sessionId: string) => {
      if (!isAuthenticated || !userId) return false

      const previous = sessionsRef.current
      setSessions((current) => current.filter((session) => session.id !== sessionId))

      const { error } = await supabase.from("sessions").delete().eq("id", sessionId).eq("profile_id", userId)

      if (error) {
        log.error("[sessions] Failed to delete session:", error)
        setSessions(previous)
        return false
      }

      return true
    },
    [supabase, isAuthenticated, userId],
  )

  return { sessions, isLoading, startSession, reportProgress, endSession, resumeFor, deleteSession }
}
