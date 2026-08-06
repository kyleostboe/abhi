/**
 * The note that is waiting after a sit, before it is a note.
 *
 * A sit ending is the moment someone is most likely to write and least likely to go looking for
 * a "new note" button — so a draft is offered. But it stays a draft: no row is written until
 * something is actually typed into it. Creating a note per sit and cleaning up the empty ones
 * later is the obvious implementation and the wrong one, because it fills the journal with
 * blanks and makes "you have 400 notes" mean nothing.
 *
 * This module holds the shape of that draft and the rule for whether it has become real. Pure —
 * the storage side lives in lib/storage/session-note-draft.ts.
 */

export type SessionNoteDraft = {
  sessionId: string
  meditationId: string | null
  meditationTitle: string | null
  /** ISO timestamp of when the sit started. */
  startedAt: string
  /** Seconds actually sat. */
  durationActual: number
  source: "guided" | "timer"
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

const finiteOrZero = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0

/** Narrows a stored value back to a draft, or null if it is not one. */
export const parseSessionNoteDraft = (value: unknown): SessionNoteDraft | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null
  const record = value as Record<string, unknown>

  if (!isNonEmptyString(record.sessionId)) return null
  if (!isNonEmptyString(record.startedAt)) return null
  if (Number.isNaN(new Date(record.startedAt).getTime())) return null

  return {
    sessionId: record.sessionId,
    meditationId: isNonEmptyString(record.meditationId) ? record.meditationId : null,
    meditationTitle: isNonEmptyString(record.meditationTitle) ? record.meditationTitle : null,
    startedAt: record.startedAt,
    durationActual: finiteOrZero(record.durationActual),
    source: record.source === "timer" ? "timer" : "guided",
  }
}

/**
 * The title a note gets if it is written but never titled.
 *
 * Named after what was sat rather than the date, because a journal listing full of "March 14"
 * tells you nothing you could not get from the sort order.
 */
export const draftTitle = (draft: SessionNoteDraft): string =>
  draft.meditationTitle?.trim() || (draft.source === "timer" ? "Timer sit" : "Meditation")

/** Minutes, phrased the way someone would say it. */
const spokenLength = (seconds: number): string => {
  const minutes = Math.round(finiteOrZero(seconds) / 60)
  if (minutes < 1) return "a few moments"
  if (minutes === 1) return "1 minute"
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  const hourPart = hours === 1 ? "1 hour" : `${hours} hours`
  return rest === 0 ? hourPart : `${hourPart} ${rest} min`
}

/**
 * The line shown above the empty editor: what you just sat, for how long, when.
 *
 * Not written into the note body. It is context for the person writing, and a body that starts
 * with an auto-generated paragraph is a body someone has to delete before they can start.
 */
export const draftSubtitle = (draft: SessionNoteDraft, now: Date = new Date()): string => {
  const started = new Date(draft.startedAt)
  if (Number.isNaN(started.getTime())) return spokenLength(draft.durationActual)

  const sameDay =
    started.getFullYear() === now.getFullYear() &&
    started.getMonth() === now.getMonth() &&
    started.getDate() === now.getDate()

  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(started)
  const when = sameDay
    ? time
    : `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(started)}, ${time}`

  return `${spokenLength(draft.durationActual)} · ${when}`
}

/**
 * Whether what is in the editor counts as writing.
 *
 * Stricter than a length check because an empty Tiptap document is not an empty string — it
 * serializes to markdown that may carry stray whitespace or a lone newline. Anything that is only
 * whitespace is still nothing.
 */
export const draftHasContent = (markdown: string | null | undefined): boolean =>
  typeof markdown === "string" && markdown.replace(/\s/g, "").length > 0
