"use client"

import type React from "react"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { createPortal } from "react-dom"
import type { MouseEvent, ChangeEvent } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MeditationLibrary, type SavedMeditation, type Playlist } from "@/lib/meditation-library"
import { getAudioContext } from "@/lib/audio-utils"
import { runAdjusterWorkflow } from "@/lib/adjuster-workflow"
import { cn } from "@/lib/utils"
import { useJournal } from "@/hooks/use-journal"
import { useAuth } from "@/hooks/use-auth"
import {
  Trash2,
  Clock,
  Calendar,
  FolderPlus,
  Edit2,
  X,
  SlidersHorizontal,
  MoreVertical,
  SkipBack,
  SkipForward,
  Play,
  Pause,
  Download,
  ChevronDown,
  Music,
  Volume2,
  Wand2,
  Loader2,
  Plus,
  NotebookPen,
  BookOpenCheck,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { StorageBar } from "@/components/storage-bar"
import { AuthButtons } from "@/components/auth-buttons"

type LibraryTimelineEntry = NonNullable<SavedMeditation["metadata"]["timeline"]>[number]

type QuickAdjustPreset = {
  id: string
  label: string
  seconds: number
}

type DurationMode = {
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

type StoredDurationMode = {
  id: string
  label: string
  seconds: number
  playbackRate: number
  timeline: LibraryTimelineEntry[]
  presetId?: string | null
  audioUrl?: string | null
  sourceAudioUrl?: string | null
}

type StoredMeditationDurations = {
  modes: StoredDurationMode[]
  lastPlayedId?: string
  lastPlayedSeconds?: number
  lastPlayedLabel?: string
}

type MeditationGroup = {
  base: SavedMeditation
  variants: SavedMeditation[]
}

const DEFAULT_PRESETS: QuickAdjustPreset[] = [
  { id: "preset-10m", label: "10m", seconds: 10 * 60 },
  { id: "preset-30m", label: "30m", seconds: 30 * 60 },
  { id: "preset-1h", label: "1h", seconds: 60 * 60 },
]

const QUICK_ADJUST_PRESETS_KEY = "library.quickAdjustPresets"
const QUICK_ADJUST_DURATIONS_KEY = "library.quickAdjustDurations"

const formatDurationLabelFromSeconds = (seconds: number) => {
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

const parseDurationInput = (value: string): number | null => {
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

const scaleTimelineEvents = (
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

const cloneTimeline = (events: LibraryTimelineEntry[] | undefined) =>
  Array.isArray(events) ? events.map((event) => ({ ...event })) : []

const normalizeDurationMode = (mode: DurationMode): DurationMode => {
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

const buildDurationModeFromStored = (
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

const sortDurationModes = (modes: DurationMode[]) =>
  [...modes].sort((a, b) => {
    if (a.id === "original") return -1
    if (b.id === "original") return 1
    return a.seconds - b.seconds
  })

export default function LibraryPage() {
  const [meditations, setMeditations] = useState<SavedMeditation[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activeTab, setActiveTab] = useState<"meditations" | "playlists">("meditations")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<"all" | "adjuster" | "encoder">("all")
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [selectedMeditation, setSelectedMeditation] = useState<SavedMeditation | null>(null)
  const [baseMeditation, setBaseMeditation] = useState<SavedMeditation | null>(null)
  const { entries: journalEntries, recordPlayback: recordJournalPlayback } = useJournal()
  const [hasRecordedJournalEntry, setHasRecordedJournalEntry] = useState(false)
  const [isJournalHistoryOpen, setIsJournalHistoryOpen] = useState(false)
  const [activeJournalEntryId, setActiveJournalEntryId] = useState<string | null>(null)
  const [handledMeditationParam, setHandledMeditationParam] = useState<string | null>(null)
  const [pendingJournalEntryId, setPendingJournalEntryId] = useState<string | null>(null)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [playerTime, setPlayerTime] = useState(0)
  const [playerDuration, setPlayerDuration] = useState(0)
  const [isWideLayout, setIsWideLayout] = useState(false)
  const [playingTimelineEventId, setPlayingTimelineEventId] = useState<string | null>(null)
  const [playerPortalElement, setPlayerPortalElement] = useState<HTMLElement | null>(null)
  const [currentDurationModes, setCurrentDurationModes] = useState<DurationMode[]>([])
  const [activeDurationModeId, setActiveDurationModeId] = useState<string>("original")
  const [currentPlaybackRate, setCurrentPlaybackRate] = useState(1)
  const [quickAdjustPresets, setQuickAdjustPresets] = useState<QuickAdjustPreset[]>(DEFAULT_PRESETS)
  const [isQuickAdjustDialogOpen, setIsQuickAdjustDialogOpen] = useState(false)
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    DEFAULT_PRESETS.length > 0 ? DEFAULT_PRESETS[0].id : null,
  )
  const [isEditingPresets, setIsEditingPresets] = useState(false)
  const [newPresetValue, setNewPresetValue] = useState("")
  const [isQuickAdjustProcessing, setIsQuickAdjustProcessing] = useState(false)
  const [quickAdjustProgress, setQuickAdjustProgress] = useState(0)
  const [quickAdjustStep, setQuickAdjustStep] = useState("")
  const [pendingAdjustmentId, setPendingAdjustmentId] = useState<string | null>(null)
  const [savedDurationsMap, setSavedDurationsMap] = useState<Record<string, StoredMeditationDurations>>({})
  const [lastPlayedDurationMap, setLastPlayedDurationMap] = useState<
    Record<string, { label: string; seconds: number }>
  >({})
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadTitle, setUploadTitle] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [storageUsage, setStorageUsage] = useState<{ usedBytes: number; quotaBytes?: number }>({ usedBytes: 0 })

  const [showTitleDialog, setShowTitleDialog] = useState(false)
  const [draggedFile, setDraggedFile] = useState<File | null>(null)
  const [audioFileTitle, setAudioFileTitle] = useState("")

  const [isBackupLoading, setIsBackupLoading] = useState(false)
  const [backupProgress, setBackupProgress] = useState<{ progress: number; message: string } | null>(null)
  const { isAuthenticated, login, status } = useAuth()
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timelineAudioRef = useRef<HTMLAudioElement | null>(null)
  const presetsPersistReadyRef = useRef(false)
  const durationsPersistReadyRef = useRef(false)
  const backupInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobileDevice = useMobile()

  const [playlistMeditationsMap, setPlaylistMeditationsMap] = useState<Record<string, SavedMeditation[]>>({})

  const clearLibraryData = async () => {
    if (!window.confirm("Are you sure you want to clear all library data? This cannot be undone.")) {
      return
    }
    try {
      await MeditationLibrary.clearAllData()
      await loadData()
      toast({
        title: "Library cleared",
        description: "All meditations and data have been removed.",
      })
    } catch (error) {
      console.error("Failed to clear library:", error)
      toast({
        title: "Error",
        description: "Failed to clear library data.",
        variant: "destructive",
      })
    }
  }

  const convertModeToStored = useCallback(
    (mode: DurationMode): StoredDurationMode => ({
      id: mode.id,
      label: mode.label,
      seconds: mode.seconds,
      playbackRate: mode.playbackRate,
      timeline: cloneTimeline(mode.timeline),
      presetId: mode.presetId ?? null,
      audioUrl: mode.audioUrl,
      sourceAudioUrl: mode.sourceAudioUrl ?? null,
    }),
    [],
  )

  const updateSavedDurations = useCallback(
    (
      meditationId: string,
      updater: (existing: StoredMeditationDurations | undefined) => StoredMeditationDurations | undefined,
    ) => {
      setSavedDurationsMap((previous) => {
        const next = { ...previous }
        const updated = updater(previous[meditationId])
        if (!updated) {
          delete next[meditationId]
        } else {
          next[meditationId] = updated
        }
        return next
      })
    },
    [],
  )

  const loadData = useCallback(async () => {
    try {
      const meditationsData = await MeditationLibrary.getAllMeditations()
      setMeditations(meditationsData)
      const playlistsData = await MeditationLibrary.getAllPlaylists()
      setPlaylists(playlistsData)
      const playlistMeditationsPromises = playlistsData.map(async (playlist) => {
        const meditations = await MeditationLibrary.getPlaylistMeditations(playlist.id)
        return [playlist.id, meditations] as [string, SavedMeditation[]]
      })
      const playlistMeditationsMapData = Object.fromEntries(await Promise.all(playlistMeditationsPromises))
      setPlaylistMeditationsMap(playlistMeditationsMapData)
      const usage = await MeditationLibrary.getStorageUsage()
      setStorageUsage(usage)
    } catch (error) {
      console.error("[v0] Failed to load library data:", error)
      toast({
        title: "Error loading library",
        description: "Please refresh the page.",
        variant: "destructive",
      })
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [isAuthenticated, loadData])

  useEffect(() => {
    if (typeof window === "undefined") return

    try {
      const storedPresets = window.localStorage.getItem(QUICK_ADJUST_PRESETS_KEY)
      if (storedPresets) {
        const parsed = JSON.parse(storedPresets) as QuickAdjustPreset[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuickAdjustPresets(parsed)
          setSelectedPresetId(parsed[0]?.id ?? null)
        }
      }
    } catch (error) {
      console.warn("[v0] Failed to restore quick adjust presets:", error)
    }

    try {
      const storedDurations = window.localStorage.getItem(QUICK_ADJUST_DURATIONS_KEY)
      if (storedDurations) {
        const parsed = JSON.parse(storedDurations) as Record<string, StoredMeditationDurations>
        if (parsed && typeof parsed === "object") {
          setSavedDurationsMap(parsed)
          const lastPlayed: Record<string, { label: string; seconds: number }> = {}
          Object.entries(parsed).forEach(([meditationId, data]) => {
            if (!data) return
            const label = data.lastPlayedLabel
            const seconds = data.lastPlayedSeconds
            if (label && typeof seconds === "number" && Number.isFinite(seconds)) {
              lastPlayed[meditationId] = { label, seconds }
            }
          })
          setLastPlayedDurationMap(lastPlayed)
        }
      }
    } catch (error) {
      console.warn("[v0] Failed to restore saved durations:", error)
    }
  }, [])

  useEffect(() => {
    setPlayerPortalElement(document.body)
    return () => {
      setPlayerPortalElement(null)
    }
  }, [])

  const handleExportBackup = useCallback(async () => {
    try {
      setIsBackupLoading(true)
      toast({ title: "Exporting backup...", description: "This may take a moment for large libraries." })

      const blob = await MeditationLibrary.exportBackup()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = `abhi-backup-${new Date().toISOString().split("T")[0]}.zip`
      anchor.click()
      URL.revokeObjectURL(url)

      toast({
        title: "Backup exported",
        description: "Your meditations and audio were saved to a ZIP file.",
      })
    } catch (error) {
      console.error("Unable to export backup", error)
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Could not create a backup. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsBackupLoading(false)
    }
  }, [toast])

  const handleImportBackup = useCallback(
    async (file: File) => {
      try {
        setIsBackupLoading(true)
        setBackupProgress({ progress: 0, message: "Starting import..." })

        await MeditationLibrary.importBackup(file, (progress, message) => {
          setBackupProgress({ progress, message })
        })

        await loadData()

        toast({
          title: "Backup restored",
          description: "All meditations and audio have been restored successfully.",
        })
      } catch (error) {
        console.error("Unable to import backup", error)
        toast({
          title: "Import failed",
          description: error instanceof Error ? error.message : "We couldn't read that backup file.",
          variant: "destructive",
        })
      } finally {
        setIsBackupLoading(false)
        setBackupProgress(null)
        if (backupInputRef.current) {
          backupInputRef.current.value = ""
        }
      }
    },
    [loadData, toast],
  )

  const handleBackupFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        void handleImportBackup(file)
      }
    },
    [handleImportBackup],
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)")

    const updateLayout = () => {
      setIsWideLayout(mediaQuery.matches)
    }

    updateLayout()

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateLayout)
      return () => mediaQuery.removeEventListener("change", updateLayout)
    }

    mediaQuery.addListener(updateLayout)
    return () => mediaQuery.removeListener(updateLayout)
  }, [])

  useEffect(() => {
    if (!presetsPersistReadyRef.current) {
      presetsPersistReadyRef.current = true
      return
    }
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(QUICK_ADJUST_PRESETS_KEY, JSON.stringify(quickAdjustPresets))
    } catch (error) {
      console.warn("[v0] Failed to persist quick adjust presets:", error)
    }
  }, [quickAdjustPresets])

  useEffect(() => {
    if (!durationsPersistReadyRef.current) {
      durationsPersistReadyRef.current = true
      return
    }
    if (typeof window === "undefined") return
    try {
      window.localStorage.setItem(QUICK_ADJUST_DURATIONS_KEY, JSON.stringify(savedDurationsMap))
    } catch (error) {
      console.warn("[v0] Failed to persist saved durations:", error)
    }
  }, [savedDurationsMap])

  useEffect(() => {
    const nextMap: Record<string, { label: string; seconds: number }> = {}
    Object.entries(savedDurationsMap).forEach(([meditationId, data]) => {
      if (!data) return
      const label = data.lastPlayedLabel
      const seconds = data.lastPlayedSeconds
      if (label && typeof seconds === "number" && Number.isFinite(seconds)) {
        nextMap[meditationId] = { label, seconds }
      }
    })
    setLastPlayedDurationMap(nextMap)
  }, [savedDurationsMap])

  const allMeditationsMap = useMemo(() => {
    const map = new Map<string, SavedMeditation>()
    meditations.forEach((meditation) => {
      map.set(meditation.id, meditation)
    })
    return map
  }, [meditations])

  const filteredMeditations = useMemo(
    () =>
      meditations.filter((med) => {
        const lowerSearch = searchQuery.toLowerCase()
        const matchesSearch =
          med.title.toLowerCase().includes(lowerSearch) || med.originalFileName.toLowerCase().includes(lowerSearch)
        const matchesSource = sourceFilter === "all" || med.source === sourceFilter

        return matchesSearch && matchesSource
      }),
    [meditations, searchQuery, sourceFilter],
  )

  const groupMeditations = useCallback(
    (items: SavedMeditation[], includeExternalParent: boolean): MeditationGroup[] => {
      if (!Array.isArray(items) || items.length === 0) {
        return []
      }

      const itemMap = new Map(items.map((item) => [item.id, item]))
      const groups = new Map<string, MeditationGroup>()

      items.forEach((meditation) => {
        const rawParentId =
          typeof meditation.metadata?.linkedParentId === "string" ? meditation.metadata.linkedParentId.trim() : ""
        const hasLinkedParent = rawParentId.length > 0 && rawParentId !== meditation.id
        let parent: SavedMeditation | undefined

        if (hasLinkedParent) {
          parent = itemMap.get(rawParentId)
          if (!parent && includeExternalParent) {
            parent = allMeditationsMap.get(rawParentId)
          }
        }

        if (!parent) {
          parent = meditation
        }

        const groupId = parent.id
        let group = groups.get(groupId)
        if (!group) {
          group = { base: parent, variants: [] }
          groups.set(groupId, group)
        }

        if (meditation.id === parent.id) {
          group.base = meditation
        } else if (!group.variants.some((variant) => variant.id === meditation.id)) {
          group.variants.push(meditation)
        }
      })

      return Array.from(groups.values()).sort((a, b) => b.base.createdAt.getTime() - a.base.createdAt.getTime())
    },
    [allMeditationsMap],
  )

  const displayedGroups = useMemo<MeditationGroup[]>(() => {
    if (selectedPlaylist) {
      const playlistItems = playlistMeditationsMap[selectedPlaylist] || []
      return groupMeditations(playlistItems, false)
    }
    return groupMeditations(filteredMeditations, true)
  }, [selectedPlaylist, playlistMeditationsMap, filteredMeditations, groupMeditations])

  const journalEntriesForSelectedMeditation = useMemo(() => {
    if (!selectedMeditation) return []
    return journalEntries
      .filter((entry) => entry.meditationId === selectedMeditation.id)
      .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
  }, [journalEntries, selectedMeditation])

  const activeJournalEntry = activeJournalEntryId
    ? (journalEntriesForSelectedMeditation.find((entry) => entry.id === activeJournalEntryId) ?? null)
    : (journalEntriesForSelectedMeditation[0] ?? null)

  useEffect(() => {
    setHasRecordedJournalEntry(false)
  }, [selectedMeditation?.id])

  useEffect(() => {
    if (isAudioPlaying && selectedMeditation && !hasRecordedJournalEntry) {
      void recordJournalPlayback({ id: selectedMeditation.id, title: selectedMeditation.title })
      setHasRecordedJournalEntry(true)
    }
  }, [isAudioPlaying, selectedMeditation, hasRecordedJournalEntry, recordJournalPlayback])

  useEffect(() => {
    if (!isJournalHistoryOpen) return
    if (journalEntriesForSelectedMeditation.length > 0) {
      setActiveJournalEntryId((current) => {
        if (current && journalEntriesForSelectedMeditation.some((entry) => entry.id === current)) {
          return current
        }
        return journalEntriesForSelectedMeditation[0]?.id ?? null
      })
    } else {
      setActiveJournalEntryId(null)
    }
  }, [isJournalHistoryOpen, journalEntriesForSelectedMeditation])

  useEffect(() => {
    if (!selectedMeditation) {
      setIsJournalHistoryOpen(false)
      setActiveJournalEntryId(null)
    }
  }, [selectedMeditation])

  useEffect(() => {
    if (!pendingJournalEntryId || !selectedMeditation) return
    const hasEntry = journalEntriesForSelectedMeditation.some((entry) => entry.id === pendingJournalEntryId)
    if (hasEntry) {
      setActiveJournalEntryId(pendingJournalEntryId)
      setIsJournalHistoryOpen(true)
      setPendingJournalEntryId(null)
    }
  }, [pendingJournalEntryId, selectedMeditation, journalEntriesForSelectedMeditation])

  const handleSelectPlaylist = (playlistId: string | null) => {
    setSelectedPlaylist(playlistId)
    setSourceFilter("all")
    if (searchQuery) {
      setSearchQuery("")
    }
  }

  const handleSourceFilterChange = (filter: "all" | "adjuster" | "encoder") => {
    setSourceFilter(filter)
    setSelectedPlaylist(null)
  }

  const handleDelete = async (meditationId: string) => {
    await MeditationLibrary.deleteMeditation(meditationId)
    await loadData()
    if (selectedMeditation?.id === meditationId) {
      setIsPlayerOpen(false)
      setSelectedMeditation(null)
    }
    toast({
      title: "Meditation deleted",
      description: "The meditation has been removed from your library.",
    })
  }

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return

    try {
      await MeditationLibrary.createPlaylist(newPlaylistName.trim(), newPlaylistDescription.trim())
      setNewPlaylistName("")
      setNewPlaylistDescription("")
      await loadData()
      toast({
        title: "Playlist created",
        description: `"${newPlaylistName}" has been added to your playlists.`,
      })
    } catch (error) {
      console.error("[v0] Error creating playlist:", error)
      toast({
        title: "Error creating playlist",
        description: "There was a problem creating your playlist. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleUpdatePlaylist = async () => {
    if (!editingPlaylist || !editingPlaylist.name.trim()) return

    try {
      await MeditationLibrary.updatePlaylist(editingPlaylist.id, {
        name: editingPlaylist.name,
        description: editingPlaylist.description,
      })
      setEditingPlaylist(null)
      await loadData()
      toast({
        title: "Playlist updated",
        description: "Your playlist has been updated successfully.",
      })
    } catch (error) {
      console.error("[v0] Error updating playlist:", error)
      toast({
        title: "Error updating playlist",
        description: "There was a problem updating your playlist. Please try again.",
        variant: "destructive",
      })
    }
  }

  const timelineEvents = useMemo(() => {
    if (!selectedMeditation) {
      return []
    }

    const rawTimeline = selectedMeditation.metadata?.timeline

    if (!Array.isArray(rawTimeline)) {
      return []
    }

    return rawTimeline as LibraryTimelineEntry[]
  }, [selectedMeditation])

  const hasTimelineEvents = timelineEvents.length > 0

  const handleDeletePlaylist = async (playlistId: string) => {
    try {
      await MeditationLibrary.deletePlaylist(playlistId)
      if (selectedPlaylist === playlistId) {
        setSelectedPlaylist(null)
      }
      await loadData()
      toast({
        title: "Playlist deleted",
        description: "The playlist has been removed from your library.",
      })
    } catch (error) {
      console.error("[v0] Error deleting playlist:", error)
      toast({
        title: "Error deleting playlist",
        description: "There was a problem deleting your playlist. Please try again.",
        variant: "destructive",
      })
    }
  }

  const formatDuration = useCallback((seconds: number) => {
    return formatDurationLabelFromSeconds(seconds)
  }, [])

  const formatDetailedTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatJournalDateLabel = (isoString: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(isoString))

  const formatJournalTimeLabel = (isoString: string) =>
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(isoString))

  const getDateKeyFromIso = (isoString: string) => isoString.split("T")[0] ?? ""

  const recordLastPlayedDuration = useCallback(
    (meditation: SavedMeditation, mode: DurationMode) => {
      const label =
        mode.id === "original"
          ? `Original (${formatDuration(mode.seconds)})`
          : `${mode.label} (${formatDuration(mode.seconds)})`

      updateSavedDurations(meditation.id, (existing) => {
        const base: StoredMeditationDurations = existing
          ? { ...existing, modes: Array.isArray(existing.modes) ? existing.modes : [] }
          : { modes: [] }

        return {
          ...base,
          lastPlayedId: mode.id,
          lastPlayedSeconds: mode.seconds,
          lastPlayedLabel: label,
        }
      })
    },
    [updateSavedDurations, formatDuration],
  )

  const applyDurationMode = useCallback(
    (mode: DurationMode, baseOverride?: SavedMeditation) => {
      const base = baseOverride ?? baseMeditation
      if (!base) return

      const audio = audioRef.current
      if (audio) {
        audio.pause()
      }
      if (timelineAudioRef.current) {
        timelineAudioRef.current.pause()
        timelineAudioRef.current = null
      }
      setPlayingTimelineEventId(null)

      let meditationToUse: SavedMeditation
      if (mode.id === "original") {
        meditationToUse = { ...base }
      } else {
        const processedAudioUrl = mode.audioUrl || base.processedAudioUrl
        const sourceAudioUrl = mode.sourceAudioUrl ?? base.sourceAudioUrl

        meditationToUse = {
          ...base,
          duration: mode.seconds,
          processedAudioUrl,
          sourceAudioUrl,
          metadata: {
            ...base.metadata,
            targetDuration: mode.seconds,
            timeline: cloneTimeline(mode.timeline),
            quickAdjust: {
              ...(base.metadata.quickAdjust ?? {}),
              lastPresetId: mode.presetId ?? null,
              lastDurationId: mode.id,
            },
          },
        }
      }

      setSelectedMeditation(meditationToUse)
      setActiveDurationModeId(mode.id)
      setPlayerDuration(mode.seconds)
      setPlayerTime(0)
      setIsAudioPlaying(false)
      setCurrentPlaybackRate(mode.playbackRate)

      if (audio) {
        audio.playbackRate = mode.playbackRate
        audio.currentTime = 0
      }

      recordLastPlayedDuration(base, mode)
    },
    [
      baseMeditation,
      audioRef,
      timelineAudioRef,
      setPlayingTimelineEventId,
      setSelectedMeditation,
      setActiveDurationModeId,
      setPlayerDuration,
      setPlayerTime,
      setIsAudioPlaying,
      setCurrentPlaybackRate,
      recordLastPlayedDuration,
    ],
  )

  const applyDurationModeById = useCallback(
    (modeId: string) => {
      const mode = currentDurationModes.find((item) => item.id === modeId)
      if (!mode) return
      applyDurationMode(mode)
    },
    [currentDurationModes, applyDurationMode],
  )

  const handleSelectDurationMode = (modeId: string) => {
    if (isQuickAdjustProcessing) return
    if (modeId === activeDurationModeId) return
    applyDurationModeById(modeId)
  }

  const deriveAdjusterSettings = (meditation: SavedMeditation | null) => {
    const defaults = {
      silenceThreshold: 0.01,
      minSilenceDuration: 3,
      minSpacingDuration: 1.5,
      preserveNaturalPacing: true,
      compatibilityMode: "high",
    }

    if (!meditation) {
      return defaults
    }

    const metadata = meditation.metadata ?? {}
    const adjusterMetadata =
      (metadata as Record<string, unknown>).adjusterSettings ?? (metadata as Record<string, unknown>).adjuster ?? {}

    const pickNumber = (value: unknown, fallback: number, allowZero = false) => {
      if (typeof value === "number" && Number.isFinite(value)) {
        if (allowZero) {
          return value
        }
        if (value > 0) {
          return value
        }
      }
      return fallback
    }

    const pickBoolean = (value: unknown, fallback: boolean) => (typeof value === "boolean" ? value : fallback)

    const pickString = (value: unknown, fallback: string) =>
      typeof value === "string" && value.trim().length > 0 ? value : fallback

    return {
      silenceThreshold: pickNumber(
        (metadata as Record<string, unknown>).silenceThreshold ??
          (adjusterMetadata as Record<string, unknown>).silenceThreshold,
        defaults.silenceThreshold,
      ),
      minSilenceDuration: pickNumber(
        (metadata as Record<string, unknown>).minSilenceDuration ??
          (adjusterMetadata as Record<string, unknown>).minSilenceDuration,
        defaults.minSilenceDuration,
      ),
      minSpacingDuration: pickNumber(
        (metadata as Record<string, unknown>).minSpacingDuration ??
          (adjusterMetadata as Record<string, unknown>).minSpacingDuration,
        defaults.minSpacingDuration,
        true,
      ),
      preserveNaturalPacing: pickBoolean(
        (metadata as Record<string, unknown>).preserveNaturalPacing ??
          (adjusterMetadata as Record<string, unknown>).preserveNaturalPacing,
        defaults.preserveNaturalPacing,
      ),
      compatibilityMode: pickString(
        (metadata as Record<string, unknown>).compatibilityMode ??
          (adjusterMetadata as Record<string, unknown>).compatibilityMode,
        defaults.compatibilityMode,
      ),
    }
  }

  const handleQuickAdjust = async () => {
    if (isQuickAdjustProcessing) return
    if (!selectedPresetId || !baseMeditation) {
      toast({
        title: "Select a preset",
        description: "Choose a quick adjust preset to continue.",
      })
      return
    }

    const preset = quickAdjustPresets.find((item) => item.id === selectedPresetId)
    if (!preset) {
      toast({
        title: "Preset unavailable",
        description: "The selected preset could not be found.",
        variant: "destructive",
      })
      return
    }

    const audio = audioRef.current
    if (audio) {
      audio.pause()
    }
    if (timelineAudioRef.current) {
      timelineAudioRef.current.pause()
      timelineAudioRef.current = null
    }
    setPlayingTimelineEventId(null)
    setIsAudioPlaying(false)
    setIsQuickAdjustDialogOpen(false)
    setIsQuickAdjustProcessing(true)
    setQuickAdjustStep("Preparing audio...")
    setQuickAdjustProgress(0)
    setPendingAdjustmentId(null)

    const baseDuration = baseMeditation.duration > 0 ? baseMeditation.duration : playerDuration
    const targetSeconds = Math.max(1, preset.seconds)

    const storedRange = baseMeditation.metadata?.quickAdjust?.range
    const storedLowerBoundSeconds =
      typeof storedRange?.minSeconds === "number" &&
      Number.isFinite(storedRange.minSeconds) &&
      storedRange.minSeconds > 0
        ? Math.max(1, Math.round(storedRange.minSeconds))
        : null

    let effectiveTargetSeconds = targetSeconds
    let clampedToLowerBound = false

    if (storedLowerBoundSeconds && targetSeconds < storedLowerBoundSeconds) {
      effectiveTargetSeconds = storedLowerBoundSeconds
      clampedToLowerBound = true
    }

    const existingMode = currentDurationModes.find(
      (mode) =>
        mode.id !== "original" &&
        (mode.presetId === preset.id || Math.round(mode.seconds) === Math.round(effectiveTargetSeconds)),
    )

    if (existingMode && existingMode.persisted) {
      const normalizedExistingMode = normalizeDurationMode(existingMode)
      if (normalizedExistingMode.playbackRate !== existingMode.playbackRate) {
        setCurrentDurationModes((previous) =>
          previous.map((mode) => (mode.id === normalizedExistingMode.id ? normalizedExistingMode : mode)),
        )
      }
      applyDurationMode(normalizedExistingMode)
      let description = `Meditation duration set to ${formatDuration(Math.round(normalizedExistingMode.seconds))}.`
      if (clampedToLowerBound && storedLowerBoundSeconds) {
        description += ` This meditation can't be shortened below ${formatDuration(
          Math.round(storedLowerBoundSeconds),
        )}.`
      }
      toast({
        title: "Quick adjust ready",
        description,
      })
      setIsQuickAdjustProcessing(false)
      setQuickAdjustStep("")
      setQuickAdjustProgress(0)
      return
    }

    const settings = deriveAdjusterSettings(baseMeditation)
    const sourceUrl = baseMeditation.sourceAudioUrl || baseMeditation.processedAudioUrl

    if (!sourceUrl) {
      toast({
        title: "Missing audio",
        description: "We couldn't locate the source audio for this meditation.",
        variant: "destructive",
      })
      setIsQuickAdjustProcessing(false)
      setQuickAdjustStep("")
      setQuickAdjustProgress(0)
      return
    }

    let objectUrl: string | null = null
    let memoryWarningShown = false

    try {
      setQuickAdjustStep("Loading audio...")
      const response = await fetch(sourceUrl)
      if (!response.ok) {
        throw new Error("Unable to load the source audio for this meditation.")
      }
      const arrayBuffer = await response.arrayBuffer()

      const audioContext = getAudioContext()
      if (audioContext.state === "suspended") {
        try {
          await audioContext.resume()
        } catch (resumeError) {
          console.warn("[v0] Unable to resume audio context for quick adjust:", resumeError)
        }
      }

      setQuickAdjustStep("Decoding audio...")
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))

      const result = await runAdjusterWorkflow({
        audioContext,
        buffer: audioBuffer,
        settings: {
          targetDurationSeconds: effectiveTargetSeconds,
          silenceThreshold: settings.silenceThreshold,
          minSilenceDuration: settings.minSilenceDuration,
          minSpacingDuration: settings.minSpacingDuration,
          preserveNaturalPacing: settings.preserveNaturalPacing,
          compatibilityMode: settings.compatibilityMode,
        },
        isMobileDevice,
        callbacks: {
          onProgress: (progress) => setQuickAdjustProgress(Math.max(0, Math.min(100, Math.round(progress)))),
          onStep: (step) => setQuickAdjustStep(step),
          onMemoryWarning: () => {
            if (!memoryWarningShown) {
              memoryWarningShown = true
              toast({
                title: "Processing may take longer",
                description: "We're optimizing the adjustment for this device's memory limits.",
              })
            }
          },
        },
      })

      const processedDurationSeconds = result.processedBuffer.duration
      const newLowerBoundSeconds = Math.max(
        1,
        Math.round(result.audioContentDuration + result.silenceRegions.length * settings.minSpacingDuration),
      )
      const scaledTimeline = scaleTimelineEvents(
        baseMeditation.metadata?.timeline as LibraryTimelineEntry[] | undefined,
        baseDuration,
        processedDurationSeconds,
      )

      const modeId = existingMode?.id ?? `quick-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

      const existingQuickAdjustMetadata = baseMeditation.metadata.quickAdjust ?? {}
      const quickAdjustMetadata = {
        ...existingQuickAdjustMetadata,
        lastPresetId: preset.id,
        lastDurationId: modeId,
        range: {
          ...(existingQuickAdjustMetadata.range ?? {}),
          minSeconds: newLowerBoundSeconds,
        },
      }

      setQuickAdjustStep("Saving to library...")
      objectUrl = URL.createObjectURL(result.wavBlob)

      const metadataForSave: SavedMeditation["metadata"] = {
        ...baseMeditation.metadata,
        targetDuration: processedDurationSeconds,
        pausesAdjusted: result.pausesAdjusted,
        wav: result.wavMetadata,
        timeline: scaledTimeline,
        adjusterSettings: {
          silenceThreshold: settings.silenceThreshold,
          minSilenceDuration: settings.minSilenceDuration,
          minSpacingDuration: settings.minSpacingDuration,
          preserveNaturalPacing: settings.preserveNaturalPacing,
          compatibilityMode: settings.compatibilityMode,
        },
        quickAdjust: quickAdjustMetadata,
        linkedParentId: baseMeditation.id,
        linkedVariantLabel: preset.label,
        linkedDurationId: modeId,
        linkedIsPreset: true,
        originalDurationSeconds: baseMeditation.duration,
      }

      const savedMeditation = await MeditationLibrary.saveMeditation({
        title: baseMeditation.title,
        originalFileName: baseMeditation.originalFileName,
        processedAudioUrl: objectUrl,
        processedAudioData: result.wavBlob,
        sourceAudioUrl: baseMeditation.sourceAudioUrl ?? objectUrl,
        duration: Math.max(1, Math.round(processedDurationSeconds)),
        source: baseMeditation.source,
        metadata: metadataForSave,
      })

      const newMode: DurationMode = {
        id: modeId,
        label: preset.label,
        seconds: processedDurationSeconds,
        playbackRate: 1,
        timeline: scaledTimeline,
        source: "saved",
        persisted: true,
        presetId: preset.id,
        audioUrl: savedMeditation.processedAudioUrl,
        sourceAudioUrl: savedMeditation.sourceAudioUrl ?? savedMeditation.processedAudioUrl,
      }

      const normalizedNewMode = normalizeDurationMode(newMode)

      const updatedBaseMeditation: SavedMeditation = {
        ...baseMeditation,
        metadata: {
          ...baseMeditation.metadata,
          quickAdjust: quickAdjustMetadata,
        },
      }

      setBaseMeditation(updatedBaseMeditation)
      setCurrentDurationModes((previous) => {
        const filtered = previous.filter((mode) => mode.id !== normalizedNewMode.id)
        const normalizedPrevious = filtered.map((mode) => normalizeDurationMode(mode))
        return sortDurationModes([...normalizedPrevious, normalizedNewMode])
      })

      updateSavedDurations(baseMeditation.id, (existing) => {
        const baseStored: StoredMeditationDurations = existing
          ? { ...existing, modes: Array.isArray(existing.modes) ? [...existing.modes] : [] }
          : { modes: [] }
        const storedMode = convertModeToStored(normalizedNewMode)
        const withoutPending = baseStored.modes.filter((mode) => mode.id !== storedMode.id)
        return {
          ...baseStored,
          modes: [...withoutPending, storedMode],
          lastPlayedId: newMode.id,
          lastPlayedSeconds: newMode.seconds,
          lastPlayedLabel: `${newMode.label} (${formatDuration(Math.round(newMode.seconds))})`,
        }
      })

      applyDurationMode(normalizedNewMode, updatedBaseMeditation)
      setQuickAdjustProgress(100)
      const roundedProcessedSeconds = Math.round(processedDurationSeconds)
      const requestedRoundedSeconds = Math.round(targetSeconds)
      const differenceFromRequested = Math.abs(roundedProcessedSeconds - requestedRoundedSeconds)
      const wasBelowNewMinimum = targetSeconds < newLowerBoundSeconds

      let completionDescription = `Meditation duration set to ${formatDuration(roundedProcessedSeconds)}.`

      if (wasBelowNewMinimum || clampedToLowerBound) {
        completionDescription += ` This meditation can't be shortened below ${formatDuration(newLowerBoundSeconds)}.`
      } else if (!storedLowerBoundSeconds && differenceFromRequested > 1) {
        completionDescription += ` We couldn't reach ${formatDuration(
          requestedRoundedSeconds,
        )} automatically. Open this meditation in Adjuster to fine-tune the duration.`
      }

      toast({
        title: "Quick adjust complete",
        description: completionDescription,
      })
    } catch (error) {
      console.error("[v0] Quick adjust failed:", error)
      toast({
        title: "Quick adjust failed",
        description: error instanceof Error ? error.message : "We couldn't adjust this meditation.",
        variant: "destructive",
      })
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
      setPendingAdjustmentId(null)
      setIsQuickAdjustProcessing(false)
      setQuickAdjustStep("")
      setQuickAdjustProgress(0)
    }
  }

  const handleAddPreset = () => {
    const seconds = parseDurationInput(newPresetValue)
    if (!seconds || seconds <= 0) {
      toast({
        title: "Enter a valid duration",
        description: "Try values like 12m, 45, or 1h 15m.",
        variant: "destructive",
      })
      return
    }

    const label = formatDurationLabelFromSeconds(seconds)
    const exists = quickAdjustPresets.some((preset) => preset.seconds === seconds || preset.label === label)
    if (exists) {
      toast({
        title: "Preset already exists",
        description: "Choose a new duration or edit an existing preset.",
      })
      return
    }

    const newPreset: QuickAdjustPreset = {
      id: `preset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      seconds,
    }

    const sorted = [...quickAdjustPresets, newPreset].sort((a, b) => a.seconds - b.seconds)
    setQuickAdjustPresets(sorted)
    setSelectedPresetId(newPreset.id)
    setNewPresetValue("")
    toast({
      title: "Preset added",
      description: `${label} is now available for quick adjustments.`,
    })
  }

  const handleRemovePreset = (presetId: string) => {
    const preset = quickAdjustPresets.find((item) => item.id === presetId)
    setQuickAdjustPresets((previous) => {
      const filtered = previous.filter((preset) => preset.id !== presetId)
      if (filtered.length === 0) {
        setSelectedPresetId(null)
        return []
      }
      if (selectedPresetId === presetId) {
        setSelectedPresetId(filtered[0]?.id ?? null)
      }
      return filtered
    })
    if (preset) {
      toast({
        title: "Preset removed",
        description: `${preset.label} has been removed from quick adjust.`,
      })
    }
  }

  const readAudioDurationFromUrl = (url: string): Promise<number> =>
    new Promise((resolve, reject) => {
      const audio = document.createElement("audio")
      audio.preload = "metadata"
      audio.src = url
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          resolve(audio.duration)
        } else {
          reject(new Error("Unable to determine audio duration."))
        }
        audio.remove()
      }
      audio.onerror = () => {
        audio.remove()
        reject(new Error("Unable to read audio metadata."))
      }
      audio.load()
    })

  const handleUploadMeditation = async () => {
    if (!uploadFile) {
      setUploadError("Select an audio file to upload.")
      return
    }

    const trimmedTitle = uploadTitle.trim()
    const derivedTitle = trimmedTitle || uploadFile.name.replace(/\.[^/.]+$/, "")

    setIsUploading(true)
    setUploadError(null)

    let objectUrl: string | null = null

    try {
      objectUrl = URL.createObjectURL(uploadFile)
      const duration = await readAudioDurationFromUrl(objectUrl)
      const roundedDuration = Math.max(1, Math.round(duration))

      await MeditationLibrary.saveMeditation({
        title: derivedTitle,
        originalFileName: uploadFile.name,
        processedAudioUrl: objectUrl,
        processedAudioData: uploadFile,
        sourceAudioUrl: objectUrl,
        sourceAudioData: uploadFile,
        duration: roundedDuration,
        source: "adjuster",
        metadata: {
          meditationTitle: derivedTitle,
          targetDuration: roundedDuration,
        },
      })

      toast({
        title: "Meditation uploaded",
        description: `"${derivedTitle}" is ready in your library.`,
      })

      setUploadFile(null)
      setUploadTitle("")
      setIsUploadDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error("[v0] Failed to upload meditation:", error)
      setUploadError(error instanceof Error ? error.message : "We couldn't upload this meditation. Please try again.")
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
      setIsUploading(false)
    }
  }

  const resetUploadDialogState = () => {
    setUploadFile(null)
    setUploadTitle("")
    setUploadError(null)
  }

  const openMeditationPlayer = useCallback(
    (meditation: SavedMeditation, linkedVariants: SavedMeditation[] = []) => {
      const audio = audioRef.current
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
      if (timelineAudioRef.current) {
        timelineAudioRef.current.pause()
        timelineAudioRef.current = null
      }
      setPlayingTimelineEventId(null)

      const baseTimeline = cloneTimeline(meditation.metadata?.timeline as LibraryTimelineEntry[] | undefined)
      const baseMode: DurationMode = {
        id: "original",
        label: "Original",
        seconds: meditation.duration,
        playbackRate: 1,
        timeline: baseTimeline,
        source: "original",
        persisted: true,
        presetId: null,
        audioUrl: meditation.processedAudioUrl,
        sourceAudioUrl: meditation.sourceAudioUrl ?? null,
      }

      const storedData = savedDurationsMap[meditation.id]
      const storedModes =
        storedData?.modes?.map((mode) =>
          buildDurationModeFromStored(mode, "saved", meditation.processedAudioUrl, meditation.sourceAudioUrl ?? null),
        ) ?? []

      const variantModes = linkedVariants
        .filter((variant) => typeof variant.processedAudioUrl === "string" && variant.processedAudioUrl.length > 0)
        .map((variant) => {
          const variantIdRaw =
            typeof variant.metadata?.linkedDurationId === "string" ? variant.metadata.linkedDurationId.trim() : ""
          const variantId = variantIdRaw.length > 0 ? variantIdRaw : `linked-${variant.id}`
          const rawLabel =
            typeof variant.metadata?.linkedVariantLabel === "string" ? variant.metadata.linkedVariantLabel.trim() : ""
          const label = rawLabel.length > 0 ? rawLabel : formatDurationLabelFromSeconds(variant.duration)
          const timeline = cloneTimeline(variant.metadata?.timeline as LibraryTimelineEntry[] | undefined)

          const mode: DurationMode = {
            id: variantId,
            label,
            seconds: variant.duration,
            playbackRate: 1,
            timeline,
            source: "saved",
            persisted: true,
            presetId: variant.metadata?.quickAdjust?.lastPresetId ?? null,
            audioUrl: variant.processedAudioUrl,
            sourceAudioUrl: variant.sourceAudioUrl ?? null,
          }

          return normalizeDurationMode(mode)
        })

      const deduped = new Map<string, DurationMode>()
      ;[baseMode, ...storedModes, ...variantModes].forEach((mode) => {
        const normalized = normalizeDurationMode(mode)
        deduped.set(normalized.id, normalized)
      })

      const availableModes = sortDurationModes(Array.from(deduped.values()))

      const targetModeId =
        storedData?.lastPlayedId && deduped.has(storedData.lastPlayedId) ? storedData.lastPlayedId : "original"
      const activeMode = availableModes.find((mode) => mode.id === targetModeId) ?? availableModes[0] ?? baseMode

      setBaseMeditation(meditation)
      setCurrentDurationModes(availableModes)
      setActiveDurationModeId(activeMode.id)
      setPendingAdjustmentId(null)
      setIsQuickAdjustProcessing(false)

      if (activeMode.id === "original") {
        setSelectedMeditation(meditation)
        setCurrentPlaybackRate(1)
        setPlayerDuration(meditation.duration)
      } else {
        const adjustedMeditation: SavedMeditation = {
          ...meditation,
          duration: activeMode.seconds,
          metadata: {
            ...meditation.metadata,
            targetDuration: activeMode.seconds,
            timeline: cloneTimeline(activeMode.timeline),
            quickAdjust: {
              ...(meditation.metadata.quickAdjust ?? {}),
              lastPresetId: activeMode.presetId ?? null,
              lastDurationId: activeMode.id,
            },
          },
        }
        setSelectedMeditation(adjustedMeditation)
        setCurrentPlaybackRate(activeMode.playbackRate)
        setPlayerDuration(activeMode.seconds)
      }

      setPlayerTime(0)
      setIsAudioPlaying(false)
      setIsPlayerOpen(true)

      if (audio) {
        audio.playbackRate = activeMode.playbackRate
      }

      if (activeMode) {
        recordLastPlayedDuration(meditation, activeMode)
      }
    },
    [
      baseMeditation,
      audioRef,
      timelineAudioRef,
      setPlayingTimelineEventId,
      setSelectedMeditation,
      setBaseMeditation,
      setCurrentDurationModes,
      setActiveDurationModeId,
      setPlayerDuration,
      setPlayerTime,
      setIsAudioPlaying,
      setCurrentPlaybackRate,
      recordLastPlayedDuration,
      savedDurationsMap,
      formatDurationLabelFromSeconds,
      cloneTimeline,
      normalizeDurationMode,
      sortDurationModes,
    ],
  )

  const openMeditationPlayerRef = useRef(openMeditationPlayer)

  useEffect(() => {
    openMeditationPlayerRef.current = openMeditationPlayer
  }, [openMeditationPlayer])

  useEffect(() => {
    const meditationParam = searchParams.get("meditation")
    const entryParam = searchParams.get("entry")

    if (!meditationParam) {
      setHandledMeditationParam(null)
      if (entryParam && pendingJournalEntryId !== entryParam) {
        setPendingJournalEntryId(entryParam)
      }
      return
    }

    if (handledMeditationParam === meditationParam) {
      if (entryParam && pendingJournalEntryId !== entryParam) {
        setPendingJournalEntryId(entryParam)
      }
      return
    }

    if (meditations.length === 0) return
    const allGroups = groupMeditations(meditations, true)
    const targetGroup = allGroups.find(
      (group) => group.base.id === meditationParam || group.variants.some((variant) => variant.id === meditationParam),
    )

    if (targetGroup && openMeditationPlayerRef.current) {
      setHandledMeditationParam(meditationParam)
      if (entryParam && pendingJournalEntryId !== entryParam) {
        setPendingJournalEntryId(entryParam)
      }
      openMeditationPlayerRef.current(targetGroup.base, targetGroup.variants)
    }
  }, [searchParams, meditations, groupMeditations, handledMeditationParam, pendingJournalEntryId])

  const closeMeditationPlayer = useCallback(() => {
    setIsQuickAdjustProcessing(false)
    if (pendingAdjustmentId && baseMeditation) {
      const pendingMode = currentDurationModes.find((mode) => mode.id === pendingAdjustmentId)
      if (pendingMode) {
        const normalizedPendingMode = normalizeDurationMode(pendingMode)
        const shouldPersist = window.confirm(
          "Would you like to save this adjusted duration for instant toggling in the future?",
        )
        if (shouldPersist) {
          updateSavedDurations(baseMeditation.id, (existing) => {
            const base: StoredMeditationDurations = existing
              ? { ...existing, modes: Array.isArray(existing.modes) ? [...existing.modes] : [] }
              : { modes: [] }
            const storedMode = convertModeToStored(normalizedPendingMode)
            const withoutPending = base.modes.filter((mode) => mode.id !== storedMode.id)
            const updatedModes = [...withoutPending, storedMode]
            return {
              ...base,
              modes: updatedModes,
              lastPlayedId: normalizedPendingMode.id,
              lastPlayedSeconds: normalizedPendingMode.seconds,
              lastPlayedLabel:
                normalizedPendingMode.id === "original"
                  ? `Original (${formatDuration(normalizedPendingMode.seconds)})`
                  : `${normalizedPendingMode.label} (${formatDuration(normalizedPendingMode.seconds)})`,
            }
          })
          setCurrentDurationModes((previous) =>
            sortDurationModes(
              previous.map((mode) =>
                mode.id === normalizedPendingMode.id
                  ? normalizeDurationMode({ ...mode, persisted: true, source: "saved" as const })
                  : normalizeDurationMode(mode),
              ),
            ),
          )
        } else {
          const originalMode: DurationMode =
            currentDurationModes.find((mode) => mode.id === "original") ??
            ({
              id: "original",
              label: "Original",
              seconds: baseMeditation.duration,
              playbackRate: 1,
              timeline: cloneTimeline(baseMeditation.metadata?.timeline as LibraryTimelineEntry[] | undefined),
              source: "original",
              persisted: true,
              presetId: null,
            } as DurationMode)

          updateSavedDurations(baseMeditation.id, (existing) => {
            const base: StoredMeditationDurations = existing
              ? { ...existing, modes: Array.isArray(existing.modes) ? [...existing.modes] : [] }
              : { modes: [] }

            return {
              ...base,
              lastPlayedId: originalMode.id,
              lastPlayedSeconds: originalMode.seconds,
              lastPlayedLabel: `Original (${formatDuration(originalMode.seconds)})`,
            }
          })

          setCurrentDurationModes((previous) =>
            sortDurationModes(previous.filter((mode) => mode.id !== pendingMode.id)),
          )
        }
      }
      setPendingAdjustmentId(null)
    }

    if (timelineAudioRef.current) {
      timelineAudioRef.current.pause()
      timelineAudioRef.current = null
    }
    setPlayingTimelineEventId(null)
    setIsPlayerOpen(false)
    setSelectedMeditation(null)
    setBaseMeditation(null)
    setCurrentDurationModes([])
    setActiveDurationModeId("original")
    setCurrentPlaybackRate(1)
  }, [
    pendingAdjustmentId,
    baseMeditation,
    currentDurationModes,
    normalizeDurationMode,
    updateSavedDurations,
    convertModeToStored,
    cloneTimeline,
    sortDurationModes,
    formatDuration,
  ])

  const togglePlayback = useCallback(() => {
    if (isQuickAdjustProcessing) return
    const audio = audioRef.current
    if (!audio) return
    audio.playbackRate = currentPlaybackRate
    if (audio.paused) {
      audio
        .play()
        .then(() => {
          setIsAudioPlaying(true)
        })
        .catch(() => {
          toast({
            title: "Unable to play audio",
            description: "Try reloading the page and playing the meditation again.",
            variant: "destructive",
          })
        })
    } else {
      audio.pause()
      setIsAudioPlaying(false)
    }
  }, [isQuickAdjustProcessing, audioRef, currentPlaybackRate, toast])

  const handleSkip = useCallback(
    (amount: number) => {
      if (isQuickAdjustProcessing) return
      const audio = audioRef.current
      if (!audio) return
      const playbackRate = currentPlaybackRate > 0 ? currentPlaybackRate : 1
      const baseDuration = Number.isFinite(audio.duration)
        ? audio.duration
        : (baseMeditation?.duration ?? playerDuration)
      const maxTime = Number.isFinite(baseDuration) && baseDuration > 0 ? baseDuration : audio.currentTime
      const newCurrentTime = Math.max(0, Math.min(maxTime, audio.currentTime + amount * playbackRate))
      audio.currentTime = newCurrentTime
      const displayTime = playbackRate > 0 ? newCurrentTime / playbackRate : newCurrentTime
      setPlayerTime(displayTime)
    },
    [isQuickAdjustProcessing, audioRef, currentPlaybackRate, baseMeditation, playerDuration, setPlayerTime],
  )

  const handlePlayTimelineEvent = useCallback(
    (timelineEvent: LibraryTimelineEntry) => {
      if (isQuickAdjustProcessing) return
      if (!selectedMeditation) return

      const stopCurrentTimelineAudio = () => {
        if (timelineAudioRef.current) {
          timelineAudioRef.current.pause()
          timelineAudioRef.current = null
        }
        setPlayingTimelineEventId(null)
      }

      if (timelineEvent.eventType === "recorded_voice" && timelineEvent.recordingUrl) {
        if (playingTimelineEventId === timelineEvent.id) {
          stopCurrentTimelineAudio()
          return
        }

        stopCurrentTimelineAudio()
        const audio = audioRef.current
        if (audio && !audio.paused) {
          audio.pause()
          setIsAudioPlaying(false)
        }

        try {
          const playback = new Audio(timelineEvent.recordingUrl)
          playback.onended = () => {
            stopCurrentTimelineAudio()
          }
          playback.onerror = () => {
            stopCurrentTimelineAudio()
            toast({
              title: "Unable to play recording",
              description: "The stored recording could not be loaded.",
              variant: "destructive",
            })
          }
          timelineAudioRef.current = playback
          playback
            .play()
            .then(() => {
              setPlayingTimelineEventId(timelineEvent.id)
            })
            .catch((error) => {
              console.error("[v0] Failed to play timeline recording:", error)
              stopCurrentTimelineAudio()
              toast({
                title: "Unable to play recording",
                description: "Try reloading the page and playing the event again.",
                variant: "destructive",
              })
            })
        } catch (error) {
          console.error("[v0] Error playing timeline recording:", error)
          stopCurrentTimelineAudio()
          toast({
            title: "Unable to play recording",
            description: "The recording could not be initialized for playback.",
            variant: "destructive",
          })
        }
        return
      }

      stopCurrentTimelineAudio()

      const audio = audioRef.current
      if (!audio) return

      const targetTime = Number.isFinite(timelineEvent.startTime) ? timelineEvent.startTime : 0
      const playbackRate = currentPlaybackRate > 0 ? currentPlaybackRate : 1
      const baseDuration = Number.isFinite(audio.duration)
        ? audio.duration
        : (baseMeditation?.duration ?? selectedMeditation.duration)
      const clampedBase = Number.isFinite(baseDuration) && baseDuration > 0 ? baseDuration : targetTime
      const adjustedTime = Math.max(0, Math.min(clampedBase, targetTime * playbackRate))
      audio.playbackRate = playbackRate
      audio.currentTime = adjustedTime
      audio
        .play()
        .then(() => {
          setIsAudioPlaying(true)
          setPlayerTime(targetTime)
        })
        .catch((error) => {
          console.error("[v0] Failed to play main audio from timeline event:", error)
          toast({
            title: "Unable to play event",
            description: "Try reloading the page and playing the meditation again.",
            variant: "destructive",
          })
        })
    },
    [
      isQuickAdjustProcessing,
      selectedMeditation,
      playingTimelineEventId,
      timelineAudioRef,
      audioRef,
      setIsAudioPlaying,
      toast,
      currentPlaybackRate,
      baseMeditation,
      setPlayerTime,
    ],
  )

  const handleOpenInTool = useCallback(
    (tool?: "adjuster" | "encoder") => {
      if (!selectedMeditation) return

      // Determine target tool - use parameter if provided, otherwise use original logic
      const targetTool = tool || (selectedMeditation.source === "adjuster" ? "adjuster" : "encoder")

      const audioUrlToUse = selectedMeditation.sourceAudioUrl || selectedMeditation.processedAudioUrl

      console.log("[v0] Opening meditation in tool:", {
        tool: targetTool,
        hasSourceAudio: !!selectedMeditation.sourceAudioUrl,
        usingSourceAudio: audioUrlToUse === selectedMeditation.sourceAudioUrl,
      })

      const metadataForPayload: SavedMeditation["metadata"] & { meditationTitle?: string } = {
        ...selectedMeditation.metadata,
      }

      if (
        typeof metadataForPayload.meditationTitle !== "string" ||
        metadataForPayload.meditationTitle.trim().length === 0
      ) {
        metadataForPayload.meditationTitle = selectedMeditation.title
      }

      const payload = {
        id: selectedMeditation.id,
        title: selectedMeditation.title,
        originalFileName: selectedMeditation.originalFileName,
        processedAudioUrl: audioUrlToUse, // Use high-quality source for re-adjustment
        duration: selectedMeditation.duration,
        source: selectedMeditation.source,
        metadata: metadataForPayload,
        crossToolOpening: targetTool !== selectedMeditation.source,
      }

      try {
        if (targetTool === "adjuster") {
          localStorage.setItem("abhi_adjuster_import", JSON.stringify(payload))
          toast({
            title: "Opening Adjuster",
            description: `"${selectedMeditation.title}" will load in the Adjuster tool${selectedMeditation.sourceAudioUrl ? " (using high-quality source)" : ""}.`,
          })
          setIsPlayerOpen(false)
          router.push("/#adjuster", { scroll: false })
        } else {
          localStorage.setItem("abhi_encoder_import", JSON.stringify(payload))
          toast({
            title: "Opening Encoder",
            description: `"${selectedMeditation.title}" will load in the Encoder tool${selectedMeditation.sourceAudioUrl ? " (using high-quality source)" : ""}.`,
          })
          setIsPlayerOpen(false)
          router.push("/#encoder", { scroll: false })
        }
      } catch (error) {
        toast({
          title: "Unable to open tool",
          description: "We couldn't pass this meditation to the selected tool.",
          variant: "destructive",
        })
      }
    },
    [selectedMeditation, router, toast, setIsPlayerOpen],
  )

  const handleDownloadMeditation = useCallback(() => {
    if (!selectedMeditation) return

    try {
      const link = document.createElement("a")
      link.href = selectedMeditation.processedAudioUrl
      const safeTitle = selectedMeditation.title.trim().replace(/\s+/g, "_") || "meditation"

      const extractExtension = (url: string) => {
        const getExtensionFromPath = (path: string) => {
          const filename = path.split("/").pop() || ""
          const match = filename.match(/\.([\w-]+)$/)
          return match?.[1]?.toLowerCase() ?? null
        }

        try {
          const parsedUrl = new URL(url, typeof window !== "undefined" ? window.location.href : undefined)
          const extensionFromUrl = getExtensionFromPath(parsedUrl.pathname)
          if (extensionFromUrl) {
            return extensionFromUrl
          }
        } catch (error) {
          console.warn("[v0] Unable to parse processedAudioUrl for extension:", error)
        }

        const extensionFromDirectPath = getExtensionFromPath(url)
        if (extensionFromDirectPath) {
          return extensionFromDirectPath
        }

        const originalExtension = selectedMeditation.originalFileName.split(".").pop()?.toLowerCase()
        if (originalExtension && originalExtension !== selectedMeditation.originalFileName) {
          return originalExtension
        }

        return "wav"
      }

      const fileExtension = extractExtension(selectedMeditation.processedAudioUrl)
      link.download = `${safeTitle}.${fileExtension}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("[v0] Error downloading meditation:", error)
      toast({
        title: "Unable to download",
        description: "We couldn't download this meditation. Please try again.",
        variant: "destructive",
      })
    }
  }, [selectedMeditation, toast])

  const handleSeek = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (isQuickAdjustProcessing) return
      const audio = audioRef.current
      if (!audio || !(audio.duration || playerDuration)) return

      const rect = event.currentTarget.getBoundingClientRect()
      const clickPosition = event.clientX - rect.left
      const ratio = Math.min(Math.max(clickPosition / rect.width, 0), 1)
      const playbackRate = currentPlaybackRate > 0 ? currentPlaybackRate : 1
      const baseDuration = Number.isFinite(audio.duration)
        ? audio.duration
        : (baseMeditation?.duration ?? selectedMeditation?.duration ?? 0)
      const effectiveDuration = playbackRate > 0 ? baseDuration / playbackRate : baseDuration
      const newDisplayTime = ratio * effectiveDuration
      audio.currentTime = newDisplayTime * playbackRate
      setPlayerTime(newDisplayTime)
    },
    [
      isQuickAdjustProcessing,
      audioRef,
      playerDuration,
      currentPlaybackRate,
      baseMeditation,
      selectedMeditation,
      setPlayerTime,
    ],
  )

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      const playbackRate = currentPlaybackRate > 0 ? currentPlaybackRate : 1
      const displayTime = playbackRate > 0 ? audio.currentTime / playbackRate : audio.currentTime
      setPlayerTime(displayTime)
    }
    const handlePlayEvent = () => setIsAudioPlaying(true)
    const handlePauseEvent = () => setIsAudioPlaying(false)
    const handleLoadedMetadata = () => {
      const playbackRate = currentPlaybackRate > 0 ? currentPlaybackRate : 1
      const baseDuration = Number.isFinite(audio.duration)
        ? audio.duration
        : (baseMeditation?.duration ?? selectedMeditation?.duration ?? 0)
      const displayDuration = playbackRate > 0 ? baseDuration / playbackRate : baseDuration
      const displayTime = playbackRate > 0 ? audio.currentTime / playbackRate : audio.currentTime
      setPlayerDuration(displayDuration)
      setPlayerTime(displayTime)
    }
    const handleEndedEvent = () => {
      setIsAudioPlaying(false)
      setPlayerTime(0)
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("play", handlePlayEvent)
    audio.addEventListener("pause", handlePauseEvent)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("ended", handleEndedEvent)

    if (selectedMeditation) {
      audio.playbackRate = currentPlaybackRate > 0 ? currentPlaybackRate : 1
      audio.load()
      audio.currentTime = 0
      setPlayerTime(0)
      setPlayerDuration(selectedMeditation.duration)
    }

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("play", handlePlayEvent)
      audio.removeEventListener("pause", handlePauseEvent)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("ended", handleEndedEvent)
    }
  }, [selectedMeditation, currentPlaybackRate, baseMeditation, setPlayerTime, setPlayerDuration])

  useEffect(() => {
    if (!selectedMeditation && timelineAudioRef.current) {
      timelineAudioRef.current.pause()
      timelineAudioRef.current = null
      setPlayingTimelineEventId(null)
    }
  }, [selectedMeditation])

  useEffect(() => {
    return () => {
      if (timelineAudioRef.current) {
        timelineAudioRef.current.pause()
        timelineAudioRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (isPlayerOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
      const audio = audioRef.current
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
      if (timelineAudioRef.current) {
        timelineAudioRef.current.pause()
        timelineAudioRef.current = null
      }
      setPlayingTimelineEventId(null)
      setIsAudioPlaying(false)
      setPlayerTime(0)
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isPlayerOpen])

  const playbackProgress = playerDuration ? Math.min(100, (playerTime / playerDuration) * 100) : 0
  const totalFilterButtons = playlists.length + 3
  const shouldStackFilters = totalFilterButtons >= 5
  const baseFilterButtonClasses =
    "flex items-center justify-center font-black text-gray-600 px-5 transition-all duration-200 ease-out hover:shadow-none shadow-md border-gray-500 text-xs border-[3px] rounded-sm py-1"

  const handlePlay = useCallback(
    (meditation: SavedMeditation) => {
      if (!meditation.processedAudioUrl) {
        toast({
          title: "Audio not found",
          description:
            "The audio file for this meditation is missing from this device's storage. This can happen if you cleared your browser data or are on a new device.",
          variant: "destructive",
        })
        return
      }

      setSelectedMeditation(meditation)
      setBaseMeditation(meditation)
      setIsPlayerOpen(true)
      setIsAudioPlaying(true)

      // Reset player state
      setPlayerTime(0)
      setCurrentPlaybackRate(1)
      setActiveDurationModeId("original")

      // Reset timeline state
      if (timelineAudioRef.current) {
        timelineAudioRef.current.pause()
        timelineAudioRef.current = null
      }
      setPlayingTimelineEventId(null)
    },
    [toast],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (!isAuthenticated) {
        toast({
          title: "Authentication required",
          description: "Please log in to upload files to your library.",
          variant: "destructive",
        })
        return
      }

      const files = Array.from(e.dataTransfer.files)
      if (files.length === 0) return

      const file = files[0]

      // Check if it's a backup ZIP file
      if (file.name.endsWith(".zip") || file.type === "application/zip") {
        await handleImportBackup(file)
        return
      }

      // Check if it's an audio file
      if (file.type.startsWith("audio/")) {
        // Show title dialog for single audio file
        setDraggedFile(file)
        setAudioFileTitle(file.name.replace(/\.[^/.]+$/, "")) // Remove extension
        setShowTitleDialog(true)
        return
      }

      toast({
        title: "Invalid file type",
        description: "Please drop an audio file (.mp3, .wav, etc.) or a backup ZIP file.",
        variant: "destructive",
      })
    },
    [isAuthenticated, handleImportBackup, toast],
  )

  const handleUploadAudioFile = useCallback(async () => {
    if (!draggedFile || !audioFileTitle.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a title for your meditation.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsUploading(true)
      setUploadError(null)

      const audioContext = getAudioContext()
      const arrayBuffer = await draggedFile.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const duration = audioBuffer.duration

      const blob = new Blob([arrayBuffer], { type: draggedFile.type })

      await MeditationLibrary.saveMeditation({
        title: audioFileTitle.trim(),
        originalFileName: draggedFile.name,
        duration,
        source: "adjuster",
        processedAudioData: blob,
        metadata: {},
      })

      await loadData()

      toast({
        title: "Meditation uploaded",
        description: `"${audioFileTitle.trim()}" has been added to your library.`,
      })

      setShowTitleDialog(false)
      setDraggedFile(null)
      setAudioFileTitle("")
    } catch (error) {
      console.error("Upload failed:", error)
      setUploadError(error instanceof Error ? error.message : "Upload failed")
      toast({
        title: "Upload failed",
        description: "Could not process the audio file. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }, [draggedFile, audioFileTitle, loadData, toast])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8 pt-20 md:pt-24 font-serif font-black">
      <Navigation showProfileButton />

      {!isAuthenticated && (
        <div className="flex justify-center py-4 z-10">
          <AuthButtons onLogin={login} />
        </div>
      )}

      <Dialog open={showTitleDialog} onOpenChange={setShowTitleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Name Your Meditation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="audio-title">Title</Label>
              <Input
                id="audio-title"
                value={audioFileTitle}
                onChange={(e) => setAudioFileTitle(e.target.value)}
                placeholder="Enter meditation title"
                disabled={isUploading}
              />
            </div>
            {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTitleDialog(false)
                  setDraggedFile(null)
                  setAudioFileTitle("")
                }}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button onClick={handleUploadAudioFile} disabled={isUploading || !audioFileTitle.trim()}>
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div
        className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg shadow-xl overflow-hidden transition-colors rounded-3xl duration-300 ease-in-out"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {!isAuthenticated && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm text-center p-6 space-y-3">
            <p className="text-lg text-gray-800 font-serif font-black">Create account to save</p>
            <p className="text-sm text-gray-600 max-w-xl">
              Library access is local-only. Audio exists on your device and browser.
            </p>
          </div>
        )}
        {typeof window !== "undefined" && window.location.hostname === "localhost" && (
          <div className="fixed top-4 right-4 z-50">
            <Button
              onClick={clearLibraryData}
              variant="outline"
              size="sm"
              className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
            >
              Clear Library (Debug)
            </Button>
          </div>
        )}
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20" />
            <div className="absolute top-2 left-8 w-16 h-12 bg-gradient-to-br from-emerald-300/30 to-teal-400/25 rounded-full transform rotate-12" />
            <div className="absolute top-6 right-12 w-20 h-8 bg-gradient-to-bl from-rose-300/25 to-purple-400/20 rounded-full transform -rotate-6" />
            <div className="absolute top-1 left-1/3 w-12 h-16 bg-gradient-to-tr from-amber-300/20 to-orange-400/15 rounded-full transform rotate-45" />
            <div className="absolute top-8 right-1/4 w-14 h-10 bg-gradient-to-tl from-blue-300/25 to-indigo-400/20 rounded-full transform -rotate-12" />
          </div>
          <div className="relative px-6 sm:px-8 lg:px-12 pt-16 pb-10">
            <div className="text-center mb-8">
              <div className="flex justify-center mb-[25px]">
                <div className="relative">
                  <div className="flex justify-center items-center space-x-[5px]">
                    <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[16px] h-[16px] shadow-md" />
                    <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[11px] w-[11px] shadow" />
                    <div className="w-5 bg-gradient-to-br from-logo-amber to-orange-300 rounded-[4px] transform h-[11px] shadow-sm" />
                    <div className="bg-gradient-to-br from-gray-600 to-gray-500 px-0 mx-0 border-[3px] bg-muted h-11 w-3 border-stone-200 shadow-md rounded-md" />
                    <div className="w-5 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-[4px] transform h-[11px] pl-0 ml-2 shadow-sm" />
                    <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[11px] w-[11px] shadow" />
                    <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[16px] h-[16px] shadow-md" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-center mb-8">
              <div className="flex p-1 bg-muted rounded-sm shadow-inner text-sm text-gray-600">
                <button
                  onClick={() => setActiveTab("meditations")}
                  className={cn(
                    "transition-all rounded-sm text-sm tracking-tight font-black font-serif py-3 px-4 text-gray-600",
                    activeTab === "meditations" ? "bg-white text-gray-600 shadow-md" : "",
                  )}
                >
                  Meditations
                </button>
                <button
                  onClick={() => setActiveTab("playlists")}
                  className={cn(
                    "transition-all rounded-sm text-sm tracking-tight font-black font-serif py-3 px-4 text-gray-600",
                    activeTab === "playlists" ? "bg-white text-gray-600 shadow-md" : "",
                  )}
                >
                  Playlists
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "meditations" && (
                <motion.div
                  className="tracking-normal"
                  key="meditations"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Search and Filters */}
                  <div
                    className={`grid grid-cols-1 gap-4 mb-[27px] tracking-tight ${
                      shouldStackFilters
                        ? "md:grid-cols-1"
                        : "md:[grid-template-columns:minmax(0,1.15fr)_minmax(0,1fr)] md:items-start"
                    }`}
                  >
                    <div className={`${shouldStackFilters ? "" : "md:[grid-row:span_2]"}`}>
                      <div className="p-0.5 bg-gradient-to-br from-logo-rose-300 to-stone-300 rounded-sm shadow-lg py-1 px-[5px]">
                        <div className="bg-white rounded-sm">
                          <input
                            placeholder="Search meditations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex w-full ring-offset-background file:border-0 file:bg-white file:text-xs file:font-medium file:text-foreground placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-[3px] focus-visible:border-gray-600 disabled:cursor-not-allowed disabled:border-gray-500 md:text-xs rounded-[10px] bg-white py-4 px-4 h-11 border-stone-200 bg-transparent text-gray-600 placeholder-gray-400 text-xs border-0 shadow-none"
                          />
                        </div>
                      </div>
                      <div className="mt-3 text-center">
                        <Dialog
                          open={isUploadDialogOpen}
                          onOpenChange={(open) => {
                            setIsUploadDialogOpen(open)
                            if (!open) {
                              resetUploadDialogState()
                            }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button className="w-44 py-3 bg-gradient-to-br from-gray-600 to-gray-500 rounded-[9px] text-white shadow-md hover:shadow-none text-xs font-black">
                              Upload Meditation
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Upload Meditation</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="upload-title" className="text-xs font-black text-gray-600">
                                  Title
                                </Label>
                                <Input
                                  id="upload-title"
                                  value={uploadTitle}
                                  onChange={(event) => setUploadTitle(event.target.value)}
                                  placeholder="Morning Calm"
                                  className="text-xs"
                                  disabled={isUploading}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="upload-file" className="text-xs font-black text-gray-600">
                                  Audio file
                                </Label>
                                <Input
                                  id="upload-file"
                                  type="file"
                                  accept="audio/*"
                                  onChange={(event) => {
                                    const file = event.target.files?.[0] ?? null
                                    setUploadFile(file)
                                    setUploadError(null)
                                    if (file && !uploadTitle) {
                                      setUploadTitle(file.name.replace(/\.[^/.]+$/, ""))
                                    }
                                  }}
                                  className="text-xs"
                                  disabled={isUploading}
                                />
                                {uploadFile && (
                                  <p className="text-[11px] text-gray-500 truncate">Selected: {uploadFile.name}</p>
                                )}
                              </div>
                              {uploadError && <p className="text-xs text-red-500">{uploadError}</p>}

                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    resetUploadDialogState()
                                    setIsUploadDialogOpen(false)
                                  }}
                                  disabled={isUploading}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  onClick={handleUploadMeditation}
                                  size="sm"
                                  disabled={isUploading || !uploadFile}
                                >
                                  {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  {isUploading ? "Uploading" : "Upload"}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    <div className="flex flex-wrap font-serif font-black text-xs text-gray-600 md:justify-start md:items-start gap-[5px] justify-center">
                      <button
                        onClick={() => handleSourceFilterChange("all")}
                        className={`flex items-center justify-center font-black text-gray-600 px-5 transition-all duration-200 ease-out shadow-md text-xs border-[3px] rounded-[8px] py-1 ${
                          !selectedPlaylist && sourceFilter === "all"
                            ? " border-stone-300"
                            : "bg-white border-gray-500 hover:shadow-none"
                        }`}
                      >
                        All Meditations
                      </button>
                      <button
                        onClick={() => handleSourceFilterChange("adjuster")}
                        className={`flex items-center justify-center font-black text-gray-600 px-5 transition-all duration-200 ease-out shadow-md text-xs border-[3px] rounded-[8px] py-1 ${
                          !selectedPlaylist && sourceFilter === "adjuster"
                            ? " border-stone-300"
                            : "bg-white border-gray-500 hover:shadow-none"
                        }`}
                      >
                        Adjuster
                      </button>
                      <button
                        onClick={() => handleSourceFilterChange("encoder")}
                        className={`flex items-center justify-center font-black text-gray-600 px-5 transition-all duration-200 ease-out shadow-md text-xs border-[3px] rounded-[8px] py-1 ${
                          !selectedPlaylist && sourceFilter === "encoder"
                            ? " border-stone-300"
                            : "bg-white border-gray-500 hover:shadow-none"
                        }`}
                      >
                        Encoder
                      </button>
                      {playlists.map((playlist) => (
                        <button
                          key={playlist.id}
                          onClick={() => handleSelectPlaylist(playlist.id)}
                          className={`flex items-center justify-center font-black text-gray-600 px-5 transition-all duration-200 ease-out shadow-md text-xs border-[3px] rounded-[8px] py-1 ${
                            selectedPlaylist === playlist.id
                              ? " border-stone-300"
                              : "bg-white border-gray-500 hover:shadow-none"
                          }`}
                        >
                          {playlist.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Meditations Grid */}
                  {displayedGroups.length === 0 ? (
                    <Card className="p-12 text-center">
                      <p className="text-gray-500 mb-4 text-base">
                        {selectedPlaylist
                          ? "This playlist is empty. Add a meditation to get started :)"
                          : "No meditations yet "}
                      </p>
                      <Button
                        onClick={() => router.push("/")}
                        className="font-serif font-black bg-gradient-to-r from-purple-300 to-orange-300 shadow-md hover:shadow-none text-white"
                      >
                        Go to Tools
                      </Button>
                    </Card>
                  ) : (
                    <div className="space-y-5">
                      {displayedGroups.map((group) => {
                        const { base, variants } = group
                        const lastPlayedInfo = lastPlayedDurationMap[base.id]
                        const sortedVariants = [...variants].sort((a, b) => a.duration - b.duration)
                        const variantSummaries = sortedVariants.map((variant) => {
                          const rawLabel =
                            typeof variant.metadata?.linkedVariantLabel === "string"
                              ? variant.metadata.linkedVariantLabel.trim()
                              : ""
                          const label =
                            rawLabel.length > 0 ? rawLabel : formatDurationLabelFromSeconds(variant.duration)
                          return `${label} (${formatDuration(variant.duration)})`
                        })
                        const defaultDurationDisplay = [
                          `Original (${formatDuration(base.duration)})`,
                          ...variantSummaries,
                        ].join(", ")
                        const durationDisplay = lastPlayedInfo ? lastPlayedInfo.label : defaultDurationDisplay
                        return (
                          <motion.div
                            key={base.id}
                            className="group w-full text-left cursor-pointer"
                            onClick={() => openMeditationPlayer(base, variants)}
                          >
                            <Card className="w-full border border-muted bg-white backdrop-blur-sm shadow-md">
                              <div className="relative flex items-center justify-between p-4 border-muted border-[3px] rounded-sm overflow-visible">
                                <Badge
                                  variant="outline"
                                  className={`absolute -top-2 -right-2 translate-x-[7px] -translate-y-[5px] z-10 !border-0 !px-3 !py-1 shadow-inner text-gray-500 text-xs font-black rounded-[6px] bg-gradient-to-r ${
                                    base.source === "adjuster"
                                      ? "bg-gradient-to-r from-muted to-stone-200"
                                      : "bg-gradient-to-r from-muted to-stone-200"
                                  }`}
                                >
                                  {base.source === "adjuster" ? "Adjuster" : "Encoder"}
                                </Badge>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-black text-gray-800 truncate text-xs">{base.title}</h3>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4 text-gray-500" />
                                      <span className="font-black truncate text-xs text-gray-500 tracking-tight">
                                        {durationDisplay}
                                      </span>
                                    </span>
                                    {isWideLayout && (
                                      <>
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-4 w-4 text-gray-500" />
                                          <span className="font-black truncate text-xs text-gray-500 tracking-tight tracking-tightext-gray-500 tracking-tight">
                                            {formatDate(base.createdAt)}
                                          </span>
                                        </span>
                                        {base.metadata.pausesAdjusted ? (
                                          <span className="flex items-center gap-1">
                                            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
                                            <span className="font-black truncate text-xs text-gray-500 tracking-tight">
                                              {base.metadata.pausesAdjusted} pauses adjusted
                                            </span>
                                          </span>
                                        ) : base.metadata.instructionCount ? (
                                          <span className="flex items-center gap-1">
                                            <SlidersHorizontal className="h-4 w-4 text-gray-600" />
                                            <span>{base.metadata.instructionCount} instructions</span>
                                          </span>
                                        ) : null}
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 ml-3">
                                  {!isWideLayout && (
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                          onClick={(event) => event.stopPropagation()}
                                          aria-label="View details"
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        className="rounded-sm border-muted border-2 text-xs font-serif font-black w-40 text-gray-500"
                                      >
                                        <DropdownMenuItem className="flex items-center gap-2 cursor-default">
                                          <Calendar className="h-4 w-4 text-gray-600" />
                                          <span className="text-xs">{formatDate(base.createdAt)}</span>
                                        </DropdownMenuItem>
                                        {base.metadata.pausesAdjusted ? (
                                          <DropdownMenuItem className="flex items-center gap-2 cursor-default">
                                            <SlidersHorizontal className="h-4 w-4 text-logo-rose-500" />
                                            <span className="text-sm">
                                              {base.metadata.pausesAdjusted} pauses adjusted
                                            </span>
                                          </DropdownMenuItem>
                                        ) : base.metadata.instructionCount ? (
                                          <DropdownMenuItem className="flex items-center gap-2 cursor-default">
                                            <SlidersHorizontal className="h-4 w-4 text-gray-600" />
                                            <span className="text-sm">
                                              {base.metadata.instructionCount} instructions
                                            </span>
                                          </DropdownMenuItem>
                                        ) : null}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-500 transition hover:bg-muted hover:text-logo-rose-400"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleDelete(base.id)
                                    }}
                                    aria-label="Delete meditation"
                                  >
                                    <Trash2 className="h-4 w-4 " />
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "playlists" && (
                <motion.div
                  key="playlists"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Create Playlist Button */}
                  <div className="mb-6">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-br from-logo-amber-300 to-logo-teal-500 rounded-[10px] shadow-md hover:shadow-none text-white text-sm font-black">
                          <FolderPlus className="w-4 h-4 mr-2" />
                          Create Playlist
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Playlist</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="playlist-name">Name</Label>
                            <Input
                              id="playlist-name"
                              value={newPlaylistName}
                              onChange={(e) => setNewPlaylistName(e.target.value)}
                              placeholder="Enter playlist name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="playlist-description">Description</Label>
                            <Textarea
                              id="playlist-description"
                              value={newPlaylistDescription}
                              onChange={(e) => setNewPlaylistDescription(e.target.value)}
                              placeholder="Describe your playlist"
                              rows={3}
                            />
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline">Cancel</Button>
                            <Button onClick={handleCreatePlaylist}>Create Playlist</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {/* Playlists Grid */}
                  {playlists.length === 0 ? (
                    <Card className="p-12 text-center">
                      <FolderPlus className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-xl font-black text-gray-600 mb-2">No playlists created yet</h3>
                      <p className="text-gray-500 mb-4">Create your first playlist to organize your meditations.</p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {playlists.map((playlist) => {
                        const playlistMeditations = playlistMeditationsMap[playlist.id] || []
                        const totalDuration = playlistMeditations.reduce((sum, med) => sum + med.duration, 0)

                        return (
                          <Card key={playlist.id} className="p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h3 className="font-black text-lg mb-1">{playlist.name}</h3>
                                {playlist.description && (
                                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{playlist.description}</p>
                                )}
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span>{playlistMeditations.length} meditations</span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDuration(totalDuration)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setActiveTab("meditations")
                                  setSelectedPlaylist(playlist.id)
                                }}
                              >
                                View Meditations
                              </Button>
                              <div className="flex gap-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => setEditingPlaylist(playlist)}>
                                      <Edit2 className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Edit Playlist</DialogTitle>
                                    </DialogHeader>
                                    {editingPlaylist && (
                                      <div className="space-y-4">
                                        <div>
                                          <Label htmlFor="edit-name">Name</Label>
                                          <Input
                                            id="edit-name"
                                            value={editingPlaylist.name}
                                            onChange={(e) =>
                                              setEditingPlaylist({
                                                ...editingPlaylist,
                                                name: e.target.value,
                                              })
                                            }
                                          />
                                        </div>
                                        <div>
                                          <Label htmlFor="edit-description">Description</Label>
                                          <Textarea
                                            id="edit-description"
                                            value={editingPlaylist.description}
                                            onChange={(e) =>
                                              setEditingPlaylist({
                                                ...editingPlaylist,
                                                description: e.target.value,
                                              })
                                            }
                                            rows={3}
                                          />
                                        </div>
                                        <div className="flex justify-end space-x-2">
                                          <Button variant="outline" onClick={() => setEditingPlaylist(null)}>
                                            Cancel
                                          </Button>
                                          <Button onClick={handleUpdatePlaylist}>Update Playlist</Button>
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeletePlaylist(playlist.id)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

          {playerPortalElement &&
            createPortal(
              <AnimatePresence>
                {isPlayerOpen && selectedMeditation && (
                  <motion.div
                    key="meditation-player"
                    className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 py-6 sm:px-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={closeMeditationPlayer}
                  >
                    <motion.div
                      className="absolute inset-0 bg-black/70 backdrop-blur-2xl"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    />
                    <motion.div
                      className="relative z-10 w-full max-w-xl"
                      initial={{ opacity: 0, y: 30, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 30, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 260, damping: 24 }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Card className="relative overflow-hidden border-none bg-white shadow-2xl backdrop-blur max-h-[85vh] flex flex-col p-6">
                        <button
                          type="button"
                          className="absolute right-4 top-4 rounded-full p-2 text-gray-500 transition hover:text-gray-700 mb-0 pt-2 pr-2"
                          onClick={closeMeditationPlayer}
                          aria-label="Close player"
                        >
                          <X className="h-[16px] w-[16px]" />
                        </button>

                        <div className="flex-1 overflow-y-auto scrollbar-none pt-0">
                          <div
                            className={cn(
                              "space-y-6 mx-0 my-0 pl-1.5 pt-1.5 pr-1.5 pb-2",
                              isQuickAdjustProcessing ? "pointer-events-none select-none blur-[1px]" : "",
                            )}
                          >
                            <div className="space-y-3">
                              <div>
                                <h2 className="font-black text-gray-600 text-left text-lg mt-3.5">
                                  {selectedMeditation.title}
                                </h2>
                                {(() => {
                                  const trimmedTitle = selectedMeditation.title.trim()
                                  const trimmedOriginal = selectedMeditation.originalFileName.trim()
                                  const showOriginalFileName =
                                    trimmedOriginal.length > 0 &&
                                    trimmedOriginal.localeCompare(trimmedTitle, undefined, {
                                      sensitivity: "accent",
                                    }) !== 0
                                  if (!showOriginalFileName) return null
                                  return null
                                })()}
                              </div>
                            </div>

                            {/* Player Content */}
                            <audio
                              ref={audioRef}
                              src={selectedMeditation.processedAudioUrl || undefined}
                              preload="metadata"
                              className="hidden"
                            />

                            {hasTimelineEvents && (
                              <div className="space-y-3">
                                <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">
                                  Timeline Events
                                </h3>
                                <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-none">
                                  {timelineEvents.map((timelineEvent, index) => {
                                    const colorClass =
                                      typeof timelineEvent.color === "string" && timelineEvent.color.trim().length > 0
                                        ? timelineEvent.color
                                        : "bg-gradient-to-br from-gray-300 to-gray-400"
                                    const isRecording =
                                      timelineEvent.eventType === "recorded_voice" ||
                                      Boolean(timelineEvent.keepOriginal)
                                    const isRecordingPlaying =
                                      playingTimelineEventId === timelineEvent.id && isRecording
                                    const durationLabel =
                                      typeof timelineEvent.duration === "number" &&
                                      Number.isFinite(timelineEvent.duration)
                                        ? formatTime(timelineEvent.duration)
                                        : null

                                    return (
                                      <div
                                        key={timelineEvent.id}
                                        className="bg-gradient-to-r from-gray-50 to-stone-50 rounded-lg p-3 border border-gray-200 shadow-sm"
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="mt-0.5">
                                            <div
                                              className={cn(
                                                "w-2.5 h-12 rounded-full shadow-sm",
                                                colorClass,
                                                colorClass.includes("bg-gradient") ? "" : "bg-gradient-to-b",
                                              )}
                                              aria-hidden="true"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-gray-500">
                                              <span className="font-black">#{index + 1}</span>
                                              <span>at {formatTime(timelineEvent.startTime ?? 0)}</span>
                                              {durationLabel && <span>• {durationLabel}</span>}
                                            </div>
                                            <p className="text-xs font-black text-gray-800 truncate">
                                              {timelineEvent.text}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
                                              {isRecording && (
                                                <span className="flex items-center gap-1">
                                                  <Volume2 className="h-3 w-3 text-logo-rose-500" />
                                                  <span className="text-logo-rose-500 font-semibold">
                                                    {timelineEvent.recordingLabel?.trim() || "Recording"}
                                                  </span>
                                                </span>
                                              )}
                                              <span className="flex items-center gap-1">
                                                <Music className="h-3 w-3 text-logo-teal-500" />
                                                <span className="text-logo-teal-500 font-semibold">Cue</span>
                                              </span>
                                            </div>
                                          </div>
                                          <div className="flex flex-col items-end gap-2">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                              onClick={(event) => {
                                                event.stopPropagation()
                                                handlePlayTimelineEvent(timelineEvent)
                                              }}
                                              aria-label="Play timeline event"
                                              disabled={isQuickAdjustProcessing}
                                            >
                                              {isRecordingPlaying ? (
                                                <Pause className="h-4 w-4" />
                                              ) : (
                                                <Play className="h-4 w-4" />
                                              )}
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {!hasTimelineEvents && selectedMeditation.source === "encoder" && (
                              <div className="space-y-3">
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                                  <p className="text-xs text-amber-800 font-black">
                                    Timeline data not available for this meditation. Re-encode and save it again to see
                                    the timeline events.
                                  </p>
                                </div>
                              </div>
                            )}

                            <div className="space-y-3">
                              <div
                                className="relative h-2 rounded-full cursor-pointer shadow-inner bg-muted"
                                onClick={handleSeek}
                              >
                                <div
                                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-gray-500 to-gray-600 rounded-full transition-all duration-150"
                                  style={{ width: `${playbackProgress}%` }}
                                />
                              </div>

                              <div className="flex justify-between text-xs font-black text-gray-600">
                                <span>{formatDetailedTime(playerTime)}</span>
                                <span>{formatDetailedTime(playerDuration)}</span>
                              </div>

                              <div className="flex items-center justify-center gap-[13px] mb-0 pb-[21px]">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSkip(-10)}
                                  className="h-10 w-10 text-gray-600 hover:text-gray-800"
                                  disabled={isQuickAdjustProcessing}
                                >
                                  <SkipBack className="h-5 w-5" />
                                </Button>

                                <Button
                                  onClick={togglePlayback}
                                  className="h-12 w-12 rounded-full shadow-md bg-gradient-to-br from-gray-600 to-gray-500  hover:shadow-none text-white"
                                  disabled={isQuickAdjustProcessing}
                                >
                                  {isAudioPlaying ? (
                                    <Pause className="h-10 w-10" />
                                  ) : (
                                    <Play className="ml-0.5 w-10 h-10" />
                                  )}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSkip(10)}
                                  className="h-10 w-10 text-gray-600 hover:text-gray-800"
                                  disabled={isQuickAdjustProcessing}
                                >
                                  <SkipForward className="h-5 w-5" />
                                </Button>
                              </div>

                              {currentDurationModes.length > 0 && (
                                <div className="mt-5 flex flex-wrap items-center justify-center gap-2 font-black font-serif">
                                  {currentDurationModes.map((mode) => {
                                    const isActive = mode.id === activeDurationModeId
                                    const label =
                                      mode.id === "original"
                                        ? `Original (${formatDuration(mode.seconds)})`
                                        : `${mode.label}`
                                    return (
                                      <Button
                                        key={mode.id}
                                        size="sm"
                                        variant={isActive ? "default" : "outline"}
                                        className={`text-[11px] rounded-[10px] font-black ${
                                          isActive
                                            ? "bg-gradient-to-tl from-gray-600 to-gray-500 text-white"
                                            : "text-gray-600"
                                        }`}
                                        onClick={() => handleSelectDurationMode(mode.id)}
                                        disabled={isQuickAdjustProcessing}
                                      >
                                        <span className="flex items-center gap-1">
                                          {label}
                                          {!mode.persisted && mode.id !== "original" && (
                                            <span className="text-[10px]">• Unsaved</span>
                                          )}
                                        </span>
                                      </Button>
                                    )
                                  })}
                                </div>
                              )}

                              <div className="flex flex-wrap pt-0 gap-3 tracking-tight">
                                <Button
                                  onClick={() => {
                                    if (!selectedMeditation) return
                                    router.push(`/journal?meditation=${selectedMeditation.id}`)
                                  }}
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10  rounded-[10px] text-gray-600 shadow-md hover:shadow-none"
                                  title="Open Journal"
                                  disabled={isQuickAdjustProcessing || !selectedMeditation}
                                >
                                  <NotebookPen className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={handleDownloadMeditation}
                                  variant="ghost"
                                  size="icon"
                                  className="h-10 w-10 rounded-[10px] text-gray-600  shadow-md hover:shadow-none"
                                  title="Download"
                                  disabled={isQuickAdjustProcessing}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>

                                <Dialog
                                  open={isQuickAdjustDialogOpen}
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setIsEditingPresets(false)
                                      setNewPresetValue("")
                                    }
                                    setIsQuickAdjustDialogOpen(open)
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      className="flex-1 shadow-md bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 rounded-[10px] hover:shadow-none text-white font-black text-xs flex items-center justify-center gap-2"
                                      disabled={isQuickAdjustProcessing}
                                    >
                                      <Wand2 className="h-4 w-4" />
                                      Quick Adjust
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-md">
                                    <DialogHeader>
                                      <DialogTitle>Quick Adjust</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      {!isEditingPresets ? (
                                        <>
                                          <div className="grid gap-2 font-serif font-black">
                                            {quickAdjustPresets.length === 0 && (
                                              <div className="rounded-md border border-dashed border-gray-300 p-3 text-xs text-gray-500">
                                                No presets yet. Switch to Edit Presets to add your first quick adjust
                                                duration.
                                              </div>
                                            )}
                                            {quickAdjustPresets.map((preset) => {
                                              const isActive = selectedPresetId === preset.id
                                              return (
                                                <Button
                                                  key={preset.id}
                                                  variant={isActive ? "default" : "outline"}
                                                  className={`justify-between text-xs font-black ${
                                                    isActive
                                                      ? "bg-gradient-to-r from-logo-teal-400 to-logo-emerald-500 text-white"
                                                      : "text-gray-600"
                                                  }`}
                                                  onClick={() => setSelectedPresetId(preset.id)}
                                                >
                                                  <span>{preset.label}</span>
                                                  <span className="text-[11px] opacity-80 font-black font-serif">
                                                    {formatDuration(preset.seconds)}
                                                  </span>
                                                </Button>
                                              )
                                            })}
                                          </div>
                                          <div className="flex items-center justify-between gap-3 pt-1 font-serif font-black">
                                            <Button
                                              variant="outline"
                                              onClick={() => setIsEditingPresets(true)}
                                              size="sm"
                                            >
                                              Edit Presets
                                            </Button>
                                            <Button
                                              onClick={handleQuickAdjust}
                                              size="sm"
                                              disabled={
                                                !selectedPresetId ||
                                                isQuickAdjustProcessing ||
                                                quickAdjustPresets.length === 0
                                              }
                                            >
                                              Adjust
                                            </Button>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          <p className="text-xs text-gray-500">
                                            Add or remove preset durations. Use minutes (15), hours (1h), or mm:ss
                                            (12:30).
                                          </p>
                                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-none">
                                            {quickAdjustPresets.map((preset) => (
                                              <div
                                                key={preset.id}
                                                className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-xs"
                                              >
                                                <div className="flex flex-col">
                                                  <span className="font-black text-gray-700">{preset.label}</span>
                                                  <span className="text-[11px] text-gray-500">
                                                    {formatDuration(preset.seconds)}
                                                  </span>
                                                </div>
                                                <Button
                                                  variant="ghost"
                                                  size="icon"
                                                  className="h-7 w-7 text-gray-500 hover:text-red-500"
                                                  onClick={() => handleRemovePreset(preset.id)}
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                              </div>
                                            ))}
                                            {quickAdjustPresets.length === 0 && (
                                              <div className="rounded-md border border-dashed border-gray-300 p-3 text-xs text-gray-500">
                                                No presets yet. Add a duration below to get started.
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Input
                                              placeholder="e.g. 45m"
                                              value={newPresetValue}
                                              onChange={(event) => setNewPresetValue(event.target.value)}
                                              className="text-xs"
                                            />
                                            <Button type="button" size="sm" onClick={handleAddPreset}>
                                              <Plus className="h-3.5 w-3.5 mr-1" />
                                              Add
                                            </Button>
                                          </div>
                                          <div className="flex justify-end">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setIsEditingPresets(false)}
                                            >
                                              Done
                                            </Button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                <Dialog open={isJournalHistoryOpen} onOpenChange={setIsJournalHistoryOpen}>
                                  <DialogTrigger asChild>
                                    <Button
                                      className="flex-1 shadow-md bg-gradient-to-br from-logo-blue-400 to-logo-amber-300 rounded-[10px] hover:shadow-none text-white font-black text-xs flex items-center justify-center gap-2"
                                      disabled={!selectedMeditation}
                                    >
                                      <BookOpenCheck className="h-4 w-4" />
                                      Journal History
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-3xl">
                                    <DialogHeader>
                                      <DialogTitle>Journal History</DialogTitle>
                                    </DialogHeader>
                                    {journalEntriesForSelectedMeditation.length === 0 ? (
                                      <div className="text-center py-10 text-sm text-gray-500 font-serif font-black">
                                        No journal reflections for this meditation yet.
                                      </div>
                                    ) : (
                                      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[320px] overflow-y-auto pr-1">
                                          {journalEntriesForSelectedMeditation.map((entry) => {
                                            const isActive = activeJournalEntry?.id === entry.id
                                            return (
                                              <button
                                                key={entry.id}
                                                onClick={() => setActiveJournalEntryId(entry.id)}
                                                className={cn(
                                                  "rounded-xl border-[3px] px-4 py-3 text-left transition-all",
                                                  isActive
                                                    ? "border-stone-300 bg-white shadow-md text-gray-700"
                                                    : "border-gray-300/60 bg-muted/60 text-gray-500 hover:bg-white",
                                                )}
                                              >
                                                <div className="text-[11px] uppercase tracking-[0.3em] text-gray-400 font-black mb-1">
                                                  {formatJournalDateLabel(entry.playedAt)}
                                                </div>
                                                <div className="text-sm font-black text-gray-700 mb-1">
                                                  {formatJournalTimeLabel(entry.playedAt)}
                                                </div>
                                                <div className="text-xs text-gray-500 line-clamp-3 font-serif">
                                                  {entry.note ?? "Tap to add a reflection in the journal."}
                                                </div>
                                              </button>
                                            )
                                          })}
                                        </div>
                                        <div className="rounded-xl border-[3px] border-muted bg-gradient-to-br from-white to-stone-50 p-5 shadow-md">
                                          {activeJournalEntry ? (
                                            <div className="space-y-4">
                                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 font-black">
                                                <span className="flex items-center gap-1">
                                                  <Calendar className="h-4 w-4" />
                                                  {formatJournalDateLabel(activeJournalEntry.playedAt)}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                  <Clock className="h-4 w-4" />
                                                  {formatJournalTimeLabel(activeJournalEntry.playedAt)}
                                                </span>
                                              </div>
                                              <div className="text-sm text-gray-600 font-serif whitespace-pre-wrap leading-relaxed border border-muted bg-muted/60 rounded-md p-3 min-h-[120px]">
                                                {activeJournalEntry.note ??
                                                  "No notes recorded yet. Add one from the journal page."}
                                              </div>
                                              <div className="flex justify-end gap-2 flex-wrap">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="text-gray-500 hover:text-gray-700"
                                                  onClick={() =>
                                                    router.push(
                                                      `/journal?date=${getDateKeyFromIso(activeJournalEntry.playedAt)}`,
                                                    )
                                                  }
                                                >
                                                  View by Date
                                                </Button>
                                                <Button
                                                  className="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-400 text-white font-black shadow-md hover:shadow-none"
                                                  onClick={() => {
                                                    const basePath = selectedMeditation
                                                      ? `/journal?meditation=${selectedMeditation.id}&entry=${activeJournalEntry.id}`
                                                      : `/journal?entry=${activeJournalEntry.id}`
                                                    router.push(basePath)
                                                  }}
                                                >
                                                  Open Journal Page
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-center py-12 text-sm text-gray-500 font-serif font-black">
                                              Choose an entry to view its details.
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      className="flex-1 shadow-md bg-gradient-to-b from-gray-600 via-gray-500 to-purple-300 rounded-[10px] hover:shadow-none text-white font-black text-xs"
                                      disabled={isQuickAdjustProcessing}
                                    >
                                      Open In
                                      <ChevronDown className="h-4 w-4 ml-2" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem
                                      onClick={() => handleOpenInTool("adjuster")}
                                      className="cursor-pointer"
                                    >
                                      Adjuster
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleOpenInTool("encoder")}
                                      className="cursor-pointer"
                                    >
                                      Encoder
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </div>
                        </div>

                        {isQuickAdjustProcessing && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-sm text-gray-600">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span className="text-sm font-black text-center px-4">
                              {quickAdjustStep || "Adjusting..."}
                            </span>
                            <div className="w-40 h-2 rounded-full bg-gray-200 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500 transition-all duration-150"
                                style={{ width: `${Math.max(0, Math.min(100, quickAdjustProgress))}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-black text-gray-500">
                              {Math.max(0, Math.min(100, Math.round(quickAdjustProgress)))}%
                            </span>
                          </div>
                        )}
                      </Card>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>,
              playerPortalElement,
            )}
        </div>

        <StorageBar
          usedBytes={storageUsage?.usedBytes ?? 0}
          quotaBytes={storageUsage?.quotaBytes}
          isAuthenticated={status === "authenticated"}
          onExportBackup={handleExportBackup}
          onImportBackup={() => backupInputRef.current?.click()}
          isBackupLoading={isBackupLoading}
          backupProgress={backupProgress}
        />

        <input
          ref={backupInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={handleBackupFileChange}
        />
      </div>
    </div>
  )
}
