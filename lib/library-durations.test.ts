import { describe, expect, it } from "vitest"
import {
  buildDurationModeFromStored,
  cloneTimeline,
  formatDurationLabelFromSeconds,
  normalizeDurationMode,
  parseDurationInput,
  scaleTimelineEvents,
  sortDurationModes,
  type DurationMode,
  type LibraryTimelineEntry,
  type StoredDurationMode,
} from "./library-durations"

const entry = (over: Partial<LibraryTimelineEntry> = {}): LibraryTimelineEntry =>
  ({
    id: "e1",
    text: "breathe",
    startTime: 10,
    endTime: 20,
    keepOriginal: false,
    originalVolume: 1,
    soundVolume: 1,
    ...over,
  }) as LibraryTimelineEntry

const mode = (over: Partial<DurationMode> = {}): DurationMode => ({
  id: "m1",
  label: "10m",
  seconds: 600,
  playbackRate: 1,
  timeline: [],
  source: "saved",
  persisted: false,
  audioUrl: "blob:audio",
  ...over,
})

describe("formatDurationLabelFromSeconds", () => {
  it("formats sub-minute durations in seconds", () => {
    expect(formatDurationLabelFromSeconds(45)).toBe("45s")
  })

  it("formats whole minutes without a seconds part", () => {
    expect(formatDurationLabelFromSeconds(600)).toBe("10m")
  })

  it("includes seconds alongside minutes below an hour", () => {
    expect(formatDurationLabelFromSeconds(605)).toBe("10m 5s")
  })

  it("drops the seconds part once hours are involved", () => {
    expect(formatDurationLabelFromSeconds(3725)).toBe("1h 2m")
  })

  it("renders an exact hour as just the hour", () => {
    expect(formatDurationLabelFromSeconds(3600)).toBe("1h")
  })

  it("handles zero and non-finite input without throwing", () => {
    expect(formatDurationLabelFromSeconds(0)).toBe("0s")
    expect(formatDurationLabelFromSeconds(Number.NaN)).toBe("--")
    expect(formatDurationLabelFromSeconds(Number.POSITIVE_INFINITY)).toBe("--")
  })
})

describe("parseDurationInput", () => {
  it("treats a bare number as minutes", () => {
    expect(parseDurationInput("10")).toBe(600)
  })

  it("accepts explicit minute and hour units", () => {
    expect(parseDurationInput("90m")).toBe(5400)
    expect(parseDurationInput("2h")).toBe(7200)
    expect(parseDurationInput("1.5h")).toBe(5400)
  })

  it("accepts an hours-and-minutes combination", () => {
    expect(parseDurationInput("1h30m")).toBe(5400)
    expect(parseDurationInput("1 h 30 m")).toBe(5400)
  })

  it("accepts clock notation", () => {
    expect(parseDurationInput("10:30")).toBe(630)
    expect(parseDurationInput("1:00:00")).toBe(3600)
  })

  it("is case- and whitespace-insensitive", () => {
    expect(parseDurationInput("  2H  ")).toBe(7200)
  })

  it("returns null for empty or unparseable input", () => {
    expect(parseDurationInput("")).toBeNull()
    expect(parseDurationInput("   ")).toBeNull()
    expect(parseDurationInput("soon")).toBeNull()
    expect(parseDurationInput("1:bad")).toBeNull()
  })
})

describe("scaleTimelineEvents", () => {
  it("scales start, end and duration by the target ratio", () => {
    const scaled = scaleTimelineEvents([entry({ duration: 5 })], 100, 200)
    expect(scaled[0].startTime).toBe(20)
    expect(scaled[0].endTime).toBe(40)
    expect(scaled[0].duration).toBe(10)
  })

  it("copies events unchanged when the base duration is unusable", () => {
    const events = [entry()]
    expect(scaleTimelineEvents(events, 0, 200)).toEqual(events)
    expect(scaleTimelineEvents(events, Number.NaN, 200)).toEqual(events)
  })

  it("never produces a negative time", () => {
    const scaled = scaleTimelineEvents([entry({ startTime: -5 })], 100, 50)
    expect(scaled[0].startTime).toBeGreaterThanOrEqual(0)
  })

  it("returns a new array without mutating the input", () => {
    const events = [entry()]
    const scaled = scaleTimelineEvents(events, 100, 200)
    expect(scaled[0]).not.toBe(events[0])
    expect(events[0].startTime).toBe(10)
  })

  it("tolerates a missing timeline", () => {
    expect(scaleTimelineEvents(undefined, 100, 200)).toEqual([])
  })
})

