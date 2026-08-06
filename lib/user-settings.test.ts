import { describe, expect, it } from "vitest"

import {
  DEFAULT_USER_SETTINGS,
  formatDayBoundary,
  mergeSettings,
  normalizeSettings,
} from "./user-settings"

describe("normalizeSettings", () => {
  it("returns the defaults for a fresh account", () => {
    expect(normalizeSettings({})).toEqual(DEFAULT_USER_SETTINGS)
  })

  it("returns the defaults for anything that is not an object", () => {
    for (const value of [null, undefined, 0, "settings", [], true]) {
      expect(normalizeSettings(value)).toEqual(DEFAULT_USER_SETTINGS)
    }
  })

  it("keeps values it recognises", () => {
    const settings = normalizeSettings({
      dayBoundaryHour: 6,
      timer: { defaultDurationSeconds: 2700, warmupSeconds: 60, bellId: "chime", openingBell: false },
    })

    expect(settings.dayBoundaryHour).toBe(6)
    expect(settings.timer.defaultDurationSeconds).toBe(2700)
    expect(settings.timer.warmupSeconds).toBe(60)
    expect(settings.timer.bellId).toBe("chime")
    expect(settings.timer.openingBell).toBe(false)
  })

  it("fills in a partially written timer block", () => {
    const settings = normalizeSettings({ timer: { bellId: "bell" } })

    expect(settings.timer.bellId).toBe("bell")
    expect(settings.timer.warmupSeconds).toBe(DEFAULT_USER_SETTINGS.timer.warmupSeconds)
    expect(settings.timer.closingBell).toBe(DEFAULT_USER_SETTINGS.timer.closingBell)
  })

  it("clamps the day boundary into a real hour", () => {
    expect(normalizeSettings({ dayBoundaryHour: -3 }).dayBoundaryHour).toBe(0)
    expect(normalizeSettings({ dayBoundaryHour: 47 }).dayBoundaryHour).toBe(23)
    expect(normalizeSettings({ dayBoundaryHour: 4.7 }).dayBoundaryHour).toBe(4)
  })

  it("rejects non-finite numbers rather than storing them", () => {
    const settings = normalizeSettings({
      dayBoundaryHour: Number.NaN,
      timer: { defaultDurationSeconds: Number.POSITIVE_INFINITY, bellVolume: Number.NaN },
    })

    expect(settings.dayBoundaryHour).toBe(DEFAULT_USER_SETTINGS.dayBoundaryHour)
    expect(settings.timer.defaultDurationSeconds).toBe(DEFAULT_USER_SETTINGS.timer.defaultDurationSeconds)
    expect(settings.timer.bellVolume).toBe(DEFAULT_USER_SETTINGS.timer.bellVolume)
  })

  it("clamps volume to 0..1", () => {
    expect(normalizeSettings({ timer: { bellVolume: 4 } }).timer.bellVolume).toBe(1)
    expect(normalizeSettings({ timer: { bellVolume: -1 } }).timer.bellVolume).toBe(0)
    expect(normalizeSettings({ timer: { bellVolume: 0.35 } }).timer.bellVolume).toBe(0.35)
  })

  it("refuses a zero or absurd timer duration", () => {
    expect(normalizeSettings({ timer: { defaultDurationSeconds: 0 } }).timer.defaultDurationSeconds).toBe(1)
    expect(normalizeSettings({ timer: { defaultDurationSeconds: 10 ** 9 } }).timer.defaultDurationSeconds).toBe(
      24 * 60 * 60,
    )
  })

  it("ignores values of the wrong type", () => {
    const settings = normalizeSettings({
      dayBoundaryHour: "4",
      timer: { openingBell: "yes", bellId: 12, warmupSeconds: null },
    })

    expect(settings).toEqual(DEFAULT_USER_SETTINGS)
  })

  it("ignores a blank bell id rather than storing an unusable one", () => {
    expect(normalizeSettings({ timer: { bellId: "   " } }).timer.bellId).toBe(DEFAULT_USER_SETTINGS.timer.bellId)
  })

  it("drops keys it does not know about", () => {
    const settings = normalizeSettings({ dayBoundaryHour: 5, somethingElse: { nested: true } })
    expect(settings).toEqual({ ...DEFAULT_USER_SETTINGS, dayBoundaryHour: 5 })
    expect("somethingElse" in settings).toBe(false)
  })

  it("ignores a timer block that is not an object", () => {
    expect(normalizeSettings({ timer: "loud" })).toEqual(DEFAULT_USER_SETTINGS)
    expect(normalizeSettings({ timer: [1, 2] })).toEqual(DEFAULT_USER_SETTINGS)
  })
})

describe("mergeSettings", () => {
  it("applies a top-level change without disturbing the rest", () => {
    const merged = mergeSettings(DEFAULT_USER_SETTINGS, { dayBoundaryHour: 2 })

    expect(merged.dayBoundaryHour).toBe(2)
    expect(merged.timer).toEqual(DEFAULT_USER_SETTINGS.timer)
  })

  it("applies a partial timer change without dropping its siblings", () => {
    const merged = mergeSettings(DEFAULT_USER_SETTINGS, { timer: { bellId: "chime" } })

    expect(merged.timer.bellId).toBe("chime")
    expect(merged.timer.warmupSeconds).toBe(DEFAULT_USER_SETTINGS.timer.warmupSeconds)
    expect(merged.dayBoundaryHour).toBe(DEFAULT_USER_SETTINGS.dayBoundaryHour)
  })

  it("normalizes what it is given, so a bad patch cannot poison settings", () => {
    const merged = mergeSettings(DEFAULT_USER_SETTINGS, { dayBoundaryHour: 99 })
    expect(merged.dayBoundaryHour).toBe(23)
  })

  it("is a no-op for an empty patch", () => {
    expect(mergeSettings(DEFAULT_USER_SETTINGS, {})).toEqual(DEFAULT_USER_SETTINGS)
  })
})

describe("formatDayBoundary", () => {
  it("names the edges rather than printing 0 or 12", () => {
    expect(formatDayBoundary(0)).toBe("Midnight")
    expect(formatDayBoundary(12)).toBe("Noon")
  })

  it("formats morning and evening hours", () => {
    expect(formatDayBoundary(4)).toBe("4am")
    expect(formatDayBoundary(11)).toBe("11am")
    expect(formatDayBoundary(13)).toBe("1pm")
    expect(formatDayBoundary(23)).toBe("11pm")
  })

  it("falls back for nonsense", () => {
    expect(formatDayBoundary(Number.NaN)).toBe("4am")
  })
})
