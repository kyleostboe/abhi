"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Info, Volume2, Clock, Wand2, Settings2, AlertTriangle, Upload } from "lucide-react/dist/lucide-react.mjs"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "framer-motion"
import { Navigation } from "@/components/navigation"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import {
  INSTRUCTIONS_LIBRARY,
  SOUND_CUES_LIBRARY,
  generateSyntheticSound,
  generateAmbientSound,
  AMBIENT_SOUNDS_LIBRARY,
  NOTE_FREQUENCIES, // Keep NOTE_FREQUENCIES here as it's used by MUSICAL_NOTES
} from "@/lib/meditation-data"
import { formatTime, sleep } from "@/lib/utils" // Import formatTime and sleep
import { getAudioContext, playNote, bufferToWav } from "@/lib/audio-utils" // Import from audio-utils
import type { Instruction, SoundCue, TimelineEvent, AmbientSound as AmbientSoundType } from "@/lib/types" // Import types
import { useMobile } from "@/hooks/use-mobile" // Import useMobile hook

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
  const audioContextRef = useRef<AudioContext | null>(null) // Still needed for Adjuster's specific context management
  const [targetDuration, setTargetDuration] = useState<number>(20)
  const [silenceThreshold, setSilenceThreshold] = useState<number>(0.01)
  const [minSilenceDuration, setMinSilenceDuration] = useState<number>(3)
  const [minSpacingDuration, setMinSpacingDuration] = useState<number>(1.5)
  const [preserveNaturalPacing, setPreserveNaturalPacing] = useState<boolean>(true)
  const [compatibilityMode, setCompatibilityMode] = useState<string>("high")
  \
  const [status, setStatus<{ message: string;
  type: string
}
| null>(null)
const [originalUrl, setOriginalUrl] = useState<string>("")
const [processedUrl, setProcessedUrl] = useState<string>("")
const [pausesAdjusted, setPausesAdjusted] = useState<number>(0)
const [isProcessing, setIsProcessing] = useState<boolean>(false) // Corrected type to boolean
const [processingProgress, setProcessingProgress] = useState<number>(0)
const [processingStep, setProcessingStep] = useState<string>("")
\
const [durationLimits, setDurationLimits<{ min: number;
max: number
} | null>(null)\
const [audioAnalysis, setAudioAnalysis<{\
    totalSilence: number\
    contentDuration: number\
    silenceRegions: number\
} | null>(null)\
const [actualDuration, setActualDuration: React.Dispatch<React.SetStateAction<number | null>>>(null
)
const [isProcessingComplete, setIsProcessingComplete] = useState<boolean>(false)
const isMobileDevice = useMobile() // Use the useMobile hook
const [memoryWarning, setMemoryWarning] = useState<boolean>(false)
const fileInputRef = useRef<HTMLInputElement>(null)
const uploadAreaRef = useRef<HTMLDivElement>(null)
const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

// Add these new state variables and ref at the top of the HomePage component, near other state declarations:
const backgroundAudioRef = useRef<HTMLAudioElement | null>(null)
const [currentPlayingBackgroundSoundId, setCurrentPlayingBackgroundSoundId] = useState<string | null>(null)

// == States for Labs ==
const [meditationTitle, setMeditationTitle] = useState<string>("My Custom Meditation")
const [labsTotalDuration, setLabsTotalDuration] = useState<number>(600)
const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
const [selectedLibraryInstruction, setSelectedLibraryInstruction] = useState<Instruction | null>(null)
const [customInstructionText, setCustomInstructionText] = useState<string>("")
const [selectedSoundCue, setSelectedSoundCue] = useState<SoundCue | null>(null)
const [isRecording, setIsRecording] = useState<boolean>(false)
// State to hold the recorded audio data ready for adding to timeline
const [readyToAddToTimelineRecording, setReadyToAddToTimelineRecording] = useState<{
  url: string
  duration: number
  label: string
} | null>(null)
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

// Update the type definition for backgroundSounds to remove the redundant 'enabled' property:
const [backgroundSounds, setBackgroundSounds] = useState<
  Array<{
    id: string
    name: string
    src: string // File path or synthetic: prefix for export
    volume: number
  }>
>([])
const [masterBackgroundVolume, setMasterBackgroundVolume] = useState<number>(0.5)

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
        const audioContext = getAudioContext() // Use centralized AudioContext
        await generateSyntheticSound(soundCue, audioContext) // Await the synthetic sound generation

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
        setGenerationStep(`Adding sound: ${event.soundCueName || "Sound Cue"}`)
        console.log(`Processing sound cue from soundCueSrc: ${event.soundCueSrc}`)

        if (event.soundCueSrc?.startsWith("synthetic:")) {
          const soundCue = SOUND_CUES_LIBRARY.find((cue) => cue.id === event.soundCueId)
          if (soundCue) {
            await generateSyntheticSound(soundCue, ctx) // Pass OfflineAudioContext
            console.log(`Successfully added synthetic sound at ${eventStartTime}`)
          }
        } else if (event.soundCueSrc?.startsWith("musical:")) {
          const noteMatch = event.soundCueSrc.match(/musical:([A-G])(\d)/)
          if (noteMatch) {
            const note = noteMatch[1]
            const octave = Number.parseInt(noteMatch[2])
            console.log(`Processing musical note: ${note}${octave}`)

            const frequency = NOTE_FREQUENCIES[`${note}${octave}` as keyof typeof NOTE_FREQUENCIES]
            if (frequency) {
              const oscillator = ctx.createOscillator()
              const gainNode = ctx.createGain()

              oscillator.connect(gainNode)
              gainNode.connect(ctx.destination)

              oscillator.type = "sine"
              oscillator.frequency.setValueAtTime(frequency, eventStartTime)

              const eventDuration = 0.8 // Default duration for musical notes
              const peakVolume = 0.4 // Good volume for musical notes

              gainNode.gain.setValueAtTime(0, eventStartTime)
              gainNode.gain.exponentialRampToValueAtTime(peakVolume, eventStartTime + 0.05)
              gainNode.gain.exponentialRampToValueAtTime(0.001, eventStartTime + eventDuration)

              oscillator.start(eventStartTime)
              oscillator.stop(eventStartTime + eventDuration)
              console.log(`Successfully added musical note ${note}${octave} at ${eventStartTime}`)
            }
          }
        } else if (event.soundCueSrc) {
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

            console.log(`Successfully added pre-recorded audio at ${eventStartTime}`)
          } catch (error) {
            console.warn(`Could not load recorded audio: ${event.soundCueSrc}`, error)
          }
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

    // Add background sounds to the audio context
    for (const bgSound of backgroundSounds) {
      if (bgSound.volume > 0) {
        try {
          console.log(`Adding background sound: ${bgSound.name} from src: ${bgSound.src}`)
          if (bgSound.src.startsWith("synthetic:")) {
            const ambientSoundDef = AMBIENT_SOUNDS_LIBRARY.find((s) => s.id === bgSound.id) as AmbientSoundType
            if (ambientSoundDef) {
              await generateAmbientSound(
                ambientSoundDef,
                ctx,
                maxAudioDuration,
                bgSound.volume * masterBackgroundVolume * 0.3,
              )
            }
          } else {
            const response = await fetch(bgSound.src)
            const arrayBuffer = await response.arrayBuffer()
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
            const source = ctx.createBufferSource()
            const gainNode = ctx.createGain()
            source.buffer = audioBuffer
            source.connect(gainNode)
            gainNode.connect(ctx.destination)
            const finalVolume = bgSound.volume * masterBackgroundVolume * 0.3
            gainNode.gain.setValueAtTime(finalVolume, 0)
            source.loop = true
            source.start(0)
            source.stop(maxAudioDuration)
            console.log(`Successfully added background sound ${bgSound.name} at volume ${finalVolume}`)
          }
        } catch (error) {
          console.warn(`Could not load background sound: ${bgSound.src}`, error)
        }
      }
    }

    setGenerationStep("Rendering audio...")
    setGenerationProgress(80) // Set to 80% before rendering
    console.log("Starting audio rendering...")

    const rendered = await ctx.startRendering()
    console.log("Audio rendering complete, creating WAV blob...")

    if (rendered.length === 0) {
      throw new Error("Rendered audio buffer is empty. No audio content was generated.")
    }

    const wavBlob = await bufferToWav(
      rendered,
      compatibilityMode === "high",
      (p) => setProcessingProgress(90 + Math.floor(p * 0.1)),
      isMobileDevice,
    )
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
  // Use the useMobile hook for initial detection
  // The useMobile hook already handles window.innerWidth and user agent.
  // No need for manual check here.
  if (typeof navigator !== "undefined" && (navigator as any).deviceMemory) {
    const deviceMemory = (navigator as any).deviceMemory
    if (deviceMemory < 4) {
      console.warn("Device memory less than 4GB, enabling memory warnings.")
      setMemoryWarning(true)
    }
  }
}, []) // isMobileDevice is now a hook, no longer a dependency here

useEffect(() => {
  if (typeof window === "undefined") return

  // Use getAudioContext for consistent initialization
  try {
    const ctx = getAudioContext()
    audioContextRef.current = ctx
  } catch (error) {
    setStatus({
      message: `Error initializing audio system: ${error instanceof Error ? error.message : "Unknown error"}`,
      type: "error",
    })
  }

  return () => {
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current
        .close()
        .catch((err) => console.warn("Error closing AudioContext in main useEffect cleanup:", err))
      audioContextRef.current = null
    }
  }
}, []) // isMobileDevice removed from dependency array as it's handled by useMobile hook

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
        message: `Audio loaded. Duration: ${formatTime(buffer.duration)}.`,
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
    await sleep(10)
    await sleep(10)
    const silenceRegions2 = await detectSilenceRegions(originalBuffer, silenceThreshold, minSilenceDuration)
    setProcessingStep("Calculating adjustments (step 2/4)...")
    await sleep(10)
    const totalSilenceDuration = silenceRegions2.reduce((sum, region) => sum + (region.end - region.start), 0)
    const audioContentDuration = originalBuffer.duration - totalSilenceDuration
    const availableSilenceDuration = Math.max(
      targetDurationSeconds - audioContentDuration,
      silenceRegions2.length * minSpacingDuration,
    )
    const scaleFactor = totalSilenceDuration > 0 ? availableSilenceDuration / totalSilenceDuration : 1
    setProcessingStep("Rebuilding audio (step 3/4)...")
    setProcessingProgress(50)
    await sleep(10)

    const processedAudioBuffer = await rebuildAudioWithScaledPauses(
      originalBuffer,
      silenceRegions2,
      scaleFactor,
      minSpacingDuration,
      preserveNaturalPacing,
      availableSilenceDuration,
      (p) => setProcessingProgress(50 + Math.floor(p * 0.4)),
    )
    setPausesAdjusted(silenceRegions2.length)
    setProcessingStep("Creating download file (step 4/4)...")
    setProcessingProgress(90)
    await sleep(10)
    const wavBlob = await bufferToWav(
      processedAudioBuffer,
      compatibilityMode === "high",
      (p) => setProcessingProgress(90 + Math.floor(p * 0.1)),
      isMobileDevice,
    )
    if (wavBlob.size === 0) {
      throw new Error("Generated WAV blob is empty. WAV conversion failed or resulted in no data.")
    }
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
      console.warn(`Mobile device: Output duration ${formatTime(newTotalDur)} may cause issues.`)
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

const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFile = e.target.files?.[0]
  if (selectedFile) handleFile(selectedFile)
  if (fileInputRef.current) fileInputRef.current.value = ""
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
    handleFileSelect(mockChangeEvent)
  }
}

