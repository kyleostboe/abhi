"use client"

import { useEffect, useState } from "react"

import { type BackupJobState, getBackupJobState, subscribeToBackupJob } from "@/lib/backup-job"

/**
 * The running backup, from wherever it was started.
 *
 * Seeded from module memory rather than from idle, so a page that mounts in the middle of a job —
 * a swipe away and back — renders the progress that is actually happening instead of an idle bar.
 */
export function useBackupJob(): BackupJobState {
  const [state, setState] = useState<BackupJobState>(getBackupJobState)

  useEffect(() => {
    // Re-read on subscribe: the job may have moved on between this render and the effect.
    setState(getBackupJobState())
    return subscribeToBackupJob(setState)
  }, [])

  return state
}
