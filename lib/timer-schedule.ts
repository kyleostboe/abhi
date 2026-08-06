/**
 * Turns a timer configuration into the exact list of bells to ring, and when.
 *
 * The schedule is computed up front rather than decided as the sit runs, because the runtime
 * schedules bells against the AudioContext clock ahead of time. That is not an optimisation: a
 * backgrounded tab has its timers clamped to roughly one tick a second and a locked phone can
 * stop firing them altogether, so anything relying on `setTimeout` to decide when the next bell
 * happens will drift or simply go silent. Handing the whole schedule to the audio clock in
 * advance is what makes a timer survive the screen going off, which is the normal case for a sit.
 *
 * Pure: no audio, no clock, no React.
 */

export type TimerBellKind = "opening" | "interval" | "closing"

export type TimerBell = {
  /** Seconds from the moment the timer starts. */
  at: number
  kind: TimerBellKind
}

export type TimerConfig = {
  /** Length of the sit itself, excluding warm-up. Null for an open-ended sit. */
  durationSeconds: number | null
  /** Silence before the opening bell, for settling. */
  warmupSeconds?: number
  openingBell?: boolean
  closingBell?: boolean
  /** Ring every N seconds during the sit. Ignored when `intervalMarks` is given. */
  intervalSeconds?: number
  /** Explicit marks, in seconds from the start of the sit. Takes precedence over the interval. */
  intervalMarks?: readonly number[]
}

export type TimerSchedule = {
  bells: TimerBell[]
  /** Total length including warm-up, or null for an open-ended sit. */
  totalSeconds: number | null
  /** When the sit proper begins — after warm-up, at the opening bell. */
  sitStartsAt: number
}

/**
 * How close two bells have to be before the later one is dropped. Without this, an interval that
 * divides the duration exactly rings simultaneously with the closing bell, which sounds like a
 * glitch rather than a marker.
 */
export const BELL_MERGE_WINDOW_SECONDS = 1

/** Default horizon for an open-ended sit, past which interval bells stop being precomputed. */
export const OPEN_ENDED_HORIZON_SECONDS = 4 * 60 * 60

const positiveOrZero = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0

const positiveOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null

/**
 * The bells for one sit, in time order.
 *
 * An open-ended sit has no closing bell and no total — it ends when the sitter ends it — so its
 * interval bells are precomputed only as far as `horizonSeconds`. The runtime extends the
 * schedule if a sit outlasts it.
 */
export const buildTimerSchedule = (
  config: TimerConfig,
  options: { horizonSeconds?: number } = {},
): TimerSchedule => {
  const warmup = positiveOrZero(config.warmupSeconds)
  const duration = positiveOrNull(config.durationSeconds)
  const horizon = positiveOrZero(options.horizonSeconds) || OPEN_ENDED_HORIZON_SECONDS

  const sitStartsAt = warmup
  const sitLength = duration ?? horizon
  const bells: TimerBell[] = []

  if (config.openingBell !== false) {
    bells.push({ at: sitStartsAt, kind: "opening" })
  }

  const marks: number[] = []
  if (config.intervalMarks && config.intervalMarks.length > 0) {
    for (const mark of config.intervalMarks) {
      const offset = positiveOrNull(mark)
      if (offset !== null && offset < sitLength) marks.push(offset)
    }
  } else {
    const interval = positiveOrNull(config.intervalSeconds)
    if (interval !== null) {
      // A guard rather than a loop bound: an interval of a fraction of a second over a four-hour
      // horizon would otherwise try to build tens of thousands of bells.
      const maxBells = 1000
      for (let index = 1; index * interval < sitLength && index <= maxBells; index += 1) {
        marks.push(index * interval)
      }
    }
  }

  for (const offset of marks.sort((a, b) => a - b)) {
    bells.push({ at: sitStartsAt + offset, kind: "interval" })
  }

  if (duration !== null && config.closingBell !== false) {
    bells.push({ at: sitStartsAt + duration, kind: "closing" })
  }

  bells.sort((a, b) => a.at - b.at)

  // Drop anything that would ring on top of the bell before it. Later kinds win, so a closing
  // bell is never displaced by an interval that happened to land on it.
  const merged: TimerBell[] = []
  for (const bell of bells) {
    const previous = merged[merged.length - 1]
    if (previous && bell.at - previous.at < BELL_MERGE_WINDOW_SECONDS) {
      if (bell.kind === "closing" || previous.kind === "interval") merged[merged.length - 1] = bell
      continue
    }
    merged.push(bell)
  }

  return {
    bells: merged,
    totalSeconds: duration === null ? null : sitStartsAt + duration,
    sitStartsAt,
  }
}

/**
 * The bells still ahead at a given moment. Used when a sit is resumed or when an open-ended
 * schedule is extended past its horizon.
 */
export const bellsAfter = (schedule: TimerSchedule, elapsedSeconds: number): TimerBell[] => {
  const elapsed = positiveOrZero(elapsedSeconds)
  return schedule.bells.filter((bell) => bell.at > elapsed)
}

/** Remaining seconds in a fixed-length sit, or null when there is no end to count toward. */
export const remainingSeconds = (schedule: TimerSchedule, elapsedSeconds: number): number | null => {
  if (schedule.totalSeconds === null) return null
  return Math.max(0, schedule.totalSeconds - positiveOrZero(elapsedSeconds))
}

/** `m:ss`, or `h:mm:ss` past an hour — the clock a sit is actually read on. */
export const formatTimerClock = (seconds: number): string => {
  const total = Math.max(0, Math.round(positiveOrZero(seconds)))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`
}
