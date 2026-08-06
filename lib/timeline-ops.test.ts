import { describe, expect, it } from "vitest"

import type { TimelineEvent } from "@/lib/types"
import {
  eventEnd,
  minimumTimelineDuration,
  repeatTimelineRange,
  scaleTimelineToDuration,
  timelineEnd,
} from "./timeline-ops"

const event = (id: string, startTime: number, duration?: number): TimelineEvent => ({
  id,
  type: "instruction_sound",
  startTime,
  instructionText: id,
  ...(duration === undefined ? {} : { duration }),
})

const at = (events: TimelineEvent[]) => events.map((e) => e.startTime)

describe("eventEnd / timelineEnd", () => {
  it("ends where an event's duration runs out", () => {
    expect(eventEnd(event("a", 10, 5))).toBe(15)
  })

  it("treats a durationless event as instantaneous", () => {
    expect(eventEnd(event("a", 10))).toBe(10)
  })

  it("finds the end of the last thing, not the last in the array", () => {
    expect(timelineEnd([event("b", 30, 5), event("a", 10, 2)])).toBe(35)
  })

  it("is zero for an empty timeline", () => {
    expect(timelineEnd([])).toBe(0)
  })
})

describe("repeatTimelineRange", () => {
  const timeline = [event("intro", 0, 5), event("a", 10, 3), event("b", 20, 3), event("outro", 40, 5)]

  it("repeats the events in the range and shifts what follows", () => {
    const result = repeatTimelineRange(timeline, { from: 10, to: 30, times: 1 })

    // intro stays, a/b repeat once 20s later, outro moves back by 20s.
    expect(at(result)).toEqual([0, 10, 20, 30, 40, 60])
    expect(result.map((e) => e.instructionText)).toEqual(["intro", "a", "b", "a", "b", "outro"])
  })

  it("makes as many copies as asked", () => {
    // The 20s block holding a and b, played four times in all, then the outro 60s later.
    const result = repeatTimelineRange(timeline, { from: 10, to: 30, times: 3 })
    expect(at(result)).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 100])
  })

  it("gives the copies distinct ids", () => {
    const result = repeatTimelineRange(timeline, { from: 10, to: 30, times: 2 })
    expect(new Set(result.map((e) => e.id)).size).toBe(result.length)
  })

  it("keeps the originals' ids", () => {
    const result = repeatTimelineRange(timeline, { from: 10, to: 30, times: 1 })
    expect(result.filter((e) => e.id === "a")).toHaveLength(1)
  })

  it("includes an event that starts inside the range but rings past its end", () => {
    const overlapping = [event("long", 10, 30), event("after", 40, 2)]
    const result = repeatTimelineRange(overlapping, { from: 10, to: 20, times: 1 })
    expect(result.filter((e) => e.instructionText === "long")).toHaveLength(2)
  })

  it("excludes an event starting exactly at the range end", () => {
    const result = repeatTimelineRange(timeline, { from: 10, to: 20, times: 1 })
    expect(result.filter((e) => e.instructionText === "b")).toHaveLength(1)
  })

  it("returns the timeline unchanged for an empty range", () => {
    expect(at(repeatTimelineRange(timeline, { from: 30, to: 40, times: 2 }))).toEqual(at(timeline))
  })

  it("returns the timeline unchanged for an inverted or zero-width range", () => {
    expect(at(repeatTimelineRange(timeline, { from: 30, to: 10, times: 2 }))).toEqual(at(timeline))
    expect(at(repeatTimelineRange(timeline, { from: 10, to: 10, times: 2 }))).toEqual(at(timeline))
  })

  it("returns the timeline unchanged for a non-positive repeat count", () => {
    expect(at(repeatTimelineRange(timeline, { from: 10, to: 30, times: 0 }))).toEqual(at(timeline))
    expect(at(repeatTimelineRange(timeline, { from: 10, to: 30, times: -2 }))).toEqual(at(timeline))
  })

  it("does not mutate the input", () => {
    const original = timeline.map((e) => ({ ...e }))
    repeatTimelineRange(timeline, { from: 10, to: 30, times: 2 })
    expect(timeline).toEqual(original)
  })

  it("tolerates non-finite start times", () => {
    const broken = [event("a", Number.NaN, 2), event("b", 10, 2)]
    expect(() => repeatTimelineRange(broken, { from: 0, to: 20, times: 1 })).not.toThrow()
  })

  it("returns events in time order", () => {
    const result = repeatTimelineRange(timeline, { from: 10, to: 30, times: 2 })
    const starts = at(result)
    expect([...starts].sort((a, b) => a - b)).toEqual(starts)
  })
})

