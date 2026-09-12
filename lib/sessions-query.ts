import type { SupabaseClient } from "@supabase/supabase-js"

import { type PracticeSession, type PracticeSessionSource } from "@/lib/sessions"

/**
 * The practice log's query and row mapping.
 *
 * Lifted out of `hooks/use-sessions.ts` so `components/data-warmer.tsx` can warm the same rows the
 * hook reads, through one definition rather than two copies of a column list. The hook still owns
 * everything that *writes* — starting, reporting and ending a sit — and it still owns reconciling
 * sessions a crash left open, because that is a repair rather than a read.
 */

export const SESSION_COLUMNS =
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

export const mapRow = (row: SessionRow): PracticeSession => ({
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


/** Every session for a profile, newest first. */
export async function loadSessionRows(supabase: SupabaseClient, userId: string): Promise<PracticeSession[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_COLUMNS)
    .eq("profile_id", userId)
    .order("started_at", { ascending: false })

  if (error) throw error
  return Array.isArray(data) ? (data as SessionRow[]).map(mapRow) : []
}
