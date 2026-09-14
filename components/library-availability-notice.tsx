"use client"

import { useEffect, useState } from "react"
import { CloudOff, Download, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { SavedMeditation } from "@/lib/meditation-library"
import {
  describeMissingAudio,
  shouldShowMissingAudioNotice,
  summarizeAvailability,
} from "@/lib/library-availability"
import { describeBackupRisk, shouldPromptForBackup } from "@/lib/backup-reminder"
import { isStoragePersisted } from "@/lib/storage-persistence"

/**
 * The two things the library has to say about where audio is, and neither of them on a timer.
 *
 * The first is for arriving on a second device: past the sync allowance a meditation's audio stays
 * in the browser that made it, so the library here lists rows it cannot play. Left unexplained
 * that reads as the app being broken. Named — "28 meditations have their audio on your iPhone" —
 * it reads as a thing you understand, and the fix is a backup you already have.
 *
 * The second is the inverse, on the device that does hold them: something here exists in exactly
 * one place. That one is deliberately hard to trigger. A recurring banner about impending data
 * loss is a small dose of anxiety on the way into a sit, and `shouldPromptForBackup` exists to
 * make sure it appears when there is genuinely something to lose and stays silent otherwise.
 */
export function LibraryAvailabilityNotice({
  meditations,
  recordings,
  lastExportAt,
  lastPromptDismissedAt,
  onExportBackup,
  onDismissBackupPrompt,
}: {
  meditations: SavedMeditation[]
  recordings: SavedMeditation[]
  lastExportAt: number | null
  lastPromptDismissedAt: number | null
  onExportBackup: () => void
  onDismissBackupPrompt: () => void
}) {
  // Whether the browser promised to keep what is here, which decides how long an export counts as
  // cover. Read once — it only changes when something asks it to.
  const [storagePersisted, setStoragePersisted] = useState(true)

  useEffect(() => {
    let active = true
    void isStoragePersisted().then((persisted) => {
      if (active) setStoragePersisted(persisted)
    })
    return () => {
      active = false
    }
  }, [])

  const items = [...meditations, ...recordings].map((item) => ({
    id: item.id,
    hasAudioKey: item.audioAvailability === "synced",
    hasLocalAudio: item.audioAvailability === "local",
    deviceLabel: item.audioDeviceLabel,
  }))

  const availability = summarizeAvailability(items)
  const missingMessage = shouldShowMissingAudioNotice(availability)
    ? describeMissingAudio(availability)
    : null

  const localOnlyCount = availability.playableHere - availability.synced
  const showBackupPrompt =
    missingMessage === null &&
    shouldPromptForBackup({
      localOnlyCount,
      storagePersisted,
      lastExportAt,
      lastDismissedAt: lastPromptDismissedAt,
      now: Date.now(),
    })

  if (!missingMessage && !showBackupPrompt) return null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-2">
      {missingMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
          <CloudOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-foreground">{missingMessage}</p>
            <p className="mt-1 text-muted-foreground">
              Restore a backup from that device to play them here.
            </p>
          </div>
        </div>
      )}

      {showBackupPrompt && (
        <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-3 text-sm">
          <Download className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-foreground">{describeBackupRisk(localOnlyCount)}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={onExportBackup}>
                Back up now
              </Button>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0"
            onClick={onDismissBackupPrompt}
            aria-label="Dismiss backup reminder"
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  )
}
