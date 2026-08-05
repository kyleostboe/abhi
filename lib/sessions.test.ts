import { describe, expect, it } from "vitest"

import {
  ABANDONED_AFTER_SECONDS,
  COMPLETION_RATIO,
  MIN_COUNTED_SECONDS,
  type PracticeSession,
  completionRatio,
  computeStreak,
  computeTotals,
  countsAsPractice,
  isEffectivelyComplete,
  practiceDayKey,
  previousDayKey,
  reconcileAbandonedSession,
  resumePosition,
  summarizeByDay,
} from "./sessions"

/** Local time, so the day-boundary maths is exercised the way the app experiences it. */
const at = (year: number, month: number, day: number, hour = 12, minute = 0) =>
  new Date(year, month - 1, day, hour, minute, 0, 0).toISOString()

const session = (overrides: Partial<PracticeSession> = {}): PracticeSession => ({
  id: "s1",
  meditationId: "m1",
  meditationTitle: "Body scan",
  source: "guided",
  startedAt: at(2026, 3, 10),
  endedAt: at(2026, 3, 10, 12, 30),
  durationPlanned: 1800,
  durationActual: 1800,
  lastPosition: 1800,
  completed: true,
  ...overrides,
})

describe("practiceDayKey", () => {
  it("buckets a midday sit into that calendar day", () => {
    expect(practiceDayKey(at(2026, 3, 10, 12))).toBe("2026-03-10")
  })

  it("counts an after-midnight sit toward the day that is ending", () => {
    expect(practiceDayKey(at(2026, 3, 11, 1))).toBe("2026-03-10")
  })

  it("starts the new day once the boundary hour has passed", () => {
    expect(practiceDayKey(at(2026, 3, 11, 4))).toBe("2026-03-11")
  })

  it("honours a custom boundary, including midnight", () => {
    expect(practiceDayKey(at(2026, 3, 11, 1), 0)).toBe("2026-03-11")
    expect(practiceDayKey(at(2026, 3, 11, 5), 6)).toBe("2026-03-10")
  })

  it("clamps a nonsensical boundary rather than producing a nonsensical day", () => {
    expect(practiceDayKey(at(2026, 3, 11, 1), -5)).toBe("2026-03-11")
    expect(practiceDayKey(at(2026, 3, 11, 1), 99)).toBe(practiceDayKey(at(2026, 3, 11, 1), 23))
    expect(practiceDayKey(at(2026, 3, 11, 1), Number.NaN)).toBe("2026-03-10")
  })

  it("returns null for an unparseable timestamp", () => {
    expect(practiceDayKey("not a date")).toBeNull()
    expect(practiceDayKey("")).toBeNull()
  })
})

describe("previousDayKey", () => {
  it("steps back one day", () => {
    expect(previousDayKey("2026-03-10")).toBe("2026-03-09")
  })

  it("steps across a month boundary", () => {
    expect(previousDayKey("2026-03-01")).toBe("2026-02-28")
  })

  it("steps across a leap day", () => {
    expect(previousDayKey("2024-03-01")).toBe("2024-02-29")
  })

  it("rejects a malformed key", () => {
    expect(previousDayKey("2026-3-1")).toBeNull()
    expect(previousDayKey("")).toBeNull()
  })
})

describe("countsAsPractice", () => {
  it("rejects a sit below the floor", () => {
    expect(countsAsPractice({ durationActual: MIN_COUNTED_SECONDS - 1 })).toBe(false)
    expect(countsAsPractice({ durationActual: 0 })).toBe(false)
  })

  it("accepts a sit at the floor", () => {
    expect(countsAsPractice({ durationActual: MIN_COUNTED_SECONDS })).toBe(true)
  })

  it("treats non-finite and negative durations as no practice", () => {
    expect(countsAsPractice({ durationActual: Number.NaN })).toBe(false)
    expect(countsAsPractice({ durationActual: Number.POSITIVE_INFINITY })).toBe(false)
    expect(countsAsPractice({ durationActual: -600 })).toBe(false)
  })
})

describe("isEffectivelyComplete", () => {
  it("accepts stopping inside the closing silence", () => {
    expect(isEffectivelyComplete({ durationPlanned: 1800, durationActual: 1800 * COMPLETION_RATIO })).toBe(true)
  })

  it("rejects stopping short of the threshold", () => {
    expect(isEffectivelyComplete({ durationPlanned: 1800, durationActual: 1500 })).toBe(false)
  })

  it("treats an open-ended sit as complete once it counts as practice", () => {
    expect(isEffectivelyComplete({ durationPlanned: null, durationActual: MIN_COUNTED_SECONDS })).toBe(true)
    expect(isEffectivelyComplete({ durationPlanned: null, durationActual: 10 })).toBe(false)
    expect(isEffectivelyComplete({ durationPlanned: 0, durationActual: 900 })).toBe(true)
  })
})

