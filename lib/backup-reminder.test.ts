import { describe, expect, it } from "vitest"

import {
  type BackupRiskInput,
  DISMISSAL_QUIET_DAYS,
  EXPORT_STALE_AFTER_DAYS,
  EXPORT_STALE_AFTER_DAYS_PERSISTED,
  MIN_LOCAL_ONLY_FOR_PROMPT,
  describeBackupRisk,
  shouldPromptForBackup,
} from "./backup-reminder"

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 8, 14)
const daysAgo = (days: number) => NOW - days * DAY

const input = (overrides: Partial<BackupRiskInput> = {}): BackupRiskInput => ({
  localOnlyCount: 10,
  storagePersisted: false,
  lastExportAt: null,
  lastDismissedAt: null,
  now: NOW,
  ...overrides,
})

describe("shouldPromptForBackup", () => {
  it("asks once there is real exposure and no export behind it", () => {
    expect(shouldPromptForBackup(input())).toBe(true)
  })

  // The whole point of making this risk-triggered: a fully synced library is already in two
  // places, so there is nothing an export would protect and nothing to interrupt anyone about.
  it("stays quiet when nothing is local-only, however old the last export", () => {
    expect(shouldPromptForBackup(input({ localOnlyCount: 0, lastExportAt: daysAgo(3650) }))).toBe(false)
  })

  it("stays quiet below the exposure threshold", () => {
    expect(shouldPromptForBackup(input({ localOnlyCount: MIN_LOCAL_ONLY_FOR_PROMPT - 1 }))).toBe(false)
    expect(shouldPromptForBackup(input({ localOnlyCount: MIN_LOCAL_ONLY_FOR_PROMPT }))).toBe(true)
  })

  it("stays quiet while a recent export still covers things", () => {
    expect(shouldPromptForBackup(input({ lastExportAt: daysAgo(1) }))).toBe(false)
    expect(shouldPromptForBackup(input({ lastExportAt: daysAgo(EXPORT_STALE_AFTER_DAYS - 1) }))).toBe(false)
  })

  it("asks again once the export has gone stale", () => {
    expect(shouldPromptForBackup(input({ lastExportAt: daysAgo(EXPORT_STALE_AFTER_DAYS) }))).toBe(true)
  })

  // Persistent storage is not a guarantee — clearing site data still wins — so the prompt is
  // delayed rather than retired.
  it("waits longer when the browser granted persistent storage", () => {
    const at = (days: number) => input({ storagePersisted: true, lastExportAt: daysAgo(days) })
    expect(shouldPromptForBackup(at(EXPORT_STALE_AFTER_DAYS))).toBe(false)
    expect(shouldPromptForBackup(at(EXPORT_STALE_AFTER_DAYS_PERSISTED))).toBe(true)
  })

  it("still asks a persisted account that has never exported", () => {
    expect(shouldPromptForBackup(input({ storagePersisted: true, lastExportAt: null }))).toBe(true)
  })

  it("respects a dismissal", () => {
    expect(shouldPromptForBackup(input({ lastDismissedAt: daysAgo(1) }))).toBe(false)
    expect(shouldPromptForBackup(input({ lastDismissedAt: daysAgo(DISMISSAL_QUIET_DAYS - 1) }))).toBe(false)
  })

  it("asks again once the dismissal has aged out", () => {
    expect(shouldPromptForBackup(input({ lastDismissedAt: daysAgo(DISMISSAL_QUIET_DAYS) }))).toBe(true)
  })

  it("lets a dismissal outrank a stale export", () => {
    expect(
      shouldPromptForBackup(input({ lastExportAt: daysAgo(3650), lastDismissedAt: daysAgo(1) })),
    ).toBe(false)
  })

  it("treats unusable stored timestamps as absent rather than throwing", () => {
    expect(shouldPromptForBackup(input({ lastExportAt: Number.NaN }))).toBe(true)
    expect(shouldPromptForBackup(input({ lastDismissedAt: Number.NaN }))).toBe(true)
  })

  it("refuses to decide without a usable clock", () => {
    expect(shouldPromptForBackup(input({ now: Number.NaN }))).toBe(false)
  })

  it("treats an unusable count as no exposure", () => {
    expect(shouldPromptForBackup(input({ localOnlyCount: Number.NaN }))).toBe(false)
  })

  // A clock that has gone backwards (a device whose time was wrong and got corrected) should not
  // turn into a permanent prompt.
  it("stays quiet for an export dated in the future", () => {
    expect(shouldPromptForBackup(input({ lastExportAt: NOW + 10 * DAY }))).toBe(false)
  })
})

describe("describeBackupRisk", () => {
  it("states the exposure", () => {
    expect(describeBackupRisk(28)).toBe(
      "28 meditations exist only on this device. A backup keeps a copy you control.",
    )
  })

  it("uses the singular for one", () => {
    expect(describeBackupRisk(1)).toBe(
      "1 meditation exists only on this device. A backup keeps a copy you control.",
    )
  })

  it("does not render a negative or fractional count", () => {
    expect(describeBackupRisk(-3)).toContain("0 meditations")
    expect(describeBackupRisk(2.7)).toContain("2 meditations")
  })
})
