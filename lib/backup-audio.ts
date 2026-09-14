/**
 * Deciding what a backup can actually contain, before any of it is zipped.
 *
 * `exportBackup` used to read every blob from IndexedDB and skip whatever was not there. That is
 * fine on the browser that made the recording and quietly wrong everywhere else: sign in on a new
 * device, or let Safari clear site data, and the export still succeeds — with complete metadata,
 * notes and sessions, and no audio at all. A backup that reports success and cannot restore a
 * single meditation is worse than one that fails, because you only find out when you need it.
 *
 * Processed audio has a second home: rows saved since migration 013 carry an `audio_key` and the
 * bytes are in R2, so the local cache being empty is recoverable. Source audio and the per-event
 * voice clips of a Creator timeline have no such key — they were never uploaded — so when the
 * cache is gone they are simply gone, and the honest thing is to say so rather than write a zip
 * that looks whole.
 *
 * Pure: no network, no IndexedDB, no React. The caller gathers what exists and this decides what
 * to do about it.
 */

export type MeditationAudioState = {
  id: string
  /** The processed audio blob is in the local cache. */
  hasLocalProcessed: boolean
  /** R2 object key for the processed audio; null for rows saved before R2 storage existed. */
  processedKey: string | null
  /**
   * Storage keys of the timeline events that are recorded voice, from the stored metadata — what
   * a complete backup of this meditation would have to include.
   */
  recordingKeys: string[]
  /** Storage keys actually present in the local cache. */
  availableRecordingKeys: string[]
}

export type BackupAudioPlan = {
  /** Ids whose processed audio has to be pulled from R2 before it can be zipped. */
  fetchFromR2: string[]
  /** Ids with no processed audio anywhere — nothing to zip and nothing to recover it from. */
  missingProcessed: string[]
  /** Id to the number of voice clips that cannot be included, for the ids that are missing any. */
  missingRecordings: Record<string, number>
}

const uniqueInOrder = (values: string[]): string[] => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    if (value && !seen.has(value)) {
      seen.add(value)
      result.push(value)
    }
  }
  return result
}

/**
 * Sorts each meditation into "already have it", "can fetch it" and "cannot get it at all".
 *
 * Voice clips are counted rather than listed because the count is what a person can act on — one
 * missing clip out of twelve is a different situation from twelve out of twelve, and neither is
 * helped by a list of storage keys.
 */
export const planBackupAudio = (states: MeditationAudioState[]): BackupAudioPlan => {
  const fetchFromR2: string[] = []
  const missingProcessed: string[] = []
  const missingRecordings: Record<string, number> = {}

  for (const state of states) {
    if (!state.hasLocalProcessed) {
      if (state.processedKey) {
        fetchFromR2.push(state.id)
      } else {
        missingProcessed.push(state.id)
      }
    }

    const available = new Set(state.availableRecordingKeys)
    const missing = uniqueInOrder(state.recordingKeys).filter((key) => !available.has(key)).length
    if (missing > 0) {
      missingRecordings[state.id] = missing
    }
  }

  return { fetchFromR2, missingProcessed, missingRecordings }
}

/**
 * What the finished zip actually holds, written into it as `export-report.json`.
 *
 * It is built after the downloads rather than from the plan alone, because a presigned URL can
 * expire or a fetch can fail, and a report that describes the intention instead of the outcome is
 * the same lie in a new place.
 */
export type BackupReport = {
  /** ISO timestamp, so a zip found later can be placed in time. */
  exportedAt: string
  meditationCount: number
  /** Meditations with no processed audio in this file. */
  missingProcessed: string[]
  /** How many of those were recovered from R2 rather than the local cache. */
  recoveredFromR2: number
  missingRecordings: Record<string, number>
  /** True when every meditation has its processed audio and every voice clip is present. */
  isComplete: boolean
}

export const buildBackupReport = (
  plan: BackupAudioPlan,
  recovered: Iterable<string>,
  meditationCount: number,
  exportedAt: string,
): BackupReport => {
  const recoveredSet = new Set(recovered)
  // An id that was meant to come from R2 and did not is missing, whatever the plan hoped.
  const failed = plan.fetchFromR2.filter((id) => !recoveredSet.has(id))
  const missingProcessed = uniqueInOrder([...plan.missingProcessed, ...failed])

  return {
    exportedAt,
    meditationCount,
    missingProcessed,
    recoveredFromR2: plan.fetchFromR2.filter((id) => recoveredSet.has(id)).length,
    missingRecordings: { ...plan.missingRecordings },
    isComplete: missingProcessed.length === 0 && Object.keys(plan.missingRecordings).length === 0,
  }
}

/**
 * One sentence for a toast, or null when there is nothing to warn about.
 *
 * Separate from the report because the report is a record and this is a message: the export
 * should say plainly that something could not be included, rather than reporting success and
 * leaving the gap to be discovered during a restore.
 */
export const describeBackupGaps = (report: BackupReport): string | null => {
  if (report.isComplete) return null

  const parts: string[] = []
  const audioCount = report.missingProcessed.length
  if (audioCount > 0) {
    parts.push(`${audioCount} meditation${audioCount === 1 ? "" : "s"} without audio`)
  }

  const clipCount = Object.values(report.missingRecordings).reduce((total, count) => total + count, 0)
  if (clipCount > 0) {
    parts.push(`${clipCount} voice recording${clipCount === 1 ? "" : "s"}`)
  }

  return `${parts.join(" and ")} could not be included.`
}
