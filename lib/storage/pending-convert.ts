import type { AudioExportFormat } from "@/lib/audio-utils"

// A guest who chose "create an account & keep both" during a format conversion gets sent
// straight to sign-up — we only stash *what* they wanted converted, not the converted audio
// itself, so no encoding work happens before we even know they'll finish signing up. The
// actual conversion runs after they're back and authenticated, using whichever original audio
// is available at that point (the existing library meditation, or the restored tool session).

const KEY = "abhi_pending_convert_intent"

export type PendingConvertIntent =
  | { kind: "library"; meditationId: string; targetFormat: AudioExportFormat }
  | { kind: "tool"; context: "adjuster" | "creator"; targetFormat: AudioExportFormat }

export function savePendingConvertIntent(intent: PendingConvertIntent): void {
  window.localStorage.setItem(KEY, JSON.stringify(intent))
}

export function getPendingConvertIntent(): PendingConvertIntent | null {
  const raw = window.localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as PendingConvertIntent
  } catch (error) {
    console.warn("[v0] Unable to read pending convert intent:", error)
    return null
  }
}

export function clearPendingConvertIntent(): void {
  window.localStorage.removeItem(KEY)
}
