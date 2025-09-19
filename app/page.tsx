"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { MeditationLibrary, type SavedMeditation, type Playlist } from "@/lib/meditation-library"
import { Music, Upload, Play, Pause, Volume2, Download, BookmarkPlus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { SaveMeditationDialog } from "@/components/save-meditation-dialog"

type NavigationPage = "home" | "library" | "contact" | "donate"

export default function HomePage() {
  const [activePage, setActivePage] = useState<NavigationPage>("home")

  const [activeMode, setActiveMode] = useState<"adjuster" | "encoder">("adjuster")
  const [file, setFile] = useState<File | null>(null)
  const [targetDuration, setTargetDuration] = useState<number>(300)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processedAudio, setProcessedAudio] = useState<string | null>(null)
  const [originalDuration, setOriginalDuration] = useState<number | null>(null)
  const [adjustmentsMade, setAdjustmentsMade] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null)
  const [processingProgress, setProcessingProgress] = useState(0)

  // Library page state
  const [meditations, setMeditations] = useState<SavedMeditation[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [activeTab, setActiveTab] = useState<"meditations" | "playlists">("meditations")
  const [searchQuery, setSearchQuery] = useState("")
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("")
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  const { toast } = useToast()

  useEffect(() => {
    if (activePage === "library") {
      loadLibraryData()
    }
  }, [activePage])

  const loadLibraryData = () => {
    setMeditations(MeditationLibrary.getAllMeditations())
    setPlaylists(MeditationLibrary.getAllPlaylists())
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.type.startsWith("audio/")) {
        toast({
          title: "Invalid file type",
          description: "Please select a valid audio file.",
          variant: "destructive",
        })
        return
      }

      setFile(selectedFile)
      setProcessedAudio(null)
      setOriginalDuration(null)
      setAdjustmentsMade(0)

      // Get audio duration
      const audio = new Audio(URL.createObjectURL(selectedFile))
      audio.addEventListener("loadedmetadata", () => {
        setOriginalDuration(audio.duration)
        setDuration(audio.duration)
      })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadAreaRef.current) uploadAreaRef.current.classList.add("border-primary")
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadAreaRef.current) uploadAreaRef.current.classList.remove("border-primary")
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadAreaRef.current) uploadAreaRef.current.classList.remove("border-primary")
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const mockChangeEvent = {
        target: {
          files: files,
        },
      } as React.ChangeEvent<HTMLInputElement>
      handleFileChange(mockChangeEvent)
    }
  }

  const processAudio = async () => {
    if (!file || !originalDuration) return

    setIsProcessing(true)
    setProcessingProgress(0)

    // Simulate processing with progress updates
    const progressInterval = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      // Simulate audio processing delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Create processed audio URL (in real implementation, this would be actual audio processing)
      const processedUrl = URL.createObjectURL(file)
      setProcessedAudio(processedUrl)

      // Calculate adjustments made
      const ratio = targetDuration / originalDuration
      const adjustments = Math.abs(1 - ratio) * 100
      setAdjustmentsMade(Math.round(adjustments))

      setProcessingProgress(100)
      toast({
        title: "Processing complete!",
        description: `Audio adjusted to ${Math.round(targetDuration / 60)} minutes.`,
      })
    } catch (error) {
      toast({
        title: "Processing failed",
        description: "There was an error processing your audio file.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      clearInterval(progressInterval)
    }
  }

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number.parseFloat(e.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number.parseFloat(e.target.value)
    setVolume(vol)
    if (audioRef.current) {
      audioRef.current.volume = vol
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const downloadProcessedAudio = () => {
    if (!processedAudio || !file) return

    const a = document.createElement("a")
    a.href = processedAudio
    a.download = `${file.name.split(".")[0]}_adjusted.${file.name.split(".").pop()}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const HomeContent = () => (
    <div className="px-6 md:px-10 pb-10">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-black text-gray-800 mb-4 font-serif">abhī</h1>
        <p className="text-lg text-gray-600 mb-8 font-serif">meditation tool</p>

        {/* Custom underline */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="flex justify-center items-center space-x-[3px]">
              <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[12px] h-[12px]"></div>
              <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[8px] w-[8px]"></div>
              <div className="w-4 bg-gradient-to-br from-logo-amber to-orange-300 rounded-sm transform -rotate-6 h-[8px]"></div>
              <div className="bg-gradient-to-r from-gray-600 to-gray-500 rounded-sm w-[48px] h-[4px]"></div>
              <div className="w-4 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-sm transform rotate-6 h-[8px] pl-0 ml-1.5"></div>
              <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[8px] w-[8px]"></div>
              <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[12px] h-[12px]"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex justify-center mb-6">
        <div className="flex mx-auto items-center p-1 font-serif text-gray-600 shadow-inner rounded-sm gap-1 w-fit bg-muted">
          <button
            onClick={() => setActiveMode("adjuster")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-black py-3 tracking-tight text-sm",
              activeMode === "adjuster" ? "bg-white text-gray-600 shadow-sm " : "text-gray-600 ",
            )}
          >
            Adjuster
          </button>
          <button
            onClick={() => setActiveMode("encoder")}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-3 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-black text-gray-600 tracking-tight text-sm",
              activeMode === "encoder" ? "bg-white text-gray-600 shadow-sm " : "text-gray-600 ",
            )}
          >
            Encoder
          </button>
        </div>
      </div>

      {/* Mode Description Notes */}
      <AnimatePresence mode="wait">
        {activeMode === "adjuster" && (
          <motion.div
            key="adjuster-note"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4 rounded-md font-serif font-black max-w-2xl mx-auto border-solid text-logo-rose-600 border-logo-rose-500 border-0 shadow-none mb-4 py-0 px-0"
          >
            <p className="text-center px-4 pt-1.5 text-logo-rose-600 text-xs">
              Change the length of your guided meditations. Upload an audio file, set your target duration, and this
              tool will re-space content to fit your schedule.
            </p>
          </motion.div>
        )}
        {activeMode === "encoder" && (
          <motion.div
            key="encoder-note"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-4 rounded-md font-serif font-black max-w-2xl mx-auto border-solid text-logo-rose-600 border-logo-rose-500 border-0 shadow-none mb-4 py-0 px-0"
          >
            <p className="text-center px-4 pt-1.5 text-logo-rose-600 text-xs pb-1.5">
              Design custom guided meditations by pairing instructions with sound cues or using the recorder, then
              arranging events on the timeline.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tool Content */}
      <AnimatePresence mode="wait">
        {activeMode === "adjuster" && (
          <motion.div
            key="adjuster-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-2xl mx-auto space-y-6"
          >
            {/* File Upload */}
            <div
              ref={uploadAreaRef}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">
                {file ? file.name : "Drag and drop your audio file here, or click to browse"}
              </p>
              <Button variant="outline">Choose File</Button>
            </div>

            {/* Duration Settings */}
            {file && originalDuration && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Duration Settings</h3>
                <div className="space-y-4">
                  <div>
                    <Label>Original Duration: {formatTime(originalDuration)}</Label>
                  </div>
                  <div>
                    <Label htmlFor="target-duration">Target Duration (seconds)</Label>
                    <Input
                      id="target-duration"
                      type="number"
                      value={targetDuration}
                      onChange={(e) => setTargetDuration(Number.parseInt(e.target.value) || 300)}
                      min="30"
                      max="3600"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Target: {formatTime(targetDuration)} ({Math.round(targetDuration / 60)} minutes)
                    </p>
                  </div>
                  <Button onClick={processAudio} disabled={isProcessing} className="w-full">
                    {isProcessing ? "Processing..." : "Adjust Audio"}
                  </Button>
                  {isProcessing && (
                    <div className="space-y-2">
                      <Progress value={processingProgress} />
                      <p className="text-sm text-center text-gray-600">{processingProgress}% complete</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Audio Player */}
            {processedAudio && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Processed Audio</h3>
                <div className="space-y-4">
                  <audio
                    ref={audioRef}
                    src={processedAudio}
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => {
                      if (audioRef.current) {
                        setDuration(audioRef.current.duration)
                      }
                    }}
                    className="hidden"
                  />

                  {/* Custom Player Controls */}
                  <div className="flex items-center space-x-4">
                    <Button onClick={togglePlayPause} size="sm">
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <div className="flex-1">
                      <input
                        type="range"
                        min="0"
                        max={duration}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full"
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center space-x-2">
                    <Volume2 className="w-4 h-4" />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-24"
                    />
                  </div>

                  {/* Stats */}
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Adjustments made: {adjustmentsMade}%</p>
                    <p>New duration: {formatTime(targetDuration)}</p>
                  </div>

                  {/* Download and Save */}
                  <div className="flex space-x-2">
                    <Button onClick={downloadProcessedAudio} variant="outline" className="flex-1 bg-transparent">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                    <SaveMeditationDialog
                      audioUrl={processedAudio}
                      originalFileName={file?.name || "meditation"}
                      duration={targetDuration}
                      source="adjuster"
                      metadata={{
                        originalDuration,
                        targetDuration,
                        adjustmentsMade,
                      }}
                    >
                      <Button className="flex-1">
                        <BookmarkPlus className="w-4 h-4 mr-2" />
                        Save to Library
                      </Button>
                    </SaveMeditationDialog>
                  </div>
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {activeMode === "encoder" && (
          <motion.div
            key="encoder-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="max-w-2xl mx-auto text-center"
          >
            <p className="text-gray-600 mb-8">
              For advanced meditation creation with sound cues and timeline editing, visit the dedicated Encoder page.
            </p>
            <Button onClick={() => (window.location.href = "/encoder")} size="lg">
              Go to Encoder
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const LibraryContent = () => {
    const filteredMeditations = meditations.filter(
      (med) =>
        med.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        med.originalFileName.toLowerCase().includes(searchQuery.toLowerCase()),
    )

    const displayedMeditations = selectedPlaylist
      ? MeditationLibrary.getPlaylistMeditations(selectedPlaylist)
      : filteredMeditations

    const formatDuration = (seconds: number) => {
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

    const playMeditation = (meditation: SavedMeditation) => {
      if (currentlyPlaying === meditation.id) {
        setCurrentlyPlaying(null)
      } else {
        setCurrentlyPlaying(meditation.id)
      }
    }

    const deleteMeditation = (id: string) => {
      MeditationLibrary.deleteMeditation(id)
      loadLibraryData()
      toast({
        title: "Meditation deleted",
        description: "The meditation has been removed from your library.",
      })
    }

    const createPlaylist = () => {
      if (!newPlaylistName.trim()) return

      const playlist: Playlist = {
        id: Date.now().toString(),
        name: newPlaylistName,
        description: newPlaylistDescription,
        meditationIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      MeditationLibrary.createPlaylist(playlist)
      setNewPlaylistName("")
      setNewPlaylistDescription("")
      loadLibraryData()
      toast({
        title: "Playlist created",
        description: `"${playlist.name}" has been added to your library.`,
      })
    }

    const deletePlaylist = (id: string) => {
      MeditationLibrary.deletePlaylist(id)
      if (selectedPlaylist === id) {
        setSelectedPlaylist(null)
      }
      loadLibraryData()
      toast({
        title: "Playlist deleted",
        description: "The playlist has been removed from your library.",
      })
    }

    const addToPlaylist = (meditationId: string, playlistId: string) => {
      MeditationLibrary.addToPlaylist(playlistId, meditationId)
      loadLibraryData()
      toast({
        title: "Added to playlist",
        description: "The meditation has been added to the playlist.",
      })
    }

    return (
      <div className="px-6 md:px-10 pb-10">
        {/* Custom underline matching home page but larger */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="flex justify-center items-center space-x-[4px]">
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

        {/* Search Bar */}
        <div className="max-w-md mx-auto mb-6">
          <Input
            placeholder="Search meditations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="flex p-1 bg-muted rounded-lg">
            <button
              onClick={() => setActiveTab("meditations")}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                activeTab === "meditations" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Meditations ({meditations.length})
            </button>
            <button
              onClick={() => setActiveTab("playlists")}
              className={`px-6 py-2 rounded-md font-semibold transition-all ${
                activeTab === "playlists" ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Playlists ({playlists.length})
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
              {/* Playlist Filter */}
              {playlists.length > 0 && (
                <div className="mb-6 flex justify-center">
                  <select
                    value={selectedPlaylist || ""}
                    onChange={(e) => setSelectedPlaylist(e.target.value || null)}
                    className="px-4 py-2 border rounded-md bg-white"
                  >
                    <option value="">All Meditations</option>
                    {playlists.map((playlist) => (
                      <option key={playlist.id} value={playlist.id}>
                        {playlist.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {displayedMeditations.length === 0 ? (
                <Card className="p-12 text-center">
                  <Music className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    {searchQuery ? "No meditations found" : "No meditations saved yet"}
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchQuery
                      ? "Try adjusting your search terms."
                      : "Create your first meditation using the Adjuster or Encoder tools."}
                  </p>
                  {!searchQuery && <Button onClick={() => setActivePage("home")}>Go to Tools</Button>}
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {displayedMeditations.map((meditation) => (
                    <Card key={meditation.id} className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{meditation.title}</h3>
                          <p className="text-sm text-gray-600 mb-2">{formatDuration(meditation.duration)}</p>
                          <p className="text-xs text-gray-500">
                            Created {formatDate(meditation.createdAt)} • {meditation.source}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button size="sm" onClick={() => playMeditation(meditation)} className="flex-1">
                          {currentlyPlaying === meditation.id ? (
                            <Pause className="w-4 h-4 mr-2" />
                          ) : (
                            <Play className="w-4 h-4 mr-2" />
                          )}
                          {currentlyPlaying === meditation.id ? "Pause" : "Play"}
                        </Button>

                        {playlists.length > 0 && (
                          <select
                            onChange={(e) => {
                              if (e.target.value) {
                                addToPlaylist(meditation.id, e.target.value)
                                e.target.value = ""
                              }
                            }}
                            className="px-2 py-1 text-xs border rounded"
                          >
                            <option value="">Add to...</option>
                            {playlists.map((playlist) => (
                              <option key={playlist.id} value={playlist.id}>
                                {playlist.name}
                              </option>
                            ))}
                          </select>
                        )}

                        <Button size="sm" variant="destructive" onClick={() => deleteMeditation(meditation.id)}>
                          Delete
                        </Button>
                      </div>

                      {currentlyPlaying === meditation.id && (
                        <div className="mt-4">
                          <audio
                            controls
                            src={meditation.audioUrl}
                            className="w-full"
                            autoPlay
                            onEnded={() => setCurrentlyPlaying(null)}
                          />
                        </div>
                      )}
                    </Card>
                  ))}
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
              {/* Create Playlist Form */}
              <Card className="p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">Create New Playlist</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="playlist-name">Playlist Name</Label>
                    <Input
                      id="playlist-name"
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Enter playlist name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="playlist-description">Description (optional)</Label>
                    <Textarea
                      id="playlist-description"
                      value={newPlaylistDescription}
                      onChange={(e) => setNewPlaylistDescription(e.target.value)}
                      placeholder="Enter playlist description"
                      rows={2}
                    />
                  </div>
                  <Button onClick={createPlaylist} disabled={!newPlaylistName.trim()}>
                    Create Playlist
                  </Button>
                </div>
              </Card>

              {/* Playlists List */}
              {playlists.length === 0 ? (
                <Card className="p-12 text-center">
                  <Music className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">No playlists created yet</h3>
                  <p className="text-gray-500">Create your first playlist using the form above.</p>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {playlists.map((playlist) => {
                    const playlistMeditations = MeditationLibrary.getPlaylistMeditations(playlist.id)
                    const totalDuration = playlistMeditations.reduce((sum, med) => sum + med.duration, 0)

                    return (
                      <Card key={playlist.id} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{playlist.name}</h3>
                            {playlist.description && <p className="text-gray-600 mb-2">{playlist.description}</p>}
                            <p className="text-sm text-gray-500">
                              {playlistMeditations.length} meditations • {formatDuration(totalDuration)}
                            </p>
                            <p className="text-xs text-gray-500">Created {formatDate(playlist.createdAt)}</p>
                          </div>
                        </div>

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPlaylist(playlist.id)
                              setActiveTab("meditations")
                            }}
                            className="flex-1"
                          >
                            View Meditations
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => deletePlaylist(playlist.id)}>
                            Delete
                          </Button>
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
    )
  }

  const ContactContent = () => (
    <div className="px-6 md:px-10 pb-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-gray-800 mb-4 font-serif">Contact</h2>
        <p className="text-gray-600 mb-8">Get in touch with us</p>
      </div>
      <div className="max-w-2xl mx-auto">
        <Card className="p-8">
          <div className="space-y-6">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Your name" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="your@email.com" />
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="Your message" rows={5} />
            </div>
            <Button className="w-full">Send Message</Button>
          </div>
        </Card>
      </div>
    </div>
  )

  const DonateContent = () => (
    <div className="px-6 md:px-10 pb-10">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-gray-800 mb-4 font-serif">Support abhī</h2>
        <p className="text-gray-600 mb-8">Help us continue developing meditation tools</p>
      </div>
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <h3 className="text-xl font-semibold mb-4">Make a Donation</h3>
          <p className="text-gray-600 mb-6">Your support helps us maintain and improve abhī for everyone.</p>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Button variant="outline">$5</Button>
            <Button variant="outline">$15</Button>
            <Button variant="outline">$25</Button>
          </div>
          <Button className="w-full">Donate Now</Button>
        </Card>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8 md:pt-0">
      <nav className="flex justify-center py-4 mb-5">
        <ul className="flex space-x-4 bg-white/70 backdrop-blur-md px-6 py-3 shadow-2xl rounded-sm">
          <li>
            <button
              onClick={() => setActivePage("home")}
              className={cn(
                "px-4 py-2 transition-colors font-black font-serif text-sm shadow-none rounded-sm",
                activePage === "home"
                  ? "bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-md "
                  : "text-gray-600 hover:bg-gray-100 ",
              )}
            >
              Home
            </button>
          </li>
          <li>
            <button
              onClick={() => setActivePage("library")}
              className={cn(
                "px-4 py-2 transition-colors font-black font-serif text-sm shadow-none rounded-sm",
                activePage === "library"
                  ? "bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-md "
                  : "text-gray-600 hover:bg-gray-100 ",
              )}
            >
              Library
            </button>
          </li>
          <li>
            <button
              onClick={() => setActivePage("contact")}
              className={cn(
                "px-4 py-2 text-sm transition-colors font-black font-serif shadow-none rounded-md",
                activePage === "contact" ? "bg-gray-600 text-white shadow-md " : "text-gray-600 hover:bg-gray-100 ",
              )}
            >
              Contact
            </button>
          </li>
          <li>
            <button
              onClick={() => setActivePage("donate")}
              className={cn(
                "px-4 py-2 text-sm transition-colors font-black font-serif shadow-none rounded-md",
                activePage === "donate" ? "bg-gray-600 text-white shadow-md " : "text-gray-600 hover:bg-gray-100 ",
              )}
            >
              Donate
            </button>
          </li>
        </ul>
      </nav>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden transition-colors duration-300 ease-in-out"
        style={{
          borderRadius: "4rem 3rem 2rem 1rem",
        }}
        role="application"
      >
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20"></div>
          </div>
          <div className="relative text-center px-8 pt-16 pb-8">
            <AnimatePresence mode="wait">
              {activePage === "home" && (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <HomeContent />
                </motion.div>
              )}
              {activePage === "library" && (
                <motion.div
                  key="library"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <LibraryContent />
                </motion.div>
              )}
              {activePage === "contact" && (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <ContactContent />
                </motion.div>
              )}
              {activePage === "donate" && (
                <motion.div
                  key="donate"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <DonateContent />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
