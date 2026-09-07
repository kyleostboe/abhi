"use client"

/**
 * The practice log: every sit, in reverse-chronological order and grouped by day.
 *
 * This reads the sessions table rather than the journal. The distinction is the point — Notes
 * answers "what have I written", Sessions answers "what did I actually sit with, and when",
 * and those stopped being the same question the moment a sit could happen without anything
 * being written about it. A silent timer sit appears here with no note attached and that is
 * not a gap.
 *
 * Days are bucketed by the user's practice-day boundary, so a sit at 1am belongs to the day
 * that is ending rather than opening a new one with a single entry in it.
 */

import { Clock, Hourglass, NotebookPen, Timer } from "lucide-react"

import type { JournalNote } from "@/hooks/use-journal-notes"
import {
  DEFAULT_DAY_BOUNDARY_HOUR,
  type PracticeSession,
  completionRatio,
  practiceDayKey,
} from "@/lib/sessions"
import { cn } from "@/lib/utils"

const formatDayHeading = (dayKey: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey)
  if (!match) return dayKey

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  const todayKey = practiceDayKey(new Date())
  const yesterdayKey = practiceDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000))

  if (dayKey === todayKey) return "Today"
  if (dayKey === yesterdayKey) return "Yesterday"

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

const formatTime = (iso: string) => {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "--:--"
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date)
}

/** Practice length, rounded to whole minutes — seconds are noise at this scale. */
const formatSatLength = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 60) return "under a minute"
  const totalMinutes = Math.round(seconds / 60)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`
}

export function SessionsView({
  sessions,
  notes,
  isLoading,
  onOpenNote,
  dayBoundaryHour = DEFAULT_DAY_BOUNDARY_HOUR,
}: {
  sessions: PracticeSession[]
  notes: JournalNote[]
  isLoading: boolean
  onOpenNote: (noteId: string) => void
  dayBoundaryHour?: number
}) {
  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-8" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="animate-pulse rounded-xl border-[3px] border-muted p-4 shadow-md">
            <div className="mb-2 h-3 w-40 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted/70" />
          </div>
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center p-8 text-center">
        <p className="font-serif text-sm font-black text-gray-500">No practice sessions yet</p>
        <p className="mt-1 max-w-xs font-serif text-xs text-gray-400">
          Sessions appear here when you play a meditation or sit with the timer.
        </p>
      </div>
    )
  }

  const ordered = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  )

  const days: { key: string; entries: PracticeSession[] }[] = []
  for (const session of ordered) {
    const key = practiceDayKey(session.startedAt, dayBoundaryHour)
    if (!key) continue
    const existing = days.find((day) => day.key === key)
    if (existing) existing.entries.push(session)
    else days.push({ key, entries: [session] })
  }

  /** The note written about a sit, if there was one. Most sits have none. */
  const noteFor = (session: PracticeSession) =>
    notes.find((note) => note.sessionId === session.id) ?? null

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 md:p-8">
      {days.map((day) => {
        const dayTotal = day.entries.reduce((total, session) => total + session.durationActual, 0)

        return (
          // A day is a heading with cards under it, not a container — the same bare
          // section head the Creator puts above Timeline Events.
          <section key={day.key} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="min-w-0 truncate text-base font-black text-gray-600">{formatDayHeading(day.key)}</h2>
              <span className="flex-shrink-0 text-xs font-black tracking-tight text-gray-400">
                {day.entries.length} {day.entries.length === 1 ? "sit" : "sits"}
                {dayTotal >= 60 ? ` · ${formatSatLength(dayTotal)}` : ""}
              </span>
            </div>

            <div className="space-y-2">
              {day.entries.map((session) => {
                const note = noteFor(session)
                const ratio = completionRatio(session)
                const isTimer = session.source === "timer"

                // The Library's meditation card, item for item: small bold title, then a
                // wrapping row of icon-and-label facts in the same grey. A sit and a saved
                // meditation are the same kind of object in this app, so they read the same.
                const body = (
                  <span className="flex items-center justify-between gap-3 p-4 text-left">
                    <span className="min-w-0 flex-1">
                      <span className="mb-2 block truncate text-xs font-black text-gray-800">
                        {session.meditationTitle ?? (isTimer ? "Timer sit" : "Meditation")}
                      </span>
                      <span className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          {isTimer ? <Timer className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                          <span className="truncate text-xs font-black tracking-tight">
                            {formatTime(session.startedAt)}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Hourglass className="h-4 w-4" />
                          <span className="truncate text-xs font-black tracking-tight">
                            {formatSatLength(session.durationActual)}
                            {ratio !== null && !session.completed ? ` of ${Math.round(ratio * 100)}%` : ""}
                          </span>
                        </span>
                        {note ? (
                          <span className="flex min-w-0 items-center gap-1">
                            <NotebookPen className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate text-xs font-black tracking-tight">
                              {note.preview || note.title || "Note"}
                            </span>
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </span>
                )

                const className = cn(
                  "block w-full min-w-0 rounded-xl border-[3px] border-muted bg-white shadow-md",
                  note && "transition-colors hover:border-stone-300",
                )

                // A sit with nothing written about it has nowhere to go, so it is not a button.
                return note ? (
                  <button key={session.id} type="button" onClick={() => onOpenNote(note.id)} className={className}>
                    {body}
                  </button>
                ) : (
                  <div key={session.id} className={className}>
                    {body}
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
