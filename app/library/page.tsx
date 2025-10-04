"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { createPortal } from "react-dom"
import type { MouseEvent } from "react"
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
import { cn } from "@/lib/utils"
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
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

type LibraryTimelineEntry = NonNullable<SavedMeditation["metadata"]["timeline"]>[number]

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
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [playerTime, setPlayerTime] = useState(0)
  const [playerDuration, setPlayerDuration] = useState(0)
  const [displayedMeditations, setDisplayedMeditations] = useState<SavedMeditation[]>([])
  const [isWideLayout, setIsWideLayout] = useState(false)
  const [playingTimelineEventId, setPlayingTimelineEventId] = useState<string | null>(null)
  const [playerPortalElement, setPlayerPortalElement] = useState<HTMLElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timelineAudioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const [playlistMeditationsMap, setPlaylistMeditationsMap] = useState<Record<string, SavedMeditation[]>>({})

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    setPlayerPortalElement(document.body)
    return () => {
      setPlayerPortalElement(null)
    }
  }, [])

  const loadData = async () => {
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
  }

  useEffect(() => {
    if (typeof window === "undefined") return

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

  const filteredMeditations = useMemo(
    () =>
      meditations.filter((med) => {
        const matchesSearch =
          med.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          med.originalFileName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesSource = sourceFilter === "all" || med.source === sourceFilter

        return matchesSearch && matchesSource
      }),
    [meditations, searchQuery, sourceFilter],
  )

  useEffect(() => {
    const updateDisplayedMeditations = () => {
      if (selectedPlaylist) {
        setDisplayedMeditations(playlistMeditationsMap[selectedPlaylist] || [])
      } else {
        setDisplayedMeditations(filteredMeditations)
      }
    }
    updateDisplayedMeditations()
  }, [selectedPlaylist, filteredMeditations, playlistMeditationsMap])

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

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDetailedTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return "0:00"
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const openMeditationPlayer = (meditation: SavedMeditation) => {
    setSelectedMeditation(meditation)
    setPlayerTime(0)
    setPlayerDuration(meditation.duration)
    setIsAudioPlaying(false)
    setIsPlayerOpen(true)
  }

  const closeMeditationPlayer = () => {
    if (timelineAudioRef.current) {
      timelineAudioRef.current.pause()
      timelineAudioRef.current = null
    }
    setPlayingTimelineEventId(null)
    setIsPlayerOpen(false)
  }

  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio) return
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
  }

  const handleSkip = (amount: number) => {
    const audio = audioRef.current
    if (!audio) return
    const newTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + amount))
    audio.currentTime = newTime
    setPlayerTime(newTime)
  }

  const handlePlayTimelineEvent = (timelineEvent: LibraryTimelineEntry) => {
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
    audio.currentTime = Math.max(0, Math.min(audio.duration || targetTime, targetTime))
    audio
      .play()
      .then(() => {
        setIsAudioPlaying(true)
      })
      .catch((error) => {
        console.error("[v0] Failed to play main audio from timeline event:", error)
        toast({
          title: "Unable to play event",
          description: "Try reloading the page and playing the meditation again.",
          variant: "destructive",
        })
      })
  }

  const handleOpenInTool = (tool?: "adjuster" | "encoder") => {
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
  }

  const handleDownloadMeditation = () => {
    if (!selectedMeditation) return

    try {
      const link = document.createElement("a")
      link.href = selectedMeditation.processedAudioUrl
      const safeTitle = selectedMeditation.title.trim().replace(/\s+/g, "_") || "meditation"
      link.download = `${safeTitle}.wav`
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
  }

  const handleSeek = (event: MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !(audio.duration || playerDuration)) return

    const rect = event.currentTarget.getBoundingClientRect()
    const clickPosition = event.clientX - rect.left
    const ratio = Math.min(Math.max(clickPosition / rect.width, 0), 1)
    const duration =
      Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : (selectedMeditation?.duration ?? 0)
    const newTime = ratio * duration
    audio.currentTime = newTime
    setPlayerTime(newTime)
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => setPlayerTime(audio.currentTime)
    const handlePlayEvent = () => setIsAudioPlaying(true)
    const handlePauseEvent = () => setIsAudioPlaying(false)
    const handleLoadedMetadata = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : (selectedMeditation?.duration ?? 0)
      setPlayerDuration(duration)
      setPlayerTime(audio.currentTime)
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
  }, [selectedMeditation])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8 md:pt-[3px] font-serif font-black">
      <Navigation />

      <div
        className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden transition-colors duration-300 ease-in-out"
        style={{
          borderRadius: "5rem 3rem 2rem 1rem",
        }}
      >
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20"></div>
          </div>
          <div className="relative text-center px-8 pt-16 pb-0">
            {/* Custom underline matching home page but larger */}
            <div className="flex justify-center mb-[25px]">
              <div className="relative">
                <div className="flex justify-center items-center space-x-[5px]">
                  <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[16px] h-[16px] shadow-md"></div>
                  <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[11px] w-[11px] shadow"></div>
                  <div className="w-5 bg-gradient-to-br from-logo-amber to-orange-300 rounded-[4px] transform h-[11px] shadow-sm"></div>
                  <div className="bg-gradient-to-br from-gray-600 to-gray-500 px-0 mx-0 border-[3px] bg-muted h-11 w-3 rounded border-stone-200 shadow-md"></div>
                  <div className="w-5 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-[4px] transform h-[11px] pl-0 ml-2 shadow-sm"></div>
                  <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[11px] w-[11px] shadow"></div>
                  <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[16px] h-[16px] shadow-md"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 md:px-10 pb-10">
            {/* Tab Navigation */}
            <div className="flex justify-center mb-[25px]">
              <div className="flex p-1 bg-muted flex-row rounded-sm shadow-inner text-sm text-gray-600">
                <button
                  onClick={() => setActiveTab("meditations")}
                  className={`transition-all rounded-sm text-sm tracking-tight font-black font-serif py-3 px-4 text-gray-600 ${
                    activeTab === "meditations" ? "bg-white text-gray-600 shadow-sm" : "text-gray-600 "
                  }`}
                >
                  Meditations
                </button>
                <button
                  onClick={() => setActiveTab("playlists")}
                  className={`transition-all rounded-sm tracking-tight font-black font-serif py-3 px-4 text-gray-600 ${
                    activeTab === "playlists" ? "bg-white text-gray-600 shadow-sm" : "text-gray-600 "
                  }`}
                >
                  Playlists
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "meditations" && (
                <motion.div
                  key="meditations"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Search and Filters */}
                  <div
                    className={`grid grid-cols-1 gap-4 mb-[27px] ${
                      shouldStackFilters
                        ? "md:grid-cols-1"
                        : "md:[grid-template-columns:minmax(0,1.15fr)_minmax(0,1fr)] md:items-start"
                    }`}
                  >
                    <div className={`${shouldStackFilters ? "" : "md:[grid-row:span_2]"}`}>
                      <div className="p-0.5 bg-gradient-to-r from-logo-rose-300 to-stone-300 rounded-sm shadow-lg py-1 px-[5px]">
                        <div className="bg-white rounded-sm">
                          <input
                            placeholder="Search meditations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex w-full ring-offset-background file:border-0 file:bg-white file:text-xs file:font-medium file:text-foreground placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-[3px] focus-visible:border-gray-600 disabled:cursor-not-allowed disabled:border-gray-500 md:text-xs border-[3px] rounded-[10px] bg-white py-4 px-4 h-11 shadow border-stone-200 bg-transparent text-gray-600 placeholder-gray-400"
                          />
                        </div>
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
                  {displayedMeditations.length === 0 ? (
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
                      {displayedMeditations.map((meditation) => {
                        return (
                          <motion.div
                            key={meditation.id}
                            className="group w-full text-left cursor-pointer"
                            onClick={() => openMeditationPlayer(meditation)}
                          >
                            <Card className="w-full border border-muted bg-white backdrop-blur-sm shadow-md">
                              <div className="relative flex items-center justify-between p-4 border-muted border-[3px] rounded-sm overflow-visible">
                                <Badge
                                  variant="outline"
                                  className={`absolute -top-2 -right-2 translate-x-[7px] -translate-y-[5px] z-10 !border-0 !px-3 !py-1 shadow-inner text-gray-500 text-xs font-black rounded-[6px] bg-gradient-to-r ${
                                    meditation.source === "adjuster"
                                      ? "bg-gradient-to-r from-muted to-stone-200"
                                      : "bg-gradient-to-r from-muted to-stone-200"
                                  }`}
                                >
                                  {meditation.source === "adjuster" ? "Adjuster" : "Encoder"}
                                </Badge>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h3 className="font-black text-gray-800 text-sm truncate">{meditation.title}</h3>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4 text-gray-600" />
                                      <span>{formatDuration(meditation.duration)}</span>
                                    </span>
                                    {isWideLayout && (
                                      <>
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-4 w-4 text-gray-600" />
                                          <span>{formatDate(meditation.createdAt)}</span>
                                        </span>
                                        {meditation.metadata.pausesAdjusted ? (
                                          <span className="flex items-center gap-1">
                                            <SlidersHorizontal className="h-4 w-4 text-logo-rose-500" />
                                            <span>{meditation.metadata.pausesAdjusted} pauses adjusted</span>
                                          </span>
                                        ) : meditation.metadata.instructionCount ? (
                                          <span className="flex items-center gap-1">
                                            <SlidersHorizontal className="h-4 w-4 text-gray-600" />
                                            <span>{meditation.metadata.instructionCount} instructions</span>
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
                                          <span className="text-sm">{formatDate(meditation.createdAt)}</span>
                                        </DropdownMenuItem>
                                        {meditation.metadata.pausesAdjusted ? (
                                          <DropdownMenuItem className="flex items-center gap-2 cursor-default">
                                            <SlidersHorizontal className="h-4 w-4 text-logo-rose-500" />
                                            <span className="text-sm">
                                              {meditation.metadata.pausesAdjusted} pauses adjusted
                                            </span>
                                          </DropdownMenuItem>
                                        ) : meditation.metadata.instructionCount ? (
                                          <DropdownMenuItem className="flex items-center gap-2 cursor-default">
                                            <SlidersHorizontal className="h-4 w-4 text-gray-600" />
                                            <span className="text-sm">
                                              {meditation.metadata.instructionCount} instructions
                                            </span>
                                          </DropdownMenuItem>
                                        ) : null}
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 transition hover:bg-red-50 hover:text-red-600"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleDelete(meditation.id)
                                    }}
                                    aria-label="Delete meditation"
                                  >
                                    <Trash2 className="h-4 w-4" />
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
                        <Button className="bg-gradient-to-r from-logo-amber-300 to-logo-teal-500 rounded-[8px] shadow-md hover:shadow-none text-white text-sm font-black">
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

      {playerPortalElement &&
        createPortal(
          <AnimatePresence>
            {isPlayerOpen && selectedMeditation && (
              <motion.div
                key="meditation-player"
                className="fixed inset-0 z-50 flex items-center justify-center"
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
                  className="relative z-10 w-full max-w-xl px-4"
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Card className="relative overflow-hidden border-none bg-white p-6 shadow-2xl backdrop-blur">
                    <button
                      type="button"
                      className="absolute right-4 top-4 rounded-full  p-2 text-gray-500 transition hover:text-gray-700"
                      onClick={closeMeditationPlayer}
                      aria-label="Close player"
                    >
                      <X className="h-[16px] w-[16px]" />
                    </button>

                    <div className="space-y-6 my-[3px] mx-[7px]">
                      <div className="space-y-3">
                        <button className="bg-gradient-to-r from-muted to-stone-200 text-xs font-serif rounded-[7px] font-black text-gray-500 shadow-inner py-[5px] px-[13px] mb-[9px]">
                          {selectedMeditation.source === "adjuster" ? "Adjuster" : "Encoder"}
                        </button>
                        <div>
                          <h2 className="text-2xl font-black text-gray-600 text-left">{selectedMeditation.title}</h2>
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
                        src={selectedMeditation.processedAudioUrl}
                        preload="metadata"
                        className="hidden"
                      />

                      {hasTimelineEvents && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-black text-gray-700 uppercase tracking-wide">Timeline Events</h3>
                          <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                            {timelineEvents.map((timelineEvent, index) => {
                              const colorClass =
                                typeof timelineEvent.color === "string" && timelineEvent.color.trim().length > 0
                                  ? timelineEvent.color
                                  : "bg-gradient-to-br from-gray-300 to-gray-400"
                              const isRecording =
                                timelineEvent.eventType === "recorded_voice" || Boolean(timelineEvent.keepOriginal)
                              const isRecordingPlaying = playingTimelineEventId === timelineEvent.id && isRecording
                              const durationLabel =
                                typeof timelineEvent.duration === "number" && Number.isFinite(timelineEvent.duration)
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
                                      <p className="text-xs font-black text-gray-800 truncate">{timelineEvent.text}</p>
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
                                      >
                                        {isRecordingPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
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
                              Timeline data not available for this meditation. Re-encode and save it again to see the
                              timeline events.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
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

                        <div className="flex items-center justify-center gap-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSkip(-10)}
                            className="h-10 w-10 text-gray-600 hover:text-gray-800"
                          >
                            <SkipBack className="h-5 w-5" />
                          </Button>

                          <Button
                            onClick={togglePlayback}
                            className="h-12 w-12 rounded-full shadow-md bg-gradient-to-r from-gray-500 to-gray-600  hover:shadow-none text-white"
                          >
                            {isAudioPlaying ? <Pause className="h-10 w-10" /> : <Play className="ml-0.5 w-10 h-10" />}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSkip(10)}
                            className="h-10 w-10 text-gray-600 hover:text-gray-800"
                          >
                            <SkipForward className="h-5 w-5" />
                          </Button>
                        </div>

                        <div className="flex pt-[27px] gap-3.5">
                          <Button
                            onClick={handleDownloadMeditation}
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-gray-600 hover:text-gray-800 shadow-md hover:shadow-none"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button className="flex-1 shadow-md bg-gradient-to-r from-logo-amber-300 to-logo-teal-500 rounded-[11px] hover:shadow-none text-white font-black text-xs">
                                Open In
                                <ChevronDown className="h-4 w-4 ml-2" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => handleOpenInTool("adjuster")} className="cursor-pointer">
                                Adjuster
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenInTool("encoder")} className="cursor-pointer">
                                Encoder
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          playerPortalElement,
        )}
          </div>
        </div>
      </div>
  )
}
