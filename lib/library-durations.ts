/**
 * Duration modes for the Library.
 *
 * A saved meditation can be played at several lengths: its original, a quick-adjust preset, or
 * a separately saved variant. This module owns the shape of those modes and the pure functions
 * that parse, format, scale and order them.
 *
 * No React and no storage access — everything here is data in, data out, which is what makes it
 * directly testable.
 */

import type { SavedMeditation } from "@/lib/meditation-library"

export type LibraryTimelineEntry = NonNullable<SavedMeditation["metadata"]["timeline"]>[number]

export type QuickAdjustPreset = {
  id: string
  label: string
  seconds: number
}

export type DurationMode = {
  id: string
  label: string
  seconds: number
  playbackRate: number
  timeline: LibraryTimelineEntry[]
  source: "original" | "quick-adjust" | "saved"
  persisted: boolean
  presetId?: string | null
  audioUrl: string
  sourceAudioUrl?: string | null
}

export type StoredDurationMode = {
  id: string
  label: string
  seconds: number
  playbackRate: number
  timeline: LibraryTimelineEntry[]
  presetId?: string | null
  audioUrl?: string | null
  sourceAudioUrl?: string | null
}

export type StoredMeditationDurations = {
  modes: StoredDurationMode[]
  lastPlayedId?: string
  lastPlayedSeconds?: number
  lastPlayedLabel?: string
}


export const DEFAULT_PRESETS: QuickAdjustPreset[] = [
  { id: "preset-10m", label: "10m", seconds: 10 * 60 },
  { id: "preset-30m", label: "30m", seconds: 30 * 60 },
  { id: "preset-1h", label: "1h", seconds: 60 * 60 },
]

export const QUICK_ADJUST_PRESETS_KEY = "library.quickAdjustPresets"
export const QUICK_ADJUST_DURATIONS_KEY = "library.quickAdjustDurations"

export const formatDurationLabelFromSeconds = (seconds: number) => {
  if (!Number.isFinite(seconds)) {
    return "--"
  }

  if (seconds <= 0) {
    return "0s"
  }

  const totalSeconds = Math.max(0, Math.round(seconds))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const remainingSeconds = totalSeconds % 60

  const parts: string[] = []

  if (hours > 0) {
    parts.push(`${hours}h`)
  }

  if (minutes > 0) {
    parts.push(`${minutes}m`)
  }

  if (remainingSeconds > 0 && hours === 0) {
    parts.push(`${remainingSeconds}s`)
  } else if (parts.length === 0) {
    parts.push(`${remainingSeconds}s`)
  }

  return parts.join(" ")
}

export const parseDurationInput = (value: string): number | null => {
  const raw = value.trim().toLowerCase()
  if (!raw) return null

  if (raw.includes(":")) {
    const parts = raw.split(":").map((part) => Number.parseFloat(part))
    if (parts.some((part) => Number.isNaN(part))) {
      return null
    }
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts
      return hours * 3600 + minutes * 60 + seconds
    }
    if (parts.length === 2) {
      const [minutes, seconds] = parts
      return minutes * 60 + seconds
    }
    if (parts.length === 1) {
      return parts[0]
    }
    return null
  }

  const comboMatch = raw.match(/^(\d+)\s*h(?:\s*(\d+)\s*m)?$/)
  if (comboMatch) {
    const hours = Number.parseInt(comboMatch[1] ?? "0", 10)
    const minutes = Number.parseInt(comboMatch[2] ?? "0", 10)
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      return null
    }
    return hours * 3600 + minutes * 60
  }

  const match = raw.match(/^(\d+(?:\.\d+)?)(h|m)?$/)
  if (match) {
    const valueNum = Number.parseFloat(match[1])
    if (Number.isNaN(valueNum)) {
      return null
    }
    const unit = match[2] ?? "m"
    if (unit === "h") {
      return valueNum * 3600
    }
    return valueNum * 60
  }

  const asNumber = Number.parseFloat(raw)
  if (!Number.isNaN(asNumber) && asNumber > 0) {
    return asNumber * 60
  }

  return null
}

export const scaleTimelineEvents = (
  events: LibraryTimelineEntry[] | undefined,
  baseDuration: number,
  targetDuration: number,
): LibraryTimelineEntry[] => {
  if (!Array.isArray(events)) {
    return []
  }
  if (!Number.isFinite(baseDuration) || baseDuration <= 0) {
    return events.map((event) => ({ ...event }))
  }
  const ratio = targetDuration / baseDuration
  return events.map((event) => {
    const scaled: LibraryTimelineEntry = { ...event }
    if (Number.isFinite(event.startTime)) {
      scaled.startTime = Math.max(0, event.startTime * ratio)
    }
    if (Number.isFinite(event.endTime)) {
      scaled.endTime = Math.max(0, event.endTime * ratio)
    }
    if (Number.isFinite(event.duration ?? Number.NaN)) {
      scaled.duration = Math.max(0, (event.duration ?? 0) * ratio)
    }
    return scaled
  })
}

export const cloneTimeline = (events: LibraryTimelineEntry[] | undefined) =>
  Array.isArray(events) ? events.map((event) => ({ ...event })) : []

export const normalizeDurationMode = (mode: DurationMode): DurationMode => {
  let nextPlaybackRate = mode.playbackRate

  if (!Number.isFinite(nextPlaybackRate) || nextPlaybackRate <= 0) {
    nextPlaybackRate = 1
  }

  if (
    mode.id !== "original" &&
    mode.persisted &&
    typeof mode.audioUrl === "string" &&
    mode.audioUrl.length > 0 &&
    Math.abs(nextPlaybackRate - 1) > 0.001
  ) {
    nextPlaybackRate = 1
  }

  if (nextPlaybackRate === mode.playbackRate) {
    return mode
  }

  return { ...mode, playbackRate: nextPlaybackRate }
}

export const buildDurationModeFromStored = (
  stored: StoredDurationMode,
  source: DurationMode["source"],
  fallbackAudioUrl: string,
  fallbackSourceAudioUrl?: string | null,
): DurationMode => {
  const storedPlaybackRate = Number.isFinite(stored.playbackRate) && stored.playbackRate > 0 ? stored.playbackRate : 1
  const playbackRate = typeof stored.audioUrl === "string" && stored.audioUrl.length > 0 ? 1 : storedPlaybackRate

  const mode: DurationMode = {
    id: stored.id,
    label: stored.label,
    seconds: stored.seconds,
    playbackRate,
    timeline: cloneTimeline(stored.timeline),
    source,
    persisted: true,
    presetId: stored.presetId,
    audioUrl: stored.audioUrl ?? fallbackAudioUrl,
    sourceAudioUrl: stored.sourceAudioUrl ?? fallbackSourceAudioUrl ?? null,
  }

  return normalizeDurationMode(mode)
}

export const sortDurationModes = (modes: DurationMode[]) =>
  [...modes].sort((a, b) => {
    if (a.id === "original") return -1
    if (b.id === "original") return 1
    return a.seconds - b.seconds
  })
