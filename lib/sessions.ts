/**
 * The practice log: what was actually sat, as opposed to what was written about.
 *
 * Until now a "session" was inferred from the journal — a note carrying a meditation_id — which
 * meant a sit only existed if you wrote about it, a three-second mis-tap counted the same as a
 * forty-minute sit, and a silent timer could not be recorded at all. This module owns the model
 * that replaces that inference, and it is deliberately free of React, the DOM and the network so
 * the parts that are easy to get subtly wrong — day boundaries, streaks, what counts as finished
 * — can be tested directly.
 *
 * Everything here takes `now` as an argument rather than reading the clock, for the same reason.
 */

export type PracticeSessionSource = "guided" | "timer"

/**
 * One sit.
 *
 * `durationPlanned` is what the user asked for (the meditation's length, or the timer's) and is
 * null for an open-ended sit, where there is nothing to be a fraction of. `durationActual` is
 * time actually spent listening or sitting, which is not the same as wall-clock elapsed: pausing
 * for five minutes should not earn five minutes of practice.
 */
export type PracticeSession = {
  id: string
  meditationId: string | null
  meditationTitle: string | null
  source: PracticeSessionSource
  startedAt: string
  endedAt: string | null
  durationPlanned: number | null
  durationActual: number
  lastPosition: number
  completed: boolean
}

/**
 * Sits shorter than this do not count as practice — they are the mis-taps, the "what does this
 * one sound like", the accidental resumes. Without a floor, opening the player would build a
 * streak, which would make the streak mean nothing.
 */
export const MIN_COUNTED_SECONDS = 60

/**
 * How much of a planned length has to be reached before a sit counts as completed. Guided
 * recordings routinely end with several seconds of silence or a fade, and stopping during that
 * is finishing, not quitting.
 */
export const COMPLETION_RATIO = 0.9

/**
 * The hour that divides one practice day from the next. A sit at 1am belongs to the day that is
 * ending, not the one that just started — anyone who sits late knows this, and a midnight
 * boundary makes them lose a streak for it. Configurable per user; this is the default.
 */
export const DEFAULT_DAY_BOUNDARY_HOUR = 4

/**
 * A session with no end and no recent activity: the tab was closed, the browser crashed, or the
 * phone went to sleep and never came back. Past this age an open session is reconciled from its
 * last known position rather than left open forever.
 */
export const ABANDONED_AFTER_SECONDS = 6 * 60 * 60

const pad = (value: number) => String(value).padStart(2, "0")

const toDate = (value: string | Date): Date | null => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const normalizeBoundaryHour = (hour: number | undefined): number => {
  if (typeof hour !== "number" || !Number.isFinite(hour)) return DEFAULT_DAY_BOUNDARY_HOUR
  const rounded = Math.trunc(hour)
  if (rounded < 0) return 0
  if (rounded > 23) return 23
  return rounded
}

const nonNegative = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0

/**
 * The local calendar day a timestamp belongs to, shifted by the day boundary.
 *
 * Local rather than UTC because a practice day is the user's day. Returns null for an
 * unparseable timestamp so callers can drop it rather than silently bucketing it under 1970.
 */
