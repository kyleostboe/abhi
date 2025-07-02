"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { Navigation } from "@/components/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Plus,
  MicIcon as Microphone,
  Pause,
  StopCircle,
  PlayCircle,
  FileAudio,
  AudioWaveformIcon as Waveform,
  Download,
  Upload,
  RefreshCcw,
} from "lucide-react"
import { INSTRUCTIONS_LIBRARY, SOUND_CUES_LIBRARY } from "@/lib/meditation-data"
import { VisualTimeline } from "@/components/visual-timeline"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

// Add this near the top of the file, after the imports
const NOTE_FREQUENCIES = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
}

// Mobile detection
const isMobile = () => {
  if (typeof window === "undefined") return false
  return /Android|webOS|iPhone|iPad|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768
}

// Memory management utilities
const forceGarbageCollection = () => {
  if (typeof window !== "undefined" && (window as any).gc) {
    console.log("Attempting to force garbage collection.")
    ;(window as any).gc()
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const monitorMemory = () => {
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const memory = (performance as any).memory
    const usedMB = memory.usedJSHeapSize / 1048576
    const limitMB = memory.jsHeapSizeLimit / 1048576
    console.log(`Memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`)
    if (usedMB > limitMB * 0.75) {
      console.warn("High memory usage detected, forcing GC.")
      forceGarbageCollection()
      return true
    }
  }
  return false
}

interface TimelineEvent {
  id: string
  type: "instruction" | "recording" | "sound-cue"
  startTime: number
  duration: number
  text?: string
  soundCueId?: string
  audioUrl?: string
  volume?: number // 0-100
}

interface RecordingStatus {
  isRecording: boolean
  isPaused: boolean
  recordedChunks: BlobPart[]
  mediaRecorder: MediaRecorder | null
  audioStream: MediaStream | null
  startTime: number | null
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

export default function LabsPage() {
  const { toast } = useToast()

  const [activeMode, setActiveMode] = useState<"adjuster" | "labs">("labs")
  const [sessionTitle, setSessionTitle] = useState("My Guided Meditation")
  const [totalDuration, setTotalDuration] = useState(600) // 10 minutes in seconds
  const [fadeDuration, setFadeDuration] = useState(5) // seconds
  const [instructionVolume, setInstructionVolume] = useState(80)
  const [soundCueVolume, setSoundCueVolume] = useState(60)

  // Instruction Library state
  const [selectedInstructionCategory, setSelectedInstructionCategory] = useState<string>("Mindfulness")
  const [selectedInstruction, setSelectedInstruction] = useState<string | null>(null)

  // Sound Cue Library state
  const [selectedSoundCueCategory, setSelectedSoundCueCategory] = useState<string>("Bells & Chimes")
  const [selectedSoundCue, setSelectedSoundCue] = useState<string | null>(null)

  // Voice Recording state
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    isRecording: false,
    isPaused: false,
    recordedChunks: [],
    mediaRecorder: null,
    audioStream: null,
    startTime: null,
  })
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
  const [recordingCurrentTime, setRecordingCurrentTime] = useState(0)
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const recordedAudioRef = useRef<HTMLAudioElement>(null)

  // Timeline state
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [totalEvents, setTotalEvents] = useState(0)
  const [currentTimelineDuration, setCurrentTimelineDuration] = useState(0)

  // Audio Encoding state (Labs section specific)
  const [labsAudioFile, setLabsAudioFile] = useState<File | null>(null)
  const [labsOriginalAudioUrl, setLabsOriginalAudioUrl] = useState<string>("")
  const [isGeneratingLabsAudio, setIsGeneratingLabsAudio] = useState(false)
  const [labsGeneratedAudioUrl, setLabsGeneratedAudioUrl] = useState<string>("")
  const [labsGeneratedAudioDuration, setLabsGeneratedAudioDuration] = useState(0)
  const [labsGenerateProgress, setLabsGenerateProgress] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null) // For Web Audio API

  // Scrolling refs
  const instructionLibraryRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<HTMLDivElement>(null)

  const scrollToTimeline = useCallback(() => {
    setTimeout(() => {
      timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100) // Small delay to ensure DOM updates before scrolling
  }, [])

  const scrollToInstructionLibrary = useCallback(() => {
    setTimeout(() => {
      instructionLibraryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }, [])

  // Initialize Web Audio API context
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  // Update total events and duration for timeline display
  useEffect(() => {
    setTotalEvents(timelineEvents.length)
    const maxDuration = timelineEvents.reduce((max, event) => Math.max(max, event.startTime + event.duration), 0)
    setCurrentTimelineDuration(maxDuration)
  }, [timelineEvents])

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm; codecs=opus")
        ? "audio/webm; codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/wav"

      const mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType })
      const chunks: BlobPart[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: mediaRecorder.mimeType })
        const url = URL.createObjectURL(audioBlob)
        setRecordedAudioUrl(url)
        setRecordingStatus((prev) => ({ ...prev, isRecording: false, isPaused: false, recordedChunks: [] }))
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)

        // Add to timeline automatically
        const newEvent: TimelineEvent = {
          id: `recording_${Date.now()}`,
          type: "recording",
          startTime: currentTimelineDuration + 2, // Add 2 seconds buffer
          duration: recordingCurrentTime,
          audioUrl: url,
        }
        setTimelineEvents((prev) => [...prev, newEvent])
        toast({
          title: "Recording Added",
          description: "Your voice recording has been added to the timeline.",
        })
        scrollToTimeline()
      }

      mediaRecorder.start()
      setRecordingStatus({
        isRecording: true,
        isPaused: false,
        recordedChunks: chunks,
        mediaRecorder,
        audioStream: stream,
        startTime: Date.now(),
      })
      setRecordingCurrentTime(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingCurrentTime((prev) => prev + 1)
      }, 1000)
    } catch (error) {
      console.error("Error accessing microphone:", error)
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record your voice.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (recordingStatus.mediaRecorder && recordingStatus.isRecording) {
      recordingStatus.mediaRecorder.stop()
      recordingStatus.audioStream?.getTracks().forEach((track) => track.stop())
    }
  }

  const pauseRecording = () => {
    if (recordingStatus.mediaRecorder && recordingStatus.isRecording && !recordingStatus.isPaused) {
      recordingStatus.mediaRecorder.pause()
      setRecordingStatus((prev) => ({ ...prev, isPaused: true }))
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    }
  }

  const resumeRecording = () => {
    if (recordingStatus.mediaRecorder && recordingStatus.isRecording && recordingStatus.isPaused) {
      recordingStatus.mediaRecorder.resume()
      setRecordingStatus((prev) => ({ ...prev, isPaused: false }))
      recordingTimerRef.current = setInterval(() => {
        setRecordingCurrentTime((prev) => prev + 1)
      }, 1000)
    }
  }

  const resetRecording = () => {
    if (recordingStatus.mediaRecorder) {
      recordingStatus.mediaRecorder.stop() // Ensure it stops cleanly
      recordingStatus.audioStream?.getTracks().forEach((track) => track.stop())
    }
    setRecordingStatus({
      isRecording: false,
      isPaused: false,
      recordedChunks: [],
      mediaRecorder: null,
      audioStream: null,
      startTime: null,
    })
    setRecordedAudioUrl(null)
    setRecordingCurrentTime(0)
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    toast({
      title: "Recording Reset",
      description: "Voice recording has been cleared.",
    })
  }

  // Handle adding instruction to timeline
  const addInstructionToTimeline = () => {
    if (!selectedInstruction) {
      toast({
        title: "No Instruction Selected",
        description: "Please select an instruction from the library first.",
        variant: "destructive",
      })
      return
    }

    const instructionDetails = INSTRUCTIONS_LIBRARY.flatMap((cat) => cat.instructions).find(
      (instr) => instr.id === selectedInstruction,
    )

    if (instructionDetails) {
      const newEvent: TimelineEvent = {
        id: `instr_${Date.now()}`,
        type: "instruction",
        startTime: currentTimelineDuration + 2, // Add 2 seconds buffer
        duration: instructionDetails.duration,
        text: instructionDetails.text,
        soundCueId: instructionDetails.soundCueId,
        volume: instructionVolume,
      }
      setTimelineEvents((prev) => [...prev, newEvent])
      setSelectedInstruction(null) // Clear selection
      toast({
        title: "Instruction Added",
        description: `"${instructionDetails.text.substring(0, 30)}..." added to timeline.`,
      })
      scrollToTimeline()
    }
  }

  // Handle adding sound cue to timeline
  const addSoundCueToTimeline = () => {
    if (!selectedSoundCue) {
      toast({
        title: "No Sound Cue Selected",
        description: "Please select a sound cue from the library first.",
        variant: "destructive",
      })
      return
    }

    const soundDetails = SOUND_CUES_LIBRARY.flatMap((cat) => cat.soundCues).find((cue) => cue.id === selectedSoundCue)

    if (soundDetails) {
      const newEvent: TimelineEvent = {
        id: `sound_${Date.now()}`,
        type: "sound-cue",
        startTime: currentTimelineDuration + 2, // Add 2 seconds buffer
        duration: soundDetails.duration,
        soundCueId: soundDetails.id,
        volume: soundCueVolume,
      }
      setTimelineEvents((prev) => [...prev, newEvent])
      setSelectedSoundCue(null) // Clear selection
      toast({
        title: "Sound Cue Added",
        description: `"${soundDetails.name}" added to timeline.`,
      })
      scrollToTimeline()
    }
  }

  // Handle deleting an event from the timeline
  const deleteTimelineEvent = (id: string) => {
    setTimelineEvents((prev) => prev.filter((event) => event.id !== id))
    toast({
      title: "Event Deleted",
      description: "The event has been removed from the timeline.",
    })
  }

  // Labs section: Audio Encoding related functions
  const handleLabsFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.type.startsWith("audio/")) {
        toast({
          title: "Invalid File Type",
          description: "Please select a valid audio file.",
          variant: "destructive",
        })
        return
      }
      setLabsAudioFile(selectedFile)
      setLabsOriginalAudioUrl(URL.createObjectURL(selectedFile))
      setLabsGeneratedAudioUrl("") // Reset generated audio
      setLabsGenerateProgress(0) // Reset progress
      setLabsGeneratedAudioDuration(0) // Reset duration

      // Load audio buffer to get duration for processing estimates
      try {
        const arrayBuffer = await selectedFile.arrayBuffer()
        const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer)
        setLabsGeneratedAudioDuration(audioBuffer.duration) // This is initial duration
      } catch (error) {
        console.error("Error loading audio buffer:", error)
        toast({
          title: "Audio Load Error",
          description: "Could not load audio file for duration estimate.",
          variant: "destructive",
        })
      }
    }
  }

  const handleLabsDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add("border-primary")
  }

  const handleLabsDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove("border-primary")
  }

  const handleLabsDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove("border-primary")
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const mockChangeEvent = {
        target: {
          files: files,
        },
      } as React.ChangeEvent<HTMLInputElement>
      handleLabsFileChange(mockChangeEvent)
    }
  }

  const processLabsAudio = async () => {
    if (!labsAudioFile) {
      toast({
        title: "No Audio File",
        description: "Please upload an audio file to process.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingLabsAudio(true)
    setLabsGenerateProgress(0)
    toast({
      title: "Processing Audio",
      description: "Simulating audio processing and enhancement...",
    })

    try {
      // Simulate progress
      let progress = 0
      const interval = setInterval(() => {
        progress += 10
        setLabsGenerateProgress(Math.min(progress, 90))
        if (progress >= 90) clearInterval(interval)
      }, 300)

      await new Promise((resolve) => setTimeout(resolve, 3000)) // Simulate network/processing time

      clearInterval(interval)
      setLabsGenerateProgress(100)

      // For demonstration, we'll just set the output to the input URL.
      // In a real scenario, this would be a new URL from the processed audio.
      setLabsGeneratedAudioUrl(labsOriginalAudioUrl)
      toast({
        title: "Audio Processed!",
        description: "Your audio has been successfully processed and enhanced.",
        variant: "success",
      })
    } catch (error) {
      console.error("Error processing labs audio:", error)
      toast({
        title: "Processing Failed",
        description: `Failed to process audio: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsGeneratingLabsAudio(false)
    }
  }

  const downloadLabsAudio = () => {
    if (labsGeneratedAudioUrl && labsAudioFile) {
      const a = document.createElement("a")
      a.href = labsGeneratedAudioUrl
      a.download = `${labsAudioFile.name.split(".")[0]}_processed.wav` // Or whatever processed format
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-7xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-white/40 overflow-hidden dark:bg-gray-900/80 transition-colors duration-300 ease-in-out"
        style={{
          borderRadius: "3rem 2.5rem 3rem 2.5rem",
        }}
      >
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20 dark:from-amber-600/20 dark:via-rose-500/15 dark:via-purple-600/10 dark:to-teal-500/20"></div>
          </div>
          <div className="relative px-8 text-center pb-2 pt-16">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal dark:from-logo-amber dark:via-logo-rose dark:via-logo-purple dark:to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out tracking-wide mb-2 font-black">
                Abhī Meditation Toolkit
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-lg mb-8">
                Craft, adjust, and explore your meditation journey.
              </p>
            </motion.div>
          </div>
        </div>

        <div className="px-6 md:px-10 pb-10 font-serif font-black">
          {/* Mode Selector */}
          <div className="mb-8 flex justify-center">
            <Tabs defaultValue="labs" className="w-fit">
              <TabsList className="grid w-full grid-cols-2 bg-gray-100/70 p-1 rounded-lg dark:bg-gray-800/70">
                <TabsTrigger value="adjuster" onClick={() => setActiveMode("adjuster")}>
                  Length Adjuster
                </TabsTrigger>
                <TabsTrigger value="labs" onClick={() => setActiveMode("labs")}>
                  Labs
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Conditional Rendering based on activeMode */}
          {activeMode === "adjuster" ? (
            // == Length Adjuster UI ==
            <div className="grid md:grid-cols-2 gap-8">
              {/* Process Audio Card */}
              <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 overflow-hidden shadow-lg border border-indigo-200 dark:border-blue-700">
                <CardHeader>
                  <CardTitle className="text-indigo-700 dark:text-blue-300">Process Audio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    className="border-2 border-dashed border-indigo-300 rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-indigo-500"
                    onDragOver={handleLabsDragOver}
                    onDragLeave={handleLabsDragLeave}
                    onDrop={handleLabsDrop}
                    onClick={() => document.getElementById("labs-audio-upload")?.click()}
                  >
                    <Upload className="h-10 w-10 mx-auto mb-3 text-indigo-400" />
                    <p className="text-lg font-medium text-indigo-800 dark:text-indigo-200 mb-1">
                      Drag & Drop or Click to Upload
                    </p>
                    <p className="text-sm text-indigo-600 dark:text-indigo-400">MP3, WAV, OGG, M4A files supported</p>
                    <input
                      id="labs-audio-upload"
                      type="file"
                      className="hidden"
                      accept=".mp3,.wav,.ogg,.m4a,audio/*"
                      onChange={handleLabsFileChange}
                    />
                  </div>
                  {labsAudioFile && (
                    <div className="flex items-center space-x-3 p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-md">
                      <FileAudio className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-indigo-800 dark:text-indigo-200 text-sm font-medium">
                        {labsAudioFile.name}
                      </span>
                      <span className="text-indigo-500 dark:text-indigo-500 text-xs ml-auto">
                        ({(labsAudioFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="total-duration" className="text-indigo-700 dark:text-indigo-300">
                      Target Total Duration: {formatTime(totalDuration)}
                    </Label>
                    <Slider
                      id="total-duration"
                      min={60}
                      max={3600} // 60 minutes
                      step={30}
                      value={[totalDuration]}
                      onValueChange={([value]) => setTotalDuration(value)}
                      className="[&>span:first-child]:h-2 [&>span:first-child]:bg-indigo-200 [&>span:first-child]:dark:bg-indigo-700 [&>span:first-child]:w-full [&>span:last-child]:bg-indigo-500 [&>span:last-child]:dark:bg-indigo-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fade-duration" className="text-indigo-700 dark:text-indigo-300">
                      Fade In/Out Duration: {fadeDuration} seconds
                    </Label>
                    <Slider
                      id="fade-duration"
                      min={0}
                      max={20}
                      step={1}
                      value={[fadeDuration]}
                      onValueChange={([value]) => setFadeDuration(value)}
                      className="[&>span:first-child]:h-2 [&>span:first-child]:bg-indigo-200 [&>span:first-child]:dark:bg-indigo-700 [&>span:first-child]:w-full [&>span:last-child]:bg-indigo-500 [&>span:last-child]:dark:bg-indigo-400"
                    />
                  </div>
                  <Button
                    onClick={processLabsAudio}
                    disabled={!labsAudioFile || isGeneratingLabsAudio}
                    className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white shadow-lg py-6 text-lg"
                  >
                    {isGeneratingLabsAudio ? (
                      <>
                        <RefreshCcw className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Waveform className="h-5 w-5 mr-2" />
                        Process Audio
                      </>
                    )}
                  </Button>
                  {isGeneratingLabsAudio && (
                    <Progress value={labsGenerateProgress} className="w-full h-2 mt-4 [&_div]:bg-indigo-500" />
                  )}
                </CardContent>
              </Card>

              {/* Processed Audio Card */}
              <Card className="bg-white dark:bg-gray-800 shadow-lg border border-indigo-500">
                <CardHeader className="bg-gradient-to-r from-green-500 via-indigo-500 to-green-500 text-white py-4 rounded-t-lg">
                  <CardTitle className="text-white">Generated Audio</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {labsGeneratedAudioUrl ? (
                    <div className="space-y-4">
                      <audio controls className="w-full" src={labsGeneratedAudioUrl} />
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                        <div>
                          <span className="font-semibold">Total Events:</span> {totalEvents}
                        </div>
                        <div>
                          <span className="font-semibold">Total Duration:</span>{" "}
                          {formatTime(labsGeneratedAudioDuration)}
                        </div>
                      </div>
                      <Button onClick={downloadLabsAudio} className="w-full">
                        <Download className="h-5 w-5 mr-2" />
                        Download Audio
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                      <FileAudio className="h-12 w-12 mb-4" />
                      <p>Processed audio will appear here</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            // == Labs UI ==
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-8">
                {/* Session Setup Card */}
                <Card className="shadow-lg border border-logo-rose">
                  <CardHeader>
                    <CardTitle className="text-logo-rose font-semibold">Session Setup</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-logo-rose font-semibold">
                    <div>
                      <Label htmlFor="session-title">Session Title</Label>
                      <Input
                        id="session-title"
                        value={sessionTitle}
                        onChange={(e) => setSessionTitle(e.target.value)}
                        placeholder="e.g., Morning Calm, Deep Focus"
                        className="text-logo-rose font-semibold border-logo-rose shadow-inner"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instruction-volume">Instruction Volume: {instructionVolume}%</Label>
                      <Slider
                        id="instruction-volume"
                        min={0}
                        max={100}
                        step={1}
                        value={[instructionVolume]}
                        onValueChange={([value]) => setInstructionVolume(value)}
                        className="[&>span:first-child]:h-2 [&>span:first-child]:bg-logo-rose/20 [&>span:first-child]:w-full [&>span:last-child]:bg-logo-rose"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sound-cue-volume">Sound Cue Volume: {soundCueVolume}%</Label>
                      <Slider
                        id="sound-cue-volume"
                        min={0}
                        max={100}
                        step={1}
                        value={[soundCueVolume]}
                        onValueChange={([value]) => setSoundCueVolume(value)}
                        className="[&>span:first-child]:h-2 [&>span:first-child]:bg-logo-rose/20 [&>span:first-child]:w-full [&>span:last-child]:bg-logo-rose"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Instruction Library Card */}
                <Card className="shadow-lg" ref={instructionLibraryRef}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-purple-700 dark:text-purple-300">Instruction Library</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Category</Label>
                      <Select value={selectedInstructionCategory} onValueChange={setSelectedInstructionCategory}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {INSTRUCTIONS_LIBRARY.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <ScrollArea className="h-60 w-full rounded-md border p-4">
                      <ToggleGroup
                        type="single"
                        value={selectedInstruction || ""}
                        onValueChange={setSelectedInstruction}
                        className="flex flex-col space-y-2 items-start"
                      >
                        {INSTRUCTIONS_LIBRARY.find((cat) => cat.id === selectedInstructionCategory)?.instructions.map(
                          (instruction) => (
                            <ToggleGroupItem
                              key={instruction.id}
                              value={instruction.id}
                              aria-label={instruction.text}
                              className={cn(
                                "w-full justify-start text-left px-3 py-2 rounded-md",
                                selectedInstruction === instruction.id
                                  ? "bg-white border border-gray-600 text-gray-800 dark:bg-gray-800 dark:border-gray-300 dark:text-gray-100"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
                              )}
                            >
                              <span className="block font-medium text-sm">{instruction.text}</span>
                              <span className="block text-xs text-gray-500">
                                Duration: {formatTime(instruction.duration)}
                                {instruction.soundCueId && ` | Cue: ${instruction.soundCueId}`}
                              </span>
                            </ToggleGroupItem>
                          ),
                        )}
                      </ToggleGroup>
                    </ScrollArea>
                    <Button onClick={addInstructionToTimeline} disabled={!selectedInstruction} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Instruction to Timeline
                    </Button>
                  </CardContent>
                </Card>

                {/* Sound Cue Library Card */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-teal-700 dark:text-teal-300">Sound Cue Library</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Category</Label>
                      <Select value={selectedSoundCueCategory} onValueChange={setSelectedSoundCueCategory}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {SOUND_CUES_LIBRARY.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <ScrollArea className="h-60 w-full rounded-md border p-4">
                      <ToggleGroup
                        type="single"
                        value={selectedSoundCue || ""}
                        onValueChange={setSelectedSoundCue}
                        className="flex flex-col space-y-2 items-start"
                      >
                        {SOUND_CUES_LIBRARY.find((cat) => cat.id === selectedSoundCueCategory)?.soundCues.map((cue) => (
                          <ToggleGroupItem
                            key={cue.id}
                            value={cue.id}
                            aria-label={cue.name}
                            className="w-full justify-start text-left px-3 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="block font-medium text-sm">{cue.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation() // Prevent toggling the item
                                  // Play sound preview (simplified, actual implementation might use Web Audio API)
                                  const audio = new Audio(cue.filePath)
                                  audio.play()
                                  toast({
                                    title: "Playing Sound Cue",
                                    description: `Playing: ${cue.name}`,
                                  })
                                }}
                              >
                                <PlayCircle className="h-4 w-4" />
                              </Button>
                            </div>
                            <span className="block text-xs text-gray-500">Duration: {formatTime(cue.duration)}</span>
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </ScrollArea>
                    <Button onClick={addSoundCueToTimeline} disabled={!selectedSoundCue} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sound Cue to Timeline
                    </Button>
                  </CardContent>
                </Card>

                {/* Voice Recording Card */}
                <Card className="shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-amber-700 dark:text-amber-300">Voice Recording</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-center space-x-4">
                      {!recordingStatus.isRecording && !recordedAudioUrl && (
                        <Button
                          onClick={startRecording}
                          className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white"
                        >
                          <Microphone className="h-5 w-5 mr-2" /> Start Recording
                        </Button>
                      )}
                      {recordingStatus.isRecording && !recordingStatus.isPaused && (
                        <Button onClick={pauseRecording} variant="outline">
                          <Pause className="h-5 w-5 mr-2" /> Pause
                        </Button>
                      )}
                      {recordingStatus.isRecording && recordingStatus.isPaused && (
                        <Button onClick={resumeRecording} className="bg-green-500 hover:bg-green-600 text-white">
                          <PlayCircle className="h-5 w-5 mr-2" /> Resume
                        </Button>
                      )}
                      {recordingStatus.isRecording && (
                        <Button onClick={stopRecording} variant="destructive">
                          <StopCircle className="h-5 w-5 mr-2" /> Stop
                        </Button>
                      )}
                      {(recordingStatus.isRecording || recordedAudioUrl) && (
                        <Button onClick={resetRecording} variant="ghost">
                          <RefreshCcw className="h-5 w-5" /> Reset
                        </Button>
                      )}
                    </div>
                    {recordingStatus.isRecording && (
                      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                        Recording: {formatTime(recordingCurrentTime)}
                      </div>
                    )}
                    {recordedAudioUrl && (
                      <div className="space-y-2">
                        <h3 className="font-medium text-gray-700 dark:text-gray-300">Recorded Audio</h3>
                        <audio ref={recordedAudioRef} controls src={recordedAudioUrl} className="w-full" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Right Column (Timeline) */}
              <div className="lg:col-span-1 space-y-8">
                {/* Timeline Card */}
                <Card className="shadow-lg" ref={timelineRef}>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-rose-700 dark:text-rose-300">Timeline</CardTitle>
                    <Button onClick={scrollToInstructionLibrary} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" /> Add Event
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                      <div>
                        <span className="font-semibold">Total Events:</span> {totalEvents}
                      </div>
                      <div>
                        <span className="font-semibold">Total Duration:</span> {formatTime(currentTimelineDuration)}
                      </div>
                    </div>
                    <VisualTimeline events={timelineEvents} onDelete={deleteTimelineEvent} />
                  </CardContent>
                </Card>

                {/* Generate Audio Card (Labs Section) */}
                <Card className="bg-gradient-to-r from-green-100 via-indigo-100 to-green-100 dark:from-green-900/20 dark:via-indigo-900/20 dark:to-green-900/20 shadow-lg border border-indigo-500">
                  <CardHeader>
                    <CardTitle className="text-indigo-700 dark:text-indigo-300">Generate Audio</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary"
                      onDragOver={handleLabsDragOver}
                      onDragLeave={handleLabsDragLeave}
                      onDrop={handleLabsDrop}
                      onClick={() => document.getElementById("labs-audio-upload-timeline")?.click()}
                    >
                      <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                      <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Drag & Drop or Click to Upload Background Audio
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Optional: MP3, WAV, OGG, M4A files</p>
                      <input
                        id="labs-audio-upload-timeline"
                        type="file"
                        className="hidden"
                        accept=".mp3,.wav,.ogg,.m4a,audio/*"
                        onChange={handleLabsFileChange}
                      />
                    </div>
                    {labsAudioFile && (
                      <div className="flex items-center space-x-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
                        <FileAudio className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">
                          {labsAudioFile.name}
                        </span>
                        <span className="text-gray-500 dark:text-gray-500 text-xs ml-auto">
                          ({(labsAudioFile.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    )}

                    <Button
                      onClick={processLabsAudio}
                      disabled={isGeneratingLabsAudio || timelineEvents.length === 0}
                      className="w-full bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white shadow-lg py-6 text-lg"
                    >
                      {isGeneratingLabsAudio ? (
                        <>
                          <RefreshCcw className="h-5 w-5 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Waveform className="h-5 w-5 mr-2" />
                          Generate Audio
                        </>
                      )}
                    </Button>
                    {isGeneratingLabsAudio && (
                      <Progress value={labsGenerateProgress} className="w-full h-2 mt-4 [&_div]:bg-indigo-500" />
                    )}
                  </CardContent>
                </Card>

                {/* Generated Audio Card (Labs Section) */}
                <Card className="bg-white dark:bg-gray-800 shadow-lg border border-indigo-500">
                  <CardHeader className="bg-gradient-to-r from-green-500 via-indigo-500 to-green-500 text-white py-4 rounded-t-lg">
                    <CardTitle className="text-white">Generated Audio</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {labsGeneratedAudioUrl ? (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">{sessionTitle}</h3>
                        <audio controls className="w-full" src={labsGeneratedAudioUrl} />
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 dark:text-gray-300">
                          <div>
                            <span className="font-semibold">Total Events:</span> {totalEvents}
                          </div>
                          <div>
                            <span className="font-semibold">Total Duration:</span>{" "}
                            {formatTime(labsGeneratedAudioDuration)}
                          </div>
                        </div>
                        <Button onClick={downloadLabsAudio} className="w-full">
                          <Download className="h-5 w-5 mr-2" />
                          Download Audio
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
                        <FileAudio className="h-12 w-12 mb-4" />
                        <p>Generated audio will appear here</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
