import { describe, expect, it } from "vitest"

import {
  type MeditationAudioState,
  buildBackupReport,
  describeBackupGaps,
  planBackupAudio,
} from "./backup-audio"

const state = (overrides: Partial<MeditationAudioState> & { id: string }): MeditationAudioState => ({
  hasLocalProcessed: true,
  processedKey: null,
  recordingKeys: [],
  availableRecordingKeys: [],
  ...overrides,
})

describe("planBackupAudio", () => {
  it("plans nothing for a library that is fully cached", () => {
    const plan = planBackupAudio([state({ id: "a" }), state({ id: "b" })])
    expect(plan).toEqual({ fetchFromR2: [], missingProcessed: [], missingRecordings: {} })
  })

  it("handles an empty library", () => {
    expect(planBackupAudio([])).toEqual({ fetchFromR2: [], missingProcessed: [], missingRecordings: {} })
  })

  // The case that made this necessary: a fresh device, where nothing is cached but the rows
  // still carry the R2 key the audio was uploaded under.
  it("fetches from R2 when the local cache is empty but the row has a key", () => {
    const plan = planBackupAudio([
      state({ id: "a", hasLocalProcessed: false, processedKey: "user/a.mp3" }),
      state({ id: "b", hasLocalProcessed: false, processedKey: "user/b.ogg" }),
    ])
    expect(plan.fetchFromR2).toEqual(["a", "b"])
    expect(plan.missingProcessed).toEqual([])
  })

  it("prefers the local copy over a refetch when both exist", () => {
    const plan = planBackupAudio([state({ id: "a", hasLocalProcessed: true, processedKey: "user/a.mp3" })])
    expect(plan.fetchFromR2).toEqual([])
    expect(plan.missingProcessed).toEqual([])
  })

  // Rows saved before migration 013 have no audio_key, so an empty cache is the end of the line.
  it("reports rows with neither a local blob nor a key as missing", () => {
    const plan = planBackupAudio([state({ id: "old", hasLocalProcessed: false, processedKey: null })])
    expect(plan.fetchFromR2).toEqual([])
    expect(plan.missingProcessed).toEqual(["old"])
  })

  it("treats an empty-string key as no key", () => {
    const plan = planBackupAudio([state({ id: "a", hasLocalProcessed: false, processedKey: "" })])
    expect(plan.missingProcessed).toEqual(["a"])
    expect(plan.fetchFromR2).toEqual([])
  })

  it("counts voice clips that are expected but not cached", () => {
    const plan = planBackupAudio([
      state({ id: "a", recordingKeys: ["k1", "k2", "k3"], availableRecordingKeys: ["k1"] }),
    ])
    expect(plan.missingRecordings).toEqual({ a: 2 })
  })

  it("says nothing about a meditation whose clips are all present", () => {
    const plan = planBackupAudio([
      state({ id: "a", recordingKeys: ["k1", "k2"], availableRecordingKeys: ["k1", "k2"] }),
    ])
    expect(plan.missingRecordings).toEqual({})
  })

  it("does not double-count a key the timeline repeats", () => {
    const plan = planBackupAudio([
      state({ id: "a", recordingKeys: ["k1", "k1", "k2"], availableRecordingKeys: [] }),
    ])
    expect(plan.missingRecordings).toEqual({ a: 2 })
  })

  it("ignores cached clips the timeline no longer references", () => {
    const plan = planBackupAudio([
      state({ id: "a", recordingKeys: ["k1"], availableRecordingKeys: ["k1", "orphan"] }),
    ])
    expect(plan.missingRecordings).toEqual({})
  })

  // Recovering processed audio from R2 says nothing about the voice clips, which were never
  // uploaded — both gaps can be true of the same meditation.
  it("reports a fetch and missing clips together", () => {
    const plan = planBackupAudio([
      state({
        id: "a",
        hasLocalProcessed: false,
        processedKey: "user/a.mp3",
        recordingKeys: ["k1"],
        availableRecordingKeys: [],
      }),
    ])
    expect(plan.fetchFromR2).toEqual(["a"])
    expect(plan.missingRecordings).toEqual({ a: 1 })
  })
})

