"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MeditationLibrary, type SavedMeditation, type Playlist } from "@/lib/meditation-library"
import {
  Trash2,
  Music,
  Clock,
  Calendar,
  FolderPlus,
  Edit2,
  SkipForward,
  SkipBack,
  Play,
  Pause,
  X,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"

export default function LibraryPage() {
  const [meditations, setMeditations] = useState<SavedMeditation[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activeTab, setActiveTab] = useState<"meditations" | "playlists">("meditations")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)
  const [selectedMeditation, setSelectedMeditation] = useState<SavedMeditation | null>(null)
  const [isPlayerOpen, setIsPlayerOpen] = useState(false)
  const [isAudioPlaying, setIsAudioPlaying] = useState(false)
  const [playerTime, setPlayerTime] = useState(0)
  const [playerDuration, setPlayerDuration] = useState(0)
  const [displayedMeditations, setDisplayedMeditations] = useState<SavedMeditation[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  const [playlistMeditationsMap, setPlaylistMeditationsMap] = useState<Record<string, SavedMeditation[]>>({})

  useEffect(() => {
    loadData()
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

  const filteredMeditations = useMemo(
    () =>
      meditations.filter(
        (med) =>
          med.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          med.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [meditations, searchQuery],
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

  const openMeditationPlayer = (meditation: SavedMeditation) => {
    setSelectedMeditation(meditation)
    setPlayerTime(0)
    setPlayerDuration(meditation.duration)
    setIsAudioPlaying(false)
    setIsPlayerOpen(true)
  }

  const closeMeditationPlayer = () => {
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
    }
  }

  const handleSkip = (amount: number) => {
    const audio = audioRef.current
    if (!audio) return
    const newTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + amount))
    audio.currentTime = newTime
    setPlayerTime(newTime)
  }

  const handlePlugIntoAdjuster = () => {
    if (!selectedMeditation) return
    const payload = {
      id: selectedMeditation.id,
      title: selectedMeditation.title,
      originalFileName: selectedMeditation.originalFileName,
      processedAudioUrl: selectedMeditation.processedAudioUrl,
      duration: selectedMeditation.duration,
      source: selectedMeditation.source,
    }
    try {
      localStorage.setItem("abhi_adjuster_import", JSON.stringify(payload))
      toast({
        title: "Opening Adjuster",
        description: `"${selectedMeditation.title}" will load in the Adjuster tool.`,
      })
      setIsPlayerOpen(false)
      router.push("/#adjuster")
    } catch (error) {
      toast({
        title: "Unable to open Adjuster",
        description: "We couldn't pass this meditation to the Adjuster.",
        variant: "destructive",
      })
    }
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
    if (isPlayerOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
      const audio = audioRef.current
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
      setIsAudioPlaying(false)
      setPlayerTime(0)
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isPlayerOpen])

  const playbackProgress = playerDuration ? Math.min(100, (playerTime / playerDuration) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8 md:pt-[3px] font-serif font-black">
      <Navigation />

      <div
        className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden transition-colors duration-300 ease-in-out"
        style={{
          borderRadius: "4rem 3rem 2rem 1rem",
        }}
      >
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20"></div>
          </div>
          <div className="relative text-center px-8 pt-16 pb-0">
            {/* Custom underline matching home page but larger */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="flex justify-center items-center space-x-[5px]">
                  <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[16px] h-[16px]"></div>
                  <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[11px] w-[11px]"></div>
                  <div className="w-5 bg-gradient-to-br from-logo-amber to-orange-300 rounded-sm transform -rotate-6 h-[11px]"></div>
                  <div className="bg-gradient-to-r from-gray-600 to-gray-500 px-0 mx-0 rounded-sm w-[64px] text-logo-rose-600 border-0 bg-gray-600 h-[6px]"></div>
                  <div className="w-5 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-sm transform rotate-6 h-[11px] pl-0 ml-2"></div>
                  <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[11px] w-[11px]"></div>
                  <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[16px] h-[16px]"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 md:px-10 pb-10">
            <div className="flex justify-center mb-8">
              <div className="relative p-1.5 bg-gradient-to-r from-gray-100 via-white to-gray-100 rounded-2xl shadow-lg border border-gray-200/50 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-r from-logo-teal-500/5 via-logo-rose-500/5 to-logo-purple-500/5 rounded-2xl"></div>
                <div className="relative flex gap-1">
                  <button
                    onClick={() => setActiveTab("meditations")}
                    className={`relative transition-all duration-300 rounded-xl text-sm tracking-tight font-black font-serif py-4 px-6 ${
                      activeTab === "meditations"
                        ? "bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 text-white shadow-lg transform scale-105"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                    }`}
                  >
                    <span className="relative z-10">Meditations ({meditations.length})</span>
                    {activeTab === "meditations" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-logo-teal-600 to-logo-emerald-600 rounded-xl opacity-20"></div>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("playlists")}
                    className={`relative transition-all duration-300 rounded-xl tracking-tight font-black font-serif py-4 px-6 ${
                      activeTab === "playlists"
                        ? "bg-gradient-to-r from-logo-purple-500 to-logo-rose-500 text-white shadow-lg transform scale-105"
                        : "text-gray-600 hover:text-gray-800 hover:bg-white/50"
                    }`}
                  >
                    <span className="relative z-10">Playlists ({playlists.length})</span>
                    {activeTab === "playlists" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-logo-purple-600 to-logo-rose-600 rounded-xl opacity-20"></div>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "meditations" && (
                <motion.div
                  key="meditations"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex flex-col md:flex-row gap-6 mb-8">
                    <div className="flex-1">
                      <div className="p-0.5 bg-gradient-to-r from-logo-teal-500 to-logo-rose-300 rounded-sm shadow-lg px-1 py-[3px]">
                        <div className="bg-white rounded-sm">
                          <Input
                            placeholder="Search meditations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full border-none bg-transparent text-gray-600 placeholder-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant={selectedPlaylist ? "outline" : "default"}
                        onClick={() => setSelectedPlaylist(null)}
                        className={`transition-all duration-300 ${
                          !selectedPlaylist
                            ? "bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 hover:from-logo-teal-600 hover:to-logo-emerald-600 text-white shadow-lg"
                            : "border-gray-300 hover:border-logo-teal-400 hover:bg-logo-teal-50"
                        }`}
                      >
                        All Meditations
                      </Button>
                      {playlists.map((playlist) => (
                        <Button
                          key={playlist.id}
                          variant={selectedPlaylist === playlist.id ? "default" : "outline"}
                          onClick={() => setSelectedPlaylist(playlist.id)}
                          className={`transition-all duration-300 ${
                            selectedPlaylist === playlist.id
                              ? "bg-gradient-to-r from-logo-purple-500 to-logo-rose-500 hover:from-logo-purple-600 hover:to-logo-rose-600 text-white shadow-lg"
                              : "border-gray-300 hover:border-logo-purple-400 hover:bg-logo-purple-50"
                          }`}
                        >
                          {playlist.name}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {displayedMeditations.length === 0 ? (
                    <Card className="relative overflow-hidden p-16 text-center bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-200">
                      <div className="absolute inset-0 bg-gradient-to-br from-logo-teal-500/5 via-transparent to-logo-rose-500/5"></div>
                      <div className="relative">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-logo-teal-100 to-logo-emerald-100 rounded-full flex items-center justify-center">
                          <Music className="w-12 h-12 text-logo-teal-600" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-700 mb-3">
                          {selectedPlaylist ? "No meditations in this playlist" : "No meditations saved yet"}
                        </h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto leading-relaxed">
                          {selectedPlaylist
                            ? "Add some meditations to this playlist to get started."
                            : "Create your first meditation using the Adjuster or Encoder tools."}
                        </p>
                        <Button
                          onClick={() => router.push("/")}
                          className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 hover:from-logo-teal-600 hover:to-logo-emerald-600 text-white shadow-lg px-8 py-3"
                        >
                          Go to Tools
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-6">
                      {displayedMeditations.map((meditation, index) => {
                        return (
                          <motion.div
                            key={meditation.id}
                            className="group w-full text-left cursor-pointer"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, duration: 0.3 }}
                            whileHover={{ y: -4, scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => openMeditationPlayer(meditation)}
                          >
                            <Card className="relative w-full overflow-hidden border-0 bg-gradient-to-br from-white via-white to-gray-50/50 backdrop-blur-sm transition-all duration-500 hover:shadow-2xl shadow-lg">
                              <div className="absolute inset-0 bg-gradient-to-r from-logo-teal-500/20 via-logo-rose-500/10 to-logo-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                              <div className="absolute inset-[1px] bg-gradient-to-br from-white via-white to-gray-50/80 rounded-lg"></div>

                              <div className="relative flex flex-col gap-6 p-8 md:flex-row md:items-center md:justify-between">
                                <div className="flex-1 space-y-4">
                                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-2">
                                      <h3 className="text-xl font-black text-gray-800 group-hover:text-gray-900 transition-colors duration-300 leading-tight">
                                        {meditation.title}
                                      </h3>
                                      <Badge
                                        variant="outline"
                                        className="w-fit border-transparent bg-gradient-to-r from-logo-teal-500/15 to-logo-emerald-500/15 text-logo-teal-700 font-semibold px-3 py-1"
                                      >
                                        {meditation.source === "adjuster" ? "Length Adjuster" : "Encoder"}
                                      </Badge>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
                                    <span className="flex items-center gap-3 text-gray-600">
                                      <div className="w-8 h-8 bg-gradient-to-br from-logo-teal-100 to-logo-teal-200 rounded-full flex items-center justify-center">
                                        <Clock className="h-4 w-4 text-logo-teal-600" />
                                      </div>
                                      <span className="font-semibold">{formatDuration(meditation.duration)}</span>
                                    </span>
                                    <span className="flex items-center gap-3 text-gray-600">
                                      <div className="w-8 h-8 bg-gradient-to-br from-logo-purple-100 to-logo-purple-200 rounded-full flex items-center justify-center">
                                        <Calendar className="h-4 w-4 text-logo-purple-600" />
                                      </div>
                                      <span className="font-semibold">{formatDate(meditation.createdAt)}</span>
                                    </span>
                                    {meditation.metadata.pausesAdjusted ? (
                                      <span className="flex items-center gap-3 text-gray-600">
                                        <div className="w-8 h-8 bg-gradient-to-br from-logo-rose-100 to-logo-rose-200 rounded-full flex items-center justify-center">
                                          <SlidersHorizontal className="h-4 w-4 text-logo-rose-600" />
                                        </div>
                                        <span className="font-semibold">
                                          {meditation.metadata.pausesAdjusted} pauses adjusted
                                        </span>
                                      </span>
                                    ) : meditation.metadata.instructionCount ? (
                                      <span className="flex items-center gap-3 text-gray-600">
                                        <div className="w-8 h-8 bg-gradient-to-br from-logo-rose-100 to-logo-rose-200 rounded-full flex items-center justify-center">
                                          <SlidersHorizontal className="h-4 w-4 text-logo-rose-600" />
                                        </div>
                                        <span className="font-semibold">
                                          {meditation.metadata.instructionCount} instructions
                                        </span>
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between gap-6 md:flex-col md:items-end md:gap-4">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-12 h-12 text-red-500 transition-all duration-300 hover:bg-red-50 hover:text-red-600 hover:scale-110 rounded-full"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleDelete(meditation.id)
                                    }}
                                    aria-label="Delete meditation"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </Button>
                                  <div className="flex items-center gap-3 text-sm font-black text-logo-teal-600 group-hover:text-logo-teal-700 transition-colors duration-300">
                                    <span>Open player</span>
                                    <div className="w-8 h-8 bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                      <ChevronRight className="h-4 w-4 text-white transition-transform group-hover:translate-x-0.5" />
                                    </div>
                                  </div>
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
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-8">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-logo-purple-500 to-logo-rose-400 hover:from-logo-purple-600 hover:to-logo-rose-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3">
                          <FolderPlus className="w-5 h-5 mr-3" />
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

                  {playlists.length === 0 ? (
                    <Card className="relative overflow-hidden p-16 text-center bg-gradient-to-br from-gray-50 to-white border-2 border-dashed border-gray-200">
                      <div className="absolute inset-0 bg-gradient-to-br from-logo-purple-500/5 via-transparent to-logo-rose-500/5"></div>
                      <div className="relative">
                        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-logo-purple-100 to-logo-rose-100 rounded-full flex items-center justify-center">
                          <FolderPlus className="w-12 h-12 text-logo-purple-600" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-700 mb-3">No playlists created yet</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto leading-relaxed">
                          Create your first playlist to organize your meditations.
                        </p>
                      </div>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {playlists.map((playlist, index) => {
                        const playlistMeditations = playlistMeditationsMap[playlist.id] || []
                        const totalDuration = playlistMeditations.reduce((sum, med) => sum + med.duration, 0)

                        return (
                          <motion.div
                            key={playlist.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1, duration: 0.3 }}
                            whileHover={{ y: -4, scale: 1.02 }}
                          >
                            <Card className="relative h-full overflow-hidden border-0 bg-gradient-to-br from-white via-white to-gray-50/50 shadow-lg hover:shadow-2xl transition-all duration-500 group">
                              <div className="absolute inset-0 bg-gradient-to-r from-logo-purple-500/10 via-logo-rose-500/5 to-logo-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                              <div className="absolute inset-[1px] bg-gradient-to-br from-white via-white to-gray-50/80 rounded-lg"></div>

                              <div className="relative p-8 h-full flex flex-col">
                                <div className="flex-1 space-y-4">
                                  <div>
                                    <h3 className="font-black text-xl mb-2 text-gray-800 group-hover:text-gray-900 transition-colors duration-300">
                                      {playlist.name}
                                    </h3>
                                    {playlist.description && (
                                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">
                                        {playlist.description}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-6 text-sm text-gray-500">
                                    <span className="flex items-center gap-2 font-semibold">
                                      <div className="w-6 h-6 bg-gradient-to-br from-logo-teal-100 to-logo-teal-200 rounded-full flex items-center justify-center">
                                        <Music className="w-3 h-3 text-logo-teal-600" />
                                      </div>
                                      {playlistMeditations.length} meditations
                                    </span>
                                    <span className="flex items-center gap-2 font-semibold">
                                      <div className="w-6 h-6 bg-gradient-to-br from-logo-purple-100 to-logo-purple-200 rounded-full flex items-center justify-center">
                                        <Clock className="w-3 h-3 text-logo-purple-600" />
                                      </div>
                                      {formatDuration(totalDuration)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-6 border-t border-gray-100 mt-6">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setActiveTab("meditations")
                                      setSelectedPlaylist(playlist.id)
                                    }}
                                    className="border-logo-teal-300 text-logo-teal-600 hover:bg-logo-teal-50 hover:border-logo-teal-400 transition-all duration-300"
                                  >
                                    View Meditations
                                  </Button>
                                  <div className="flex gap-2">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setEditingPlaylist(playlist)}
                                          className="w-10 h-10 rounded-full hover:bg-gray-100 transition-all duration-300"
                                        >
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
                                      className="w-10 h-10 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 transition-all duration-300"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
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
            </AnimatePresence>
          </div>
        </div>
      </div>

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
              className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/55 to-black/60 backdrop-blur-xl"
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
              <Card className="relative overflow-hidden border-none bg-white/95 p-6 shadow-2xl backdrop-blur">
                <button
                  type="button"
                  className="absolute right-4 top-4 rounded-full bg-gray-100/80 p-2 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
                  onClick={closeMeditationPlayer}
                  aria-label="Close player"
                >
                  <X className="h-5 w-5" />
                </button>

                <div className="space-y-6">
                  <div className="space-y-3">
                    <Badge
                      variant="secondary"
                      className="bg-gradient-to-r from-logo-teal-500/10 to-logo-emerald-500/10 text-logo-teal-700"
                    >
                      {selectedMeditation.source === "adjuster" ? "Length Adjuster" : "Encoder"}
                    </Badge>
                    <div>
                      <h2 className="text-2xl font-black text-gray-900">{selectedMeditation.title}</h2>
                      {(() => {
                        const trimmedTitle = selectedMeditation.title.trim()
                        const trimmedOriginal = selectedMeditation.originalFileName.trim()
                        const showOriginalFileName =
                          trimmedOriginal.length > 0 &&
                          trimmedOriginal.localeCompare(trimmedTitle, undefined, {
                            sensitivity: "accent",
                          }) !== 0
                        if (!showOriginalFileName) return null
                        return <p className="text-sm text-gray-500">{selectedMeditation.originalFileName}</p>
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-logo-teal-500" />
                        <span>{formatDuration(selectedMeditation.duration)}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-logo-purple-500" />
                        <span>{formatDate(selectedMeditation.createdAt)}</span>
                      </span>
                      {selectedMeditation.metadata.pausesAdjusted ? (
                        <span className="flex items-center gap-2">
                          <SlidersHorizontal className="h-4 w-4 text-logo-rose-500" />
                          <span>{selectedMeditation.metadata.pausesAdjusted} pauses adjusted</span>
                        </span>
                      ) : selectedMeditation.metadata.instructionCount ? (
                        <span className="flex items-center gap-2">
                          <SlidersHorizontal className="h-4 w-4 text-logo-rose-500" />
                          <span>{selectedMeditation.metadata.instructionCount} instructions</span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <audio
                    ref={(node) => {
                      audioRef.current = node
                    }}
                    src={selectedMeditation.processedAudioUrl}
                    preload="auto"
                    className="hidden"
                  />

                  <div className="space-y-4">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500"
                        style={{ width: `${playbackProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-black text-gray-500">
                      <span>{formatDetailedTime(playerTime)}</span>
                      <span>{formatDetailedTime(playerDuration)}</span>
                    </div>
                    <div className="flex items-center justify-center gap-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full border border-transparent bg-gray-100/80 text-gray-700 transition hover:bg-gray-200"
                        onClick={() => handleSkip(-15)}
                        aria-label="Skip back 15 seconds"
                      >
                        <SkipBack className="h-5 w-5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        onClick={togglePlayback}
                        className="h-14 w-14 rounded-full bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 text-white shadow-lg transition hover:from-logo-teal-600 hover:to-logo-emerald-600"
                        aria-label={isAudioPlaying ? "Pause" : "Play"}
                      >
                        {isAudioPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 rounded-full border border-transparent bg-gray-100/80 text-gray-700 transition hover:bg-gray-200"
                        onClick={() => handleSkip(15)}
                        aria-label="Skip forward 15 seconds"
                      >
                        <SkipForward className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      className="flex-1 bg-gradient-to-r from-logo-purple-500 to-logo-rose-400 text-white shadow-lg hover:from-logo-purple-600 hover:to-logo-rose-500"
                      onClick={handlePlugIntoAdjuster}
                    >
                      <SlidersHorizontal className="mr-2 h-4 w-4" /> Plug into Adjuster
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={closeMeditationPlayer}
                    >
                      Close Player
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