export const practiceDayKey = (
  value: string | Date,
  dayBoundaryHour: number = DEFAULT_DAY_BOUNDARY_HOUR,
): string | null => {
  const date = toDate(value)
  if (!date) return null

  const shifted = new Date(date.getTime())
  shifted.setHours(shifted.getHours() - normalizeBoundaryHour(dayBoundaryHour))
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`
}

/**
 * Midday on the given practice day. Noon rather than midnight so that adding or subtracting
 * whole days cannot land on a DST transition and shift the date underneath us.
 */
const dayKeyToNoon = (dayKey: string): Date | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKey)
  if (!match) return null
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0)
}

/** The practice day before the given one, as a key. */
export const previousDayKey = (dayKey: string): string | null => {
  const noon = dayKeyToNoon(dayKey)
  if (!noon) return null
  noon.setDate(noon.getDate() - 1)
  return `${noon.getFullYear()}-${pad(noon.getMonth() + 1)}-${pad(noon.getDate())}`
}

/**
 * Whether a session is real practice rather than a glance at the player. Used for streaks and
 * totals; the session itself is still stored either way, because "I opened this and stopped"
 * is true and deleting it would be a lie.
 */
export const countsAsPractice = (session: Pick<PracticeSession, "durationActual">): boolean =>
  nonNegative(session.durationActual) >= MIN_COUNTED_SECONDS

/**
 * Whether a sit reached the end of what it set out to do. An open-ended sit (no planned length)
 * is complete as soon as it counts as practice at all — there was no target to fall short of.
 */
export const isEffectivelyComplete = (
  session: Pick<PracticeSession, "durationPlanned" | "durationActual">,
): boolean => {
  const actual = nonNegative(session.durationActual)
  const planned = nonNegative(session.durationPlanned)
  if (planned <= 0) return actual >= MIN_COUNTED_SECONDS
  return actual >= planned * COMPLETION_RATIO
}

/** How much of the planned length was sat, clamped to 0..1. Null when nothing was planned. */
export const completionRatio = (
  session: Pick<PracticeSession, "durationPlanned" | "durationActual">,
): number | null => {
  const planned = nonNegative(session.durationPlanned)
  if (planned <= 0) return null
  return Math.max(0, Math.min(1, nonNegative(session.durationActual) / planned))
}

export type StreakSummary = {
  current: number
  longest: number
  lastPracticeDay: string | null
}

/**
 * Current and longest run of consecutive practice days.
 *
 * A streak survives today being empty — it is only broken once a whole day has passed without a
 * sit. Otherwise the streak would appear to reset every morning and only come back in the
 * evening, which reads as a bug and pressures people to sit before they are ready.
 */
export const computeStreak = (
  sessions: readonly Pick<PracticeSession, "startedAt" | "durationActual">[],
  options: { now?: Date | string; dayBoundaryHour?: number } = {},
): StreakSummary => {
  const boundary = normalizeBoundaryHour(options.dayBoundaryHour)
  const days = new Set<string>()

  for (const session of sessions) {
    if (!countsAsPractice(session)) continue
    const key = practiceDayKey(session.startedAt, boundary)
    if (key) days.add(key)
  }

  if (days.size === 0) {
    return { current: 0, longest: 0, lastPracticeDay: null }
  }

  const sorted = Array.from(days).sort()
  const lastPracticeDay = sorted[sorted.length - 1]

  let longest = 1
  let run = 1
  for (let index = 1; index < sorted.length; index += 1) {
    run = previousDayKey(sorted[index]) === sorted[index - 1] ? run + 1 : 1
    if (run > longest) longest = run
  }

  const today = practiceDayKey(toDate(options.now ?? new Date()) ?? new Date(), boundary)
  let current = 0
  if (today) {
    const yesterday = previousDayKey(today)
    let cursor = days.has(today) ? today : yesterday && days.has(yesterday) ? yesterday : null
    while (cursor && days.has(cursor)) {
      current += 1
      cursor = previousDayKey(cursor)
    }
  }

  return { current, longest, lastPracticeDay }
}

export type PracticeDay = {
  dayKey: string
  sits: number
  totalSeconds: number
}

/**
 * Per-day totals, oldest first — the shape a calendar or heatmap wants. Every session with a
 * usable timestamp is included, not only the ones long enough to count for a streak, because a
 * short sit should still show up on the day you did it.
 */
export const summarizeByDay = (
  sessions: readonly Pick<PracticeSession, "startedAt" | "durationActual">[],
  options: { dayBoundaryHour?: number } = {},
): PracticeDay[] => {
  const boundary = normalizeBoundaryHour(options.dayBoundaryHour)
  const byDay = new Map<string, PracticeDay>()

  for (const session of sessions) {
    const dayKey = practiceDayKey(session.startedAt, boundary)
    if (!dayKey) continue

    const existing = byDay.get(dayKey)
    if (existing) {
      existing.sits += 1
      existing.totalSeconds += nonNegative(session.durationActual)
    } else {
      byDay.set(dayKey, { dayKey, sits: 1, totalSeconds: nonNegative(session.durationActual) })
    }
  }

  return Array.from(byDay.values()).sort((a, b) => a.dayKey.localeCompare(b.dayKey))
}

export type PracticeTotals = {
  sits: number
  totalSeconds: number
  daysPracticed: number
}

/** Headline totals, counting only sessions that pass the practice floor. */
export const computeTotals = (
  sessions: readonly Pick<PracticeSession, "startedAt" | "durationActual">[],
  options: { dayBoundaryHour?: number } = {},
): PracticeTotals => {
  const boundary = normalizeBoundaryHour(options.dayBoundaryHour)
  const days = new Set<string>()
  let sits = 0
  let totalSeconds = 0

  for (const session of sessions) {
    if (!countsAsPractice(session)) continue
    sits += 1
    totalSeconds += nonNegative(session.durationActual)
    const key = practiceDayKey(session.startedAt, boundary)
    if (key) days.add(key)
  }

  return { sits, totalSeconds, daysPracticed: days.size }
}

/**
 * Where to offer to resume a meditation, or null if resuming would be pointless.
 *
 * Two ways it is pointless: the position is within the opening moments, where restarting costs
 * nothing, or it is close enough to the end that the sit is effectively over and offering to
 * resume would drop the user into the closing silence.
 */
export const resumePosition = (
  session: Pick<PracticeSession, "lastPosition" | "durationPlanned" | "completed">,
  options: { minSeconds?: number; endThresholdSeconds?: number } = {},
): number | null => {
  if (session.completed) return null

  const minSeconds = options.minSeconds ?? 30
  const endThreshold = options.endThresholdSeconds ?? 30
  const position = nonNegative(session.lastPosition)
  if (position < minSeconds) return null

  const planned = nonNegative(session.durationPlanned)
  if (planned > 0 && position >= planned - endThreshold) return null

  return position
}

/**
 * Close out a session that was never ended, using its last known position as the truth.
 *
 * This is what makes a crash or a closed tab survivable: the row is written when the sit starts
 * and updated as it runs, so even if nothing ever reports the end, the practice is not lost —
 * it is reconstructed from how far it had got. Returns the session unchanged if it is already
 * closed or is still plausibly running.
 */
export const reconcileAbandonedSession = (
  session: PracticeSession,
  options: { now?: Date | string; abandonedAfterSeconds?: number } = {},
): PracticeSession => {
  if (session.endedAt) return session

  const startedAt = toDate(session.startedAt)
  const now = toDate(options.now ?? new Date())
  if (!startedAt || !now) return session

  const abandonedAfter = options.abandonedAfterSeconds ?? ABANDONED_AFTER_SECONDS
  const elapsedSeconds = (now.getTime() - startedAt.getTime()) / 1000
  if (elapsedSeconds < abandonedAfter) return session

  // The last reported position is the furthest we know the sit got. Wall-clock elapsed is not a
  // substitute: an abandoned session may have sat paused for hours.
  const durationActual = Math.max(nonNegative(session.durationActual), nonNegative(session.lastPosition))
  const endedAt = new Date(startedAt.getTime() + durationActual * 1000).toISOString()

  return {
    ...session,
    endedAt,
    durationActual,
    completed: isEffectivelyComplete({ ...session, durationActual }),
  }
}