describe("completionRatio", () => {
  it("reports the fraction sat", () => {
    expect(completionRatio({ durationPlanned: 1800, durationActual: 900 })).toBe(0.5)
  })

  it("clamps overrun to 1", () => {
    expect(completionRatio({ durationPlanned: 1800, durationActual: 3600 })).toBe(1)
  })

  it("has no ratio without a planned length", () => {
    expect(completionRatio({ durationPlanned: null, durationActual: 900 })).toBeNull()
    expect(completionRatio({ durationPlanned: 0, durationActual: 900 })).toBeNull()
  })
})

describe("computeStreak", () => {
  const sat = (day: number, hour = 9, durationActual = 1200) =>
    session({ startedAt: at(2026, 3, day, hour), durationActual })

  it("counts consecutive days up to today", () => {
    const result = computeStreak([sat(8), sat(9), sat(10)], { now: at(2026, 3, 10, 20) })
    expect(result.current).toBe(3)
    expect(result.longest).toBe(3)
    expect(result.lastPracticeDay).toBe("2026-03-10")
  })

  it("survives a today with no sit yet", () => {
    const result = computeStreak([sat(8), sat(9)], { now: at(2026, 3, 10, 9) })
    expect(result.current).toBe(2)
  })

  it("breaks once a whole day has been missed", () => {
    const result = computeStreak([sat(8), sat(9)], { now: at(2026, 3, 11, 9) })
    expect(result.current).toBe(0)
    expect(result.longest).toBe(2)
  })

  it("does not double-count two sits on one day", () => {
    const result = computeStreak([sat(10, 7), sat(10, 19)], { now: at(2026, 3, 10, 21) })
    expect(result.current).toBe(1)
  })

  it("ignores sits below the practice floor", () => {
    // The 5-second sit on the 10th does not extend the streak, but the streak is not broken
    // either: today is still in progress, so it rests on the 9th.
    const result = computeStreak([sat(9), sat(10, 9, 5)], { now: at(2026, 3, 10, 20) })
    expect(result.current).toBe(1)
    expect(result.lastPracticeDay).toBe("2026-03-09")
  })

  it("breaks the day after a below-floor sit failed to extend it", () => {
    const result = computeStreak([sat(9), sat(10, 9, 5)], { now: at(2026, 3, 11, 20) })
    expect(result.current).toBe(0)
  })

  it("keeps a late-night sit on the previous day's streak", () => {
    const result = computeStreak([sat(9), session({ startedAt: at(2026, 3, 11, 1), durationActual: 1200 })], {
      now: at(2026, 3, 11, 2),
    })
    expect(result.current).toBe(2)
  })

  it("reports the longest run even when the current one is shorter", () => {
    const result = computeStreak([sat(1), sat(2), sat(3), sat(4), sat(9), sat(10)], { now: at(2026, 3, 10, 20) })
    expect(result.current).toBe(2)
    expect(result.longest).toBe(4)
  })

  it("has no streak without sessions", () => {
    expect(computeStreak([], { now: at(2026, 3, 10) })).toEqual({
      current: 0,
      longest: 0,
      lastPracticeDay: null,
    })
  })

  it("skips sessions whose timestamps cannot be parsed", () => {
    const result = computeStreak([session({ startedAt: "nonsense", durationActual: 1200 }), sat(10)], {
      now: at(2026, 3, 10, 20),
    })
    expect(result.current).toBe(1)
  })
})

describe("summarizeByDay", () => {
  it("groups and totals per day, oldest first", () => {
    const days = summarizeByDay([
      session({ startedAt: at(2026, 3, 10, 7), durationActual: 600 }),
      session({ startedAt: at(2026, 3, 10, 19), durationActual: 900 }),
      session({ startedAt: at(2026, 3, 9, 8), durationActual: 300 }),
    ])

    expect(days).toEqual([
      { dayKey: "2026-03-09", sits: 1, totalSeconds: 300 },
      { dayKey: "2026-03-10", sits: 2, totalSeconds: 1500 },
    ])
  })

  it("includes short sits, which still happened", () => {
    const days = summarizeByDay([session({ startedAt: at(2026, 3, 10), durationActual: 5 })])
    expect(days).toEqual([{ dayKey: "2026-03-10", sits: 1, totalSeconds: 5 }])
  })

  it("returns nothing for no sessions", () => {
    expect(summarizeByDay([])).toEqual([])
  })
})

