"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, useReducer } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import {
  INSTRUCTIONS_LIBRARY,
  SOUND_CUES_LIBRARY,
  generateSyntheticSound,
  type Instruction,
  type SoundCue,
} from "@/lib/meditation-data"
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

  const playLabsSound = useCallback(
    async (src: string) => {
      const soundCue = SOUND_CUES_LIBRARY.find((cue) => cue.src === src)

      if (!soundCue || typeof soundCue.src !== "string") {
        console.error("Invalid sound cue or src property for src:", src, "Found soundCue:", soundCue)
        toast({
          title: "Sound Playback Error",
          description: "The selected sound cue is malformed or not found.",
          variant: "destructive",
        })
        return
      }

      try {
        if (soundCue.src.startsWith("synthetic:")) {
          await generateSyntheticSound(soundCue)
          toast({
            title: "Playing Sound",
            description: `Now playing: ${soundCue.name}`,
            variant: "default",
          })
        } else {
          if (labsAudioRef.current) {
            labsAudioRef.current.src = soundCue.src
            labsAudioRef.current.volume = state.volume / 100
            await labsAudioRef.current.play().catch((e) => console.error("Error playing audio:", e))
            toast({
              title: "Playing Sound",
              description: `Now playing: ${soundCue.name || "Audio file"}`,
              variant: "default",
            })
          } else {
            throw new Error("Audio player not initialized.")
          }
        }
      } catch (error) {
        console.error("Labs Audio playback failed:", error)
        toast({
          title: "Audio Playback Failed",
          description: `Could not play sound. Error: ${error instanceof Error ? error.message : "Unknown"}`,
          variant: "destructive",
        })
      }
    },
    [state.volume],
  )

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/wav" })
        const url = URL.createObjectURL(blob)
        dispatch({ type: "UPDATE_LABS", payload: { recordedAudioUrl: url, recordedBlobs: chunks } })
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      dispatch({ type: "UPDATE_LABS", payload: { isRecording: true } })
      toast({ title: "Recording Started", description: "Speak your instruction now..." })
    } catch (error) {
      console.error("Error starting recording:", error)
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && state.isRecording) {
      mediaRecorderRef.current.stop()
      dispatch({ type: "UPDATE_LABS", payload: { isRecording: false } })
      toast({ title: "Recording Stopped", description: "Recording saved successfully!" })
    }
  }

  const addRecordedEvent = () => {
    if (!state.recordedAudioUrl || !state.recordingLabel.trim()) {
      toast({
        title: "Missing Information",
        description: "Please record audio and provide a label.",
        variant: "destructive",
      })
      return
    }

    const maxExistingTime =
      state.timelineEvents.length > 0 ? Math.max(...state.timelineEvents.map((e) => e.startTime)) : 0
    const newStartTime = state.timelineEvents.length > 0 ? maxExistingTime + 33 : 0

    const newEvent: TimelineEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: "recorded_voice",
      startTime: newStartTime,
      recordedAudioUrl: state.recordedAudioUrl,
      recordedInstructionLabel: state.recordingLabel.trim(),
    }

    addEventToTimeline(newEvent)
    dispatch({
      type: "UPDATE_LABS",
      payload: { recordedAudioUrl: null, recordingLabel: "", recordedBlobs: [] },
    })
    toast({
      title: "Recording Added",
      description: `"${state.recordingLabel}" added to timeline.`,
    })
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

  const bufferToWavOld = async (buffer: AudioBuffer): Promise<Blob> => {
    const numberOfChannels = buffer.numberOfChannels
    const numSamples = buffer.length
    const sampleRate = buffer.sampleRate
    const bytesPerSample = 2
    const blockAlign = numberOfChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = numSamples * blockAlign
    const fileSize = 44 + dataSize

    const arrayBuffer = new ArrayBuffer(fileSize)
    const dataView = new DataView(arrayBuffer)

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

    let offset = 44
    for (let i = 0; i < numSamples; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = buffer.getChannelData(channel)[i]
        const amplitude = Math.max(-1, Math.min(1, sample))
        dataView.setInt16(offset, amplitude * 0x7fff, true)
        offset += bytesPerSample
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" })
  }

  const handleExportAudio = async () => {
    dispatch({
      type: "UPDATE_LABS",
      payload: { isGeneratingAudio: true, generationProgress: 0, generationStep: "Initializing..." },
    })

    try {
      console.log("Starting audio export with events:", state.timelineEvents)

      const maxAudioDuration = state.labsTotalDuration

      const ctx = new OfflineAudioContext({
        numberOfChannels: 1,
        sampleRate: 44100,
        length: Math.ceil(maxAudioDuration * 44100),
      })

      let processedEventsCount = 0
      const totalEvents = state.timelineEvents.length

      for (const event of state.timelineEvents) {
        const eventStartTime = event.startTime
        console.log(`Processing event ${event.id} at time ${eventStartTime}:`, event)

        if (event.type === "instruction_sound") {
          let soundProcessed = false

          if (event.soundCueSrc) {
            dispatch({
              type: "UPDATE_LABS",
              payload: { generationStep: `Adding sound: ${event.soundCueName || "Sound Cue"}` },
            })
            console.log(`Processing sound cue from soundCueSrc: ${event.soundCueSrc}`)

            if (event.soundCueSrc.startsWith("synthetic:")) {
              const soundCue = SOUND_CUES_LIBRARY.find((cue) => cue.id === event.soundCueId)
              if (soundCue) {
                console.log(`Found synthetic sound cue:`, soundCue)

                const oscillator = ctx.createOscillator()
                const gainNode = ctx.createGain()

                oscillator.connect(gainNode)
                gainNode.connect(ctx.destination)

                oscillator.type = soundCue.waveform || "sine"
                oscillator.frequency.setValueAtTime(soundCue.frequency || 440, eventStartTime)

                const attackDuration = soundCue.attackDuration || 0.01
                const releaseDuration = soundCue.releaseDuration || 0.5
                const eventDuration = (soundCue.duration || 1000) / 1000
                const peakVolume = 0.5

                gainNode.gain.setValueAtTime(0, eventStartTime)
                gainNode.gain.linearRampToValueAtTime(peakVolume, eventStartTime + attackDuration)

                if (eventDuration > attackDuration + releaseDuration) {
                  gainNode.gain.linearRampToValueAtTime(peakVolume, eventStartTime + eventDuration - releaseDuration)
                }
                gainNode.gain.exponentialRampToValueAtTime(0.001, eventStartTime + eventDuration)

                oscillator.start(eventStartTime)
                oscillator.stop(eventStartTime + eventDuration)

                if (soundCue.harmonics) {
                  soundCue.harmonics.forEach((harmonic, index) => {
                    const harmonicOsc = ctx.createOscillator()
                    const harmonicGain = ctx.createGain()

                    harmonicOsc.connect(harmonicGain)
                    harmonicGain.connect(ctx.destination)

                    harmonicOsc.type = soundCue.waveform || "sine"
                    harmonicOsc.frequency.setValueAtTime(harmonic, eventStartTime)

                    const harmonicVolume = (peakVolume * 0.3) / (index + 1)

                    harmonicGain.gain.setValueAtTime(0, eventStartTime)
                    harmonicGain.gain.linearRampToValueAtTime(harmonicVolume, eventStartTime + attackDuration)

                    if (eventDuration > attackDuration + releaseDuration) {
                      harmonicGain.gain.linearRampToValueAtTime(
                        harmonicVolume,
                        eventStartTime + eventDuration - releaseDuration,
                      )
                    }
                    harmonicGain.gain.exponentialRampToValueAtTime(0.001, eventStartTime + eventDuration)

                    harmonicOsc.start(eventStartTime)
                    harmonicOsc.stop(eventStartTime + eventDuration)
                  })
                }

                soundProcessed = true
                console.log(`Successfully added synthetic sound at ${eventStartTime}`)
              }
            } else if (event.soundCueSrc.startsWith("musical:")) {
              const noteMatch = event.soundCueSrc.match(/musical:([A-G])(\d)/)
              if (noteMatch) {
                const note = noteMatch[1]
                const octave = Number.parseInt(noteMatch[2])
                console.log(`Processing musical note: ${note}${octave}`)

                const noteKey = `${note}${octave}` as keyof typeof NOTE_FREQUENCIES
                const frequency = NOTE_FREQUENCIES[noteKey]

                if (frequency) {
                  const oscillator = ctx.createOscillator()
                  const gainNode = ctx.createGain()

                  oscillator.connect(gainNode)
                  gainNode.connect(ctx.destination)

                  oscillator.type = "sine"
                  oscillator.frequency.setValueAtTime(frequency, eventStartTime)

                  const eventDuration = 0.8
                  const peakVolume = 0.4

                  gainNode.gain.setValueAtTime(0, eventStartTime)
                  gainNode.gain.exponentialRampToValueAtTime(peakVolume, eventStartTime + 0.05)
                  gainNode.gain.exponentialRampToValueAtTime(0.001, eventStartTime + eventDuration)

                  oscillator.start(eventStartTime)
                  oscillator.stop(eventStartTime + eventDuration)

                  soundProcessed = true
                  console.log(`Successfully added musical note ${note}${octave} at ${eventStartTime}`)
                }
              }
            } else {
              try {
                console.log(`Loading pre-recorded audio: ${event.soundCueSrc}`)
                const response = await fetch(event.soundCueSrc)
                const arrayBuffer = await response.arrayBuffer()
                const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
                const source = ctx.createBufferSource()
                const gainNode = ctx.createGain()

                source.buffer = audioBuffer
                source.connect(gainNode)
                gainNode.connect(ctx.destination)
                gainNode.gain.setValueAtTime(0.4, eventStartTime)
                source.start(eventStartTime)

                soundProcessed = true
                console.log(`Successfully added pre-recorded audio at ${eventStartTime}`)
              } catch (error) {
                console.warn(`Could not load recorded audio: ${event.soundCueSrc}`, error)
              }
            }
          }

          if (!soundProcessed && event.soundCueId) {
            console.log(`Fallback: trying to find sound cue by ID: ${event.soundCueId}`)
            const soundCue = SOUND_CUES_LIBRARY.find((cue) => cue.id === event.soundCueId)
            if (soundCue) {
              dispatch({ type: "UPDATE_LABS", payload: { generationStep: `Adding sound: ${soundCue.name}` } })
              console.log(`Found sound cue by ID:`, soundCue)

              if (soundCue.src.startsWith("synthetic:")) {
                const oscillator = ctx.createOscillator()
                const gainNode = ctx.createGain()

                oscillator.connect(gainNode)
                gainNode.connect(ctx.destination)

                oscillator.type = soundCue.waveform || "sine"
                oscillator.frequency.setValueAtTime(soundCue.frequency || 440, eventStartTime)

                const attackDuration = soundCue.attackDuration || 0.01
                const releaseDuration = soundCue.releaseDuration || 0.5
                const eventDuration = (soundCue.duration || 1000) / 1000
                const peakVolume = 0.5

                gainNode.gain.setValueAtTime(0, eventStartTime)
                gainNode.gain.linearRampToValueAtTime(peakVolume, eventStartTime + attackDuration)

                if (eventDuration > attackDuration + releaseDuration) {
                  gainNode.gain.linearRampToValueAtTime(peakVolume, eventStartTime + eventDuration - releaseDuration)
                }
                gainNode.gain.exponentialRampToValueAtTime(0.001, eventStartTime + eventDuration)

                oscillator.start(eventStartTime)
                oscillator.stop(eventStartTime + eventDuration)

                if (soundCue.harmonics) {
                  soundCue.harmonics.forEach((harmonic, index) => {
                    const harmonicOsc = ctx.createOscillator()
                    const harmonicGain = ctx.createGain()

                    harmonicOsc.connect(harmonicGain)
                    harmonicGain.connect(ctx.destination)

                    harmonicOsc.type = soundCue.waveform || "sine"
                    harmonicOsc.frequency.setValueAtTime(harmonic, eventStartTime)

                    const harmonicVolume = (peakVolume * 0.3) / (index + 1)

                    harmonicGain.gain.setValueAtTime(0, eventStartTime)
                    harmonicGain.gain.linearRampToValueAtTime(harmonicVolume, eventStartTime + attackDuration)

                    if (eventDuration > attackDuration + releaseDuration) {
                      harmonicGain.gain.linearRampToValueAtTime(
                        harmonicVolume,
                        eventStartTime + eventDuration - releaseDuration,
                      )
                    }
                    harmonicGain.gain.exponentialRampToValueAtTime(0.001, eventStartTime + eventDuration)

                    harmonicOsc.start(eventStartTime)
                    harmonicOsc.stop(eventStartTime + eventDuration)
                  })
                }

                soundProcessed = true
                console.log(`Successfully added synthetic sound from ID at ${eventStartTime}`)
              }
            }
          }

          if (!soundProcessed) {
            console.warn(`Could not process sound for event ${event.id}`)
          }
        } else if (event.type === "recorded_voice" && event.recordedAudioUrl) {
          dispatch({
            type: "UPDATE_LABS",
            payload: { generationStep: `Adding recorded voice: ${event.recordedInstructionLabel || "Untitled"}` },
          })
          console.log(`Processing recorded voice: ${event.recordedAudioUrl}`)

          try {
            const response = await fetch(event.recordedAudioUrl)
            const arrayBuffer = await response.arrayBuffer()
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
            const source = ctx.createBufferSource()
            const gainNode = ctx.createGain()

            source.buffer = audioBuffer
            source.connect(gainNode)
            gainNode.connect(ctx.destination)
            gainNode.gain.setValueAtTime(0.8, eventStartTime)
            source.start(eventStartTime)

            console.log(`Successfully added recorded voice at ${eventStartTime}`)
          } catch (error) {
            console.warn(`Could not load recorded audio: ${event.recordedAudioUrl}`, error)
          }
        }

        processedEventsCount++
        dispatch({
          type: "UPDATE_LABS",
          payload: { generationProgress: Math.floor((processedEventsCount / totalEvents) * 80) },
        })
      }

      dispatch({ type: "UPDATE_LABS", payload: { generationStep: "Rendering audio..." } })
      dispatch({ type: "UPDATE_LABS", payload: { generationProgress: 80 } })
      console.log("Starting audio rendering...")

      const rendered = await ctx.startRendering()
      console.log("Audio rendering complete, creating WAV blob...")

      if (rendered.length === 0) {
        throw new Error("Rendered audio buffer is empty. No audio content was generated.")
      }

      const wavBlob = await bufferToWavOld(rendered)
      if (wavBlob.size === 0) {
        throw new Error("Generated WAV blob is empty. WAV conversion failed or resulted in no data.")
      }
      const url = URL.createObjectURL(wavBlob)
      dispatch({ type: "UPDATE_LABS", payload: { generatedAudioUrl: url } })

      if (labsAudioRef.current) {
        labsAudioRef.current.src = url
        labsAudioRef.current.volume = state.volume / 100
      }

      dispatch({ type: "UPDATE_LABS", payload: { isGeneratingAudio: false } })
      dispatch({ type: "UPDATE_LABS", payload: { generationProgress: 100 } })
      dispatch({ type: "UPDATE_LABS", payload: { generationStep: "Export Complete" } })

      console.log("Audio export completed successfully!")
      toast({ title: "Export Complete", description: "Timeline audio exported with sound cues included!" })
    } catch (error) {
      console.error("Audio export failed:", error)
      toast({
        title: "Audio Export Failed",
        description: `Could not export audio. Error: ${error instanceof Error ? error.message : "Unknown"}`,
        variant: "destructive",
      })
    } finally {
      dispatch({ type: "UPDATE_LABS", payload: { isGeneratingAudio: false } })
    }
  }

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

    if (!validateFileSize(selectedFile)) return
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      dispatch({
        type: "UPDATE_PROCESSING",
        payload: { status: { message: "Audio system not ready. Please refresh.", type: "error" } },
      })
      return
    }
    cleanupMemory()
    await sleep(100)
    dispatch({ type: "SET_FILE", payload: selectedFile })
    dispatch({ type: "UPDATE_PROCESSING", payload: { processingProgress: 0, processingStep: "Initializing..." } })
    dispatch({
      type: "UPDATE_PROCESSING",
      payload: {
        durationLimits: null,
        audioAnalysis: null,
        processedUrl: "",
        processedBufferState: null,
        actualDuration: null,
      },
    })
    dispatch({ type: "UPDATE_PROCESSING", payload: { status: null } })
    try {
      dispatch({ type: "UPDATE_PROCESSING", payload: { status: { message: "Loading audio file...", type: "info" } } })
      await loadAudioFile(selectedFile)
    } catch (error) {
      dispatch({
        type: "UPDATE_PROCESSING",
        payload: {
          status: {
            message: `Error loading audio: ${error instanceof Error ? error.message : "Unknown"}`,
            type: "error",
          },
          originalBuffer: null,
        },
      })
    }
  }

  const detectSilenceRegions = async (
    buffer: AudioBuffer,
    threshold: number,
    minSilenceDur: number,
  ): Promise<{ start: number; end: number }[]> => {
    const sampleRate = buffer.sampleRate
    const channelData = buffer.getChannelData(0)
    const silenceRegions: { start: number; end: number }[] = []
    let silenceStart: number | null = null
    let consecutiveSilentSamples = 0
    const skipSamples = state.isMobileDevice ? 20 : 10

    for (let i = 0; i < channelData.length; i += skipSamples) {
      if (i % (sampleRate * (state.isMobileDevice ? 2 : 5)) === 0) {
        await sleep(0)
        dispatch({
          type: "UPDATE_PROCESSING",
          payload: { processingProgress: 20 + Math.floor((i / channelData.length) * 10) },
        })
      }
      const amplitude = Math.abs(channelData[i])
      if (amplitude < threshold) {
        if (silenceStart === null) silenceStart = i
        consecutiveSilentSamples++
      } else {
        if (silenceStart !== null && (consecutiveSilentSamples * skipSamples) / sampleRate >= minSilenceDur) {
          silenceRegions.push({ start: silenceStart / sampleRate, end: i / sampleRate })
        }
        silenceStart = null
        consecutiveSilentSamples = 0
      }
    }
    if (silenceStart !== null && (consecutiveSilentSamples * skipSamples) / sampleRate >= minSilenceDur) {
      silenceRegions.push({ start: silenceStart / sampleRate, end: channelData.length / sampleRate })
    }
    return silenceRegions
  }

  const analyzeAudioForLimits = async (buffer: AudioBuffer, minSpacing: number) => {
    dispatch({ type: "UPDATE_PROCESSING", payload: { processingStep: "Analyzing audio for limits..." } })
    const silenceRegions = await detectSilenceRegions(buffer, state.silenceThreshold, state.minSilenceDuration)
    const totalSilenceDuration = silenceRegions.reduce((sum, region) => sum + (region.end - region.start), 0)
    const audioContentDuration = buffer.duration - totalSilenceDuration
    const minRequiredSpacing = silenceRegions.length > 0 ? silenceRegions.length * minSpacing : 0
    const minPossibleDuration = Math.max(1, Math.ceil((audioContentDuration + minRequiredSpacing) / 60))
    const maxPossibleDuration = state.isMobileDevice ? 60 : 120
    dispatch({
      type: "UPDATE_PROCESSING",
      payload: { durationLimits: { min: minPossibleDuration, max: maxPossibleDuration } },
    })
    dispatch({
      type: "UPDATE_PROCESSING",
      payload: {
        audioAnalysis: {
          totalSilence: totalSilenceDuration,
          contentDuration: audioContentDuration,
          silenceRegions: silenceRegions.length,
        },
      },
    })
    if (state.targetDuration < minPossibleDuration)
      dispatch({ type: "UPDATE_PROCESSING", payload: { targetDuration: minPossibleDuration } })
    else if (state.targetDuration > maxPossibleDuration)
      dispatch({ type: "UPDATE_PROCESSING", payload: { targetDuration: maxPossibleDuration } })
    dispatch({ type: "UPDATE_PROCESSING", payload: { processingStep: "Analysis complete." } })
  }

  const loadAudioFile = useCallback(
    async (fileToLoad: File) => {
      const currentAudioContext = audioContextRef.current
      if (!currentAudioContext) {
        dispatch({
          type: "UPDATE_PROCESSING",
          payload: { status: { message: "Audio context not initialized.", type: "error" } },
        })
        throw new Error("AudioContext not initialized")
      }
      let attempts = 0
      const maxAttempts = 3
      while (currentAudioContext.state !== "running" && attempts < maxAttempts) {
        attempts++
        if (currentAudioContext.state === "suspended") {
          try {
            await currentAudioContext.resume()
            if (currentAudioContext.state !== "running") await sleep(50 * attempts)
          } catch (err) {
            break
          }
        } else if (currentAudioContext.state === "closed") {
          dispatch({
            type: "UPDATE_PROCESSING",
            payload: { status: { message: "Audio system closed.", type: "error" } },
          })
          throw new Error("AudioContext closed")
        }
        if (currentAudioContext.state !== "running" && currentAudioContext.state !== "closed" && attempts < maxAttempts)
          await sleep(100 * attempts)
      }
      if (currentAudioContext.state !== "running") {
        dispatch({
          type: "UPDATE_PROCESSING",
          payload: { status: { message: "Failed to start audio system.", type: "error" } },
        })
        throw new Error(`AudioContext not running: ${currentAudioContext.state}`)
      }
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingStep: "Reading file data..." } })
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingProgress: 10 } })
      const arrayBuffer = await fileToLoad.arrayBuffer()
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingStep: "Decoding audio data..." } })
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingProgress: 50 } })
      try {
        const decodePromise = currentAudioContext.decodeAudioData(arrayBuffer.slice(0))
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Audio decoding timeout (30s)")), 30000),
        )
        const buffer = await Promise.race([decodePromise, timeoutPromise])
        dispatch({ type: "UPDATE_PROCESSING", payload: { processingStep: "Analyzing audio..." } })
        dispatch({ type: "UPDATE_PROCESSING", payload: { processingProgress: 80 } })
        await sleep(50)
        dispatch({ type: "UPDATE_PROCESSING", payload: { originalBuffer: buffer } })
        dispatch({ type: "UPDATE_PROCESSING", payload: { processingStep: "Creating audio player..." } })
        dispatch({ type: "UPDATE_PROCESSING", payload: { processingProgress: 95 } })
        if (state.originalUrl) URL.revokeObjectURL(state.originalUrl)
        const blob = new Blob([fileToLoad], { type: fileToLoad.type })
        const url = URL.createObjectURL(blob)
        dispatch({ type: "UPDATE_PROCESSING", payload: { originalUrl: url } })
        dispatch({ type: "UPDATE_PROCESSING", payload: { processingProgress: 100 } })
        dispatch({ type: "UPDATE_PROCESSING", payload: { processingStep: "Load complete!" } })
        dispatch({
          type: "UPDATE_PROCESSING",
          payload: {
            status: {
              message: `Audio loaded. Duration: ${formatTime(buffer.duration)}.`,
              type: "success",
            },
          },
        })
      } catch (decodeError) {
        dispatch({
          type: "UPDATE_PROCESSING",
          payload: {
            status: {
              message: `Error decoding: ${decodeError instanceof Error ? decodeError.message : "Unknown"}`,
              type: "error",
            },
          },
        })
        throw decodeError
      }
    },
    [state.originalUrl, state.isMobileDevice],
  )

  useEffect(() => {
    if (state.originalBuffer) analyzeAudioForLimits(state.originalBuffer, state.minSpacingDuration)
  }, [state.originalBuffer, state.silenceThreshold, state.minSilenceDuration, state.minSpacingDuration])

  const processAudio = async () => {
    const currentAudioContext = audioContextRef.current
    if (!state.originalBuffer || !currentAudioContext) {
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
    if (currentAudioContext.state === "suspended") {
      try {
        await currentAudioContext.resume()
        if (currentAudioContext.state !== "running") throw new Error("Failed to resume for processing.")
      } catch (err) {
        dispatch({
          type: "UPDATE_PROCESSING",
          payload: {
            status: { message: `Audio system error: ${err instanceof Error ? err.message : "Unknown"}`, type: "error" },
            isProcessing: false,
          },
        })
        return
      }
    } else if (currentAudioContext.state === "closed") {
      dispatch({
        type: "UPDATE_PROCESSING",
        payload: { status: { message: "Audio system closed.", type: "error" }, isProcessing: false },
      })
      return
    }
    if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current)
    processingTimeoutRef.current = setTimeout(
      () => {
        dispatch({
          type: "UPDATE_PROCESSING",
          payload: { isProcessing: false, status: { message: "Processing timed out.", type: "error" } },
        })
      },
      state.isMobileDevice ? 120000 : 600000,
    )

    try {
      dispatch({ type: "UPDATE_PROCESSING", payload: { status: { message: "Processing audio...", type: "info" } } })
      const targetDurationSeconds = state.targetDuration * 60
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingStep: "Detecting silence regions (step 1/4)..." } })
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingProgress: 10 } })
      await sleep(10)
      const silenceRegions = await detectSilenceRegions(
        state.originalBuffer,
        state.silenceThreshold,
        state.minSilenceDuration,
      )
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingStep: "Calculating adjustments (step 2/4)..." } })
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingProgress: 30 } })
      await sleep(10)
      const totalSilenceDuration = silenceRegions.reduce((sum, region) => sum + (region.end - region.start), 0)
      const audioContentDuration = state.originalBuffer.duration - totalSilenceDuration
      const availableSilenceDuration = Math.max(
        targetDurationSeconds - audioContentDuration,
        silenceRegions.length * state.minSpacingDuration,
      )
      const scaleFactor = totalSilenceDuration > 0 ? availableSilenceDuration / totalSilenceDuration : 1
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingStep: "Rebuilding audio (step 3/4)..." } })
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingProgress: 50 } })
      await sleep(10)

      const processedAudioBuffer = await rebuildAudioWithScaledPauses(
        state.originalBuffer,
        silenceRegions,
        scaleFactor,
        state.minSpacingDuration,
        state.preserveNaturalPacing,
        availableSilenceDuration,
        (p) => dispatch({ type: "UPDATE_PROCESSING", payload: { processingProgress: 50 + Math.floor(p * 0.4) } }),
      )
      dispatch({ type: "UPDATE_PROCESSING", payload: { pausesAdjusted: silenceRegions.length } })
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingStep: "Creating download file (step 4/4)..." } })
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingProgress: 90 } })
      await sleep(10)
      const wavBlob = await bufferToWav(processedAudioBuffer, state.compatibilityMode === "high", (p) =>
        dispatch({ type: "UPDATE_PROCESSING", payload: { processingProgress: 90 + Math.floor(p * 0.1) } }),
      )
      if (state.processedUrl) URL.revokeObjectURL(state.processedUrl)
      const url = URL.createObjectURL(wavBlob)
      dispatch({ type: "UPDATE_PROCESSING", payload: { processedUrl: url } })
      dispatch({ type: "UPDATE_PROCESSING", payload: { actualDuration: processedAudioBuffer.duration } })
      dispatch({ type: "UPDATE_PROCESSING", payload: { processedBufferState: processedAudioBuffer } })
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingProgress: 100 } })
      dispatch({ type: "UPDATE_PROCESSING", payload: { processingStep: "Complete!" } })
      dispatch({
        type: "UPDATE_PROCESSING",
        payload: { status: { message: "Audio processing completed successfully!", type: "success" } },
      })
      dispatch({ type: "UPDATE_PROCESSING", payload: { isProcessingComplete: true } })
    } catch (error) {
      console.error("Error during audio processing:", error)
      dispatch({
        type: "UPDATE_PROCESSING",
        payload: {
          status: { message: `Processing error: ${error instanceof Error ? error.message : "Unknown"}`, type: "error" },
        },
      })
    } finally {
      dispatch({ type: "UPDATE_PROCESSING", payload: { isProcessing: false } })
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current)
      if (currentAudioContext && currentAudioContext.state === "running") {
        currentAudioContext.suspend().catch((err) => console.warn("Error suspending AudioContext post-process:", err))
      }
    }
  }

  const rebuildAudioWithScaledPauses = useCallback(
    async (
      buffer: AudioBuffer,
      regions: { start: number; end: number }[],
      scaleFactorVal: number,
      minSpacingVal: number,
      preservePacing: boolean,
      targetTotalSilence: number,
      onProgress: (progress: number) => void,
    ): Promise<AudioBuffer> => {
      const currentAudioContext = audioContextRef.current
      if (!currentAudioContext) throw new Error("Audio context not available for rebuild")
      onProgress(0)
      let dynamicScale = scaleFactorVal
      if (!preservePacing && regions.length > 0) {
        const currentTotalSilence = regions.reduce((sum, r) => sum + (r.end - r.start), 0)
        dynamicScale = currentTotalSilence > 0 ? targetTotalSilence / currentTotalSilence : 1
        if (!isFinite(dynamicScale) || dynamicScale <= 0) dynamicScale = 1
      }
      const processedRegions = regions.map((region) => {
        const duration = region.end - region.start
        const newDuration = preservePacing
          ? Math.max(duration * dynamicScale, minSpacingVal)
          : regions.length > 0
            ? Math.max(minSpacingVal, targetTotalSilence / regions.length)
            : minSpacingVal
        return { ...region, newDuration }
      })
      const audioContentDur = buffer.duration - regions.reduce((sum, r) => sum + (r.end - r.start), 0)
      const newSilenceDur = processedRegions.reduce((sum, r) => sum + r.newDuration, 0)
      const newTotalDur = audioContentDur + newSilenceDur
      if (newTotalDur <= 0) throw new Error("Calculated new total duration is zero or negative.")
      if (state.isMobileDevice && newTotalDur > 45 * 60) {
        console.warn(`Mobile device: Output duration ${formatTime(newTotalDur)} may cause issues.`)
        dispatch({ type: "UPDATE_PROCESSING", payload: { memoryWarning: true } })
      }
      let newBuffer: AudioBuffer
      try {
        newBuffer = currentAudioContext.createBuffer(
          buffer.numberOfChannels,
          Math.max(1, Math.floor(newTotalDur * buffer.sampleRate)),
          buffer.sampleRate,
        )
      } catch (e) {
        forceGarbageCollection()
        throw new Error(
          `Failed to create output buffer (duration: ${newTotalDur.toFixed(2)}s). Memory limit likely exceeded. Try a shorter target duration.`,
        )
      }
      onProgress(10)
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const originalData = buffer.getChannelData(channel)
        const newData = newBuffer.getChannelData(channel)
        let writeIndex = 0
        let readIndex = 0
        const totalSamples = originalData.length
        if (regions.length > 0 && regions[0].start > 0) {
          const samplesToCopy = Math.floor(regions[0].start * buffer.sampleRate)
          for (let i = 0; i < samplesToCopy; i++) newData[writeIndex++] = originalData[readIndex++]
        }
        for (let i = 0; i < regions.length; i++) {
          if (i % (state.isMobileDevice ? 5 : 10) === 0) {
            await sleep(0)
            onProgress(10 + Math.floor((i / regions.length) * 80))
          }
          const region = regions[i]
          const processedReg = processedRegions[i]
          readIndex = Math.floor(region.end * buffer.sampleRate)
          const newSilenceLength = Math.floor(processedReg.newDuration * buffer.sampleRate)
          for (let j = 0; j < newSilenceLength; j++) {
            if (writeIndex < newData.length) newData[writeIndex++] = 0
          }
          const nextRegionStart =
            i < regions.length - 1 ? Math.floor(regions[i + 1].start * buffer.sampleRate) : totalSamples
          const segmentLength = nextRegionStart - readIndex
          for (let j = 0; j < segmentLength; j++) {
            if (writeIndex < newData.length && readIndex + j < totalSamples) {
              newData[writeIndex++] = originalData[readIndex + j]
            }
          }
        }
        if (readIndex < totalSamples && regions.length === 0) {
          for (let i = readIndex; i < totalSamples; i++)
            if (writeIndex < newData.length) newData[writeIndex++] = originalData[i]
        }
      }
      onProgress(100)
      return newBuffer
    },
    [state.isMobileDevice],
  )

  // Initialize mobile detection and audio context
  useEffect(() => {
    dispatch({ type: "UPDATE_PROCESSING", payload: { isMobileDevice: isMobile() } })
    if (typeof navigator !== "undefined" && (navigator as any).deviceMemory) {
      const deviceMemory = (navigator as any).deviceMemory
      if (deviceMemory < 4) {
