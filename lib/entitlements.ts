/**
 * What an account is allowed to keep on the server.
 *
 * The three tools are free forever and run without an account, so nothing here touches them —
 * decoding, silence detection, time-stretching and encoding all happen in the browser and cost
 * nothing to serve. This module is only about the part the server actually hosts: bytes in R2 and
 * rows in Postgres.
 *
 * Two limits, deliberately different in kind:
 *
 * `syncedMeditationLimit` is the one a person is meant to feel. A count is something you can
 * picture — "fifteen meditations" means something, "5 GB" does not — so it is the limit the UI
 * talks about and the one that decides when to mention a subscription.
 *
 * `storageQuotaBytes` is a backstop nobody should ever meet. Fifteen slots stop being fifteen
 * meditations if one of them is a three-hour WAV, and an account with an upload route and no
 * ceiling is free file hosting for anyone who notices. It exists to bound the damage, not to
 * shape the product.
 *
 * Pure: no React, no network, no Supabase. The server reads a row and hands it to
 * `entitlementsFor`; every decision after that is arithmetic that a test can reach.
 */

export type AccountTier = "free" | "supporter"

export type Entitlements = {
  tier: AccountTier
  /**
   * Meditations whose audio the server stores, excluding reusable recordings. It caps what is
   * *synced*, never what exists: past this, a save still writes its row and keeps its title,
   * duration and timeline, and only the audio stays in the browser that made it.
   *
   * `Infinity` for supporters — a real number here would eventually be a surprise wall for the
   * person who is already paying, which is the worst place to put one.
   */
  syncedMeditationLimit: number
  /** Reusable voice clips (`source: "recording"`), which get their own allowance so they cannot eat meditation slots. */
  recordingLimit: number
  /** The backstop. Always finite, including for supporters. */
  storageQuotaBytes: number
  /** Ceiling on any single object, checked before a presigned URL is minted. */
  maxUploadBytes: number
  /**
   * Images and voice notes in the journal. Note *text* is never gated — it is kilobytes, a
   * journal is what makes people come back, and a vault that holds only some of your notes is
   * not the vault the storage layout promises.
   */
  journalAttachments: boolean
}

const GB = 1024 * 1024 * 1024
const MB = 1024 * 1024

/**
 * Free is a complete product, not a trial: fifteen meditations is a real practice library, and
 * everything that is cheap to host — journal text, the practice log, backup export — is
 * unlimited and lives outside this table entirely.
 */
const FREE: Entitlements = {
  tier: "free",
  syncedMeditationLimit: 15,
  recordingLimit: 10,
  storageQuotaBytes: 2 * GB,
  maxUploadBytes: 300 * MB,
  // Note *text* stays unlimited and free — it is kilobytes, and a vault holding only some of your
  // writing is not the vault the storage layout promises. Attachments are the opposite: a phone
  // photo is megabytes and a voice note is more, so they are the part of the journal that
  // actually costs something to keep.
  journalAttachments: false,
}

const SUPPORTER: Entitlements = {
  tier: "supporter",
  syncedMeditationLimit: Number.POSITIVE_INFINITY,
  recordingLimit: Number.POSITIVE_INFINITY,
  storageQuotaBytes: 100 * GB,
  maxUploadBytes: 2 * GB,
  journalAttachments: true,
}

const BY_TIER: Record<AccountTier, Entitlements> = { free: FREE, supporter: SUPPORTER }

/**
 * Per-account adjustments, read from the entitlements row. Only the service role can write that
 * row, so these are trusted — they exist for comped accounts, founding-tier promises and for
 * clamping an account that is being abused, without a deploy in any of those cases.
 *
 * A `null` or missing field means "no override", which is why every one of them is optional
 * rather than defaulted: the tier's own value has to survive an absent column.
 */
export type EntitlementOverrides = {
  syncedMeditationLimit?: number | null
  recordingLimit?: number | null
  storageQuotaBytes?: number | null
  maxUploadBytes?: number | null
  journalAttachments?: boolean | null
}

/**
 * Coerces a stored tier into a known one.
 *
 * Total, and deliberately biased: anything unrecognised — a null column, a typo, a tier name from
 * a future build, a value someone hand-edited in the dashboard — resolves to `free`. An
 * entitlement check that fails open is a billing hole, so the fallback has to be the cheap side.
 */
export const normalizeTier = (value: unknown): AccountTier =>
  value === "supporter" ? "supporter" : "free"

/** A non-negative, finite override, or `null` when the stored value cannot be trusted as one. */
const overrideCount = (value: unknown): number | null => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null
  return Math.floor(value)
}

/**
 * Resolves a stored tier and its overrides into a complete entitlement set.
 *
 * Total in the same way `normalizeSettings` is: it takes anything at all, including the `null`
 * that a brand-new account with no entitlements row yields, and returns a usable object. Nothing
 * downstream should have to decide what an account with no row is allowed to do.
 */
