"use client"

import React from "react"

import { Separator } from "@/components/ui/separator"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import {
  Info,
  Upload,
  Volume2,
  Clock,
  Wand2,
  Download,
  AlertTriangle,
  ListPlus,
  Music2,
  Mic,
  StopCircle,
  Play,
  PlusCircle,
  CircleDotDashed,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Navigation } from "@/components/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import {
  INSTRUCTIONS_LIBRARY,
  SOUND_CUES_LIBRARY,
  generateSyntheticSound,
  type Instruction,
  type SoundCue,
} from "@/lib/meditation-data"
import { VisualTimeline } from "@/components/visual-timeline"

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
  type: "instruction_sound" | "recorded_voice"
  startTime: number
  instructionText?: string
  soundCueId?: string
  soundCueName?: string // Added for direct storage
  soundCueSrc?: string // Added for direct storage
  recordedAudioUrl?: string
  recordedInstructionLabel?: string
  duration?: number
}

interface TimelineItem {
  id: string
  type: "instruction" | "sound"
  duration: number // in seconds
  content: Instruction | SoundCue
}

export default function HomePage() {
  // State for mode toggle (Length Adjuster vs Labs)
  const [activeMode, setActiveMode] = useState<"adjuster" | "labs">("adjuster")

  // == States for Length Adjuster ==
  const [file, setFile] = useState<File | null>(null)
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null)
  const [processedBufferState, setProcessedBufferState] = useState<AudioBuffer | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const [targetDuration, setTargetDuration] = useState<number>(20)
  const [silenceThreshold, setSilenceThreshold] = useState<number>(0.01)
  const [minSilenceDuration, setMinSilenceDuration] = useState<number>(3)
  const [minSpacingDuration, setMinSpacingDuration] = useState<number>(1.5)
  const [preserveNaturalPacing, setPreserveNaturalPacing] = useState<boolean>(true)
  const [compatibilityMode, setCompatibilityMode] = useState<string>("high")

  const [status, setStatus] = useState<{ message: string; type: string } | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string>("")
  const [processedUrl, setProcessedUrl] = useState<string>("")
  const [pausesAdjusted, setPausesAdjusted] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [processingProgress, setProcessingProgress] = useState<number>(0)
  const [processingStep, setProcessingStep] = useState<string>("")

  const [durationLimits, setDurationLimits] = useState<{ min: number; max: number } | null>(null)
  const [audioAnalysis, setAudioAnalysis] = useState<{
    totalSilence: number
    contentDuration: number
    silenceRegions: number
  } | null>(null)
  const [actualDuration, setActualDuration] = useState<number | null>(null)
  const [isProcessingComplete, setIsProcessingComplete] = useState<boolean>(false)
  const [isMobileDevice, setIsMobileDevice] = useState<boolean>(false)
  const [memoryWarning, setMemoryWarning] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // == States for Labs ==
  const [meditationTitle, setMeditationTitle] = useState<string>("My Custom Meditation")
  const [labsTotalDuration, setLabsTotalDuration] = useState<number>(600)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [selectedLibraryInstruction, setSelectedLibraryInstruction] = useState<Instruction | null>(null)
  const [customInstructionText, setCustomInstructionText] = useState<string>("")
  const [selectedSoundCue, setSelectedSoundCue] = useState<SoundCue | null>(null)
  const [isRecording, setIsRecording] = useState<boolean>(false)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
  const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const labsAudioRef = useRef<HTMLAudioElement | null>(null)
  const instructionCategories = Array.from(new Set(INSTRUCTIONS_LIBRARY.map((instr) => instr.category)))
  const [recordingLabel, setRecordingLabel] = useState<string>("")

  // Audio generation states
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false)
  const [generationProgress, setGenerationProgress] = useState<number>(0)
  const [generationStep, setGenerationStep] = useState<string>("")
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null)

  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [currentTab, setCurrentTab] = useState<string>("instructions")
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0) // in seconds
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null)
  const [volume, setVolume] = useState<number>(75) // Default volume 75%
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentItemStartTimeRef = useRef<number>(0)

  const totalDuration = timeline.reduce((sum, item) => sum + item.duration, 0)

  const addTimelineItem = useCallback((item: Instruction | SoundCue, type: "instruction" | "sound") => {
    const newItem: TimelineItem = {
      id: `${type}-${Date.now()}`,
      type,
      duration: type === "instruction" ? 60 : 5, // Default duration: 60s for instruction, 5s for sound
      content: item,
    }
    setTimeline((prev) => [...prev, newItem])
  }, [])

  const updateTimelineItemDuration = useCallback((index: number, newDuration: number) => {
    setTimeline((prev) => prev.map((item, i) => (i === index ? { ...item, duration: Math.max(1, newDuration) } : item)))
  }, [])

  const removeTimelineItem = useCallback(
    (index: number) => {
      setTimeline((prev) => prev.filter((_, i) => i !== index))
      if (activeItemIndex === index) {
        setActiveItemIndex(null)
      } else if (activeItemIndex !== null && activeItemIndex > index) {
        setActiveItemIndex((prev) => (prev !== null ? prev - 1 : null))
      }
    },
    [activeItemIndex],
  )

  const playLabsSound = useCallback(
    async (src: string) => {
      const soundCue = SOUND_CUES_LIBRARY.find((cue) => cue.src === src)

      // Defensive check: Ensure soundCue exists and its src property is a string
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
          // Generate and play synthetic sound
          await generateSyntheticSound(soundCue)

          toast({
            title: "Playing Sound",
            description: `Now playing: ${soundCue.name}`,
            variant: "default",
          })
        } else {
          // Handle actual audio files
          if (labsAudioRef.current) {
            labsAudioRef.current.src = soundCue.src
            labsAudioRef.current.volume = volume / 100
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
    [volume],
  )

  const startPlayback = useCallback(() => {
    if (timeline.length === 0) return

    setIsPlaying(true)
    currentItemStartTimeRef.current = currentPlaybackTime // Store start time of current item

    playbackIntervalRef.current = setInterval(() => {
      setCurrentPlaybackTime((prevTime) => {
        const newTime = prevTime + 0.1 // Increment by 100ms

        let accumulatedDuration = 0
        let foundActiveItem = false
        for (let i = 0; i < timeline.length; i++) {
          const item = timeline[i]
          if (newTime >= accumulatedDuration && newTime < accumulatedDuration + item.duration) {
            if (activeItemIndex !== i) {
              setActiveItemIndex(i)
              // Play sound cue when it becomes active
              if (item.type === "sound") {
                playLabsSound(item.content.src) // Pass src string to playLabsSound
              }
            }
            foundActiveItem = true
            break
          }
          accumulatedDuration += item.duration
        }

        if (!foundActiveItem) {
          setActiveItemIndex(null)
        }

        if (newTime >= totalDuration) {
          // End of timeline
          clearInterval(playbackIntervalRef.current!)
          setIsPlaying(false)
          setCurrentPlaybackTime(0)
          setActiveItemIndex(null)
          return 0
        }
        return newTime
      })
    }, 100) // Update every 100ms
  }, [timeline, currentPlaybackTime, totalDuration, activeItemIndex, playLabsSound])

  const pausePlayback = useCallback(() => {
    if (playbackIntervalRef.current) {
      clearInterval(playbackIntervalRef.current)
      playbackIntervalRef.current = null
    }
    setIsPlaying(false)
  }, [])

  const resetPlayback = useCallback(() => {
    pausePlayback()
    setCurrentPlaybackTime(0)
    setActiveItemIndex(null)
  }, [pausePlayback])

  useEffect(() => {
    // Cleanup interval on component unmount
    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current)
      }
    }
  }, [])

  // Update audio volume if audioRef exists
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const handleSaveTimeline = () => {
    // Placeholder for save functionality
    console.log("Saving timeline:", timeline)
    alert("Save functionality not yet implemented.")
  }

  const handleLoadTimeline = () => {
    // Placeholder for load functionality
    console.log("Loading timeline...")
    alert("Load functionality not yet implemented.")
  }

  const bufferToWavOld = async (buffer: AudioBuffer): Promise<Blob> => {
    const numberOfChannels = buffer.numberOfChannels
    const numSamples = buffer.length
    const sampleRate = buffer.sampleRate
    const bytesPerSample = 2 // Assuming 16-bit PCM
    const blockAlign = numberOfChannels * bytesPerSample
    const byteRate = sampleRate * blockAlign
    const dataSize = numSamples * blockAlign
    const fileSize = 44 + dataSize

    const arrayBuffer = new ArrayBuffer(fileSize)
    const dataView = new DataView(arrayBuffer)

    // RIFF identifier
    dataView.setUint32(0, 0x52494646, false) // "RIFF"
    // File size
    dataView.setUint32(4, fileSize - 8, true)
    // RIFF type
    dataView.setUint32(8, 0x57415645, false) // "WAVE"
    // Format chunk identifier
    dataView.setUint32(12, 0x666d7420, false) // "fmt "
    // Format chunk size
    dataView.setUint32(16, 16, true)
    // Audio format (PCM = 1)
    dataView.setUint16(20, 1, true)
    // Number of channels
    dataView.setUint16(22, numberOfChannels, true)
    // Sample rate
    dataView.setUint32(24, sampleRate, true)
    // Byte rate (Sample Rate * Block Align)
    dataView.setUint32(28, byteRate, true)
    // Block align (Number of Channels * Bytes per Sample)
    dataView.setUint16(32, blockAlign, true)
    // Bits per sample
    dataView.setUint16(34, bytesPerSample * 8, true)
    // Data chunk identifier
    dataView.setUint32(36, 0x64617461, false) // "data"
    // Data chunk size
    dataView.setUint32(40, dataSize, true)

    // Write the samples to the data chunk
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

  const addSyntheticToContext = (ctx: OfflineAudioContext, cue: SoundCue, start: number, duration: number) => {
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0.3, start) // Reduced gain for synthetic sounds
    gainNode.connect(ctx.destination)

    if (cue.src === "synthetic:sine440") {
      const osc = ctx.createOscillator()
      osc.type = "sine"
      osc.frequency.setValueAtTime(440, start)
      osc.connect(gainNode)
      osc.start(start)
      osc.stop(start + duration)
    } else if (cue.src === "synthetic:triangle880") {
      const osc = ctx.createOscillator()
      osc.type = "triangle"
      osc.frequency.setValueAtTime(880, start)
      osc.connect(gainNode)
      osc.start(start)
      osc.stop(start + duration)
    } else if (cue.src === "synthetic:square220") {
      const osc = ctx.createOscillator()
      osc.type = "square"
      osc.frequency.setValueAtTime(220, start)
      osc.connect(gainNode)
      osc.start(start)
      osc.stop(start + duration)
    } else if (cue.src === "synthetic:sawtooth660") {
      const osc = ctx.createOscillator()
      osc.type = "sawtooth"
      osc.frequency.setValueAtTime(660, start)
      osc.connect(gainNode)
      osc.start(start)
      osc.stop(start + duration)
    } else {
      console.warn("Unknown synthetic sound:", cue.src)
    }
  }

  const handleExportAudio = async () => {
    setIsGeneratingAudio(true)
    setGenerationProgress(0)
    setGenerationStep("Initializing...")

    try {
      console.log("Starting audio export with events:", timelineEvents)

      // Calculate the maximum end time needed for the OfflineAudioContext
      const maxAudioDuration = labsTotalDuration // Start with the user-defined total duration

      const ctx = new OfflineAudioContext({
        numberOfChannels: 1,
        sampleRate: 44100,
        length: Math.ceil(maxAudioDuration * 44100), // Ensure length is an integer
      })

      let processedEventsCount = 0
      const totalEvents = timelineEvents.length

      for (const event of timelineEvents) {
        const eventStartTime = event.startTime
        console.log(`Processing event ${event.id} at time ${eventStartTime}:`, event)

        if (event.type === "instruction_sound") {
          // Handle instruction_sound events - these should include sound cues
          let soundProcessed = false

          // First try using the stored soundCueSrc
          if (event.soundCueSrc) {
            setGenerationStep(`Adding sound: ${event.soundCueName || "Sound Cue"}`)
            console.log(`Processing sound cue from soundCueSrc: ${event.soundCueSrc}`)

            if (event.soundCueSrc.startsWith("synthetic:")) {
              // Find the sound cue from the library to get full parameters
              const soundCue = SOUND_CUES_LIBRARY.find((cue) => cue.id === event.soundCueId)
              if (soundCue) {
                console.log(`Found synthetic sound cue:`, soundCue)

                // Generate synthetic sound using Web Audio API
                const oscillator = ctx.createOscillator()
                const gainNode = ctx.createGain()

                oscillator.connect(gainNode)
                gainNode.connect(ctx.destination)

                // Set oscillator properties from sound cue
                oscillator.type = soundCue.waveform || "sine"
                oscillator.frequency.setValueAtTime(soundCue.frequency || 440, eventStartTime)

                // Create envelope
                const attackDuration = soundCue.attackDuration || 0.01
                const releaseDuration = soundCue.releaseDuration || 0.5
                const eventDuration = (soundCue.duration || 1000) / 1000 // Convert ms to seconds
                const peakVolume = 0.5 // Increased volume for better audibility

                gainNode.gain.setValueAtTime(0, eventStartTime)
                gainNode.gain.linearRampToValueAtTime(peakVolume, eventStartTime + attackDuration)

                if (eventDuration > attackDuration + releaseDuration) {
                  gainNode.gain.linearRampToValueAtTime(peakVolume, eventStartTime + eventDuration - releaseDuration)
                }
                gainNode.gain.exponentialRampToValueAtTime(0.001, eventStartTime + eventDuration)

                oscillator.start(eventStartTime)
                oscillator.stop(eventStartTime + eventDuration)

                // Add harmonics if specified
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
              // Handle musical notes
              const noteMatch = event.soundCueSrc.match(/musical:([A-G])(\d)/)
              if (noteMatch) {
                const note = noteMatch[1]
                const octave = Number.parseInt(noteMatch[2])
                console.log(`Processing musical note: ${note}${octave}`)

                // Get frequency from NOTE_FREQUENCIES
                const noteKey = `${note}${octave}` as keyof typeof NOTE_FREQUENCIES
                const frequency = NOTE_FREQUENCIES[noteKey]

                if (frequency) {
                  const oscillator = ctx.createOscillator()
                  const gainNode = ctx.createGain()

                  oscillator.connect(gainNode)
                  gainNode.connect(ctx.destination)

                  oscillator.type = "sine"
                  oscillator.frequency.setValueAtTime(frequency, eventStartTime)

                  const eventDuration = 0.8 // Default duration for musical notes
                  const peakVolume = 0.4 // Good volume for musical notes

                  // Gentle envelope for musical notes
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
              // Handle pre-recorded audio files
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
                gainNode.gain.setValueAtTime(0.4, eventStartTime) // Good volume for pre-recorded sounds
                source.start(eventStartTime)

                soundProcessed = true
                console.log(`Successfully added pre-recorded audio at ${eventStartTime}`)
              } catch (error) {
                console.warn(`Could not load recorded audio: ${event.soundCueSrc}`, error)
              }
            }
          }

          // Fallback: try to find sound cue by ID if soundCueSrc didn't work
          if (!soundProcessed && event.soundCueId) {
            console.log(`Fallback: trying to find sound cue by ID: ${event.soundCueId}`)
            const soundCue = SOUND_CUES_LIBRARY.find((cue) => cue.id === event.soundCueId)
            if (soundCue) {
              setGenerationStep(`Adding sound: ${soundCue.name}`)
              console.log(`Found sound cue by ID:`, soundCue)

              if (soundCue.src.startsWith("synthetic:")) {
                // Generate synthetic sound using Web Audio API
                const oscillator = ctx.createOscillator()
                const gainNode = ctx.createGain()

                oscillator.connect(gainNode)
                gainNode.connect(ctx.destination)

                // Set oscillator properties from sound cue
                oscillator.type = soundCue.waveform || "sine"
                oscillator.frequency.setValueAtTime(soundCue.frequency || 440, eventStartTime)

                // Create envelope
                const attackDuration = soundCue.attackDuration || 0.01
                const releaseDuration = soundCue.releaseDuration || 0.5
                const eventDuration = (soundCue.duration || 1000) / 1000 // Convert ms to seconds
                const peakVolume = 0.5 // Increased volume

                gainNode.gain.setValueAtTime(0, eventStartTime)
                gainNode.gain.linearRampToValueAtTime(peakVolume, eventStartTime + attackDuration)

                if (eventDuration > attackDuration + releaseDuration) {
                  gainNode.gain.linearRampToValueAtTime(peakVolume, eventStartTime + eventDuration - releaseDuration)
                }
                gainNode.gain.exponentialRampToValueAtTime(0.001, eventStartTime + eventDuration)

                oscillator.start(eventStartTime)
                oscillator.stop(eventStartTime + eventDuration)

                // Add harmonics if specified
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
          setGenerationStep(`Adding recorded voice: ${event.recordedInstructionLabel || "Untitled"}`)
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
            gainNode.gain.setValueAtTime(0.8, eventStartTime) // Higher volume for voice
            source.start(eventStartTime)

            console.log(`Successfully added recorded voice at ${eventStartTime}`)
          } catch (error) {
            console.warn(`Could not load recorded audio: ${event.recordedAudioUrl}`, error)
          }
        }

        processedEventsCount++
        setGenerationProgress(Math.floor((processedEventsCount / totalEvents) * 80)) // Progress up to 80% for event processing
      }

      setGenerationStep("Rendering audio...")
      setGenerationProgress(80) // Set to 80% before rendering
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
      setGeneratedAudioUrl(url)

      // Directly assign to the audio element for immediate playback readiness
      if (labsAudioRef.current) {
        labsAudioRef.current.src = url
        labsAudioRef.current.volume = volume / 100
      }

      setIsGeneratingAudio(false)
      setGenerationProgress(100)
      setGenerationStep("Export Complete")

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
      setIsGeneratingAudio(false)
    }
  }

  // == Effects for Length Adjuster ==
  useEffect(() => {
    setIsMobileDevice(isMobile())
    if (typeof navigator !== "undefined" && (navigator as any).deviceMemory) {
      const deviceMemory = (navigator as any).deviceMemory
      if (deviceMemory < 4) {
        console.warn("Device memory less than 4GB, enabling memory warnings.")
        setMemoryWarning(true)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch((err) => console.warn("Error closing previous AudioContext:", err))
    }

    const AudioContextAPI = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContextAPI) {
      const sampleRate = isMobileDevice ? 22050 : 44100
      try {
        const ctx = new AudioContextAPI({ sampleRate })
        audioContextRef.current = ctx
        if (ctx.state === "suspended") {
          const resumeContextOnInteraction = async () => {
            if (audioContextRef.current && audioContextRef.current.state === "suspended") {
              try {
                await audioContextRef.current.resume()
              } catch (e) {
                console.error("Error resuming AudioContext on user interaction:", e)
              }
            }
            document.removeEventListener("click", resumeContextOnInteraction, true)
            document.addEventListener("touchend", resumeContextOnInteraction, true)
            document.addEventListener("keydown", resumeContextOnInteraction, true)
          }
          document.addEventListener("click", resumeContextOnInteraction, { once: true, capture: true })
          document.addEventListener("touchend", resumeContextOnInteraction, { once: true, capture: true })
          document.addEventListener("keydown", resumeContextOnInteraction, { once: true, capture: true })
        }
      } catch (error) {
        setStatus({
          message: `Error initializing audio system: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "error",
        })
      }
    } else {
      setStatus({ message: "Your browser does not support the required Audio API.", type: "error" })
    }
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current
          .close()
          .catch((err) => console.warn("Error closing AudioContext in main useEffect cleanup:", err))
        audioContextRef.current = null
      }
    }
  }, [isMobileDevice])

  const cleanupMemory = useCallback(() => {
    setOriginalBuffer(null)
    setProcessedBufferState(null)
    if (originalUrl) {
      URL.revokeObjectURL(originalUrl)
      setOriginalUrl("")
    }
    if (processedUrl) {
      URL.revokeObjectURL(processedUrl)
      setProcessedUrl("")
    }
    forceGarbageCollection()
    if (isMobileDevice) setTimeout(() => forceGarbageCollection(), 100)
  }, [originalUrl, processedUrl, isMobileDevice])

  const validateFileSize = (fileToValidate: File): boolean => {
    const maxSize = isMobileDevice ? 50 * 1024 * 1024 : 500 * 1024 * 1024
    if (fileToValidate.size > maxSize) {
      setStatus({ message: `File too large. Max ${isMobileDevice ? "50MB" : "500MB"}.`, type: "error" })
      return false
    }
    if (
      (isMobileDevice && fileToValidate.size > 20 * 1024 * 1024) ||
      (!isMobileDevice && fileToValidate.size > 150 * 1024 * 1024)
    ) {
      setMemoryWarning(true)
    } else {
      setMemoryWarning(false)
    }
    return true
  }

  const handleFile = async (selectedFile: File) => {
    if (!selectedFile || !selectedFile.type) {
      setStatus({ message: "Invalid file selected.", type: "error" })
      return
    }

    if (!selectedFile.type.startsWith("audio/") && !selectedFile.name.toLowerCase().endsWith(".m4a")) {
      setStatus({ message: "Please select a valid audio file.", type: "error" })
      return
    }
    if (!validateFileSize(selectedFile)) return
    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      setStatus({ message: "Audio system not ready. Please refresh.", type: "error" })
      return
    }
    cleanupMemory()
    await sleep(100)
    setFile(selectedFile)
    setProcessingProgress(0)
    setProcessingStep("Initializing...")
    setDurationLimits(null)
    setAudioAnalysis(null)
    setProcessedUrl("")
    setProcessedBufferState(null)
    setActualDuration(null)
    setIsProcessingComplete(false)
    setStatus(null)
    try {
      setStatus({ message: "Loading audio file...", type: "info" })
      await loadAudioFile(selectedFile)
    } catch (error) {
      setStatus({
        message: `Error loading audio: ${error instanceof Error ? error.message : "Unknown"}`,
        type: "error",
      })
      setOriginalBuffer(null)
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
    const skipSamples = isMobileDevice ? 20 : 10

    for (let i = 0; i < channelData.length; i += skipSamples) {
      if (i % (sampleRate * (isMobileDevice ? 2 : 5)) === 0) {
        await sleep(0)
        setProcessingProgress(20 + Math.floor((i / channelData.length) * 10))
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
    setProcessingStep("Analyzing audio for limits...")
    const silenceRegions = await detectSilenceRegions(buffer, silenceThreshold, minSilenceDuration)
    const totalSilenceDuration = silenceRegions.reduce((sum, region) => sum + (region.end - region.start), 0)
    const audioContentDuration = buffer.duration - totalSilenceDuration
    const minRequiredSpacing = silenceRegions.length > 0 ? silenceRegions.length * minSpacing : 0
    const minPossibleDuration = Math.max(1, Math.ceil((audioContentDuration + minRequiredSpacing) / 60))
    const maxPossibleDuration = isMobileDevice ? 60 : 120
    setDurationLimits({ min: minPossibleDuration, max: maxPossibleDuration })
    setAudioAnalysis({
      totalSilence: totalSilenceDuration,
      contentDuration: audioContentDuration,
      silenceRegions: silenceRegions.length,
    })
    if (targetDuration < minPossibleDuration) setTargetDuration(minPossibleDuration)
    else if (targetDuration > maxPossibleDuration) setTargetDuration(maxPossibleDuration)
    setProcessingStep("Analysis complete.")
  }

  const loadAudioFile = useCallback(
    async (fileToLoad: File) => {
      const currentAudioContext = audioContextRef.current
      if (!currentAudioContext) {
        setStatus({ message: "Audio context not initialized.", type: "error" })
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
          setStatus({ message: "Audio system closed.", type: "error" })
          throw new Error("AudioContext closed")
        }
        if (currentAudioContext.state !== "running" && currentAudioContext.state !== "closed" && attempts < maxAttempts)
          await sleep(100 * attempts)
      }
      if (currentAudioContext.state !== "running") {
        setStatus({ message: "Failed to start audio system.", type: "error" })
        throw new Error(`AudioContext not running: ${currentAudioContext.state}`)
      }
      setProcessingStep("Reading file data...")
      setProcessingProgress(10)
      const arrayBuffer = await fileToLoad.arrayBuffer()
      setProcessingStep("Decoding audio data...")
      setProcessingProgress(50)
      try {
        const decodePromise = currentAudioContext.decodeAudioData(arrayBuffer.slice(0))
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Audio decoding timeout (30s)")), 30000),
        )
        const buffer = await Promise.race([decodePromise, timeoutPromise])
        setProcessingStep("Analyzing audio...")
        setProcessingProgress(80)
        await sleep(50)
        setOriginalBuffer(buffer)
        setProcessingStep("Creating audio player...")
        setProcessingProgress(95)
        if (originalUrl) URL.revokeObjectURL(originalUrl)
        const blob = new Blob([fileToLoad], { type: fileToLoad.type })
        const url = URL.createObjectURL(blob)
        setOriginalUrl(url)
        setProcessingProgress(100)
        setProcessingStep("Load complete!")
        setStatus({
          message: `Audio loaded. Duration: ${formatDuration(buffer.duration)}.`,
          type: "success",
        })
      } catch (decodeError) {
        setStatus({
          message: `Error decoding: ${decodeError instanceof Error ? decodeError.message : "Unknown"}`,
          type: "error",
        })
        throw decodeError
      }
    },
    [originalUrl, isMobileDevice],
  )

  useEffect(() => {
    if (originalBuffer) analyzeAudioForLimits(originalBuffer, minSpacingDuration)
  }, [originalBuffer, silenceThreshold, minSilenceDuration, minSpacingDuration])

  const processAudio = async () => {
    const currentAudioContext = audioContextRef.current
    if (!originalBuffer || !currentAudioContext) {
      setStatus({ message: "Original audio or audio system not ready.", type: "error" })
      return
    }
    setIsProcessing(true)
    setProcessingProgress(0)
    setProcessingStep("Starting processing...")
    if (currentAudioContext.state === "suspended") {
      try {
        await currentAudioContext.resume()
        if (currentAudioContext.state !== "running") throw new Error("Failed to resume for processing.")
      } catch (err) {
        setStatus({ message: `Audio system error: ${err instanceof Error ? err.message : "Unknown"}`, type: "error" })
        setIsProcessing(false)
        return
      }
    } else if (currentAudioContext.state === "closed") {
      setStatus({ message: "Audio system closed.", type: "error" })
      setIsProcessing(false)
      return
    }
    if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current)
    processingTimeoutRef.current = setTimeout(
      () => {
        setIsProcessing(false)
        setStatus({ message: "Processing timed out.", type: "error" })
      },
      isMobileDevice ? 120000 : 600000,
    )

    try {
      setStatus({ message: "Processing audio...", type: "info" })
      const targetDurationSeconds = targetDuration * 60
      setProcessingStep("Detecting silence regions (step 1/4)...")
      setProcessingProgress(10)
      await sleep(10)
      const silenceRegions = await detectSilenceRegions(originalBuffer, silenceThreshold, minSilenceDuration)
      setProcessingStep("Calculating adjustments (step 2/4)...")
      setProcessingProgress(30)
      await sleep(10)
      const totalSilenceDuration = silenceRegions.reduce((sum, region) => sum + (region.end - region.start), 0)
      const audioContentDuration = originalBuffer.duration - totalSilenceDuration
      const availableSilenceDuration = Math.max(
        targetDurationSeconds - audioContentDuration,
        silenceRegions.length * minSpacingDuration,
      )
      const scaleFactor = totalSilenceDuration > 0 ? availableSilenceDuration / totalSilenceDuration : 1
      setProcessingStep("Rebuilding audio (step 3/4)...")
      setProcessingProgress(50)
      await sleep(10)

      const processedAudioBuffer = await rebuildAudioWithScaledPauses(
        originalBuffer,
        silenceRegions,
        scaleFactor,
        minSpacingDuration,
        preserveNaturalPacing,
        availableSilenceDuration,
        (p) => setProcessingProgress(50 + Math.floor(p * 0.4)),
      )
      setPausesAdjusted(silenceRegions.length)
      setProcessingStep("Creating download file (step 4/4)...")
      setProcessingProgress(90)
      await sleep(10)
      const wavBlob = await bufferToWav(processedAudioBuffer, compatibilityMode === "high", (p) =>
        setProcessingProgress(90 + Math.floor(p * 0.1)),
      )
      if (processedUrl) URL.revokeObjectURL(processedUrl)
      const url = URL.createObjectURL(wavBlob)
      setProcessedUrl(url)
      setActualDuration(processedAudioBuffer.duration)
      setProcessedBufferState(processedAudioBuffer)
      setProcessingProgress(100)
      setProcessingStep("Complete!")
      setStatus({ message: "Audio processing completed successfully!", type: "success" })
      setIsProcessingComplete(true)
    } catch (error) {
      console.error("Error during audio processing:", error)
      setStatus({ message: `Processing error: ${error instanceof Error ? error.message : "Unknown"}`, type: "error" })
    } finally {
      setIsProcessing(false)
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
      if (isMobileDevice && newTotalDur > 45 * 60) {
        console.warn(`Mobile device: Output duration ${formatDuration(newTotalDur)} may cause issues.`)
        setMemoryWarning(true)
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
          if (i % (isMobileDevice ? 5 : 10) === 0) {
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
          readIndex = nextRegionStart
        }
        if (readIndex < totalSamples && regions.length === 0) {
          for (let i = readIndex; i < totalSamples; i++)
            if (writeIndex < newData.length) newData[writeIndex++] = originalData[i]
        }
      }
      onProgress(100)
      return newBuffer
    },
    [isMobileDevice],
  )

  const bufferToWav = useCallback(
    async (buffer: AudioBuffer, highCompatibility = true, onProgress: (progress: number) => void): Promise<Blob> => {
      const currentAudioContext = audioContextRef.current
      if (!currentAudioContext) throw new Error("Audio context not available for WAV conversion")
      onProgress(0)
      let targetSampleRate = highCompatibility ? 44100 : buffer.sampleRate
      if (isMobileDevice && highCompatibility && buffer.duration > 15 * 60) {
        targetSampleRate = Math.min(targetSampleRate, 22050)
      }
      let resampledBuffer = buffer
      if (buffer.sampleRate !== targetSampleRate) {
        const ratio = targetSampleRate / buffer.sampleRate
        const newLength = Math.floor(buffer.length * ratio)
        try {
          resampledBuffer = currentAudioContext.createBuffer(buffer.numberOfChannels, newLength, targetSampleRate)
        } catch (e) {
          forceGarbageCollection()
          throw new Error(
            `Failed to create resample buffer (target SR: ${targetSampleRate}Hz). Memory limit likely exceeded.`,
          )
        }
        onProgress(10)
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const oldData = buffer.getChannelData(channel)
          const newData = resampledBuffer.getChannelData(channel)
          for (let i = 0; i < newLength; i++) {
            if (i % (targetSampleRate * (isMobileDevice ? 1 : 2)) === 0) {
              await sleep(0)
              onProgress(
                10 +
                  Math.floor(
                    ((channel * (newLength / buffer.numberOfChannels) + i) / (newLength * buffer.numberOfChannels)) *
                      40,
                  ),
              )
            }
            const oldIndex = i / ratio
            const index = Math.floor(oldIndex)
            const frac = oldIndex - index
            const samp1 = oldData[Math.min(index, oldData.length - 1)]
            const samp2 = oldData[Math.min(index + 1, oldData.length - 1)]
            newData[i] = samp1 + (samp2 - samp1) * frac
          }
        }
      } else {
        onProgress(50)
      }
      const numSamples = resampledBuffer.length
      const numberOfChannels = resampledBuffer.numberOfChannels
      const bytesPerSample = 2
      const dataSize = numSamples * numberOfChannels * bytesPerSample
      const fileSize = 44 + dataSize
      if (isMobileDevice && fileSize > 40 * 1024 * 1024) {
        setMemoryWarning(true)
      }
      let finalArrayBuffer: ArrayBuffer
      try {
        finalArrayBuffer = new ArrayBuffer(fileSize)
      } catch (e) {
        throw new Error(
          `Failed to create WAV data buffer (size: ${formatFileSize(fileSize)}). Memory limit likely exceeded.`,
        )
      }
      const view = new DataView(finalArrayBuffer)
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i))
      }
      writeString(0, "RIFF")
      view.setUint32(4, 36 + dataSize, true)
      writeString(8, "WAVE")
      writeString(12, "fmt ")
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, numberOfChannels, true)
      view.setUint32(24, targetSampleRate, true)
      view.setUint32(28, targetSampleRate * numberOfChannels * bytesPerSample, true)
      view.setUint16(32, numberOfChannels * bytesPerSample, true)
      view.setUint16(34, 16, true)
      writeString(36, "data")
      view.setUint32(40, dataSize, true)
      let offset = 44
      for (let i = 0; i < numSamples; i++) {
        if (i % (targetSampleRate * (isMobileDevice ? 1 : 2)) === 0) {
          await sleep(0)
          onProgress(50 + Math.floor((i / numSamples) * 50))
        }
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, resampledBuffer.getChannelData(channel)[i]))
          view.setInt16(offset, sample * 0x7fff, true)
          offset += bytesPerSample
        }
      }
      onProgress(100)
      return new Blob([finalArrayBuffer], { type: "audio/wav" })
    },
    [isMobileDevice],
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) handleFile(selectedFile)
    if (e.target) e.target.value = ""
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
    if (files.length > 0) handleFile(files[0])
  }

  const downloadProcessedAudio = async () => {
    if (!processedBufferState || !file) return
    const a = document.createElement("a")
    a.href = processedUrl
    a.download = `${file.name.split(".")[0]}_adjusted.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const formatDuration = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60)
    const seconds = Math.floor(timeInSeconds % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${["Bytes", "KB", "MB", "GB"][i]}`
  }

  useEffect(() => {
    if (isProcessingComplete) setIsProcessingComplete(false)
  }, [
    targetDuration,
    silenceThreshold,
    minSilenceDuration,
    minSpacingDuration,
    preserveNaturalPacing,
    compatibilityMode,
  ])

  // Labs: Recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        setRecordedAudioUrl(url)
        setRecordedBlobs(chunks)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      toast({ title: "Recording Started", description: "Recording your instruction..." })
    } catch (err) {
      console.error("Error accessing microphone:", err)
      toast({
        title: "Recording Failed",
        description: `Could not access microphone: ${err instanceof Error ? err.message : "Unknown"}`,
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      toast({ title: "Recording Stopped", description: "Recording saved." })
    }
  }

  const addRecordedVoiceToTimeline = () => {
    if (recordedAudioUrl && recordedBlobs.length > 0) {
      // Estimate duration (this is a rough estimate, actual duration might vary)
      const estimatedDuration = recordedBlobs.reduce((sum, blob) => sum + blob.size, 0) / (12000 * 10) // Rough estimate for webm audio
      const newEvent: TimelineEvent = {
        id: `recorded-voice-${Date.now()}`,
        type: "recorded_voice",
        startTime: labsTotalDuration, // Placeholder, will be adjusted by VisualTimeline
        recordedAudioUrl: recordedAudioUrl,
        recordedInstructionLabel: recordingLabel || `Recorded Instruction ${timelineEvents.length + 1}`,
        duration: Math.max(5, Math.ceil(estimatedDuration)), // Ensure minimum duration
      }
      setTimelineEvents((prev) => [...prev, newEvent])
      setRecordedAudioUrl(null)
      setRecordedBlobs([])
      setRecordingLabel("")
      toast({ title: "Added to Timeline", description: "Recorded voice added to meditation timeline." })
    } else {
      toast({
        title: "No Recording",
        description: "Please record an instruction first.",
        variant: "destructive",
      })
    }
  }

  const addInstructionToTimeline = () => {
    if (selectedLibraryInstruction) {
      const newEvent: TimelineEvent = {
        id: `instruction-${Date.now()}`,
        type: "instruction_sound",
        startTime: labsTotalDuration, // Placeholder
        instructionText: selectedLibraryInstruction.text,
        duration: 60, // Default duration for instructions
      }
      setTimelineEvents((prev) => [...prev, newEvent])
      toast({ title: "Added to Timeline", description: "Instruction added to meditation timeline." })
    } else if (customInstructionText.trim()) {
      const newEvent: TimelineEvent = {
        id: `custom-instruction-${Date.now()}`,
        type: "instruction_sound",
        startTime: labsTotalDuration, // Placeholder
        instructionText: customInstructionText.trim(),
        duration: 60, // Default duration for instructions
      }
      setTimelineEvents((prev) => [...prev, newEvent])
      setCustomInstructionText("")
      toast({ title: "Added to Timeline", description: "Custom instruction added to meditation timeline." })
    } else {
      toast({
        title: "No Instruction",
        description: "Please select a library instruction or enter custom text.",
        variant: "destructive",
      })
    }
  }

  const addSoundCueToTimeline = () => {
    if (selectedSoundCue) {
      const newEvent: TimelineEvent = {
        id: `sound-cue-${Date.now()}`,
        type: "instruction_sound",
        startTime: labsTotalDuration, // Placeholder
        soundCueId: selectedSoundCue.id,
        soundCueName: selectedSoundCue.name,
        soundCueSrc: selectedSoundCue.src,
        duration: (selectedSoundCue.duration || 1000) / 1000, // Convert ms to seconds
      }
      setTimelineEvents((prev) => [...prev, newEvent])
      toast({ title: "Added to Timeline", description: "Sound cue added to meditation timeline." })
    } else {
      toast({
        title: "No Sound Cue",
        description: "Please select a sound cue.",
        variant: "destructive",
      })
    }
  }

  const updateTimelineEvent = useCallback((index: number, newEvent: TimelineEvent) => {
    setTimelineEvents((prev) => prev.map((event, i) => (i === index ? newEvent : event)))
  }, [])

  const removeTimelineEvent = useCallback((index: number) => {
    setTimelineEvents((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const calculateTotalTimelineDuration = useCallback(() => {
    if (timelineEvents.length === 0) return 0
    let total = 0
    let currentTime = 0
    for (const event of timelineEvents) {
      event.startTime = currentTime // Update start time for each event
      total += event.duration || 0
      currentTime += event.duration || 0
    }
    return total
  }, [timelineEvents])

  useEffect(() => {
    const calculatedDuration = calculateTotalTimelineDuration()
    setLabsTotalDuration(calculatedDuration)
  }, [timelineEvents, calculateTotalTimelineDuration])

  const handlePlayGeneratedAudio = () => {
    if (labsAudioRef.current && generatedAudioUrl) {
      labsAudioRef.current.play().catch((e) => console.error("Error playing generated audio:", e))
    }
  }

  const handlePauseGeneratedAudio = () => {
    if (labsAudioRef.current) {
      labsAudioRef.current.pause()
    }
  }

  const handleStopGeneratedAudio = () => {
    if (labsAudioRef.current) {
      labsAudioRef.current.pause()
      labsAudioRef.current.currentTime = 0
    }
  }

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0])
    if (labsAudioRef.current) {
      labsAudioRef.current.volume = value[0] / 100
    }
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <Navigation />
      <main className="container mx-auto flex flex-1 flex-col gap-8 p-4 md:p-8">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={activeMode === "adjuster" ? "default" : "outline"}
            onClick={() => setActiveMode("adjuster")}
            className="px-6 py-3 text-lg"
          >
            Length Adjuster
          </Button>
          <Button
            variant={activeMode === "labs" ? "default" : "outline"}
            onClick={() => setActiveMode("labs")}
            className="px-6 py-3 text-lg"
          >
            Labs
          </Button>
        </div>

        {activeMode === "adjuster" && (
          <section className="grid gap-8 lg:grid-cols-2">
            <Card className="flex flex-col items-center justify-center gap-6 p-6 text-center shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Upload Audio</h2>
              <div
                ref={uploadAreaRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="flex w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-primary dark:border-gray-700"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-12 w-12 text-gray-500 dark:text-gray-400" />
                <p className="text-gray-600 dark:text-gray-300">Drag & drop your audio file here, or click to browse</p>
                <Input
                  type="file"
                  accept="audio/*,.m4a"
                  onChange={handleFileSelect}
                  className="hidden"
                  ref={fileInputRef}
                />
              </div>
              {file && (
                <div className="text-md text-gray-700 dark:text-gray-300">
                  Selected: <span className="font-semibold">{file.name}</span> ({formatFileSize(file.size)})
                </div>
              )}
              {status && (
                <Alert variant={status.type === "error" ? "destructive" : "default"}>
                  {status.type === "error" ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                  <AlertTitle>{status.type === "error" ? "Error" : "Info"}</AlertTitle>
                  <AlertDescription>{status.message}</AlertDescription>
                </Alert>
              )}
              {memoryWarning && (
                <Alert variant="warning">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Memory Warning</AlertTitle>
                  <AlertDescription>
                    Large files may cause performance issues or crashes, especially on mobile devices. Consider shorter
                    audio.
                  </AlertDescription>
                </Alert>
              )}
            </Card>

            <Card className="flex flex-col gap-6 p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Adjust Settings</h2>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="target-duration" className="mb-2 block">
                    Target Duration (minutes): <span className="font-semibold">{targetDuration} min</span>
                  </Label>
                  <Slider
                    id="target-duration"
                    min={durationLimits?.min || 1}
                    max={durationLimits?.max || 120}
                    step={1}
                    value={[targetDuration]}
                    onValueChange={(val) => setTargetDuration(val[0])}
                    disabled={!originalBuffer || isProcessing}
                  />
                  {durationLimits && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Min: {durationLimits.min} min, Max: {durationLimits.max} min
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="silence-threshold" className="mb-2 block">
                    Silence Threshold: <span className="font-semibold">{(silenceThreshold * 100).toFixed(1)}%</span>
                  </Label>
                  <Slider
                    id="silence-threshold"
                    min={0.001}
                    max={0.1}
                    step={0.001}
                    value={[silenceThreshold]}
                    onValueChange={(val) => setSilenceThreshold(val[0])}
                    disabled={!originalBuffer || isProcessing}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">Lower values detect quieter silences.</p>
                </div>
                <div>
                  <Label htmlFor="min-silence-duration" className="mb-2 block">
                    Min Silence Duration (seconds):{" "}
                    <span className="font-semibold">{minSilenceDuration.toFixed(1)}s</span>
                  </Label>
                  <Slider
                    id="min-silence-duration"
                    min={0.5}
                    max={10}
                    step={0.1}
                    value={[minSilenceDuration]}
                    onValueChange={(val) => setMinSilenceDuration(val[0])}
                    disabled={!originalBuffer || isProcessing}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Minimum length of a pause to be considered for adjustment.
                  </p>
                </div>
                <div>
                  <Label htmlFor="min-spacing-duration" className="mb-2 block">
                    Min Spacing Duration (seconds):{" "}
                    <span className="font-semibold">{minSpacingDuration.toFixed(1)}s</span>
                  </Label>
                  <Slider
                    id="min-spacing-duration"
                    min={0.5}
                    max={5}
                    step={0.1}
                    value={[minSpacingDuration]}
                    onValueChange={(val) => setMinSpacingDuration(val[0])}
                    disabled={!originalBuffer || isProcessing}
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Minimum duration for any pause after adjustment.
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="preserve-pacing">Preserve Natural Pacing</Label>
                  <Switch
                    id="preserve-pacing"
                    checked={preserveNaturalPacing}
                    onCheckedChange={setPreserveNaturalPacing}
                    disabled={!originalBuffer || isProcessing}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="compatibility-mode">Compatibility Mode</Label>
                  <Select
                    value={compatibilityMode}
                    onValueChange={setCompatibilityMode}
                    disabled={!originalBuffer || isProcessing}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High (44.1kHz)</SelectItem>
                      <SelectItem value="low">Low (Original SR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={processAudio}
                  disabled={!originalBuffer || isProcessing}
                  className="mt-4 w-full bg-gradient-to-r from-green-500 to-indigo-600 text-white hover:from-green-600 hover:to-indigo-700"
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <span className="animate-spin">
                        <Wand2 className="h-5 w-5" />
                      </span>
                      {processingStep} ({processingProgress}%)
                    </div>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-5 w-5" /> Process Audio
                    </>
                  )}
                </Button>
              </div>
            </Card>

            <Card className="col-span-full flex flex-col gap-6 p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Results</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex flex-col gap-4">
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Original Audio</h3>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <span className="text-lg font-medium">
                      Duration: {originalBuffer ? formatDuration(originalBuffer.duration) : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-gray-500" />
                    <span className="text-lg font-medium">File Size: {file ? formatFileSize(file.size) : "N/A"}</span>
                  </div>
                  {originalUrl && (
                    <audio
                      controls
                      src={originalUrl}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800"
                    />
                  )}
                </div>
                <div className="flex flex-col gap-4">
                  <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Processed Audio</h3>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-500" />
                    <span className="text-lg font-medium">
                      Actual Duration: {actualDuration ? formatDuration(actualDuration) : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-gray-500" />
                    <span className="text-lg font-medium">Pauses Adjusted: {pausesAdjusted}</span>
                  </div>
                  {processedUrl && (
                    <audio
                      controls
                      src={processedUrl}
                      className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800"
                    />
                  )}
                  <Button
                    onClick={downloadProcessedAudio}
                    disabled={!processedUrl || isProcessing}
                    className="mt-4 w-full bg-gradient-to-r from-green-500 to-indigo-600 text-white hover:from-green-600 hover:to-indigo-700"
                  >
                    <Download className="mr-2 h-5 w-5" /> Download Processed Audio
                  </Button>
                </div>
              </div>
            </Card>
          </section>
        )}

        {activeMode === "labs" && (
          <section className="grid gap-8 lg:grid-cols-2">
            {/* Left Column: Timeline Builder */}
            <Card className="flex flex-col gap-6 p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Build Meditation Timeline</h2>
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="meditation-title" className="mb-2 block">
                    Meditation Title
                  </Label>
                  <Input
                    id="meditation-title"
                    value={meditationTitle}
                    onChange={(e) => setMeditationTitle(e.target.value)}
                    placeholder="e.g., Morning Mindfulness"
                  />
                </div>

                <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="instructions">Instructions</TabsTrigger>
                    <TabsTrigger value="sound-cues">Sound Cues</TabsTrigger>
                    <TabsTrigger value="record-voice">Record Voice</TabsTrigger>
                  </TabsList>
                  <TabsContent value="instructions" className="mt-4">
                    <h3 className="mb-3 text-lg font-semibold">Library Instructions</h3>
                    <Select
                      onValueChange={(value) =>
                        setSelectedLibraryInstruction(INSTRUCTIONS_LIBRARY.find((i) => i.id === value) || null)
                      }
                      value={selectedLibraryInstruction?.id || ""}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an instruction" />
                      </SelectTrigger>
                      <SelectContent>
                        {instructionCategories.map((category) => (
                          <React.Fragment key={category}>
                            <div className="px-2 py-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                              {category}
                            </div>
                            {INSTRUCTIONS_LIBRARY.filter((i) => i.category === category).map((instruction) => (
                              <SelectItem key={instruction.id} value={instruction.id}>
                                {instruction.name}
                              </SelectItem>
                            ))}
                          </React.Fragment>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedLibraryInstruction && (
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{selectedLibraryInstruction.text}</p>
                    )}
                    <Button onClick={addInstructionToTimeline} className="mt-4 w-full">
                      <ListPlus className="mr-2 h-4 w-4" /> Add Instruction
                    </Button>

                    <Separator className="my-6" />

                    <h3 className="mb-3 text-lg font-semibold">Custom Instruction</h3>
                    <Textarea
                      placeholder="Enter your custom instruction here..."
                      value={customInstructionText}
                      onChange={(e) => setCustomInstructionText(e.target.value)}
                      rows={4}
                    />
                    <Button onClick={addInstructionToTimeline} className="mt-4 w-full">
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Instruction
                    </Button>
                  </TabsContent>

                  <TabsContent value="sound-cues" className="mt-4">
                    <h3 className="mb-3 text-lg font-semibold">Sound Cues</h3>
                    <Select
                      onValueChange={(value) =>
                        setSelectedSoundCue(SOUND_CUES_LIBRARY.find((s) => s.id === value) || null)
                      }
                      value={selectedSoundCue?.id || ""}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a sound cue" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOUND_CUES_LIBRARY.map((sound) => (
                          <SelectItem key={sound.id} value={sound.id}>
                            {sound.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => selectedSoundCue && playLabsSound(selectedSoundCue.src)}
                      disabled={!selectedSoundCue}
                      className="mt-4 w-full"
                    >
                      <Play className="mr-2 h-4 w-4" /> Preview Sound
                    </Button>
                    <Button onClick={addSoundCueToTimeline} className="mt-2 w-full">
                      <Music2 className="mr-2 h-4 w-4" /> Add Sound Cue
                    </Button>
                  </TabsContent>

                  <TabsContent value="record-voice" className="mt-4">
                    <h3 className="mb-3 text-lg font-semibold">Record Your Voice</h3>
                    <Input
                      placeholder="Label for this recording (optional)"
                      value={recordingLabel}
                      onChange={(e) => setRecordingLabel(e.target.value)}
                      className="mb-4"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={startRecording}
                        disabled={isRecording}
                        className="flex-1 bg-gradient-to-r from-gray-400 to-gray-600 text-white hover:from-gray-500 hover:to-gray-700"
                      >
                        <Mic className="mr-2 h-4 w-4" /> Start Recording
                      </Button>
                      <Button onClick={stopRecording} disabled={!isRecording} className="flex-1" variant="destructive">
                        <StopCircle className="mr-2 h-4 w-4" /> Stop Recording
                      </Button>
                    </div>
                    {recordedAudioUrl && (
                      <div className="mt-4">
                        <h4 className="mb-2 text-md font-medium">Recorded Audio Preview:</h4>
                        <audio controls src={recordedAudioUrl} className="w-full" />
                        <Button onClick={addRecordedVoiceToTimeline} className="mt-4 w-full">
                          <ListPlus className="mr-2 h-4 w-4" /> Add Recorded Voice to Timeline
                        </Button>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </Card>

            {/* Right Column: Timeline Display & Audio Generation */}
            <Card className="flex flex-col gap-6 p-6 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Meditation Timeline</h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-gray-500" />
                  <span className="text-lg font-medium">Total Duration: {formatDuration(labsTotalDuration)}</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveTimeline} variant="outline" size="sm">
                    Save
                  </Button>
                  <Button onClick={handleLoadTimeline} variant="outline" size="sm">
                    Load
                  </Button>
                </div>
              </div>

              <VisualTimeline
                timelineEvents={timelineEvents}
                updateTimelineEvent={updateTimelineEvent}
                removeTimelineEvent={removeTimelineEvent}
                totalDuration={labsTotalDuration}
              />

              <div className="flex items-center gap-4">
                <Button onClick={startPlayback} disabled={isPlaying || timeline.length === 0}>
                  <Play className="mr-2 h-5 w-5" /> Play Timeline
                </Button>
                <Button onClick={pausePlayback} disabled={!isPlaying}>
                  Pause
                </Button>
                <Button onClick={resetPlayback} disabled={currentPlaybackTime === 0 && !isPlaying}>
                  Reset
                </Button>
                <div className="text-lg font-semibold tabular-nums">
                  {formatTime(currentPlaybackTime)} / {formatTime(totalDuration)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-gray-500" />
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  className="w-full"
                />
                <span className="text-sm text-gray-600">{volume}%</span>
              </div>

              <Separator className="my-4" />

              <Card className="bg-gradient-to-r from-green-400 via-indigo-400 to-green-400 p-6 shadow-lg">
                <h3 className="mb-4 text-xl font-bold text-white">Generate Audio</h3>
                <Button
                  onClick={handleExportAudio}
                  disabled={isGeneratingAudio || timelineEvents.length === 0}
                  className="w-full bg-gradient-to-r from-green-500 to-indigo-600 text-white hover:from-green-600 hover:to-indigo-700"
                >
                  {isGeneratingAudio ? (
                    <div className="flex items-center gap-2">
                      <span className="animate-spin">
                        <Wand2 className="h-5 w-5" />
                      </span>
                      {generationStep} ({generationProgress}%)
                    </div>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-5 w-5" /> Generate Audio
                    </>
                  )}
                </Button>
              </Card>

              <Card className="border border-indigo-500 bg-white p-6 shadow-lg">
                <h3 className="mb-4 text-xl font-bold text-gray-800">Generated Audio</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <CircleDotDashed className="h-5 w-5 text-gray-500" />
                      <span className="text-lg font-medium">Total Events: {timelineEvents.length}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <span className="text-lg font-medium">Total Duration: {formatDuration(labsTotalDuration)}</span>
                    </div>
                  </div>
                </div>
                {generatedAudioUrl && (
                  <div className="mt-4 flex flex-col gap-2">
                    <audio ref={labsAudioRef} controls src={generatedAudioUrl} className="w-full custom-audio-player" />
                    <div className="flex gap-2">
                      <Button onClick={handlePlayGeneratedAudio} disabled={!generatedAudioUrl}>
                        <Play className="mr-2 h-4 w-4" /> Play
                      </Button>
                      <Button onClick={handlePauseGeneratedAudio} disabled={!generatedAudioUrl}>
                        Pause
                      </Button>
                      <Button onClick={handleStopGeneratedAudio} disabled={!generatedAudioUrl}>
                        Stop
                      </Button>
                      <Button
                        onClick={() => {
                          const a = document.createElement("a")
                          a.href = generatedAudioUrl
                          a.download = `${meditationTitle.replace(/\s/g, "_")}_meditation.wav`
                          document.body.appendChild(a)
                          a.click()
                          document.body.removeChild(a)
                        }}
                        disabled={!generatedAudioUrl}
                      >
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            </Card>
          </section>
        )}
      </main>
    </div>
  )
}