describe("computeTotals", () => {
  it("counts only sessions past the practice floor", () => {
    const totals = computeTotals([
      session({ startedAt: at(2026, 3, 10, 7), durationActual: 600 }),
      session({ startedAt: at(2026, 3, 10, 19), durationActual: 10 }),
      session({ startedAt: at(2026, 3, 9), durationActual: 1800 }),
    ])

    expect(totals).toEqual({ sits: 2, totalSeconds: 2400, daysPracticed: 2 })
  })

  it("is empty for no sessions", () => {
    expect(computeTotals([])).toEqual({ sits: 0, totalSeconds: 0, daysPracticed: 0 })
  })
})

describe("resumePosition", () => {
  it("offers a position mid-sit", () => {
    expect(resumePosition({ lastPosition: 840, durationPlanned: 2700, completed: false })).toBe(840)
  })

  it("declines near the start, where restarting is free", () => {
    expect(resumePosition({ lastPosition: 12, durationPlanned: 2700, completed: false })).toBeNull()
  })

  it("declines near the end, which would drop you into the closing silence", () => {
    expect(resumePosition({ lastPosition: 2690, durationPlanned: 2700, completed: false })).toBeNull()
  })

  it("declines for a session already finished", () => {
    expect(resumePosition({ lastPosition: 840, durationPlanned: 2700, completed: true })).toBeNull()
  })

  it("offers a position for an open-ended sit, which has no end to be near", () => {
    expect(resumePosition({ lastPosition: 840, durationPlanned: null, completed: false })).toBe(840)
  })

  it("treats a non-finite position as nothing to resume", () => {
    expect(resumePosition({ lastPosition: Number.NaN, durationPlanned: 2700, completed: false })).toBeNull()
  })
})

describe("reconcileAbandonedSession", () => {
  const open = (overrides: Partial<PracticeSession> = {}) =>
    session({ endedAt: null, completed: false, startedAt: at(2026, 3, 10, 9), ...overrides })

  it("leaves a closed session alone", () => {
    const closed = session()
    expect(reconcileAbandonedSession(closed, { now: at(2026, 3, 11) })).toBe(closed)
  })

  it("leaves a session that might still be running", () => {
    const running = open({ durationActual: 300, lastPosition: 300 })
    expect(reconcileAbandonedSession(running, { now: at(2026, 3, 10, 9, 30) })).toBe(running)
  })

  it("closes an abandoned session at its last known position", () => {
    const abandoned = open({ durationPlanned: 2700, durationActual: 400, lastPosition: 1500 })
    const result = reconcileAbandonedSession(abandoned, { now: at(2026, 3, 11, 9) })

    expect(result.endedAt).toBe(at(2026, 3, 10, 9, 25))
    expect(result.durationActual).toBe(1500)
    expect(result.completed).toBe(false)
  })

  it("marks an abandoned session complete when it had effectively finished", () => {
    const abandoned = open({ durationPlanned: 1800, durationActual: 1700, lastPosition: 1750 })
    const result = reconcileAbandonedSession(abandoned, { now: at(2026, 3, 11, 9) })

    expect(result.durationActual).toBe(1750)
    expect(result.completed).toBe(true)
  })

  it("does not credit wall-clock time to a session that sat paused", () => {
    const abandoned = open({ durationPlanned: 2700, durationActual: 120, lastPosition: 120 })
    const result = reconcileAbandonedSession(abandoned, { now: at(2026, 3, 12, 9) })

    expect(result.durationActual).toBe(120)
  })

  it("uses the configured threshold", () => {
    const abandoned = open({ durationActual: 100, lastPosition: 100 })
    const stillRunning = reconcileAbandonedSession(abandoned, {
      now: at(2026, 3, 10, 10),
      abandonedAfterSeconds: ABANDONED_AFTER_SECONDS,
    })
    expect(stillRunning.endedAt).toBeNull()

    const closed = reconcileAbandonedSession(abandoned, {
      now: at(2026, 3, 10, 10),
      abandonedAfterSeconds: 60,
    })
    expect(closed.endedAt).not.toBeNull()
  })

  it("leaves a session with an unparseable start alone rather than inventing an end", () => {
    const broken = open({ startedAt: "nonsense" })
    expect(reconcileAbandonedSession(broken, { now: at(2026, 3, 11) })).toBe(broken)
  })
})
