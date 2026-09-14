"use client"

import { MeditationLibrary } from "@/lib/meditation-library"
import type { BackupReport } from "@/lib/backup-audio"

/**
 * The one in-flight backup, held outside the page that started it.
 *
 * Exporting zips the whole library and importing unpacks it — minutes, for a library of any size —
 * and the progress for both is rendered by the `StorageBar`, which is ordinary inline page
 * content. So the page was fully swipeable throughout: a swipe unmounted it, every `setProgress`
 * landed on a component that was gone, and coming back showed a Library with no sign that
 * anything was happening. An interrupted *import* is the bad version of that, since it is
 * half-applied and silent.
 *
 * Marking the bar `data-no-swipe` was the cheap alternative and does not work: it only declines a
 * gesture that starts on the bar, and the page is swipeable everywhere else.
 *
 * Module memory plus subscribers, the same shape as `hooks/use-persisted-choice.ts` and
 * `lib/data-cache.ts` — minus the storage mirror, because a job genuinely cannot survive a reload
 * and there is nothing to pretend otherwise about.
 */
export type BackupJobKind = "export" | "import"

export interface BackupJobState {
  /** What is running, or null when nothing is. */
  kind: BackupJobKind | null
  /**
   * Progress for either job. Export reports a percentage only while it is pulling audio back
   * from R2, which is the part with countable milestones; the zip itself is one long step.
   */
  progress: { progress: number; message: string } | null
}

const IDLE: BackupJobState = { kind: null, progress: null }

let state: BackupJobState = IDLE
const listeners = new Set<(state: BackupJobState) => void>()

function publish(next: BackupJobState) {
  state = next
  for (const listener of [...listeners]) listener(next)
}

export function getBackupJobState(): BackupJobState {
  return state
}

export function subscribeToBackupJob(listener: (state: BackupJobState) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Whether something is already running. Two backups at once would fight over the same rows. */
export function isBackupRunning(): boolean {
  return state.kind !== null
}

/**
 * Zip the library and hand the file to the browser.
 *
 * Resolves when the job finishes, rejecting on failure, so the page that started it can still
 * raise a toast — but the job's *state* is here, so a page that arrives mid-job sees it too.
 */
export async function runExport(): Promise<BackupReport | null> {
  if (isBackupRunning()) return null
  publish({ kind: "export", progress: null })
  try {
    const { blob, report } = await MeditationLibrary.exportBackup((progress, message) => {
      publish({ kind: "export", progress: { progress, message } })
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `abhi-backup-${new Date().toISOString().split("T")[0]}.zip`
    anchor.click()
    URL.revokeObjectURL(url)
    // Handed back so the page can say what the file does not contain. The zip carries the same
    // report, but nobody opens a backup they have not needed yet.
    return report
  } finally {
    publish(IDLE)
  }
}

/** Unpack a backup zip back into the library. */
export async function runImport(file: File): Promise<void> {
  if (isBackupRunning()) return
  publish({ kind: "import", progress: { progress: 0, message: "Starting import..." } })
  try {
    await MeditationLibrary.importBackup(file, (progress, message) => {
      publish({ kind: "import", progress: { progress, message } })
    })
  } finally {
    publish(IDLE)
  }
}
