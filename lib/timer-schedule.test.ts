import { describe, expect, it } from "vitest"

import {
  OPEN_ENDED_HORIZON_SECONDS,
  bellsAfter,
  buildTimerSchedule,
  formatTimerClock,
  remainingSeconds,
} from "./timer-schedule"

describe("buildTimerSchedule", () => {
  it("rings at the start and the end of a plain sit", () => {
    const schedule = buildTimerSchedule({ durationSeconds: 1200 })

    expect(schedule.bells).toEqual([
      { at: 0, kind: "opening" },
      { at: 1200, kind: "closing" },
    ])
    expect(schedule.totalSeconds).toBe(1200)
    expect(schedule.sitStartsAt).toBe(0)
  })

  it("puts the warm-up before the opening bell, not before the sit", () => {
    const schedule = buildTimerSchedule({ durationSeconds: 1200, warmupSeconds: 30 })

    expect(schedule.bells).toEqual([
      { at: 30, kind: "opening" },
      { at: 1230, kind: "closing" },
    ])
    expect(schedule.totalSeconds).toBe(1230)
    expect(schedule.sitStartsAt).toBe(30)
  })

  it("spaces interval bells through the sit", () => {
    const schedule = buildTimerSchedule({ durationSeconds: 2400, intervalSeconds: 600 })

    expect(schedule.bells).toEqual([
      { at: 0, kind: "opening" },
      { at: 600, kind: "interval" },
      { at: 1200, kind: "interval" },
      { at: 1800, kind: "interval" },
      { at: 2400, kind: "closing" },
    ])
  })

  it("measures intervals from the sit, not from the warm-up", () => {
    const schedule = buildTimerSchedule({ durationSeconds: 1200, warmupSeconds: 60, intervalSeconds: 600 })

    expect(schedule.bells.map((bell) => bell.at)).toEqual([60, 660, 1260])
  })

  it("does not ring an interval on top of the closing bell", () => {
    const schedule = buildTimerSchedule({ durationSeconds: 1800, intervalSeconds: 600 })

    expect(schedule.bells).toEqual([
      { at: 0, kind: "opening" },
      { at: 600, kind: "interval" },
      { at: 1200, kind: "interval" },
      { at: 1800, kind: "closing" },
    ])
  })

  it("does not ring an interval on top of the opening bell", () => {
    const schedule = buildTimerSchedule({ durationSeconds: 1800, intervalMarks: [0, 900] })

    expect(schedule.bells).toEqual([
      { at: 0, kind: "opening" },
      { at: 900, kind: "interval" },
      { at: 1800, kind: "closing" },
    ])
  })

  it("skips intervals longer than the sit", () => {
    const schedule = buildTimerSchedule({ durationSeconds: 600, intervalSeconds: 900 })

    expect(schedule.bells).toEqual([
      { at: 0, kind: "opening" },
      { at: 600, kind: "closing" },
    ])
  })

  it("honours explicit marks over a regular interval", () => {
    const schedule = buildTimerSchedule({
      durationSeconds: 2400,
      intervalSeconds: 300,
      intervalMarks: [600, 1200, 1800],
    })

    expect(schedule.bells.map((bell) => bell.at)).toEqual([0, 600, 1200, 1800, 2400])
  })

  it("drops marks that fall outside the sit", () => {
    const schedule = buildTimerSchedule({ durationSeconds: 1200, intervalMarks: [600, 1200, 5000] })

    expect(schedule.bells.map((bell) => bell.at)).toEqual([0, 600, 1200])
  })

  it("can be asked for silence at either end", () => {
    const schedule = buildTimerSchedule({
      durationSeconds: 1200,
      openingBell: false,
      closingBell: false,
      intervalSeconds: 600,
    })

    expect(schedule.bells).toEqual([{ at: 600, kind: "interval" }])
  })

  it("gives an open-ended sit no closing bell and no total", () => {
    const schedule = buildTimerSchedule({ durationSeconds: null, intervalSeconds: 600 })

    expect(schedule.totalSeconds).toBeNull()
    expect(schedule.bells[0]).toEqual({ at: 0, kind: "opening" })
    expect(schedule.bells.every((bell) => bell.kind !== "closing")).toBe(true)
    expect(schedule.bells[schedule.bells.length - 1].at).toBeLessThan(OPEN_ENDED_HORIZON_SECONDS)
  })

  it("precomputes an open-ended sit only as far as the horizon", () => {
    const schedule = buildTimerSchedule({ durationSeconds: null, intervalSeconds: 600 }, { horizonSeconds: 1800 })

    expect(schedule.bells.map((bell) => bell.at)).toEqual([0, 600, 1200])
  })

  it("refuses to build an unbounded number of bells for a tiny interval", () => {
    const schedule = buildTimerSchedule({ durationSeconds: null, intervalSeconds: 0.001 })

    expect(schedule.bells.length).toBeLessThanOrEqual(1001)
  })

  it("treats non-finite and negative values as absent", () => {
    const schedule = buildTimerSchedule({
      durationSeconds: 1200,
      warmupSeconds: Number.NaN,
      intervalSeconds: -600,
    })

    expect(schedule.bells).toEqual([
      { at: 0, kind: "opening" },
      { at: 1200, kind: "closing" },
    ])
  })

  it("treats a zero duration as open-ended rather than as an instant sit", () => {
    const schedule = buildTimerSchedule({ durationSeconds: 0 })
    expect(schedule.totalSeconds).toBeNull()
  })
})

describe("bellsAfter", () => {
  const schedule = buildTimerSchedule({ durationSeconds: 1800, intervalSeconds: 600 })

  it("returns only what is still ahead", () => {
    expect(bellsAfter(schedule, 700).map((bell) => bell.at)).toEqual([1200, 1800])
  })

  it("excludes a bell at the current moment, which has already rung", () => {
    expect(bellsAfter(schedule, 600).map((bell) => bell.at)).toEqual([1200, 1800])
  })

  it("returns everything at the start", () => {
    expect(bellsAfter(schedule, 0)).toHaveLength(schedule.bells.length - 1)
  })

  it("returns nothing past the end", () => {
    expect(bellsAfter(schedule, 9999)).toEqual([])
  })
})

describe("remainingSeconds", () => {
  it("counts down a fixed sit", () => {
    const schedule = buildTimerSchedule({ durationSeconds: 1200 })
    expect(remainingSeconds(schedule, 200)).toBe(1000)
  })

  it("never goes negative", () => {
    const schedule = buildTimerSchedule({ durationSeconds: 1200 })
    expect(remainingSeconds(schedule, 5000)).toBe(0)
  })

  it("has nothing to count toward in an open-ended sit", () => {
    const schedule = buildTimerSchedule({ durationSeconds: null })
    expect(remainingSeconds(schedule, 200)).toBeNull()
  })
})

describe("formatTimerClock", () => {
  it("formats under an hour", () => {
    expect(formatTimerClock(0)).toBe("0:00")
    expect(formatTimerClock(9)).toBe("0:09")
    expect(formatTimerClock(600)).toBe("10:00")
    expect(formatTimerClock(3599)).toBe("59:59")
  })

  it("formats past an hour", () => {
    expect(formatTimerClock(3600)).toBe("1:00:00")
    expect(formatTimerClock(3661)).toBe("1:01:01")
  })

  it("clamps nonsense to zero", () => {
    expect(formatTimerClock(-30)).toBe("0:00")
    expect(formatTimerClock(Number.NaN)).toBe("0:00")
  })
})