describe("cloneTimeline", () => {
  it("shallow-copies every entry", () => {
    const events = [entry()]
    const cloned = cloneTimeline(events)
    expect(cloned).toEqual(events)
    expect(cloned[0]).not.toBe(events[0])
  })

  it("returns an empty array for undefined", () => {
    expect(cloneTimeline(undefined)).toEqual([])
  })
})

describe("normalizeDurationMode", () => {
  it("repairs a non-positive or non-finite playback rate", () => {
    expect(normalizeDurationMode(mode({ playbackRate: 0 })).playbackRate).toBe(1)
    expect(normalizeDurationMode(mode({ playbackRate: Number.NaN })).playbackRate).toBe(1)
  })

  it("forces rate 1 for a persisted variant that has its own audio", () => {
    const result = normalizeDurationMode(
      mode({ id: "m2", persisted: true, audioUrl: "blob:variant", playbackRate: 1.5 }),
    )
    expect(result.playbackRate).toBe(1)
  })

  it("leaves the original mode's rate alone", () => {
    const result = normalizeDurationMode(
      mode({ id: "original", persisted: true, audioUrl: "blob:x", playbackRate: 1.5 }),
    )
    expect(result.playbackRate).toBe(1.5)
  })

  it("returns the same object when nothing needs changing", () => {
    const input = mode({ playbackRate: 1 })
    expect(normalizeDurationMode(input)).toBe(input)
  })
})

describe("buildDurationModeFromStored", () => {
  const stored: StoredDurationMode = {
    id: "s1",
    label: "20m",
    seconds: 1200,
    playbackRate: 1.25,
    timeline: [entry()],
  }

  it("falls back to the provided audio url when the stored mode has none", () => {
    const built = buildDurationModeFromStored(stored, "saved", "blob:fallback", "blob:source")
    expect(built.audioUrl).toBe("blob:fallback")
    expect(built.sourceAudioUrl).toBe("blob:source")
    expect(built.persisted).toBe(true)
  })

  // Documents current behavior rather than endorsing it. The fallback url is assigned before
  // normalizeDurationMode runs, so a persisted mode always looks like it has "its own" audio and
  // its stored playback rate is reset to 1 — even when the rate was the only thing setting the
  // variant's length. See the note in the PR description.
  it("resets the stored playback rate to 1 once the fallback url is applied", () => {
    expect(buildDurationModeFromStored(stored, "saved", "blob:fallback").playbackRate).toBe(1)
  })

  it("keeps a stored rate only when the mode is not persisted through this path", () => {
    expect(normalizeDurationMode({ ...mode({ id: "s1", persisted: false }), playbackRate: 1.25 }).playbackRate).toBe(
      1.25,
    )
  })

  it("resets the rate to 1 when the stored mode has its own audio", () => {
    const built = buildDurationModeFromStored({ ...stored, audioUrl: "blob:own" }, "saved", "blob:fallback")
    expect(built.playbackRate).toBe(1)
    expect(built.audioUrl).toBe("blob:own")
  })

  it("clones the timeline rather than aliasing it", () => {
    const built = buildDurationModeFromStored(stored, "saved", "blob:fallback")
    expect(built.timeline[0]).not.toBe(stored.timeline[0])
  })

  it("defaults a missing source url to null", () => {
    expect(buildDurationModeFromStored(stored, "saved", "blob:fallback").sourceAudioUrl).toBeNull()
  })
})

describe("sortDurationModes", () => {
  it("always puts the original first, then ascending by length", () => {
    const modes = [
      mode({ id: "b", seconds: 1800 }),
      mode({ id: "original", seconds: 999999 }),
      mode({ id: "a", seconds: 600 }),
    ]
    expect(sortDurationModes(modes).map((m) => m.id)).toEqual(["original", "a", "b"])
  })

  it("does not mutate the input array", () => {
    const modes = [mode({ id: "b", seconds: 1800 }), mode({ id: "original", seconds: 1 })]
    sortDurationModes(modes)
    expect(modes[0].id).toBe("b")
  })
})
