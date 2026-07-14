"use client"

import { useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { MeditationLibrary, type SavedMeditation } from "@/lib/meditation-library"
import { getPendingConvertCopy, clearPendingConvertCopy } from "@/lib/storage/pending-convert"

/**
 * When a guest chose "create an account & keep both" during a format conversion, the
 * converted audio was stashed locally before the signup redirect. Once the user comes back
 * authenticated — on whichever page they land — this saves that stash into their library.
 *
 * `onSaved` must be referentially stable (useCallback) if provided.
 */
export function usePendingConvertAutoSave(onSaved?: (meditation: SavedMeditation) => void) {
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!isAuthenticated) return

    let cancelled = false
    void (async () => {
      const pending = await getPendingConvertCopy()
      if (!pending || cancelled) return

      try {
        const saved = await MeditationLibrary.saveMeditation({
          title: pending.meta.title,
          originalFileName: pending.meta.originalFileName,
          processedAudioData: pending.audio,
          duration: pending.meta.duration,
          source: pending.meta.source,
          metadata: {
            audioFormat: pending.meta.audioFormat,
          },
        })
        if (cancelled) return
        await clearPendingConvertCopy()
        onSaved?.(saved)
        toast({
          title: "Converted copy saved",
          description: `"${pending.meta.title}" is now in your library.`,
        })
      } catch (error) {
        console.error("[v0] Failed to save pending converted copy:", error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, toast, onSaved])
}