describe("scaleTimelineToDuration", () => {
  const timeline = [event("a", 0, 4), event("b", 30, 4), event("c", 60, 4)]

  it("scales start times proportionally", () => {
    expect(at(scaleTimelineToDuration(timeline, 90, 180))).toEqual([0, 60, 120])
  })

  it("compresses as well as stretches", () => {
    expect(at(scaleTimelineToDuration(timeline, 90, 45))).toEqual([0, 15, 30])
  })

  it("leaves durations alone — a bell is a bell at any length", () => {
    const scaled = scaleTimelineToDuration(timeline, 90, 180)
    expect(scaled.map((e) => e.duration)).toEqual([4, 4, 4])
  })

  it("returns the timeline unchanged for a zero or missing base", () => {
    expect(at(scaleTimelineToDuration(timeline, 0, 180))).toEqual(at(timeline))
    expect(at(scaleTimelineToDuration(timeline, Number.NaN, 180))).toEqual(at(timeline))
  })

  it("returns the timeline unchanged for a zero target", () => {
    expect(at(scaleTimelineToDuration(timeline, 90, 0))).toEqual(at(timeline))
  })

  it("does not mutate the input", () => {
    const original = timeline.map((e) => ({ ...e }))
    scaleTimelineToDuration(timeline, 90, 180)
    expect(timeline).toEqual(original)
  })

  it("handles an empty timeline", () => {
    expect(scaleTimelineToDuration([], 90, 180)).toEqual([])
  })
})

describe("minimumTimelineDuration", () => {
  it("is the length at which the tightest pair just touches", () => {
    // b starts 30s after a, and a runs 6s. Compressing 5x closes that gap exactly.
    const timeline = [event("a", 0, 6), event("b", 30, 2)]
    expect(minimumTimelineDuration(timeline, 60)).toBeCloseTo(12, 5)
  })

  it("is driven by the tightest pair, not the first", () => {
    const timeline = [event("a", 0, 2), event("b", 30, 20), event("c", 60, 2)]
    // b needs 20s of the 30s gap to c, so the floor is 2/3 of the current length.
    expect(minimumTimelineDuration(timeline, 90)).toBeCloseTo(60, 5)
  })

  it("accounts for the last event needing to fit inside the total", () => {
    const timeline = [event("a", 0, 1), event("last", 50, 20)]
    // last has 10s of room at the current length and needs 20, so nothing can be compressed.
    expect(minimumTimelineDuration(timeline, 60)).toBeGreaterThan(60)
  })

  it("is zero when nothing has a duration to protect", () => {
    expect(minimumTimelineDuration([event("a", 0), event("b", 30)], 60)).toBe(0)
  })

  it("is zero for an empty timeline or a missing base", () => {
    expect(minimumTimelineDuration([], 60)).toBe(0)
    expect(minimumTimelineDuration([event("a", 0, 2)], 0)).toBe(0)
  })

  it("lets a scale to its own floor keep every event clear of the next", () => {
    const timeline = [event("a", 0, 6), event("b", 30, 2), event("c", 45, 2)]
    const floor = minimumTimelineDuration(timeline, 60)
    const scaled = scaleTimelineToDuration(timeline, 60, floor)

    for (let index = 0; index < scaled.length - 1; index += 1) {
      expect(eventEnd(scaled[index])).toBeLessThanOrEqual(scaled[index + 1].startTime + 1e-6)
    }
  })
})