export const entitlementsFor = (
  tier: unknown,
  overrides: EntitlementOverrides | null | undefined = null,
): Entitlements => {
  const base = BY_TIER[normalizeTier(tier)]
  if (!overrides) return base

  const syncedMeditationLimit = overrideCount(overrides.syncedMeditationLimit)
  const recordingLimit = overrideCount(overrides.recordingLimit)
  const storageQuotaBytes = overrideCount(overrides.storageQuotaBytes)
  const maxUploadBytes = overrideCount(overrides.maxUploadBytes)

  return {
    tier: base.tier,
    syncedMeditationLimit: syncedMeditationLimit ?? base.syncedMeditationLimit,
    recordingLimit: recordingLimit ?? base.recordingLimit,
    storageQuotaBytes: storageQuotaBytes ?? base.storageQuotaBytes,
    maxUploadBytes: maxUploadBytes ?? base.maxUploadBytes,
    journalAttachments:
      typeof overrides.journalAttachments === "boolean"
        ? overrides.journalAttachments
        : base.journalAttachments,
  }
}


/**
 * The shape `account_entitlements` comes back as, from either side of the wire.
 *
 * Both the API routes and the client read this row and both have to reach the same verdict about
 * it — a client that thinks it has room where the database disagrees produces an upload that is
 * refused after the bytes have been read. So the mapping lives here, once, and neither side gets
 * to hold its own opinion about what a column means.
 */
export type EntitlementRow = {
  tier?: unknown
  synced_meditation_limit?: number | null
  recording_limit?: number | null
  storage_quota_bytes?: number | null
  max_upload_bytes?: number | null
  journal_attachments?: boolean | null
} | null | undefined

export const entitlementsFromRow = (row: EntitlementRow): Entitlements =>
  entitlementsFor(
    row?.tier,
    row
      ? {
          syncedMeditationLimit: row.synced_meditation_limit,
          recordingLimit: row.recording_limit,
          storageQuotaBytes: row.storage_quota_bytes,
          maxUploadBytes: row.max_upload_bytes,
          journalAttachments: row.journal_attachments,
        }
      : null,
  )

/** The columns `entitlementsFromRow` reads, for a `select()`. */
export const ENTITLEMENT_COLUMNS =
  "tier, synced_meditation_limit, recording_limit, storage_quota_bytes, max_upload_bytes, journal_attachments"

/** Bytes left before the backstop. Never negative, so a UI can render it without clamping. */
export const remainingBytes = (entitlements: Entitlements, usedBytes: number): number => {
  const used = Number.isFinite(usedBytes) && usedBytes > 0 ? usedBytes : 0
  return Math.max(0, entitlements.storageQuotaBytes - used)
}

export type UploadRejection = "too-large" | "quota-exceeded"

/**
 * Whether an upload of `incomingBytes` may proceed, and if not, which limit stopped it.
 *
 * The two reasons are separated because they need different words: one file being too big is a
 * different problem from an account being full, and telling someone to upgrade when they should
 * have shortened a recording is the kind of thing that makes a paywall feel dishonest.
 *
 * An unknown size (a caller that sends no length) is refused rather than waved through — the
 * whole point of the check is that nothing reaches R2 unmeasured.
 */
export const checkUpload = (
  entitlements: Entitlements,
  usedBytes: number,
  incomingBytes: unknown,
): { allowed: true } | { allowed: false; reason: UploadRejection } => {
  if (typeof incomingBytes !== "number" || !Number.isFinite(incomingBytes) || incomingBytes < 0) {
    return { allowed: false, reason: "too-large" }
  }
  if (incomingBytes > entitlements.maxUploadBytes) {
    return { allowed: false, reason: "too-large" }
  }
  if (incomingBytes > remainingBytes(entitlements, usedBytes)) {
    return { allowed: false, reason: "quota-exceeded" }
  }
  return { allowed: true }
}

/**
 * Whether one more meditation can be synced, given how many the account already has.
 *
 * Counts meditations only. Recordings share the `meditations` table but are not meditations —
 * every listing already filters them out, and letting them consume slots would mean building a
 * reusable instruction set quietly costs you the library you came for.
 */
export const canSyncAnotherMeditation = (entitlements: Entitlements, currentCount: number): boolean => {
  const count = Number.isFinite(currentCount) && currentCount > 0 ? currentCount : 0
  return count < entitlements.syncedMeditationLimit
}

export const canSaveAnotherRecording = (entitlements: Entitlements, currentCount: number): boolean => {
  const count = Number.isFinite(currentCount) && currentCount > 0 ? currentCount : 0
  return count < entitlements.recordingLimit
}

/**
 * Meditation slots left, or `null` when there is no limit to count down from.
 *
 * `null` rather than `Infinity` because this is the one value that exists to be rendered: a UI
 * showing "∞ remaining" is noise, and the absent case is what tells it to show nothing at all.
 */
export const remainingMeditationSlots = (
  entitlements: Entitlements,
  currentCount: number,
): number | null => {
  if (!Number.isFinite(entitlements.syncedMeditationLimit)) return null
  const count = Number.isFinite(currentCount) && currentCount > 0 ? currentCount : 0
  return Math.max(0, entitlements.syncedMeditationLimit - count)
}
