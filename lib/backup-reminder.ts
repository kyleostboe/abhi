/**
 * When to suggest a backup.
 *
 * Not on a schedule. A recurring banner about impending data loss is a small dose of anxiety on
 * the way into forty minutes of sitting, which is the opposite of what the app is for — and it
 * does not even work, because a prompt that appears whether or not anything is at risk gets
 * dismissed on reflex and then gets dismissed on the one day it mattered.
 *
 * So the prompt is a function of actual exposure. It appears when there is something to lose that
 * exists in exactly one place, when the browser has not promised to keep it, and when it has been
 * long enough since the last export that the copy on disk no longer covers what has been made
 * since. All three, or nothing.
 *
 * Pure: the decision is arithmetic over a few facts, which is what makes "does this fire when it
 * should and stay quiet when it shouldn't" something a test can answer.
 */

export type BackupRiskInput = {
  /** Meditations whose audio exists only in this browser. Nothing at risk, nothing to say. */
  localOnlyCount: number
  /**
   * Whether the browser granted persistent storage. When it has, eviction is far less likely and
   * the case for interrupting someone is correspondingly weaker.
   */
  storagePersisted: boolean
  /** Epoch ms of the last successful export, or null if there has never been one. */
  lastExportAt: number | null
  /** Epoch ms the prompt was last dismissed, so declining it buys a real reprieve. */
  lastDismissedAt: number | null
  now: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/** How stale an export may get before it stops counting as cover for what is here now. */
export const EXPORT_STALE_AFTER_DAYS = 30
/**
 * Longer without the browser's promise than with it. Persistent storage is not a guarantee —
 * clearing site data still wins — so the prompt is delayed rather than retired.
 */
export const EXPORT_STALE_AFTER_DAYS_PERSISTED = 90
/** A dismissal is an answer, and re-asking the next morning would make it a worthless one. */
export const DISMISSAL_QUIET_DAYS = 14
/** Below this, the exposure is one or two files and a banner costs more than it protects. */
export const MIN_LOCAL_ONLY_FOR_PROMPT = 3

const daysBetween = (from: number, to: number) => (to - from) / DAY_MS

/**
 * Whether to offer a backup now.
 *
 * Never fires on a library that is fully synced, however old the last export: the bytes are in
 * two places already, and that is the situation an export was going to create.
 */
export const shouldPromptForBackup = (input: BackupRiskInput): boolean => {
  const { localOnlyCount, storagePersisted, lastExportAt, lastDismissedAt, now } = input

  if (!Number.isFinite(now)) return false
  if (!Number.isFinite(localOnlyCount) || localOnlyCount < MIN_LOCAL_ONLY_FOR_PROMPT) return false

  if (lastDismissedAt !== null && Number.isFinite(lastDismissedAt)) {
    if (daysBetween(lastDismissedAt, now) < DISMISSAL_QUIET_DAYS) return false
  }

  const staleAfter = storagePersisted ? EXPORT_STALE_AFTER_DAYS_PERSISTED : EXPORT_STALE_AFTER_DAYS

  // Never exported, and something here exists nowhere else. This is the first real ask.
  if (lastExportAt === null || !Number.isFinite(lastExportAt)) return true

  return daysBetween(lastExportAt, now) >= staleAfter
}

/**
 * What the prompt says.
 *
 * States the exposure rather than warning about it — the number is the argument, and a person who
 * knows twenty-eight meditations exist in one place does not need to be told that is risky.
 */
export const describeBackupRisk = (localOnlyCount: number): string => {
  const count = Math.max(0, Math.trunc(localOnlyCount))
  const noun = count === 1 ? "meditation exists" : "meditations exist"
  return `${count} ${noun} only on this device. A backup keeps a copy you control.`
}
