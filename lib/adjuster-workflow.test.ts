import { describe, expect, it } from "vitest"
import {
  calculateUniformScaledPauseDurations,
  computeFeasibility,
  type SilenceRegion,
} from "./adjuster-workflow"

const region = (start: number, end: number): SilenceRegion => ({ start, end })

const totalOf = (result: { newDuration: number }[]) => result.reduce((sum, r) => sum + r.newDuration, 0)

describe("computeFeasibility", () => {
  it("splits a buffer into speech and pause totals", () => {
    const result = computeFeasibility({
      bufferDuration: 100,
      silenceRegions: [region(10, 20), region(50, 60)],
      minSilenceDuration: 1,
    })
    expect(result.pauseTotal).toBe(20)
    expect(result.speechTotal).toBe(80)
    expect(result.pauseCount).toBe(2)
  })

  it("derives the floor from the pause count and the minimum pause duration", () => {
    const result = computeFeasibility({
      bufferDuration: 100,
      silenceRegions: [region(10, 20), region(50, 60)],
      minSilenceDuration: 2,
    })
    // 80s of speech + 2 pauses held at their 2s floor.
    expect(result.minAchievable).toBe(84)
  })

  it("applies a 0.3s failsafe when the configured minimum is smaller", () => {
    const result = computeFeasibility({
      bufferDuration: 10,
      silenceRegions: [region(0, 1)],
      minSilenceDuration: 0,
    })
    expect(result.minAchievable).toBeCloseTo(9.3, 5)
  })

  it("shortens the reachable minimum when content is sped up", () => {
    const result = computeFeasibility({
      bufferDuration: 100,
      silenceRegions: [region(0, 20)],
      minSilenceDuration: 1,
      contentSpeedMultiplier: 2,
    })
    // 80s of speech at 2x is 40s, plus one 1s pause.
    expect(result.minAchievable).toBe(41)
  })

  it("never reports a maximum below the minimum", () => {
    const result = computeFeasibility({
      bufferDuration: 60 * 60 * 4,
      silenceRegions: [region(0, 1)],
      minSilenceDuration: 1,
    })
    expect(result.maxAchievable).toBeGreaterThanOrEqual(result.minAchievable)
  })

  it("treats a buffer with no detected silence as all speech", () => {
    const result = computeFeasibility({ bufferDuration: 30, silenceRegions: [], minSilenceDuration: 1 })
    expect(result.pauseTotal).toBe(0)
    expect(result.speechTotal).toBe(30)
    expect(result.minAchievable).toBe(30)
  })
})

describe("calculateUniformScaledPauseDurations", () => {
  it("returns nothing for an empty region list", () => {
    expect(calculateUniformScaledPauseDurations([], 2, 100, 1)).toEqual([])
  })

  it("scales uniformly when no clamp is triggered", () => {
    const regions = [region(0, 10), region(20, 30)]
    const result = calculateUniformScaledPauseDurations(regions, 2, 40, 1)
    expect(result.map((r) => r.newDuration)).toEqual([20, 20])
  })

  it("never lets a pause fall below the configured floor", () => {
    const regions = [region(0, 4), region(10, 14)]
    const result = calculateUniformScaledPauseDurations(regions, 0.1, 4, 2)
    for (const entry of result) {
      expect(entry.newDuration).toBeGreaterThanOrEqual(2)
    }
  })

  it("applies the 0.3s failsafe floor even when the caller passes zero", () => {
    const regions = [region(0, 1), region(5, 6)]
    const result = calculateUniformScaledPauseDurations(regions, 0.01, 0.02, 0)
    for (const entry of result) {
      expect(entry.newDuration).toBeGreaterThanOrEqual(0.3)
    }
  })

  it("caps a short pause at the 2.5s ceiling so content is not torn apart", () => {
    // A 1s pause is "short" (< 2s); scaling it 10x would reach 10s.
    const regions = [region(0, 1), region(10, 40)]
    const result = calculateUniformScaledPauseDurations(regions, 10, 310, 0.3)
    const shortPause = result.find((r) => r.region.start === 0)!
    expect(shortPause.newDuration).toBeLessThanOrEqual(2.5)
  })

  it("redistributes time clamped off a short pause onto the long ones", () => {
    const regions = [region(0, 1), region(10, 40)]
    const scaled = calculateUniformScaledPauseDurations(regions, 10, 310, 0.3)
    const longPause = scaled.find((r) => r.region.start === 10)!
    // The long pause absorbs the 7.5s the short pause was not allowed to take.
    expect(longPause.newDuration).toBeGreaterThan(300)
    expect(totalOf(scaled)).toBeCloseTo(310, 5)
  })

  it("returns zero-length pauses when the source has no silence at all", () => {
    const regions = [region(5, 5)]
    expect(calculateUniformScaledPauseDurations(regions, 3, 10, 1)).toEqual([{ region: regions[0], newDuration: 0 }])
  })

  it("keeps every region, in order, whatever the scaling", () => {
    const regions = [region(0, 2), region(5, 9), region(20, 21)]
    const result = calculateUniformScaledPauseDurations(regions, 0.5, 3.5, 0.5)
    expect(result).toHaveLength(3)
    expect(result.map((r) => r.region)).toEqual(regions)
  })
})
