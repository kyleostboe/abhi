"use client"

import { useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { getAudioContext, encodeDistributionAudio, extensionForContainer } from "@/lib/audio-utils"
import { MeditationLibrary, type SavedMeditation } from "@/lib/meditation-library"
import { getPendingConvertIntent, clearPendingConvertIntent } from "@/lib/storage/pending-convert"

/**
 * When a guest chose "create an account & keep both" while converting a *library*
 * meditation's format, only the intent (which meditation, which format) was stashed before
 * the signup redirect. Once the user comes back authenticated — on whichever page they land —
 * this fetches the still-untouched original meditation, converts it, and saves the result as a
 * new library copy. The original is never touched, so both end up in the library.
 *
 * Intents raised from the Adjuster/Creator tools (kind: "tool") are handled separately, on the
 * home page, since they need in-memory tool state rather than a library lookup.
 *
 * `onSaved` must be referentially stable (useCallback) if provided.
 */
export function usePendingConvertAutoSave(onSaved?: (meditation: SavedMeditation) => void) {
  const { isAuthenticated } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!isAuthenticated) return

    const intent = getPendingConvertIntent()
    if (!intent || intent.kind !== "library") return

    let cancelled = false
    void (async () => {
      try {
        const original = await MeditationLibrary.getMeditation(intent.meditationId)
        if (!original || cancelled) return

        const sourceUrl = intent.variantAudioUrl || original.sourceAudioUrl || original.processedAudioUrl
        const response = await fetch(sourceUrl)
        if (!response.ok) throw new Error("Unable to load the original meditation's audio.")
        const arrayBuffer = await response.arrayBuffer()

        const audioContext = getAudioContext()
        if (audioContext.state === "suspended") {
          await audioContext.resume().catch(() => {})
        }
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
        if (cancelled) return

        const result = await encodeDistributionAudio(audioBuffer, {
          format: intent.targetFormat,
          maxBytes: 48 * 1024 * 1024,
          bitrate: 96000,
        })
        if (cancelled) return

        const saved = await MeditationLibrary.saveMeditation({
          title: `${original.title} (.${extensionForContainer(result.format.container)})`,
          originalFileName: original.originalFileName,
          processedAudioData: result.blob,
          duration: audioBuffer.duration,
          source: original.source,
          metadata: { ...original.metadata, audioFormat: result.format, wav: undefined },
        })
        if (cancelled) return

        clearPendingConvertIntent()
        onSaved?.(saved)
        toast({
          title: "Converted copy saved",
          description: `"${saved.title}" is now in your library, alongside the original.`,
        })
      } catch (error) {
        console.error("[v0] Failed to complete pending library conversion:", error)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, toast, onSaved])
}
