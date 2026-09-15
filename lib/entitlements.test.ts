import { describe, expect, it } from "vitest"

import {
  type Entitlements,
  canSaveAnotherRecording,
  canSyncAnotherMeditation,
  checkUpload,
  entitlementsFor,
  normalizeTier,
  remainingBytes,
  remainingMeditationSlots,
} from "./entitlements"

const free = entitlementsFor("free")
const supporter = entitlementsFor("supporter")

describe("normalizeTier", () => {
  it("recognises the two real tiers", () => {
    expect(normalizeTier("free")).toBe("free")
    expect(normalizeTier("supporter")).toBe("supporter")
  })

  // The security property: an entitlement check must never fail open. Every one of these is a
  // value the database can actually produce — an account with no row, a column added later, a
  // tier name from a build that has been rolled back.
  it.each([null, undefined, "", "SUPPORTER", "paid", "pro", 1, true, {}, []])(
    "falls back to free for %p",
    (value) => {
      expect(normalizeTier(value)).toBe("free")
    },
  )
})

describe("entitlementsFor", () => {
  it("gives a brand-new account with no row the free tier", () => {
    expect(entitlementsFor(null).tier).toBe("free")
    expect(entitlementsFor(null)).toEqual(free)
  })

  it("leaves the tier defaults alone when there are no overrides", () => {
    expect(entitlementsFor("supporter", null)).toEqual(supporter)
    expect(entitlementsFor("supporter", {})).toEqual(supporter)
  })

  it("applies overrides field by field", () => {
    const comped = entitlementsFor("free", { syncedMeditationLimit: 50, journalAttachments: false })
    expect(comped.syncedMeditationLimit).toBe(50)
    expect(comped.journalAttachments).toBe(false)
    // Untouched fields keep the tier's value rather than being zeroed by the partial object.
    expect(comped.storageQuotaBytes).toBe(free.storageQuotaBytes)
    expect(comped.recordingLimit).toBe(free.recordingLimit)
  })

  it("ignores null overrides, which is what an unset column reads as", () => {
    const applied = entitlementsFor("free", {
      syncedMeditationLimit: null,
      storageQuotaBytes: null,
      journalAttachments: null,
    })
    expect(applied).toEqual(free)
  })

  it("ignores overrides that are not usable counts", () => {
    const applied = entitlementsFor("free", {
      syncedMeditationLimit: Number.NaN,
      recordingLimit: -5,
      storageQuotaBytes: Number.POSITIVE_INFINITY,
      maxUploadBytes: "lots" as unknown as number,
    })
    expect(applied).toEqual(free)
  })

  it("allows an override of zero, so an abused account can be clamped shut", () => {
    expect(entitlementsFor("supporter", { syncedMeditationLimit: 0 }).syncedMeditationLimit).toBe(0)
  })

  it("never lets an override promote the tier itself", () => {
    const applied = entitlementsFor("free", { syncedMeditationLimit: 9999, journalAttachments: true })
    expect(applied.tier).toBe("free")
  })

  it("keeps a false override, rather than treating it as absent", () => {
    expect(entitlementsFor("supporter", { journalAttachments: false }).journalAttachments).toBe(false)
  })
})

describe("remainingBytes", () => {
  it("counts down from the quota", () => {
    expect(remainingBytes(free, 0)).toBe(free.storageQuotaBytes)
    expect(remainingBytes(free, 1024)).toBe(free.storageQuotaBytes - 1024)
  })

  it("floors at zero rather than going negative", () => {
    expect(remainingBytes(free, free.storageQuotaBytes + 1)).toBe(0)
  })

  it("treats unusable usage as zero", () => {
    expect(remainingBytes(free, Number.NaN)).toBe(free.storageQuotaBytes)
    expect(remainingBytes(free, -1)).toBe(free.storageQuotaBytes)
  })
})

