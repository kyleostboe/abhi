"use client"

/**
 * The practice log: every note that's tied to a meditation, in reverse-chronological order and
 * grouped by day.
 *
 * This is deliberately a different lens from the Notes tab rather than a re-sort of it. Notes
 * answers "what have I written"; Sessions answers "what did I actually sit with, and when" —
 * which is the question a retreat day (several sits, several notes) actually raises. Standalone
 * notes have no session to belong to, so they live only under Notes.
 */

import { Clock, NotebookPen } from "lucide-react"

import type { JournalNote } from "@/hooks/use-journal-notes"
import { cn } from "@/lib/utils"

const dayKeyOf = (iso: string) => {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

const formatDayHeading = (iso: string) => {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)

  const sameDate = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  if (sameDate(date, today)) return "Today"
  if (sameDate(date, yesterday)) return "Yesterday"
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(iso))

export function SessionsView({
  notes,
  isLoading,
  onOpenNote,
}: {
  notes: JournalNote[]
  isLoading: boolean
  onOpenNote: (noteId: string) => void
}) {
  // A session is a note attached to a meditation; everything else is just writing.
  const sessions = notes
    .filter((note) => note.meditationId || note.meditationTitle)
    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 md:p-8" aria-busy="true">
        {[0, 1, 2].map((index) => (
          <div key={index} className="animate-pulse rounded-xl border-[3px] border-muted p-4">
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
          Sessions appear here when you play a meditation, or when a note is linked to one.
        </p>
      </div>
    )
  }

  const days: { key: string; iso: string; entries: JournalNote[] }[] = []
  for (const session of sessions) {
    const key = dayKeyOf(session.playedAt)
    const existing = days.find((day) => day.key === key)
    if (existing) existing.entries.push(session)
    else days.push({ key, iso: session.playedAt, entries: [session] })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-4 md:p-8">
      {days.map((day) => (
        <section key={day.key}>
          <div className="mb-3 flex items-baseline justify-between gap-3 border-b border-muted pb-2">
            <h2 className="min-w-0 truncate font-serif text-lg font-black text-gray-700">
              {formatDayHeading(day.iso)}
            </h2>
            <span className="flex-shrink-0 text-[11px] font-black uppercase tracking-[0.15em] text-gray-400">
              {day.entries.length} {day.entries.length === 1 ? "sit" : "sits"}
            </span>
          </div>

          <div className="space-y-2">
            {day.entries.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => onOpenNote(session.id)}
                className={cn(
                  "flex w-full min-w-0 items-start gap-3 rounded-xl border-[3px] border-muted bg-gradient-to-br from-white to-stone-50 p-4 text-left transition-colors",
                  "hover:border-stone-300",
                )}
              >
                <span className="mt-0.5 flex flex-shrink-0 items-center gap-1 text-xs font-black text-gray-500">
                  <Clock className="h-3.5 w-3.5" />
                  {formatTime(session.playedAt)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-sm font-black text-gray-700">
                    {session.meditationTitle ?? "Meditation"}
                  </span>
                  <span className="mt-0.5 block truncate font-serif text-xs text-gray-500">
                    {session.preview || session.title || "No reflection yet"}
                  </span>
                </span>
                <NotebookPen className="mt-0.5 h-4 w-4 flex-shrink-0 text-logo-rose-400" />
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
