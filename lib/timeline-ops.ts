/**
 * Structural edits to a Creator timeline: repeating a stretch of it, and stretching the whole
 * thing to a different length.
 *
 * These are the two operations that make the Creator answer the question the Adjuster answers.
 * A meditation built as "settle, three cycles of noting, close" is a shape, not a fixed length —
 * scaling lets the same shape be a twenty-minute sit or a forty-minute one, and repeating lets
 * the cycle be written once instead of six times.
 *
 * Operates on TimelineEvent (the persisted model), not TimelineItem. Pure — no React, no audio.
 */

import type { TimelineEvent } from "@/lib/types"

/** Ids have to be unique across a timeline, so repeated events get fresh ones. */
const freshId = (sourceId: string, copyIndex: number): string =>
  `${sourceId}-r${copyIndex}-${Math.random().toString(36).slice(2, 8)}`

const finiteOr = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback

/** Where an event ends, which is its own duration or nothing if it has none. */
export const eventEnd = (event: TimelineEvent): number =>
  finiteOr(event.startTime, 0) + Math.max(0, finiteOr(event.duration, 0))

/** The end of the last thing on the timeline. */
export const timelineEnd = (events: readonly TimelineEvent[]): number =>
  events.reduce((latest, event) => Math.max(latest, eventEnd(event)), 0)

export type RepeatRangeOptions = {
  /** Start of the stretch to repeat, in seconds. */
  from: number
  /** End of the stretch, in seconds. Events starting at or after this are outside it. */
  to: number
  /** How many additional copies to make. 2 turns one cycle into three. */
  times: number
}

/**
 * Repeats the events inside a time range, pushing everything after it later to make room.
 *
 * Membership is by start time: an event that begins inside the range belongs to it, even if it
 * rings on past the end. That is the useful rule for this timeline, where the things being
 * repeated are instructions and bells whose tails are allowed to overlap what follows.
 *
 * Returns the events in time order. An empty or inverted range, or a non-positive `times`,
 * returns the timeline unchanged.
 */
export const repeatTimelineRange = (
  events: readonly TimelineEvent[],
  options: RepeatRangeOptions,
): TimelineEvent[] => {
  const from = Math.max(0, finiteOr(options.from, 0))
  const to = finiteOr(options.to, 0)
  const times = Math.trunc(finiteOr(options.times, 0))

  if (!(to > from) || times < 1) {
    return events.map((event) => ({ ...event }))
  }

  const inRange = events.filter((event) => {
    const start = finiteOr(event.startTime, 0)
    return start >= from && start < to
  })

  if (inRange.length === 0) {
    return events.map((event) => ({ ...event }))
  }

  const span = to - from
  const shift = span * times

  const before = events
    .filter((event) => finiteOr(event.startTime, 0) < from)
    .map((event) => ({ ...event }))

  // Everything after the range moves later by the total added length, so the tail of the
  // meditation keeps its shape rather than being overwritten.
  const after = events
    .filter((event) => finiteOr(event.startTime, 0) >= to)
    .map((event) => ({ ...event, startTime: finiteOr(event.startTime, 0) + shift }))

  const copies: TimelineEvent[] = []
  for (let copyIndex = 1; copyIndex <= times; copyIndex += 1) {
    for (const event of inRange) {
      copies.push({
        ...event,
        id: freshId(event.id, copyIndex),
        startTime: finiteOr(event.startTime, 0) + span * copyIndex,
      })
    }
  }

  return [...before, ...inRange.map((event) => ({ ...event })), ...copies, ...after].sort(
    (a, b) => finiteOr(a.startTime, 0) - finiteOr(b.startTime, 0),
  )
}

/**
 * Stretches or compresses a whole timeline to a target length.
 *
 * Start times scale proportionally so the structure is preserved. Durations do **not**: a bell
 * is a bell at any length, and a recorded instruction played at 1.6x is not a longer version of
 * itself, it is a chipmunk. What gets longer is the silence between things, which is exactly
 * what the Adjuster does to a recording and the same reason it works.
 */
export const scaleTimelineToDuration = (
  events: readonly TimelineEvent[],
  currentDuration: number,
  targetDuration: number,
): TimelineEvent[] => {
  const current = finiteOr(currentDuration, 0)
  const target = finiteOr(targetDuration, 0)

  if (current <= 0 || target <= 0) {
    return events.map((event) => ({ ...event }))
  }

  const ratio = target / current
  return events.map((event) => ({
    ...event,
    startTime: Math.max(0, finiteOr(event.startTime, 0) * ratio),
  }))
}

/**
 * The shortest the timeline can be scaled to without events colliding with the ones after them.
 *
 * Because durations do not scale, compressing far enough eventually pushes a recorded
 * instruction into the one that follows it. This is the floor the UI should refuse to go below,
 * the same way the Adjuster computes feasibility before doing any work.
 */
export const minimumTimelineDuration = (
  events: readonly TimelineEvent[],
  currentDuration: number,
): number => {
  const current = finiteOr(currentDuration, 0)
  if (current <= 0 || events.length === 0) return 0

  const ordered = [...events].sort((a, b) => finiteOr(a.startTime, 0) - finiteOr(b.startTime, 0))

  // For each adjacent pair, the ratio that would just close the gap between them. The largest
  // such ratio across the timeline is the tightest it can be squeezed.
  let tightest = 0
  for (let index = 0; index < ordered.length - 1; index += 1) {
    const event = ordered[index]
    const next = ordered[index + 1]
    const start = finiteOr(event.startTime, 0)
    const nextStart = finiteOr(next.startTime, 0)
    const gap = nextStart - start
    if (gap <= 0) continue

    const needed = Math.max(0, finiteOr(event.duration, 0))
    if (needed <= 0) continue

    tightest = Math.max(tightest, needed / gap)
  }

  // The last event still has to fit inside the total.
  const last = ordered[ordered.length - 1]
  const lastStart = finiteOr(last.startTime, 0)
  const lastDuration = Math.max(0, finiteOr(last.duration, 0))
  if (lastStart > 0 && current > lastStart) {
    tightest = Math.max(tightest, lastDuration / (current - lastStart))
  }

  if (tightest <= 0) return 0
  return current * tightest
}