describe("checkUpload", () => {
  it("allows an ordinary upload", () => {
    expect(checkUpload(free, 0, 5 * 1024 * 1024)).toEqual({ allowed: true })
  })

  // The quota is only reachable across several uploads, since no single object may exceed
  // maxUploadBytes — so these approach it from a nearly-full account rather than in one shot.
  it("allows an upload that exactly fills the quota", () => {
    const used = free.storageQuotaBytes - 1024
    expect(checkUpload(free, used, 1024)).toEqual({ allowed: true })
  })

  it("refuses the byte past the quota", () => {
    const used = free.storageQuotaBytes - 1024
    expect(checkUpload(free, used, 1025)).toEqual({ allowed: false, reason: "quota-exceeded" })
  })

  it("refuses everything once the account is already full", () => {
    expect(checkUpload(free, free.storageQuotaBytes, 1)).toEqual({
      allowed: false,
      reason: "quota-exceeded",
    })
  })

  it("refuses a single object over the per-upload ceiling even on an empty account", () => {
    expect(checkUpload(free, 0, free.maxUploadBytes + 1)).toEqual({
      allowed: false,
      reason: "too-large",
    })
  })

  // The two reasons are not interchangeable: one file being too big is a different message from
  // an account being full, and the size ceiling is checked first so an oversized upload to an
  // empty account does not read as "you are out of space".
  it("reports size before quota when both would fail", () => {
    expect(checkUpload(free, free.storageQuotaBytes, free.maxUploadBytes + 1)).toEqual({
      allowed: false,
      reason: "too-large",
    })
  })

  it("refuses an unmeasured upload", () => {
    for (const size of [undefined, null, Number.NaN, Number.POSITIVE_INFINITY, -1, "12"]) {
      expect(checkUpload(free, 0, size)).toEqual({ allowed: false, reason: "too-large" })
    }
  })

  it("allows a zero-byte upload rather than treating it as unmeasured", () => {
    expect(checkUpload(free, 0, 0)).toEqual({ allowed: true })
  })

  it("still enforces a ceiling for supporters", () => {
    expect(checkUpload(supporter, 0, supporter.maxUploadBytes + 1)).toEqual({
      allowed: false,
      reason: "too-large",
    })
  })
})

describe("canSyncAnotherMeditation", () => {
  it("allows up to the limit and refuses at it", () => {
    expect(canSyncAnotherMeditation(free, 0)).toBe(true)
    expect(canSyncAnotherMeditation(free, free.syncedMeditationLimit - 1)).toBe(true)
    expect(canSyncAnotherMeditation(free, free.syncedMeditationLimit)).toBe(false)
  })

  it("refuses an account already over the limit, as a lowered limit would leave it", () => {
    expect(canSyncAnotherMeditation(free, free.syncedMeditationLimit + 10)).toBe(false)
  })

  it("never refuses a supporter", () => {
    expect(canSyncAnotherMeditation(supporter, 100_000)).toBe(true)
  })

  it("treats an unusable count as zero", () => {
    expect(canSyncAnotherMeditation(free, Number.NaN)).toBe(true)
  })

  it("refuses everything at a zero override", () => {
    expect(canSyncAnotherMeditation(entitlementsFor("free", { syncedMeditationLimit: 0 }), 0)).toBe(false)
  })
})

describe("canSaveAnotherRecording", () => {
  // Recordings have their own allowance so that building a reusable instruction set does not
  // quietly consume the meditation slots the account is actually for.
  it("is counted separately from meditations", () => {
    expect(canSaveAnotherRecording(free, free.recordingLimit - 1)).toBe(true)
    expect(canSaveAnotherRecording(free, free.recordingLimit)).toBe(false)
    expect(canSyncAnotherMeditation(free, free.recordingLimit)).toBe(true)
  })
})

describe("remainingMeditationSlots", () => {
  it("counts down", () => {
    expect(remainingMeditationSlots(free, 0)).toBe(free.syncedMeditationLimit)
    expect(remainingMeditationSlots(free, 3)).toBe(free.syncedMeditationLimit - 3)
  })

  it("floors at zero for an account over the limit", () => {
    expect(remainingMeditationSlots(free, free.syncedMeditationLimit + 4)).toBe(0)
  })

  it("is null when there is no limit, so a UI knows to render nothing", () => {
    expect(remainingMeditationSlots(supporter, 12)).toBeNull()
  })
})

describe("journal attachments", () => {
  // Note text is never gated; the megabytes are. These pin that split so a future edit to the
  // tier tables has to be deliberate about it.
  it("is not included on the free tier", () => {
    expect(free.journalAttachments).toBe(false)
  })

  it("is included for supporters", () => {
    expect(supporter.journalAttachments).toBe(true)
  })

  it("can be comped onto a free account without changing its tier", () => {
    const comped = entitlementsFor("free", { journalAttachments: true })
    expect(comped.journalAttachments).toBe(true)
    expect(comped.tier).toBe("free")
  })
})

describe("tier shape", () => {
  const tiers: Entitlements[] = [free, supporter]

  it("keeps every byte limit finite, including the supporter backstop", () => {
    for (const tier of tiers) {
      expect(Number.isFinite(tier.storageQuotaBytes)).toBe(true)
      expect(Number.isFinite(tier.maxUploadBytes)).toBe(true)
    }
  })

  it("never lets a single upload exceed the whole quota", () => {
    for (const tier of tiers) {
      expect(tier.maxUploadBytes).toBeLessThanOrEqual(tier.storageQuotaBytes)
    }
  })

  it("gives supporters at least what free accounts get", () => {
    expect(supporter.syncedMeditationLimit).toBeGreaterThan(free.syncedMeditationLimit)
    expect(supporter.storageQuotaBytes).toBeGreaterThan(free.storageQuotaBytes)
    expect(supporter.maxUploadBytes).toBeGreaterThan(free.maxUploadBytes)
  })
})
