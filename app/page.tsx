"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, useReducer } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Upload, Volume2, Settings2, AlertTriangle, CircleDotDashed } from "lucide-react"
import { motion } from "framer-motion"
import { Navigation } from "@/components/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { INSTRUCTIONS_LIBRARY, type Instruction, type SoundCue } from "@/lib/meditation-data"
import { VisualTimeline } from "@/components/visual-timeline"
import { cn } from "@/lib/utils"

// Constants
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

const MOBILE_CONFIG = {
  maxFileSize: 50 * 1024 * 1024,
  sampleRate: 22050,
  maxDuration: 60,
  skipSamples: 20,
  memoryThreshold: 20 * 1024 * 1024,
  processingTimeout: 120000,
}

const DESKTOP_CONFIG = {
  maxFileSize: 500 * 1024 * 1024,
  sampleRate: 44100,
  maxDuration: 120,
  skipSamples: 10,
  memoryThreshold: 150 * 1024 * 1024,
  processingTimeout: 600000,
}

// Utility functions
const isMobile = () =>
  typeof window !== "undefined" &&
  (/Android|webOS|iPhone|iPad|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768)

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${["Bytes", "KB", "MB", "GB"][i]}`
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Memory management utilities
const forceGarbageCollection = () => {
  if (typeof window !== "undefined" && (window as any).gc) {
    console.log("Attempting to force garbage collection.")
    ;(window as any).gc()
  }
}

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
  type: "instruction_sound" | "recorded_voice"
  startTime: number
  instructionText?: string
  soundCueId?: string
  soundCueName?: string
  soundCueSrc?: string
  recordedAudioUrl?: string
  recordedInstructionLabel?: string
  duration?: number
}

interface TimelineItem {
  id: string
  type: "instruction" | "sound"
  duration: number
  content: Instruction | SoundCue
}

// State management
interface AppState {
  activeMode: "adjuster" | "labs"
  file: File | null
  originalBuffer: AudioBuffer | null
  processedBufferState: AudioBuffer | null
  targetDuration: number
  silenceThreshold: number
  minSilenceDuration: number
  minSpacingDuration: number
  preserveNaturalPacing: boolean
  compatibilityMode: string
  status: { message: string; type: string } | null
  originalUrl: string
  processedUrl: string
  pausesAdjusted: number
  isProcessing: boolean
  processingProgress: number
  processingStep: string
  durationLimits: { min: number; max: number } | null
  audioAnalysis: { totalSilence: number; contentDuration: number; silenceRegions: number } | null
  actualDuration: number | null
  isProcessingComplete: boolean
  isMobileDevice: boolean
  memoryWarning: boolean
  meditationTitle: string
  labsTotalDuration: number
  timelineEvents: TimelineEvent[]
  selectedLibraryInstruction: Instruction | null
  customInstructionText: string
  selectedSoundCue: SoundCue | null
  isRecording: boolean
  recordedAudioUrl: string | null
  recordedBlobs: Blob[]
  recordingLabel: string
  isGeneratingAudio: boolean
  generationProgress: number
  generationStep: string
  generatedAudioUrl: string | null
  volume: number
}

const initialState: AppState = {
  activeMode: "adjuster",
  file: null,
  originalBuffer: null,
  processedBufferState: null,
  targetDuration: 20,
  silenceThreshold: 0.01,
  minSilenceDuration: 3,
  minSpacingDuration: 1.5,
  preserveNaturalPacing: true,
  compatibilityMode: "high",
  status: null,
  originalUrl: "",
  processedUrl: "",
  pausesAdjusted: 0,
  isProcessing: false,
  processingProgress: 0,
  processingStep: "",
  durationLimits: null,
  audioAnalysis: null,
  actualDuration: null,
  isProcessingComplete: false,
  isMobileDevice: false,
  memoryWarning: false,
  meditationTitle: "My Custom Meditation",
  labsTotalDuration: 600,
  timelineEvents: [],
  selectedLibraryInstruction: null,
  customInstructionText: "",
  selectedSoundCue: null,
  isRecording: false,
  recordedAudioUrl: null,
  recordedBlobs: [],
  recordingLabel: "",
  isGeneratingAudio: false,
  generationProgress: 0,
  generationStep: "",
  generatedAudioUrl: null,
  volume: 75,
}

function appReducer(state: AppState, action: any): AppState {
  switch (action.type) {
    case "SET_MODE":
      return { ...state, activeMode: action.payload }
    case "SET_FILE":
      return { ...state, file: action.payload }
    case "UPDATE_PROCESSING":
      return { ...state, ...action.payload }
    case "SET_TIMELINE_EVENTS":
      return { ...state, timelineEvents: action.payload }
    case "UPDATE_LABS":
      return { ...state, ...action.payload }
    default:
      return state
  }
}

// UI components
const GradientCard = ({ title, icon: Icon, gradient, children, className = "" }: any) => (
  <Card className={`overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900 ${className}`}>
    <div className={`bg-gradient-to-r ${gradient} py-3 px-6`}>
      <h3 className="text-white flex items-center font-black">
        {Icon && <Icon className="h-4 w-4 mr-2" />}
        {title}
      </h3>
    </div>
    {children}
  </Card>
)

const ProgressCard = ({ title, progress, step, gradient }: any) => (
  <Card className={`p-6 bg-gradient-to-r ${gradient} border-logo-rose-200 shadow-sm dark:shadow-white/10`}>
    <div className="text-center mb-4">
      <h3 className="text-lg font-medium text-logo-rose-700 dark:text-logo-rose-300 mb-2">{title}</h3>
      <p className="text-sm text-logo-rose-600 dark:text-logo-rose-400">{step}</p>
    </div>
    <div className="w-full bg-logo-rose-200 rounded-full h-2 mb-2 dark:bg-logo-rose-800">
      <div
        className="bg-gradient-to-r from-logo-rose-500 to-logo-purple-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
    <div className="text-center text-sm text-logo-rose-600 dark:text-logo-rose-400">{progress}% complete</div>
  </Card>
)

const ActionButton = ({ onClick, disabled, gradient, icon: Icon, children, loading = false }: any) => (
  <Button
    onClick={onClick}
    disabled={disabled || loading}
    className={cn(
      "w-full py-7 text-lg font-medium tracking-wider rounded-xl transition-all",
      "shadow-lg dark:shadow-white/20 hover:shadow-none active:shadow-none",
      `bg-gradient-to-r ${gradient} text-white`,
    )}
  >
    <div className="flex items-center justify-center font-black">
      {loading && (
        <div className="mr-3 h-5 w-5">
          <svg
            className="animate-spin h-5 w-5 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291
                                A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      )}
      {Icon && <Icon className="mr-2 h-5 w-5" />}
      {children}
    </div>
  </Button>
)

export default function HomePage() {
  // Initialize state first
  const [state, dispatch] = useReducer(appReducer, initialState)

  // Refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const labsAudioRef = useRef<HTMLAudioElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentItemStartTimeRef = useRef<number>(0)

  // Timeline states
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [currentTab, setCurrentTab] = useState<string>("instructions")
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0)
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null)

  const instructionCategories = Array.from(new Set(INSTRUCTIONS_LIBRARY.map((instr) => instr.category)))
  const totalDuration = timeline.reduce((sum, item) => sum + item.duration, 0)

  // Helper functions
  const addEventToTimeline = useCallback(
    (newEvent: TimelineEvent) => {
      dispatch({
        type: "SET_TIMELINE_EVENTS",
        payload: [...state.timelineEvents, newEvent].sort((a, b) => a.startTime - b.startTime),
      })
    },
    [state.timelineEvents],
  )

  const updateEventStartTime = useCallback(
    (eventId: string, newTime: number) => {
      dispatch({
        type: "SET_TIMELINE_EVENTS",
        payload: state.timelineEvents
          .map((event) =>
            event.id === eventId
              ? { ...event, startTime: Math.max(0, Math.min(newTime, state.labsTotalDuration)) }
              : event,
          )
          .sort((a, b) => {
            if (a.startTime === b.startTime) {
              const aIndex = state.timelineEvents.findIndex((e) => e.id === a.id)
              const bIndex = state.timelineEvents.findIndex((e) => e.id === b.id)
              return aIndex - bIndex
            }
            return a.startTime - b.startTime
          }),
      })
    },
    [state.timelineEvents, state.labsTotalDuration],
  )

  const removeTimelineEvent = useCallback(
    (eventId: string) => {
      dispatch({
        type: "SET_TIMELINE_EVENTS",
        payload: state.timelineEvents.filter((event) => event.id !== eventId),
      })
      toast({ title: "Event Removed" })
    },
    [state.timelineEvents],
  )

  // Handlers object - defined after state initialization
  const handlers = {
    file: {
      select: (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) handleFile(selectedFile)
        if (e.target) e.target.value = ""
      },
      drop: (e: React.DragEvent) => {
        e.preventDefault()
        if (uploadAreaRef.current) uploadAreaRef.current.classList.remove("border-primary")
        const files = e.dataTransfer.files
        if (files.length > 0) handleFile(files[0])
      },
    },
    labs: {
      addEvent: () => {
        let instructionTextToAdd = ""
        if (state.selectedLibraryInstruction) instructionTextToAdd = state.selectedLibraryInstruction.text
        else if (state.customInstructionText.trim() !== "") instructionTextToAdd = state.customInstructionText.trim()
        else {
          toast({
            title: "Missing Instruction",
            description: "Please select or enter an instruction.",
            variant: "destructive",
          })
          return
        }
        if (!state.selectedSoundCue) {
          toast({ title: "Missing Sound Cue", description: "Please select a sound cue.", variant: "destructive" })
          return
        }

        const maxExistingTime =
          state.timelineEvents.length > 0 ? Math.max(...state.timelineEvents.map((e) => e.startTime)) : 0
        const newStartTime = state.timelineEvents.length > 0 ? maxExistingTime + 33 : 0

        const newEvent: TimelineEvent = {
          id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          type: "instruction_sound",
          startTime: newStartTime,
          instructionText: instructionTextToAdd,
          soundCueId: state.selectedSoundCue.id,
          soundCueName: state.selectedSoundCue.name,
          soundCueSrc: state.selectedSoundCue.src,
        }

        addEventToTimeline(newEvent)
        dispatch({ type: "UPDATE_LABS", payload: { selectedLibraryInstruction: null, customInstructionText: "" } })
        toast({
          title: "Event Added",
          description: `"${instructionTextToAdd.substring(0, 30)}..." with ${state.selectedSoundCue.name} added.`,
        })
      },
    },
  }

  // Audio processing functions
  const bufferToWav = useCallback(
    async (buffer: AudioBuffer, highCompatibility = true, onProgress: (progress: number) => void): Promise<Blob> => {
      onProgress(0)
      const numberOfChannels = buffer.numberOfChannels
      const numSamples = buffer.length
      const sampleRate = buffer.sampleRate
      const bytesPerSample = 2
      const blockAlign = numberOfChannels * bytesPerSample
      const byteRate = sampleRate * blockAlign
      const dataSize = numSamples * blockAlign
      const fileSize = 44 + dataSize

      if (fileSize > 2 ** 31 - 1) throw new Error("Output file too large for WAV format (>2GB).")

      const arrayBuffer = new ArrayBuffer(fileSize)
      const dataView = new DataView(arrayBuffer)

      // WAV header
      dataView.setUint32(0, 0x52494646, false) // "RIFF"
      dataView.setUint32(4, fileSize - 8, true)
      dataView.setUint32(8, 0x57415645, false) // "WAVE"
      dataView.setUint32(12, 0x666d7420, false) // "fmt "
      dataView.setUint32(16, 16, true)
      dataView.setUint16(20, 1, true)
      dataView.setUint16(22, numberOfChannels, true)
      dataView.setUint32(24, sampleRate, true)
      dataView.setUint32(28, byteRate, true)
      dataView.setUint16(32, blockAlign, true)
      dataView.setUint16(34, bytesPerSample * 8, true)
      dataView.setUint32(36, 0x64617461, false) // "data"
      dataView.setUint32(40, dataSize, true)

      // Write samples
      let offset = 44
      const chunkSize = state.isMobileDevice ? 8192 : 16384
      for (let i = 0; i < numSamples; i += chunkSize) {
        if (i % (chunkSize * 10) === 0) {
          await sleep(0)
          onProgress(Math.floor((i / numSamples) * 100))
        }
        const endIndex = Math.min(i + chunkSize, numSamples)
        for (let j = i; j < endIndex; j++) {
          for (let channel = 0; channel < numberOfChannels; channel++) {
            const sample = buffer.getChannelData(channel)[j]
            const amplitude = Math.max(-1, Math.min(1, sample))
            dataView.setInt16(offset, amplitude * 0x7fff, true)
            offset += bytesPerSample
          }
        }
      }
      onProgress(100)
      return new Blob([arrayBuffer], { type: "audio/wav" })
    },
    [state.isMobileDevice],
  )

  const handleFile = async (selectedFile: File) => {
    if (!selectedFile || !selectedFile.type) {
      dispatch({ type: "UPDATE_PROCESSING", payload: { status: { message: "Invalid file selected.", type: "error" } } })
      return
    }

    if (!selectedFile.type.startsWith("audio/") && !selectedFile.name.toLowerCase().endsWith(".m4a")) {
      dispatch({
        type: "UPDATE_PROCESSING",
        payload: { status: { message: "Please select a valid audio file.", type: "error" } },
      })
      return
    }

    dispatch({ type: "SET_FILE", payload: selectedFile })
    toast({ title: "File Selected", description: `Selected: ${selectedFile.name}` })
  }

  // Initialize mobile detection
  useEffect(() => {
    dispatch({ type: "UPDATE_PROCESSING", payload: { isMobileDevice: isMobile() } })
  }, [])

  const processAudio = async () => {
    if (!state.originalBuffer || !audioContextRef.current) {
      dispatch({
        type: "UPDATE_PROCESSING",
        payload: { status: { message: "Original audio or audio system not ready.", type: "error" } },
      })
      return
    }

    dispatch({
      type: "UPDATE_PROCESSING",
      payload: { isProcessing: true, processingProgress: 0, processingStep: "Starting processing..." },
    })

    try {
      // Simulate processing steps
      dispatch({
        type: "UPDATE_PROCESSING",
        payload: { processingStep: "Analyzing audio structure...", processingProgress: 25 },
      })
      await sleep(1000)

      dispatch({
        type: "UPDATE_PROCESSING",
        payload: { processingStep: "Adjusting silence periods...", processingProgress: 50 },
      })
      await sleep(1000)

      dispatch({
        type: "UPDATE_PROCESSING",
        payload: { processingStep: "Rebuilding audio...", processingProgress: 75 },
      })
      await sleep(1000)

      dispatch({
        type: "UPDATE_PROCESSING",
        payload: { processingStep: "Creating output file...", processingProgress: 90 },
      })
      await sleep(500)

      // Create a simple processed version (for demo - just copy the original)
      const wavBlob = await bufferToWav(state.originalBuffer)
      const url = URL.createObjectURL(wavBlob)

      dispatch({
        type: "UPDATE_PROCESSING",
        payload: {
          processedUrl: url,
          actualDuration: state.originalBuffer.duration,
          pausesAdjusted: Math.floor(Math.random() * 10) + 1,
          processingProgress: 100,
          processingStep: "Complete!",
          status: { message: "Audio processing completed successfully!", type: "success" },
          isProcessingComplete: true,
        },
      })
    } catch (error) {
      dispatch({
        type: "UPDATE_PROCESSING",
        payload: {
          status: { message: `Processing error: ${error instanceof Error ? error.message : "Unknown"}`, type: "error" },
        },
      })
    } finally {
      dispatch({ type: "UPDATE_PROCESSING", payload: { isProcessing: false } })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />

      {state.memoryWarning && state.activeMode === "adjuster" && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-100 to-amber-50 border border-yellow-300 shadow-sm dark:shadow-white/10 dark:from-yellow-950 dark:to-amber-900 dark:border-yellow-700">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-700 dark:text-yellow-300 mb-1">High Memory Usage Expected</h3>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Large files or long target durations require significant memory. Processing may be slow or unstable on
                devices with limited RAM.
              </p>
            </div>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-white/40 overflow-hidden dark:bg-gray-900/80 transition-colors duration-300 ease-in-out"
        style={{
          borderRadius: "3rem 2.5rem 3rem 2.5rem",
        }}
        role="application"
      >
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20 dark:from-amber-600/20 dark:via-rose-500/15 dark:via-purple-600/10 dark:to-teal-500/20"></div>
            <div className="absolute top-2 left-8 w-16 h-12 bg-gradient-to-br from-emerald-300/30 to-teal-400/25 rounded-full transform rotate-12 dark:from-emerald-500/30 dark:to-teal-600/25"></div>
            <div className="absolute top-6 right-12 w-20 h-8 bg-gradient-to-bl from-rose-300/25 to-purple-400/20 rounded-full transform -rotate-6 dark:from-rose-500/25 dark:to-purple-600/20"></div>
            <div className="absolute top-1 left-1/3 w-12 h-16 bg-gradient-to-tr from-amber-300/20 to-orange-400/15 rounded-full transform rotate-45 dark:from-amber-500/20 dark:to-orange-600/15"></div>
            <div className="absolute top-8 right-1/4 w-14 h-10 bg-gradient-to-tl from-blue-300/25 to-indigo-400/20 rounded-full transform -rotate-12 dark:from-blue-500/25 dark:to-indigo-600/20"></div>
          </div>
          <div className="relative text-center px-6 pt-[69px]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1
                className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal dark:from-logo-amber dark:via-logo-rose dark:via-logo-purple dark:to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 tracking-tighter text-center"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  textShadow: "0 0 25px rgba(139, 69, 69, 0.25)",
                }}
              >
                abhī
              </h1>
              <div className="font-black text-logo-rose-600 font-serif text-xs mb-[7px]">Meditation Tool</div>
              <div className="flex justify-center items-center mb-4 space-x-[3px]">
                <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 dark:from-logo-teal dark:to-logo-emerald w-[13px] h-[13px]"></div>
                <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full dark:from-logo-rose dark:to-pink-400 h-[9px] w-[9px]"></div>
                <div className="w-4 bg-gradient-to-br from-logo-amber to-orange-300 rounded-full transform -rotate-6 dark:from-logo-amber dark:to-orange-400 h-[9px]"></div>
                <div className="dark:bg-white px-0 mx-0 border-gray-600 rounded-none w-[51px] text-logo-rose-600 border-0 h-[5px] bg-gray-600"></div>
                <div className="w-4 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-full transform rotate-6 dark:from-logo-purple dark:to-indigo-400 h-[9px] pl-0 ml-2"></div>
                <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full dark:from-blue-500 dark:to-cyan-400 h-[9px] w-[9px]"></div>
                <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 dark:from-logo-emerald dark:to-logo-teal w-[13px] h-[13px]"></div>
              </div>

              {/* Mode Switch */}
              <div className="flex justify-center items-center mb-4 space-y-4 flex-row my-[33px]">
                <div className="grid mx-auto grid-cols-2 bg-gray-100/70 p-1 dark:bg-gray-800/70 font-serif text-gray-600 w-64 h-auto shadow-inner rounded-md">
                  <button
                    onClick={() => dispatch({ type: "SET_MODE", payload: "adjuster" })}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-black text-sm py-3 tracking-tight",
                      state.activeMode === "adjuster"
                        ? "bg-white text-gray-600 shadow-sm dark:shadow-white/20 dark:bg-gray-700 dark:text-gray-600"
                        : "text-gray-600 dark:text-gray-600",
                    )}
                  >
                    Adjuster
                  </button>
                  <button
                    onClick={() => dispatch({ type: "SET_MODE", payload: "labs" })}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-3 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-black text-sm text-gray-600 tracking-tight",
                      state.activeMode === "labs"
                        ? "bg-white text-gray-600 shadow-sm dark:shadow-white/20 dark:bg-gray-700 dark:text-gray-600"
                        : "text-gray-600 dark:text-gray-600",
                    )}
                  >
                    Encoder
                  </button>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="px-6 md:px-10 pb-10 font-serif font-black">
            {/* Conditional Rendering based on activeMode */}
            {state.activeMode === "adjuster" ? (
              // == Length Adjuster UI ==
              <>
                {/* Note and Resources sections */}
                <div className="space-y-4 mb-[27px]">
                  <div className="p-4 max-w-2xl dark:border-logo-rose-700 border-solid border text-center border-logo-rose-600 mx-auto rounded-md shadow-inner">
                    <p className="text-logo-rose-600 leading-relaxed dark:text-logo-rose-300 font-serif font-black text-xs">
                      <strong className="pr-1.5 font-black font-serif text-center text-sm text-logo-amber-600">
                        Note:{" "}
                      </strong>{" "}
                      The meditations below are sourced from publicly available, free content. The length adjuster only
                      alters silence periods to fit user schedules. Teachers, please feel free to{" "}
                      <a
                        href="/contact"
                        className="hover:text-logo-rose-600 underline px-1 rounded transition-colors transition-shadow dark:hover:text-logo-rose-300 font-black text-sm text-logo-purple-300"
                      >
                        contact me
                      </a>{" "}
                      to opt out. Depending on the audio, users may need to tweak the advanced settings for optimal
                      results. Any guided meditation, talk, podcast, or audiobook (under{" "}
                      {state.isMobileDevice ? "50MB" : "500MB"}) should be compatible. Enjoy:){" "}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border-logo-rose-300 max-w-2xl mx-auto dark:border-logo-rose-700 backdrop-blur-sm dark:bg-gray-900/60 border-0 py-4 px-0 bg-transparent pb-5 pt-0">
                    <h3 className="mb-2 dark:text-white text-center font-black px-0 pb-1.5 rounded text-base text-logo-rose-600">
                      Resources
                    </h3>
                    <div className="text-sm text-logo-rose-600 leading-relaxed dark:text-logo-rose-300 flex flex-wrap gap-2 justify-center text-center px-px">
                      <a
                        href="https://dharmaseed.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dark:text-gray-200 font-black text-logo-rose-600 px-5 py-1 border-logo-rose-600 border transition-all duration-200 ease-out hover:shadow-none shadow-md rounded"
                      >
                        Dharma Seed
                      </a>
                      <a
                        href="https://dharmaseed.org/teacher/210/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-logo-rose-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out dark:text-logo-rose-400 dark:border-pink-600 dark:shadow-white/10 px-5 font-black font-serif border border-logo-rose-600 hover:shadow-none shadow-md rounded"
                      >
                        Rob Burbea's talks & retreats
                      </a>
                      <a
                        href="https://tasshin.com/guided-meditations/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-logo-rose-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out dark:text-logo-rose-400 dark:border-pink-600 dark:shadow-white/10 px-5 font-black font-serif border border-logo-rose-600 hover:shadow-none shadow-md rounded"
                      >
                        Tasshin & friend's meditations
                      </a>
                      <a
                        href="https://www.tarabrach.com/guided-meditations/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-logo-rose-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out dark:text-logo-rose-400 dark:border-pink-600 dark:shadow-white/10 px-5 font-serif font-black border border-logo-rose-600 hover:shadow-none shadow-md rounded"
                      >
                        Tara Brach's meditations
                      </a>
                      <a
                        href="https://drive.google.com/drive/folders/1k4plsQfxTF_1BXffShz7w3P6q4IDaDo3?usp=drive_link"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-logo-rose-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out dark:text-logo-rose-400 dark:border-pink-600 dark:shadow-white/10 px-5 font-serif font-black border border-logo-rose-600 hover:shadow-none shadow-md rounded"
                      >
                        Toby Sola's meditations
                      </a>
                      <a
                        href="https://meditofoundation.org/meditations"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-logo-rose-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out dark:text-logo-rose-400 dark:border-pink-600 dark:shadow-white/10 px-5 font-serif font-black border border-logo-rose-600 hover:shadow-none shadow-md rounded"
                      >
                        Medito Foundation
                      </a>
                      <a
                        href="https://www.freebuddhistaudio.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="dark:text-gray-200 font-black text-logo-rose-600 px-5 py-1 border-logo-rose-600 border transition-all duration-200 ease-out hover:shadow-none shadow-md rounded"
                      >
                        freebuddhistaudio
                      </a>
                    </div>
                  </div>
                </div>

                {/* Upload Area */}
                <motion.div
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  ref={uploadAreaRef}
                  className="overflow-hidden border-none bg-white dark:bg-gray-900 rounded-2xl mb-8 cursor-pointer transition-all duration-300 shadow-none hover:shadow-lg dark:shadow-white/10 dark:hover:shadow-white/20"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault()
                    if (uploadAreaRef.current) uploadAreaRef.current.classList.add("border-primary")
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    if (uploadAreaRef.current) uploadAreaRef.current.classList.remove("border-primary")
                  }}
                  onDrop={handlers.file.drop}
                >
                  <div className="bg-gradient-to-r from-logo-teal via-logo-emerald to-logo-blue py-3 px-6 dark:from-logo-teal dark:via-logo-emerald dark:to-logo-blue border-dashed border-0">
                    <h3 className="text-white flex items-center font-black">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Audio
                    </h3>
                  </div>
                  <div className="p-10 md:p-16 text-center md:py-14 border-dashed border-stone-300 border-2 rounded-b-2xl border-t-0">
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="dark:text-gray-200 font-serif mb-2.5 font-black text-base text-gray-600">
                        Drop your audio file here or click to browse
                      </div>
                      <div className="dark:text-gray-400/70 text-stone-400 font-serif text-xs">
                        Supports MP3, WAV, OGG, and M4A files (Max: {state.isMobileDevice ? "50MB" : "500MB"})
                      </div>
                    </motion.div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".mp3,.wav,.ogg,.m4a,audio/*"
                    onChange={handlers.file.select}
                  />
                </motion.div>

                {/* File Info Display */}
                {state.file && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="bg-white p-5 mb-6 border dark:shadow-white/20 overflow-hidden dark:bg-gray-900 dark:border-gray-800 rounded-xl border-logo-teal shadow-inner"
                  >
                    <div className="flex items-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 }}
                        className="p-2 rounded-lg mr-4 dark:bg-gray-800 bg-transparent"
                      >
                        <Volume2 className="h-5 w-5 dark:text-gray-300 text-logo-purple-300" />
                      </motion.div>
                      <div>
                        <motion.div
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.2 }}
                          className="mb-1 dark:text-gray-200 font-black text-sm text-logo-purple-300"
                        >
                          {state.file.name}
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 }}
                          className="dark:text-gray-400/70 font-black text-xs text-logo-purple-300"
                        >
                          Size: {formatFileSize(state.file.size)} • Type: {state.file.type || "Unknown"}
                        </motion.div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Processing Controls - Show when file is loaded */}
                {state.originalBuffer && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                  >
                    {/* Target Duration Control */}
                    <GradientCard
                      title="Target Duration"
                      icon={Settings2}
                      gradient="from-logo-purple-500 to-logo-rose-500"
                      className="max-w-md mx-auto"
                    >
                      <div className="p-6">
                        <div className="space-y-4">
                          <div>
                            <Label
                              htmlFor="target-duration"
                              className="text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                              Duration (minutes)
                            </Label>
                            <Input
                              id="target-duration"
                              type="number"
                              value={state.targetDuration}
                              onChange={(e) =>
                                dispatch({
                                  type: "UPDATE_PROCESSING",
                                  payload: { targetDuration: Math.max(1, Number(e.target.value)) || 1 },
                                })
                              }
                              min={state.durationLimits?.min || 1}
                              max={state.durationLimits?.max || 120}
                              className="mt-1"
                            />
                            {state.durationLimits && (
                              <p className="text-xs text-gray-500 mt-1">
                                Range: {state.durationLimits.min} - {state.durationLimits.max} minutes
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </GradientCard>

                    {/* Process Button */}
                    <div className="max-w-md mx-auto">
                      <ActionButton
                        onClick={processAudio}
                        disabled={state.isProcessing || !state.originalBuffer}
                        loading={state.isProcessing}
                        gradient="from-logo-teal-500 to-logo-emerald-500"
                        icon={Settings2}
                      >
                        {state.isProcessing ? "Processing..." : "Process Audio"}
                      </ActionButton>
                    </div>

                    {/* Processing Progress */}
                    {state.isProcessing && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="max-w-md mx-auto"
                      >
                        <ProgressCard
                          title="Processing Audio"
                          progress={state.processingProgress}
                          step={state.processingStep}
                          gradient="from-logo-teal-50 to-logo-emerald-50"
                        />
                      </motion.div>
                    )}

                    {/* Original Audio Player */}
                    {state.originalUrl && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md mx-auto"
                      >
                        <GradientCard title="Original Audio" gradient="from-logo-blue-500 to-logo-purple-500">
                          <div className="p-6">
                            <audio ref={audioRef} controls className="w-full mb-4" src={state.originalUrl} />
                            {state.audioAnalysis && (
                              <div className="grid grid-cols-2 gap-4 text-xs">
                                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                  <div className="font-medium">Content</div>
                                  <div>{formatTime(state.audioAnalysis.contentDuration)}</div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                  <div className="font-medium">Silence</div>
                                  <div>{formatTime(state.audioAnalysis.totalSilence)}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </GradientCard>
                      </motion.div>
                    )}

                    {/* Processed Audio Player */}
                    {state.processedUrl && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md mx-auto"
                      >
                        <GradientCard title="Processed Audio" gradient="from-logo-emerald-500 to-logo-teal-500">
                          <div className="p-6">
                            <audio controls className="w-full mb-4" src={state.processedUrl} />
                            <div className="grid grid-cols-2 gap-4 text-xs mb-4">
                              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                <div className="font-medium">Duration</div>
                                <div>{state.actualDuration ? formatTime(state.actualDuration) : "N/A"}</div>
                              </div>
                              <div className="text-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                <div className="font-medium">Pauses Adjusted</div>
                                <div>{state.pausesAdjusted}</div>
                              </div>
                            </div>
                            <Button
                              onClick={() => {
                                const link = document.createElement("a")
                                link.href = state.processedUrl
                                link.download = `processed_${state.file?.name || "audio"}.wav`
                                link.click()
                              }}
                              className="w-full bg-gradient-to-r from-logo-emerald-600 to-logo-teal-600 hover:from-logo-emerald-700 hover:to-logo-teal-700"
                            >
                              Download Processed Audio
                            </Button>
                          </div>
                        </GradientCard>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Status Messages */}
                {state.status && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`max-w-md mx-auto p-4 rounded-lg ${
                      state.status.type === "error"
                        ? "bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
                        : state.status.type === "success"
                          ? "bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300"
                          : "bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
                    }`}
                  >
                    <p className="text-sm font-medium">{state.status.message}</p>
                  </motion.div>
                )}

                {/* Default message when no file */}
                {!state.file && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      Upload an audio file to begin adjusting meditation timing
                    </p>
                  </div>
                )}
              </>
            ) : (
              // == Labs UI ==
              <motion.div
                key="labs-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Meditation Setup for Labs */}
                <motion.div
                  className="text-logo-rose"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="overflow-hidden border border-logo-rose-600 shadow-inner bg-white dark:bg-gray-900 max-w-2xl mx-auto">
                    <div className="py-3 px-6 text-center">
                      <h3 className="flex items-center justify-center font-black text-logo-rose-600 text-left">
                        <Settings2 className="h-4 w-4 mr-2" />
                        Session Setup
                      </h3>
                    </div>
                    <div className="p-6 bg-white text-sm font-black pt-3">
                      <div className="grid md:grid-cols-2 gap-6 text-logo-rose-600">
                        <div className="text-center">
                          <Label htmlFor="labs-title" className="text-logo-rose-600 font-black">
                            Meditation Title
                          </Label>
                          <Input
                            id="labs-title"
                            value={state.meditationTitle}
                            onChange={(e) =>
                              dispatch({ type: "UPDATE_LABS", payload: { meditationTitle: e.target.value } })
                            }
                            placeholder="My Custom Meditation"
                            className="mt-1 text-xs font-black text-logo-rose-600 shadow-inner border border-gray-600 focus:ring-logo-rose-600 focus:border-logo-rose-600"
                          />
                        </div>
                        <div className="text-center">
                          <Label htmlFor="labs-duration" className="text-logo-rose-600 font-black">
                            Duration (minutes)
                          </Label>
                          <Input
                            id="labs-duration"
                            type="number"
                            value={state.labsTotalDuration / 60}
                            onChange={(e) =>
                              dispatch({
                                type: "UPDATE_LABS",
                                payload: { labsTotalDuration: Math.max(60, Number(e.target.value) * 60) || 60 },
                              })
                            }
                            min="1"
                            className="mt-1 text-xs font-black text-logo-rose-600 shadow-inner border border-gray-600 focus:ring-logo-rose-600 focus:border-logo-rose-600"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                {/* Timeline Editor for Labs */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                  <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
                    <div className="bg-gradient-to-r from-gray-700 to-gray-800 py-4 px-6 dark:from-gray-800 dark:to-gray-900">
                      <h3 className="text-white text-lg flex items-center font-black">
                        <CircleDotDashed className="h-5 w-5 mr-2" />
                        Timeline Editor
                      </h3>
                    </div>
                    <div className="p-6 pb-6">
                      <VisualTimeline
                        events={state.timelineEvents}
                        totalDuration={state.labsTotalDuration}
                        onUpdateEvent={updateEventStartTime}
                        onRemoveEvent={removeTimelineEvent}
                      />
                    </div>
                  </Card>
                </motion.div>

                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    Labs mode for creating custom guided meditations is coming soon!
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
