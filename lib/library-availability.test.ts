import { describe, expect, it } from "vitest"

import {
  type MeditationAvailabilityInput,
  describeMissingAudio,
  shouldShowMissingAudioNotice,
  summarizeAvailability,
} from "./library-availability"

const item = (
  overrides: Partial<MeditationAvailabilityInput> & { id: string },
): MeditationAvailabilityInput => ({
  hasAudioKey: false,
  hasLocalAudio: false,
  ...overrides,
})

const elsewhereItems = (count: number, deviceLabel?: string) =>
  Array.from({ length: count }, (_, index) => item({ id: `e${index}`, deviceLabel }))

describe("summarizeAvailability", () => {
  it("handles an empty library", () => {
    expect(summarizeAvailability([])).toEqual({
      total: 0,
      playableHere: 0,
      synced: 0,
      elsewhere: [],
      elsewhereDevices: [],
    })
  })

  it("counts synced meditations as playable anywhere", () => {
    const summary = summarizeAvailability([item({ id: "a", hasAudioKey: true })])
    expect(summary).toMatchObject({ total: 1, playableHere: 1, synced: 1, elsewhere: [] })
  })

  it("counts a local-only meditation as playable here but not synced", () => {
    const summary = summarizeAvailability([item({ id: "a", hasLocalAudio: true })])
    expect(summary).toMatchObject({ total: 1, playableHere: 1, synced: 0, elsewhere: [] })
  })

  // The case this exists for: the row is there, the bytes are on a device that is not this one.
  it("lists a meditation with neither copy as elsewhere", () => {
    const summary = summarizeAvailability([item({ id: "a", deviceLabel: "iPhone" })])
    expect(summary.elsewhere).toEqual(["a"])
    expect(summary.playableHere).toBe(0)
    expect(summary.elsewhereDevices).toEqual(["iPhone"])
  })

  it("does not double-count a meditation that is both synced and cached", () => {
    const summary = summarizeAvailability([item({ id: "a", hasAudioKey: true, hasLocalAudio: true })])
    expect(summary.playableHere).toBe(1)
    expect(summary.synced).toBe(1)
  })

  it("separates the three states across a mixed library", () => {
    const summary = summarizeAvailability([
      item({ id: "synced", hasAudioKey: true }),
      item({ id: "cached", hasLocalAudio: true }),
      item({ id: "gone", deviceLabel: "iPad" }),
    ])
    expect(summary).toEqual({
      total: 3,
      playableHere: 2,
      synced: 1,
      elsewhere: ["gone"],
      elsewhereDevices: ["iPad"],
    })
  })

  it("collects distinct device labels in first-seen order", () => {
    const summary = summarizeAvailability([
      item({ id: "a", deviceLabel: "iPhone" }),
      item({ id: "b", deviceLabel: "MacBook" }),
      item({ id: "c", deviceLabel: "iPhone" }),
    ])
    expect(summary.elsewhereDevices).toEqual(["iPhone", "MacBook"])
  })

  it("ignores blank and missing device labels", () => {
    const summary = summarizeAvailability([
      item({ id: "a", deviceLabel: "   " }),
      item({ id: "b", deviceLabel: null }),
      item({ id: "c" }),
    ])
    expect(summary.elsewhere).toEqual(["a", "b", "c"])
    expect(summary.elsewhereDevices).toEqual([])
  })

  // A label on a meditation that plays fine here says nothing about what is missing.
  it("does not collect labels from meditations that are playable", () => {
    const summary = summarizeAvailability([
      item({ id: "a", hasLocalAudio: true, deviceLabel: "iPhone" }),
    ])
    expect(summary.elsewhereDevices).toEqual([])
  })
})

describe("describeMissingAudio", () => {
  it("says nothing when everything plays", () => {
    expect(describeMissingAudio(summarizeAvailability([item({ id: "a", hasAudioKey: true })]))).toBeNull()
  })

  it("names the device when only one is responsible", () => {
    expect(describeMissingAudio(summarizeAvailability(elsewhereItems(28, "iPhone")))).toBe(
      "28 meditations have their audio on iPhone.",
    )
  })

  it("uses the singular throughout for one", () => {
    expect(describeMissingAudio(summarizeAvailability(elsewhereItems(1, "iPhone")))).toBe(
      "1 meditation has its audio on iPhone.",
    )
  })

  it("collapses to a general phrase across several devices", () => {
    const summary = summarizeAvailability([
      item({ id: "a", deviceLabel: "iPhone" }),
      item({ id: "b", deviceLabel: "MacBook" }),
    ])
    expect(describeMissingAudio(summary)).toBe("2 meditations have their audio on your other devices.")
  })

  it("falls back when no device was recorded", () => {
    expect(describeMissingAudio(summarizeAvailability(elsewhereItems(4)))).toBe(
      "4 meditations have their audio on another device.",
    )
  })
})

describe("shouldShowMissingAudioNotice", () => {
  it("stays quiet when nothing is missing", () => {
    expect(shouldShowMissingAudioNotice(summarizeAvailability([item({ id: "a", hasAudioKey: true })]))).toBe(false)
  })

  it("stays quiet for an empty library", () => {
    expect(shouldShowMissingAudioNotice(summarizeAvailability([]))).toBe(false)
  })

  // One meditation left behind on an old laptop is ordinary; a banner about it is noise.
  it("stays quiet for one or two missing out of many", () => {
    const summary = summarizeAvailability([
      ...elsewhereItems(2, "iPhone"),
      ...Array.from({ length: 40 }, (_, i) => item({ id: `s${i}`, hasAudioKey: true })),
    ])
    expect(summary.elsewhere).toHaveLength(2)
    expect(shouldShowMissingAudioNotice(summary)).toBe(false)
  })

  it("stays quiet for a small share of a large library", () => {
    const summary = summarizeAvailability([
      ...elsewhereItems(5, "iPhone"),
      ...Array.from({ length: 95 }, (_, i) => item({ id: `s${i}`, hasAudioKey: true })),
    ])
    expect(shouldShowMissingAudioNotice(summary)).toBe(false)
  })

  it("speaks up when most of the library is silent, which is the case it was written for", () => {
    const summary = summarizeAvailability([
      ...elsewhereItems(28, "iPhone"),
      ...Array.from({ length: 15 }, (_, i) => item({ id: `s${i}`, hasAudioKey: true })),
    ])
    expect(shouldShowMissingAudioNotice(summary)).toBe(true)
  })

  it("speaks up at exactly the threshold", () => {
    const summary = summarizeAvailability([...elsewhereItems(3, "iPhone"), ...Array.from({ length: 9 }, (_, i) => item({ id: `s${i}`, hasAudioKey: true }))])
    expect(summary.elsewhere).toHaveLength(3)
    expect(shouldShowMissingAudioNotice(summary)).toBe(true)
  })
})