const downloadProcessedAudio = () => {
  if (processedUrl && file) {
    const a = document.createElement("a")
    a.href = processedUrl
    a.download = `${file.name.split(".")[0]}_adjusted.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

const handleRecordVoice = async () => {
  if (isRecording) {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    return
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorderRef.current = new MediaRecorder(stream)
    const chunks: Blob[] = []

    mediaRecorderRef.current.ondataavailable = (event) => {
      chunks.push(event.data)
    }

    mediaRecorderRef.current.onstop = async () => {
      const audioBlob = new Blob(chunks, { type: "audio/webm" })
      const audioUrl = URL.createObjectURL(audioBlob)
      setRecordedBlobs((prev) => [...prev, audioBlob])

      // Get duration of recorded audio
      const audio = new Audio(audioUrl)
      audio.onloadedmetadata = () => {
        setReadyToAddToTimelineRecording({
          url: audioUrl,
          duration: audio.duration,
          label: recordingLabel || `Recorded Voice ${Date.now()}`,
        })
        toast({
          title: "Recording Complete",
          description: "Your voice recording is ready to be added to the timeline.",
        })
      }
      stream.getTracks().forEach((track) => track.stop())
    }

    mediaRecorderRef.current.start()
    setIsRecording(true)
    toast({ title: "Recording Started", description: "Speak now to record your instruction." })
  } catch (err) {
    console.error("Error accessing microphone:", err)
    toast({
      title: "Microphone Access Denied",
      description: "Please allow microphone access to record voice instructions.",
      variant: "destructive",
    })
  }
}

const addRecordedVoiceToTimeline = () => {
  if (readyToAddToTimelineRecording) {
    const newEvent: TimelineEvent = {
      id: `recorded-voice-${Date.now()}`,
      type: "recorded_voice",
      startTime: labsTotalDuration, // Add to the end for now
      recordedAudioUrl: readyToAddToTimelineRecording.url,
      recordedInstructionLabel: readyToAddToTimelineRecording.label,
      duration: readyToAddToTimelineRecording.duration,
    }
    setTimelineEvents((prev) => [...prev, newEvent])
    setReadyToAddToTimelineRecording(null) // Clear the ready state
    setRecordingLabel("") // Clear recording label
    toast({ title: "Voice Added", description: "Recorded voice added to timeline." })
  }
}

const addInstructionToTimeline = () => {
  if (selectedLibraryInstruction) {
    const newEvent: TimelineEvent = {
      id: `instruction-${Date.now()}`,
      type: "instruction_sound",
      startTime: labsTotalDuration, // Add to the end for now
      instructionText: selectedLibraryInstruction.text,
      soundCueId: selectedSoundCue?.id,
      soundCueName: selectedSoundCue?.name,
      soundCueSrc: selectedSoundCue?.src,
    }
    setTimelineEvents((prev) => [...prev, newEvent])
    toast({ title: "Instruction Added", description: "Library instruction added to timeline." })
  } else if (customInstructionText.trim() !== "") {
    const newEvent: TimelineEvent = {
      id: `custom-instruction-${Date.now()}`,
      type: "instruction_sound",
      startTime: labsTotalDuration, // Add to the end for now
      instructionText: customInstructionText.trim(),
      soundCueId: selectedSoundCue?.id,
      soundCueName: selectedSoundCue?.name,
      soundCueSrc: selectedSoundCue?.src,
    }
    setTimelineEvents((prev) => [...prev, newEvent])
    setCustomInstructionText("")
    toast({ title: "Instruction Added", description: "Custom instruction added to timeline." })
  } else {
    toast({
      title: "No Instruction Selected",
      description: "Please select a library instruction or enter custom text.",
      variant: "destructive",
    })
  }
}

const addMusicalNoteToTimeline = (note: string, octave: number) => {
  const newEvent: TimelineEvent = {
    id: `musical-note-${Date.now()}`,
    type: "instruction_sound", // Using instruction_sound type for now, could be a new type
    startTime: labsTotalDuration, // Add to the end for now
    instructionText: `Play ${note}${octave}`,
    soundCueId: `musical-note-${note}${octave}`,
    soundCueName: `${note}${octave}`,
    soundCueSrc: `musical:${note}${octave}`, // Custom src for musical notes
  }
  setTimelineEvents((prev) => [...prev, newEvent])
  playNote(note, octave) // Play a preview of the note
  toast({ title: "Musical Note Added", description: `Note ${note}${octave} added to timeline.` })
}

const addBackgroundSound = (sound: AmbientSoundType) => {
  const existingSound = backgroundSounds.find((s) => s.id === sound.id)
  if (existingSound) {
    toast({
      title: "Sound Already Added",
      description: `${sound.name} is already in your background sounds.`,
      variant: "default",
    })
    return
  }

  setBackgroundSounds((prev) => [
    ...prev,
    {
      id: sound.id,
      name: sound.name,
      src: sound.src,
      volume: 0.5, // Default volume for new background sounds
    },
  ])
  toast({ title: "Background Sound Added", description: `${sound.name} added.` })
}

const updateBackgroundSoundVolume = (id: string, newVolume: number) => {
  setBackgroundSounds((prev) => prev.map((s) => (s.id === id ? { ...s, volume: newVolume } : s)))
}

const removeBackgroundSound = (id: string) => {
  setBackgroundSounds((prev) => prev.filter((s) => s.id !== id))
  if (currentPlayingBackgroundSoundId === id) {
    stopBackgroundSound()
  }
  toast({ title: "Background Sound Removed", description: "Sound removed from background mix." })
}

const playBackgroundSound = async (sound: { id: string; src: string; volume: number }) => {
  if (backgroundAudioRef.current) {
    stopBackgroundSound() // Stop any currently playing background sound
  }

  try {
    const audioContext = getAudioContext()
    if (audioContext.state === "suspended") {
      await audioContext.resume()
    }

    if (sound.src.startsWith("synthetic:")) {
      const ambientSoundDef = AMBIENT_SOUNDS_LIBRARY.find((s) => s.id === sound.id) as AmbientSoundType
      if (ambientSoundDef) {
        // For synthetic sounds, we need to generate them into a buffer and then play
        // This is a simplified approach; a more robust solution would involve
        // creating a persistent source node for looping.
        const tempCtx = new OfflineAudioContext(1, audioContext.sampleRate * 5, audioContext.sampleRate) // 5s buffer
        await generateAmbientSound(ambientSoundDef, tempCtx, 5, sound.volume * masterBackgroundVolume)
        const renderedBuffer = await tempCtx.startRendering()

        const source = audioContext.createBufferSource()
        source.buffer = renderedBuffer
        source.loop = true
        const gainNode = audioContext.createGain()
        source.connect(gainNode)
        gainNode.connect(audioContext.destination)
        gainNode.gain.value = sound.volume * masterBackgroundVolume
        source.start(0)

        // Store the source node to stop it later
        backgroundAudioRef.current = source as any // Cast to any to store AudioBufferSourceNode
        setCurrentPlayingBackgroundSoundId(sound.id)
        toast({ title: "Playing Background Sound", description: `Now playing: ${sound.name}` })
      }
    } else {
      // For file-based sounds
      const audio = new Audio(sound.src)
      audio.loop = true
      audio.volume = sound.volume * masterBackgroundVolume
      await audio.play().catch((e) => console.error("Error playing background audio:", e))
      backgroundAudioRef.current = audio
      setCurrentPlayingBackgroundSoundId(sound.id)
      toast({ title: "Playing Background Sound", description: `Now playing: ${sound.name}` })
    }
  } catch (error) {
    console.error("Failed to play background sound:", error)
    toast({
      title: "Background Sound Error",
      description: `Could not play ${sound.name}.`,
      variant: "destructive",
    })
  }
}

const stopBackgroundSound = () => {
  if (backgroundAudioRef.current) {
    if (backgroundAudioRef.current instanceof AudioBufferSourceNode) {
      backgroundAudioRef.current.stop()
    } else {
      backgroundAudioRef.current.pause()
      backgroundAudioRef.current.currentTime = 0
    }
    backgroundAudioRef.current = null
    setCurrentPlayingBackgroundSoundId(null)
    toast({ title: "Background Sound Stopped", description: "Background sound stopped." })
  }
}

const updateTimelineEvent = useCallback((id: string, updates: Partial<TimelineEvent>) => {
  setTimelineEvents((prev) => prev.map((event) => (event.id === id ? { ...event, ...updates } : event)))
}, [])

const removeTimelineEvent = useCallback((id: string) => {
  setTimelineEvents((prev) => prev.filter((event) => event.id !== id))
}, [])

const reorderTimelineEvents = useCallback((startIndex: number, endIndex: number) => {
  setTimelineEvents((prev) => {
    const result = Array.from(prev)
    const [removed] = result.splice(startIndex, 1)
    result.splice(endIndex, 0, removed)
    return result
  })
}, [])

return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative max-w-6xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-white/40 overflow-hidden dark:bg-gray-900/80 transition-colors duration-300 ease-in-out"
        style={{
          borderRadius: "3rem 2.5rem 3rem 2.5rem",
        }}
      >
        {/* Header */}
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-logo-amber/20 via-logo-rose/15 via-logo-purple/10 to-logo-teal/20 dark:from-logo-amber/20 dark:via-logo-rose/15 dark:via-logo-purple/10 dark:to-logo-teal/20"></div>
          </div>
          <div className="relative px-8 text-center pb-2 pt-16">
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
              <p className="text-lg text-gray-600 dark:text-gray-300 mt-4 mb-8">
                Adjust meditation length or create custom meditation timelines.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-6 md:px-10 pb-10">
          <Tabs value={activeMode} onValueChange={(value) => setActiveMode(value as "adjuster" | "labs")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100/70 p-1 rounded-lg dark:bg-gray-800/70">
              <TabsTrigger value="adjuster" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Clock className="h-4 w-4 mr-2" />
                Length Adjuster
              </TabsTrigger>
              <TabsTrigger value="labs" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Wand2 className="h-4 w-4 mr-2" />
                Encoder (Labs)
              </TabsTrigger>
            </TabsList>

            {/* Length Adjuster Content */}
            <TabsContent value="adjuster" className="space-y-6">
              <Card>
                <div className="p-6">
                  <h2 className="text-2xl font-bold mb-4 flex items-center">
                    <Volume2 className="h-6 w-6 mr-2 text-logo-teal-600" />
                    Adjust Meditation Length
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Upload a guided meditation audio file and adjust its total duration by intelligently re-spacing silence periods.
                  </p>

                  {/* Upload Section */}
                  <motion.div
                    ref={uploadAreaRef}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer transition-colors hover:border-primary"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".mp3,.wav,.ogg,.m4a,audio/*"
                      onChange={handleFileSelect}
                    />
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Drop your audio file here or click to browse
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Supports MP3, WAV, OGG, and M4A files</p>
                  </motion.div>

                  {file && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center">
                        <Volume2 className="h-5 w-5 text-green-600 dark:text-green-400 mr-3" />
                        <div>
                          <p className="font-medium text-green-800 dark:text-green-200">{file.name}</p>
                          <p className="text-sm text-green-600 dark:text-green-400">
                            Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {originalUrl && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
                      <h3 className="text-lg font-medium mb-3">Original Audio</h3>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                        <audio controls className="w-full" src={originalUrl} />
                      </div>
                    </motion.div>
                  )}

                  {/* Settings Section */}
                  {originalBuffer && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8 space-y-6">
                      <h3 className="text-xl font-semibold flex items-center">
                        <Settings2 className="h-5 w-5 mr-2 text-logo-purple-600" />
                        Adjustment Settings
                      </h3>

                      {memoryWarning && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Memory Warning</AlertTitle>
                          <AlertDescription>
                            Your device may have limited memory. Processing very large files or long durations might cause crashes. Consider shorter meditations or a device with more RAM.
                          </AlertDescription>
                        </Alert>
                      )}

                      {audioAnalysis && (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>Audio Analysis</AlertTitle>
                          <AlertDescription>
                            <p>Original Duration: {formatTime(originalBuffer.duration)}</p>
                            <p>Content Duration: {formatTime(audioAnalysis.contentDuration)}</p>
                            <p>Total Silence: {formatTime(audioAnalysis.totalSilence)} ({audioAnalysis.silenceRegions} regions)</p>
                            {durationLimits && (
                              <p>Adjustable Range: {durationLimits.min} - {durationLimits.max} minutes</p>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}

                      <div>
                        <Label htmlFor="target-duration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Target Duration: {targetDuration} minutes
                        </Label>
                        <Slider
                          id="target-duration"
                          min={durationLimits?.min || 1}
                          max={durationLimits?.max || 120}
                          step={1}
                          value={[targetDuration]}
                          onValueChange={([value]) => setTargetDuration(value)}
                          className="w-full"
\