describe("buildBackupReport", () => {
  const when = "2026-09-14T00:00:00.000Z"

  it("calls a fully cached export complete", () => {
    const plan = planBackupAudio([state({ id: "a" })])
    const report = buildBackupReport(plan, [], 1, when)
    expect(report.isComplete).toBe(true)
    expect(report.missingProcessed).toEqual([])
    expect(report.recoveredFromR2).toBe(0)
    expect(report.exportedAt).toBe(when)
    expect(report.meditationCount).toBe(1)
  })

  it("counts a successful recovery and stays complete", () => {
    const plan = planBackupAudio([state({ id: "a", hasLocalProcessed: false, processedKey: "k" })])
    const report = buildBackupReport(plan, ["a"], 1, when)
    expect(report.recoveredFromR2).toBe(1)
    expect(report.missingProcessed).toEqual([])
    expect(report.isComplete).toBe(true)
  })

  // The reason the report is built from outcomes: a presigned URL can expire mid-export, and a
  // report describing the plan would call that a complete backup.
  it("moves a failed recovery into missing", () => {
    const plan = planBackupAudio([
      state({ id: "a", hasLocalProcessed: false, processedKey: "k" }),
      state({ id: "b", hasLocalProcessed: false, processedKey: "k2" }),
    ])
    const report = buildBackupReport(plan, ["a"], 2, when)
    expect(report.recoveredFromR2).toBe(1)
    expect(report.missingProcessed).toEqual(["b"])
    expect(report.isComplete).toBe(false)
  })

  it("keeps unrecoverable rows missing even when everything else worked", () => {
    const plan = planBackupAudio([
      state({ id: "old", hasLocalProcessed: false, processedKey: null }),
      state({ id: "a", hasLocalProcessed: false, processedKey: "k" }),
    ])
    const report = buildBackupReport(plan, ["a"], 2, when)
    expect(report.missingProcessed).toEqual(["old"])
    expect(report.isComplete).toBe(false)
  })

  it("does not list an id twice when it is missing for two reasons", () => {
    const plan = { fetchFromR2: ["a"], missingProcessed: ["a"], missingRecordings: {} }
    const report = buildBackupReport(plan, [], 1, when)
    expect(report.missingProcessed).toEqual(["a"])
  })

  it("is incomplete when only voice clips are missing", () => {
    const plan = planBackupAudio([
      state({ id: "a", recordingKeys: ["k1"], availableRecordingKeys: [] }),
    ])
    const report = buildBackupReport(plan, [], 1, when)
    expect(report.missingProcessed).toEqual([])
    expect(report.isComplete).toBe(false)
    expect(report.missingRecordings).toEqual({ a: 1 })
  })

  it("copies the plan's clip counts rather than aliasing them", () => {
    const plan = planBackupAudio([
      state({ id: "a", recordingKeys: ["k1"], availableRecordingKeys: [] }),
    ])
    const report = buildBackupReport(plan, [], 1, when)
    plan.missingRecordings.a = 99
    expect(report.missingRecordings).toEqual({ a: 1 })
  })
})

describe("describeBackupGaps", () => {
  const when = "2026-09-14T00:00:00.000Z"
  const report = (plan: Parameters<typeof buildBackupReport>[0], recovered: string[] = []) =>
    buildBackupReport(plan, recovered, 3, when)

  it("says nothing when the backup is whole", () => {
    expect(describeBackupGaps(report({ fetchFromR2: [], missingProcessed: [], missingRecordings: {} }))).toBeNull()
  })

  it("names missing audio", () => {
    expect(
      describeBackupGaps(report({ fetchFromR2: [], missingProcessed: ["a", "b"], missingRecordings: {} })),
    ).toBe("2 meditations without audio could not be included.")
  })

  it("uses the singular for one", () => {
    expect(
      describeBackupGaps(report({ fetchFromR2: [], missingProcessed: ["a"], missingRecordings: {} })),
    ).toBe("1 meditation without audio could not be included.")
  })

  it("totals voice clips across meditations", () => {
    expect(
      describeBackupGaps(report({ fetchFromR2: [], missingProcessed: [], missingRecordings: { a: 2, b: 3 } })),
    ).toBe("5 voice recordings could not be included.")
  })

  it("joins both kinds of gap", () => {
    expect(
      describeBackupGaps(report({ fetchFromR2: [], missingProcessed: ["a"], missingRecordings: { b: 1 } })),
    ).toBe("1 meditation without audio and 1 voice recording could not be included.")
  })
})
