"use client"

import { useCallback, useEffect, useRef } from "react"

import { useSessions, type StartSessionInput } from "@/hooks/use-sessions"
import type { PracticeSessionSource } from "@/lib/sessions"

/** How often accumulated practice time is written back while a sit is running. */
const FLUSH_INTERVAL_MS = 15_000

/** How often practice time is accumulated in memory. */
const TICK_INTERVAL_MS = 1_000

export type SessionTrackerOptions = {
  /** Null for a timer sit, which has no meditation behind it. */
  meditationId: string | null
  meditationTitle: string | null
  /** The intended length in seconds, or null for an open-ended sit. */
  durationPlanned: number | null
  source?: PracticeSessionSource
  isPlaying: boolean
  /** Current position in seconds, in the same display units the player shows. */
  getPosition: () => number
  enabled?: boolean
}

/**
 * Turns playback into a practice record.
 *
 * Practice time is accumulated as wall-clock seconds while playing, not as distance travelled
 * through the audio. The two differ in ways that matter: seeking forward should not earn
 * practice, and a sit played at 1.2x covers more audio than it does sitting. What is being
 * measured is time spent sitting.
 *
 * Nothing here tries to survive the tab being killed. It does not need to — the session row
 * exists from the moment the sit starts and carries its last reported position, so
 * `reconcileAbandonedSession` can close it out on the next load.
 */
export function useSessionTracker({
  meditationId,
  meditationTitle,
  durationPlanned,
  source = "guided",
  isPlaying,
  getPosition,
  enabled = true,
}: SessionTrackerOptions) {
  const { startSession, reportProgress, endSession, resumeFor, sessions, isLoading } = useSessions()

  const sessionIdRef = useRef<string | null>(null)
  const accumulatedRef = useRef(0)
  const lastTickRef = useRef<number | null>(null)
  const lastFlushRef = useRef(0)
  const startingRef = useRef(false)
  const getPositionRef = useRef(getPosition)

  useEffect(() => {
    getPositionRef.current = getPosition
  }, [getPosition])

  const readPosition = useCallback(() => {
    try {
      const position = getPositionRef.current()
      return Number.isFinite(position) && position > 0 ? position : 0
    } catch {
      return 0
    }
  }, [])

  const flush = useCallback(
    (sessionId: string) => {
      lastFlushRef.current = accumulatedRef.current
      void reportProgress(sessionId, {
        lastPosition: readPosition(),
        durationActual: accumulatedRef.current,
      })
    },
    [reportProgress, readPosition],
  )

  /** Closes the running sit, if there is one. Safe to call when there is not. */
  const finish = useCallback(() => {
    const sessionId = sessionIdRef.current
    if (!sessionId) return

    sessionIdRef.current = null
    lastTickRef.current = null
    const durationActual = accumulatedRef.current
    const lastPosition = readPosition()
    accumulatedRef.current = 0
    lastFlushRef.current = 0

    void endSession(sessionId, { durationActual, lastPosition })
  }, [endSession, readPosition])

  // Open a session when a sit begins. Only playback starts one, so merely opening a meditation
  // records nothing.
  useEffect(() => {
    if (!enabled || !isPlaying) return
    if (sessionIdRef.current || startingRef.current) return

    let cancelled = false
    startingRef.current = true

    const open = async () => {
      const input: StartSessionInput = { meditationId, meditationTitle, source, durationPlanned }
      const session = await startSession(input)
      startingRef.current = false

      if (cancelled) {
        // Playback stopped while the insert was in flight. The row exists, so close it rather
        // than orphaning it — a sit that short does not clear the practice floor anyway.
        if (session) void endSession(session.id, { durationActual: 0, lastPosition: 0 })
        return
      }

      if (session) {
        sessionIdRef.current = session.id
        accumulatedRef.current = 0
        lastFlushRef.current = 0
        lastTickRef.current = Date.now()
      }
    }

    void open()

    return () => {
      cancelled = true
    }
  }, [enabled, isPlaying, meditationId, meditationTitle, source, durationPlanned, startSession, endSession])

  // Accumulate while playing; pause simply stops the clock.
  useEffect(() => {
    if (!isPlaying) {
      if (lastTickRef.current !== null) {
        accumulatedRef.current += (Date.now() - lastTickRef.current) / 1000
        lastTickRef.current = null
      }
      const sessionId = sessionIdRef.current
      if (sessionId && accumulatedRef.current > lastFlushRef.current) flush(sessionId)
      return
    }

    lastTickRef.current = Date.now()

    const interval = window.setInterval(() => {
      const now = Date.now()
      if (lastTickRef.current !== null) {
        accumulatedRef.current += (now - lastTickRef.current) / 1000
      }
      lastTickRef.current = now

      const sessionId = sessionIdRef.current
      if (sessionId && (accumulatedRef.current - lastFlushRef.current) * 1000 >= FLUSH_INTERVAL_MS) {
        flush(sessionId)
      }
    }, TICK_INTERVAL_MS)

    return () => {
      window.clearInterval(interval)
      if (lastTickRef.current !== null) {
        accumulatedRef.current += (Date.now() - lastTickRef.current) / 1000
        lastTickRef.current = null
      }
    }
  }, [isPlaying, flush])

  // A different meditation is a different sit. Close the old one before the next one opens.
  const previousMeditationRef = useRef(meditationId)
  useEffect(() => {
    if (previousMeditationRef.current !== meditationId) {
      previousMeditationRef.current = meditationId
      finish()
    }
  }, [meditationId, finish])

  useEffect(() => finish, [finish])

  return { finish, resumeFor, sessions, isLoading }
}
