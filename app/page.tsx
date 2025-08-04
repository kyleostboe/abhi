"use client"

import React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import {
  Info,
  Volume2,
  Wand2,
  Download,
  Settings2,
  AlertTriangle,
  ListPlus,
  Music2,
  Mic,
  StopCircle,
  Play,
  PlusCircle,
  CircleDotDashed,
  Trash2,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Navigation } from "@/components/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { toast } from "@/components/ui/use-toast"
import {
  INSTRUCTIONS_LIBRARY,
  SOUND_CUES_LIBRARY,
  generateSyntheticSound,
  generateAmbientSound,
  AMBIENT_SOUNDS_LIBRARY,
  NOTE_FREQUENCIES, // Keep NOTE_FREQUENCIES here as it's used by MUSICAL_NOTES
} from "@/lib/meditation-data"
import { VisualTimeline } from "@/components/visual-timeline"
import { cn, formatTime, monitorMemory, forceGarbageCollection, formatFileSize } from "@/lib/utils"
import { getAudioContext, bufferToWav } from "@/lib/audio-utils" // Import from audio-utils
import type { Instruction, SoundCue, TimelineEvent, AmbientSound as AmbientSoundType } from "@/lib/types" // Import types
import { useMobile } from "@/hooks/use-mobile" // Import useMobile hook

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
  const [status, setStatus] = useState<{ message: string; type: string } | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string>("")
  const [processedUrl, setProcessedUrl] = useState<string>("")
  const [pausesAdjusted, setPausesAdjusted] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState<boolean>(false) // Corrected type to boolean
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
  const isMobileDevice = useMobile() // Use the useMobile hook
  const [memoryWarning, setMemoryWarning] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Add these new state variables and ref at the top of the HomePage component, near other state declarations:
  const backgroundAudioRef = useRef<HTMLAudioElement | AudioBufferSourceNode | null>(null) // Can be HTMLAudioElement or AudioBufferSourceNode
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
          .catch((err) => console.warn("Error suspending AudioContext in main useEffect cleanup:", err))
        audioContextRef.current = null
      }
    }
  }, []) // isMobileDevice removed from dependency array as it's handled by useMobile hook

  const cleanupMemory = useCallback(() => {
    if (originalBuffer) {
      setOriginalBuffer(null)
    }
    if (processedBufferState) {
      setProcessedBufferState(null)
    }
    if (originalUrl) {
      URL.revokeObjectURL(originalUrl)
      setOriginalUrl("")
    }
    if (processedUrl) {
      URL.revokeObjectURL(processedUrl)
      setProcessedUrl("")
    }
    if (generatedAudioUrl) {
      URL.revokeObjectURL(generatedAudioUrl)
      setGeneratedAudioUrl(null)
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch((err) => console.warn("Error closing AudioContext during cleanup:", err))
      audioContextRef.current = null
    }
    forceGarbageCollection()
    console.log("Memory cleanup performed.")
  }, [originalBuffer, processedBufferState, originalUrl, processedUrl, generatedAudioUrl])

  useEffect(() => {
    // Monitor memory usage periodically
    const interval = setInterval(() => {
      monitorMemory(setMemoryWarning)
    }, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (memoryWarning) {
      toast({
        title: "Memory Warning",
        description: "Your device is running low on memory. Performance may be affected.",
        variant: "warning",
        duration: 5000,
      })
    }
  }, [memoryWarning])

  const handleFileChange = useCallback(
    async (selectedFile: File | null) => {
      cleanupMemory() // Clean up previous state before processing new file
      setFile(null)
      setOriginalBuffer(null)
      setProcessedBufferState(null)
      setOriginalUrl("")
      setProcessedUrl("")
      setPausesAdjusted(0)
      setAudioAnalysis(null)
      setActualDuration(null)
      setIsProcessingComplete(false)
      setStatus(null)

      if (selectedFile) {
        if (!selectedFile.type.startsWith("audio/")) {
          setStatus({ message: "Please upload an audio file.", type: "error" })
          return
        }

        setFile(selectedFile)
        setStatus({ message: `Loading ${selectedFile.name}...`, type: "info" })
        setIsProcessing(true)
        setProcessingStep("Loading audio file...")
        setProcessingProgress(0)

        try {
          const arrayBuffer = await selectedFile.arrayBuffer()
          const audioContext = getAudioContext() // Ensure context is active
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          setOriginalBuffer(audioBuffer)
          setOriginalUrl(URL.createObjectURL(selectedFile))
          setDurationLimits({
            min: Math.ceil(audioBuffer.duration * 0.5),
            max: Math.floor(audioBuffer.duration * 1.5),
          })
          setTargetDuration(Math.round(audioBuffer.duration)) // Set initial target to original duration
          setStatus({ message: `File loaded: ${selectedFile.name}`, type: "success" })
        } catch (error) {
          console.error("Error loading audio file:", error)
          setStatus({
            message: `Error loading audio file: ${error instanceof Error ? error.message : "Unknown error"}`,
            type: "error",
          })
          cleanupMemory()
        } finally {
          setIsProcessing(false)
          setProcessingStep("")
          setProcessingProgress(0)
        }
      }
    },
    [cleanupMemory],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      const files = event.dataTransfer.files
      if (files && files.length > 0) {
        handleFileChange(files[0])
      }
    },
    [handleFileChange],
  )

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = "copy"
  }, [])

  const processAudio = useCallback(async () => {
    if (!originalBuffer) {
      setStatus({ message: "No audio file loaded.", type: "error" })
      return
    }

    setIsProcessing(true)
    setIsProcessingComplete(false)
    setProcessedBufferState(null)
    setProcessedUrl("")
    setPausesAdjusted(0)
    setAudioAnalysis(null)
    setActualDuration(null)
    setStatus({ message: "Starting audio processing...", type: "info" })
    setProcessingProgress(0)
    setProcessingStep("Analyzing audio...")

    // Clear any previous timeout
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current)
    }

    // Set a timeout for processing
    processingTimeoutRef.current = setTimeout(() => {
      setStatus({
        message: "Processing is taking longer than expected. Please wait or try a smaller file.",
        type: "warning",
      })
    }, 30000) // 30 seconds

    try {
      const audioContext = getAudioContext() // Ensure context is active

      const source = audioContext.createBufferSource()
      source.buffer = originalBuffer

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)

      const data = new Float32Array(analyser.fftSize)
      const sampleRate = originalBuffer.sampleRate
      const channelData = originalBuffer.getChannelData(0) // Use first channel for analysis

      const silenceRegions: Array<{ start: number; end: number }> = []
      let inSilence = false
      let silenceStart = 0
      let totalSilenceDuration = 0
      let contentDuration = 0

      const minSilenceSamples = Math.round(minSilenceDuration * sampleRate)
      const minSpacingSamples = Math.round(minSpacingDuration * sampleRate)

      setProcessingStep("Detecting silence...")
      setProcessingProgress(10)

      // Simple silence detection
      for (let i = 0; i < channelData.length; i++) {
        const amplitude = Math.abs(channelData[i])
        if (amplitude < silenceThreshold) {
          if (!inSilence) {
            silenceStart = i
            inSilence = true
          }
        } else {
          if (inSilence) {
            const currentSilenceDuration = (i - silenceStart) / sampleRate
            if (currentSilenceDuration >= minSilenceDuration) {
              silenceRegions.push({ start: silenceStart / sampleRate, end: i / sampleRate })
              totalSilenceDuration += currentSilenceDuration
            }
            inSilence = false
          }
        }
        if (i % Math.floor(channelData.length / 100) === 0) {
          setProcessingProgress(10 + Math.floor((i / channelData.length) * 20)) // 10-30%
        }
      }
      // Handle silence at the end of the file
      if (inSilence && (channelData.length - silenceStart) / sampleRate >= minSilenceDuration) {
        silenceRegions.push({ start: silenceStart / sampleRate, end: channelData.length / sampleRate })
        totalSilenceDuration += (channelData.length - silenceStart) / sampleRate
      }

      contentDuration = originalBuffer.duration - totalSilenceDuration

      setAudioAnalysis({
        totalSilence: totalSilenceDuration,
        contentDuration: contentDuration,
        silenceRegions: silenceRegions.length,
      })

      setProcessingStep("Adjusting pauses...")
      setProcessingProgress(30)

      const newDuration = targetDuration
      const originalTotalDuration = originalBuffer.duration

      let newBuffer: AudioBuffer
      let adjustedPausesCount = 0

      if (preserveNaturalPacing) {
        // Advanced mode: Adjust silence regions proportionally
        const targetSilenceDuration = Math.max(0, newDuration - contentDuration)
        const silenceAdjustmentRatio = totalSilenceDuration > 0 ? targetSilenceDuration / totalSilenceDuration : 1

        const newLength = Math.ceil(newDuration * sampleRate)
        newBuffer = audioContext.createBuffer(originalBuffer.numberOfChannels, newLength, sampleRate)

        let currentOriginalOffset = 0
        let currentNewOffset = 0

        for (let i = 0; i < silenceRegions.length; i++) {
          const region = silenceRegions[i]
          const originalSilenceStartSample = Math.round(region.start * sampleRate)
          const originalSilenceEndSample = Math.round(region.end * sampleRate)
          const originalSilenceDurationSamples = originalSilenceEndSample - originalSilenceStartSample

          // Copy content before silence
          const contentBeforeSilenceSamples = originalSilenceStartSample - currentOriginalOffset
          for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
            newBuffer
              .getChannelData(channel)
              .set(
                originalBuffer.getChannelData(channel).subarray(currentOriginalOffset, originalSilenceStartSample),
                currentNewOffset,
              )
          }
          currentNewOffset += contentBeforeSilenceSamples
          currentOriginalOffset = originalSilenceEndSample

          // Add adjusted silence
          const adjustedSilenceDurationSamples = Math.round(originalSilenceDurationSamples * silenceAdjustmentRatio)
          currentNewOffset += adjustedSilenceDurationSamples
          adjustedPausesCount++

          setProcessingProgress(30 + Math.floor((i / silenceRegions.length) * 60)) // 30-90%
        }

        // Copy remaining content after the last silence region
        const remainingContentSamples = channelData.length - currentOriginalOffset
        for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
          newBuffer
            .getChannelData(channel)
            .set(
              originalBuffer
                .getChannelData(channel)
                .subarray(currentOriginalOffset, currentOriginalOffset + remainingContentSamples),
              currentNewOffset,
            )
        }
      } else {
        // Simple mode: Stretch/compress entire audio
        const ratio = newDuration / originalTotalDuration
        const newLength = Math.ceil(originalBuffer.length * ratio)
        newBuffer = audioContext.createBuffer(originalBuffer.numberOfChannels, newLength, sampleRate)

        for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
          const originalChannelData = originalBuffer.getChannelData(channel)
          const newChannelData = newBuffer.getChannelData(channel)
          for (let i = 0; i < newLength; i++) {
            const originalIndex = Math.floor(i / ratio)
            if (originalIndex < originalChannelData.length) {
              newChannelData[i] = originalChannelData[originalIndex]
            }
          }
        }
      }

      setProcessedBufferState(newBuffer)
      setPausesAdjusted(adjustedPausesCount)
      setActualDuration(newBuffer.duration)

      setProcessingStep("Encoding audio...")
      setProcessingProgress(90)

      // Convert to WAV and create URL
      const wavBlob = await bufferToWav(
        newBuffer,
        compatibilityMode === "high",
        (p) => setProcessingProgress(90 + Math.floor(p * 0.1)),
        isMobileDevice,
      )
      const url = URL.createObjectURL(wavBlob)
      setProcessedUrl(url)

      setStatus({ message: "Audio processed successfully!", type: "success" })
      setIsProcessingComplete(true)
    } catch (error) {
      console.error("Error processing audio:", error)
      setStatus({
        message: `Error processing audio: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
      cleanupMemory()
    } finally {
      setIsProcessing(false)
      setProcessingStep("")
      setProcessingProgress(0)
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
      }
    }
  }, [
    originalBuffer,
    targetDuration,
    silenceThreshold,
    minSilenceDuration,
    minSpacingDuration,
    preserveNaturalPacing,
    compatibilityMode,
    cleanupMemory,
    isMobileDevice,
  ])

  const handleDownload = useCallback(() => {
    if (processedUrl) {
      const a = document.createElement("a")
      a.href = processedUrl
      a.download = `adjusted_${file?.name || "audio"}.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast({ title: "Download Started", description: "Your adjusted audio is downloading." })
    } else {
      toast({
        title: "Download Failed",
        description: "No processed audio available for download.",
        variant: "destructive",
      })
    }
  }, [processedUrl, file])

  const handleDownloadLabsAudio = useCallback(() => {
    if (generatedAudioUrl) {
      const a = document.createElement("a")
      a.href = generatedAudioUrl
      a.download = `${meditationTitle.replace(/\s+/g, "_") || "custom_meditation"}.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      toast({ title: "Download Started", description: "Your custom meditation audio is downloading." })
    } else {
      toast({
        title: "Download Failed",
        description: "No generated audio available for download.",
        variant: "destructive",
      })
    }
  }, [generatedAudioUrl, meditationTitle])

  // Labs: Background Audio Management
  const addBackgroundSound = useCallback((sound: AmbientSoundType) => {
    setBackgroundSounds((prev) => {
      if (prev.some((s) => s.id === sound.id)) {
        toast({
          title: "Sound Already Added",
          description: `${sound.name} is already in your background sounds.`,
          variant: "warning",
        })
        return prev
      }
      return [...prev, { id: sound.id, name: sound.name, src: sound.src, volume: 0.5 }]
    })
    toast({
      title: "Background Sound Added",
      description: `${sound.name} added to your background sounds.`,
    })
  }, [])

  const updateBackgroundSoundVolume = useCallback((id: string, volume: number) => {
    setBackgroundSounds((prev) =>
      prev.map((s) => (s.id === id ? { ...s, volume: Math.max(0, Math.min(1, volume)) } : s)),
    )
  }, [])

  const removeBackgroundSound = useCallback(
    (id: string) => {
      setBackgroundSounds((prev) => prev.filter((s) => s.id !== id))
      if (currentPlayingBackgroundSoundId === id) {
        stopBackgroundSoundPreview()
      }
      toast({
        title: "Background Sound Removed",
        description: "The background sound has been removed.",
      })
    },
    [currentPlayingBackgroundSoundId],
  )

  const playBackgroundSoundPreview = useCallback(
    async (sound: AmbientSoundType) => {
      if (currentPlayingBackgroundSoundId === sound.id) {
        stopBackgroundSoundPreview()
        return
      }

      // Stop any currently playing sound
      stopBackgroundSoundPreview()

      setCurrentPlayingBackgroundSoundId(sound.id)

      try {
        if (sound.src.startsWith("synthetic:")) {
          const audioContext = getAudioContext()
          const buffer = await generateAmbientSound(sound, audioContext, 10, 0.5) // Generate 10 seconds for preview
          const source = audioContext.createBufferSource()
          source.buffer = buffer
          source.loop = true
          source.connect(audioContext.destination)
          source.start(0)
          backgroundAudioRef.current = source
        } else {
          const audio = new Audio(sound.src)
          audio.loop = true
          audio.volume = 0.5 // Preview volume
          await audio.play()
          backgroundAudioRef.current = audio
        }
        toast({
          title: "Playing Preview",
          description: `Now previewing: ${sound.name}`,
        })
      } catch (error) {
        console.error("Error playing background sound preview:", error)
        toast({
          title: "Playback Error",
          description: `Could not play preview for ${sound.name}.`,
          variant: "destructive",
        })
        setCurrentPlayingBackgroundSoundId(null)
      }
    },
    [currentPlayingBackgroundSoundId],
  )

  const stopBackgroundSoundPreview = useCallback(() => {
    if (backgroundAudioRef.current) {
      if (backgroundAudioRef.current instanceof HTMLAudioElement) {
        backgroundAudioRef.current.pause()
        backgroundAudioRef.current.currentTime = 0
      } else if (backgroundAudioRef.current instanceof AudioBufferSourceNode) {
        backgroundAudioRef.current.stop()
      }
      backgroundAudioRef.current = null
      setCurrentPlayingBackgroundSoundId(null)
      toast({
        title: "Preview Stopped",
        description: "Background sound preview stopped.",
      })
    }
  }, [])

  // Labs: Recording functionality
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      setRecordedBlobs([]) // Clear previous recordings

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedBlobs((prev) => [...prev, event.data])
        }
      }

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordedBlobs, { type: "audio/webm" })
        const audioUrl = URL.createObjectURL(blob)

        // Get duration of the recorded audio
        const audio = new Audio(audioUrl)
        audio.onloadedmetadata = () => {
          setReadyToAddToTimelineRecording({
            url: audioUrl,
            duration: audio.duration,
            label: recordingLabel || `Voice Recording ${Date.now()}`,
          })
          toast({
            title: "Recording Complete",
            description: "Voice recording ready to be added to timeline.",
          })
        }
      }

      mediaRecorder.start()
      setIsRecording(true)
      toast({ title: "Recording Started", description: "Voice recording in progress..." })
    } catch (err) {
      console.error("Error accessing microphone:", err)
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record voice.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      // Stream tracks need to be stopped to release microphone
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
    }
  }

  const addRecordedVoiceToTimeline = useCallback(() => {
    if (readyToAddToTimelineRecording) {
      const newEvent: TimelineEvent = {
        id: `recorded-voice-${Date.now()}`,
        type: "recorded_voice",
        startTime: labsTotalDuration, // Add to the end for now
        duration: readyToAddToTimelineRecording.duration,
        recordedAudioUrl: readyToAddToTimelineRecording.url,
        recordedInstructionLabel: readyToAddToTimelineRecording.label,
      }
      setTimelineEvents((prev) => [...prev, newEvent])
      setLabsTotalDuration((prev) => prev + newEvent.duration) // Extend total duration
      setReadyToAddToTimelineRecording(null) // Clear the ready state
      setRecordingLabel("") // Clear the label input
      toast({
        title: "Recorded Voice Added",
        description: "Your voice recording has been added to the timeline.",
      })
    }
  }, [readyToAddToTimelineRecording, labsTotalDuration])

  const updateTimelineEvent = useCallback((id: string, updates: Partial<TimelineEvent>) => {
    setTimelineEvents((prev) => prev.map((event) => (event.id === id ? { ...event, ...updates } : event)))
  }, [])

  const deleteTimelineEvent = useCallback((id: string) => {
    setTimelineEvents((prev) => {
      const eventToDelete = prev.find((event) => event.id === id)
      if (eventToDelete) {
        setLabsTotalDuration((prevDuration) => prevDuration - eventToDelete.duration)
      }
      return prev.filter((event) => event.id !== id)
    })
    toast({
      title: "Event Removed",
      description: "The event has been removed from the timeline.",
    })
  }, [])

  const addInstructionToTimeline = useCallback(() => {
    if (selectedLibraryInstruction) {
      const newEvent: TimelineEvent = {
        id: `instruction-${Date.now()}`,
        type: "instruction",
        startTime: labsTotalDuration, // Add to the end
        instructionId: selectedLibraryInstruction.id,
        instructionText: selectedLibraryInstruction.text,
        duration: 60, // Default duration for instructions
      }
      setTimelineEvents((prev) => [...prev, newEvent])
      setLabsTotalDuration((prev) => prev + newEvent.duration)
      setSelectedLibraryInstruction(null)
      toast({
        title: "Instruction Added",
        description: `"${selectedLibraryInstruction.name}" added to timeline.`,
      })
    } else if (customInstructionText.trim()) {
      const newEvent: TimelineEvent = {
        id: `custom-instruction-${Date.now()}`,
        type: "instruction",
        startTime: labsTotalDuration, // Add to the end
        instructionText: customInstructionText.trim(),
        duration: 60, // Default duration for instructions
      }
      setTimelineEvents((prev) => [...prev, newEvent])
      setLabsTotalDuration((prev) => prev + newEvent.duration)
      setCustomInstructionText("")
      toast({
        title: "Custom Instruction Added",
        description: "Your custom instruction has been added to the timeline.",
      })
    } else {
      toast({
        title: "No Instruction Selected",
        description: "Please select an instruction or enter custom text.",
        variant: "warning",
      })
    }
  }, [selectedLibraryInstruction, customInstructionText, labsTotalDuration])

  const addSoundCueToTimeline = useCallback(() => {
    if (selectedSoundCue) {
      const newEvent: TimelineEvent = {
        id: `sound-cue-${Date.now()}`,
        type: "instruction_sound",
        startTime: labsTotalDuration, // Add to the end
        soundCueId: selectedSoundCue.id,
        soundCueName: selectedSoundCue.name,
        soundCueSrc: selectedSoundCue.src,
        duration: selectedSoundCue.src.startsWith("musical:") ? 0.8 : 5, // Default duration for sound cues
      }
      setTimelineEvents((prev) => [...prev, newEvent])
      setLabsTotalDuration((prev) => prev + newEvent.duration)
      setSelectedSoundCue(null)
      toast({
        title: "Sound Cue Added",
        description: `"${selectedSoundCue.name}" added to timeline.`,
      })
    } else {
      toast({
        title: "No Sound Cue Selected",
        description: "Please select a sound cue to add.",
        variant: "warning",
      })
    }
  }, [selectedSoundCue, labsTotalDuration])

  const handleTimelineEventDrop = useCallback((draggedId: string, targetId: string) => {
    setTimelineEvents((prevEvents) => {
      const draggedIndex = prevEvents.findIndex((e) => e.id === draggedId)
      const targetIndex = prevEvents.findIndex((e) => e.id === targetId)

      if (draggedIndex === -1 || targetIndex === -1) return prevEvents

      const newEvents = Array.from(prevEvents)
      const [removed] = newEvents.splice(draggedIndex, 1)
      newEvents.splice(targetIndex, 0, removed)

      // Recalculate start times
      let currentStartTime = 0
      const updatedEvents = newEvents.map((event) => {
        const updatedEvent = { ...event, startTime: currentStartTime }
        currentStartTime += event.duration
        return updatedEvent
      })
      return updatedEvents
    })
  }, [])

  const handleTimelineEventDurationChange = useCallback((id: string, newDuration: number) => {
    setTimelineEvents((prevEvents) => {
      let newTotalDuration = 0
      const updatedEvents = prevEvents.map((event) => {
        if (event.id === id) {
          const updatedEvent = { ...event, duration: Math.max(0.1, newDuration) } // Minimum duration 0.1s
          newTotalDuration += updatedEvent.duration
          return updatedEvent
        }
        newTotalDuration += event.duration
        return event
      })

      // Recalculate start times after duration change
      let currentStartTime = 0
      const finalEvents = updatedEvents.map((event) => {
        const updatedEvent = { ...event, startTime: currentStartTime }
        currentStartTime += event.duration
        return updatedEvent
      })

      setLabsTotalDuration(newTotalDuration)
      return finalEvents
    })
  }, [])

  const handleTimelineEventStartTimeChange = useCallback((id: string, newStartTime: number) => {
    setTimelineEvents((prevEvents) => {
      const eventToMove = prevEvents.find((event) => event.id === id)
      if (!eventToMove) return prevEvents

      const otherEvents = prevEvents.filter((event) => event.id !== id)

      // Find the correct insertion point based on newStartTime
      let insertIndex = 0
      for (let i = 0; i < otherEvents.length; i++) {
        if (newStartTime < otherEvents[i].startTime) {
          insertIndex = i
          break
        }
        insertIndex = i + 1
      }

      const newEvents = [...otherEvents.slice(0, insertIndex), eventToMove, ...otherEvents.slice(insertIndex)]

      // Recalculate start times for all events
      let currentStartTime = 0
      const updatedEvents = newEvents.map((event) => {
        const updatedEvent = { ...event, startTime: currentStartTime }
        currentStartTime += event.duration
        return updatedEvent
      })

      setLabsTotalDuration(currentStartTime) // Update total duration
      return updatedEvents
    })
  }, [])

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Navigation />
      <main className="flex flex-1 flex-col items-center justify-center p-4 md:p-6 lg:p-8">
        <div className="w-full max-w-4xl space-y-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
              Abhī: Meditation Audio Tools
            </h1>
            <p className="max-w-[700px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
              Adjust meditation audio length or create custom meditations with ease.
            </p>
          </div>

          <Tabs
            value={activeMode}
            onValueChange={(value) => setActiveMode(value as "adjuster" | "labs")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="adjuster">
                <Wand2 className="mr-2 h-4 w-4" /> Length Adjuster
              </TabsTrigger>
              <TabsTrigger value="labs">
                <Settings2 className="mr-2 h-4 w-4" /> Encoder (Labs)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="adjuster">
              <Card className="p-6 space-y-6">
                <h2 className="text-2xl font-bold">Length Adjuster</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Upload an audio file and adjust its length by intelligently modifying pauses.
                </p>

                {memoryWarning && (
                  <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Memory Warning</AlertTitle>
                    <AlertDescription>
                      Your device is running low on memory. Processing large audio files may cause issues.
                    </AlertDescription>
                  </Alert>
                )}

                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors dark:border-gray-700 dark:hover:border-gray-600"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  ref={uploadAreaRef}
                >
                  <Input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)}
                    className="hidden"
                    ref={fileInputRef}
                  />
                  <p className="text-gray-500 dark:text-gray-400">
                    Drag & drop your audio file here, or click to select
                  </p>
                  {file && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      Selected: {file.name} ({formatFileSize(file.size)})
                    </p>
                  )}
                </div>

                {status && (
                  <Alert
                    className={cn({
                      "bg-green-100 border-green-400 text-green-700 dark:bg-green-900 dark:border-green-600 dark:text-green-200":
                        status.type === "success",
                      "bg-red-100 border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-200":
                        status.type === "error",
                      "bg-blue-100 border-blue-400 text-blue-700 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200":
                        status.type === "info",
                      "bg-yellow-100 border-yellow-400 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-200":
                        status.type === "warning",
                    })}
                  >
                    <Info className="h-4 w-4" />
                    <AlertTitle>{status.type.charAt(0).toUpperCase() + status.type.slice(1)}</AlertTitle>
                    <AlertDescription>{status.message}</AlertDescription>
                  </Alert>
                )}

                {isProcessing && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{processingStep}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${processingProgress}%` }}></div>
                    </div>
                  </div>
                )}

                {originalBuffer && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="original-duration">Original Duration</Label>
                        <Input
                          id="original-duration"
                          type="text"
                          value={formatTime(originalBuffer.duration * 1000)}
                          readOnly
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="target-duration">Target Duration</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Slider
                            id="target-duration"
                            min={durationLimits?.min || 1}
                            max={durationLimits?.max || 3600} // Max 1 hour for slider
                            step={1}
                            value={[targetDuration]}
                            onValueChange={(val) => setTargetDuration(val[0])}
                            className="flex-1"
                            disabled={isProcessing}
                          />
                          <Input
                            type="number"
                            value={targetDuration}
                            onChange={(e) => setTargetDuration(Number.parseInt(e.target.value))}
                            className="w-24"
                            disabled={isProcessing}
                          />
                          <span className="text-sm text-gray-500">seconds</span>
                        </div>
                      </div>
                    </div>

                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="settings">
                        <AccordionTrigger className="text-lg font-medium">Advanced Settings</AccordionTrigger>
                        <AccordionContent className="space-y-4 p-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="preserve-pacing">Preserve Natural Pacing</Label>
                            <Switch
                              id="preserve-pacing"
                              checked={preserveNaturalPacing}
                              onCheckedChange={setPreserveNaturalPacing}
                              disabled={isProcessing}
                            />
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            When enabled, the tool will primarily adjust silence durations to meet the target length,
                            preserving the speaker's natural pacing. When disabled, the entire audio will be stretched
                            or compressed.
                          </p>

                          <div className="space-y-2">
                            <Label htmlFor="silence-threshold">Silence Threshold</Label>
                            <div className="flex items-center gap-2">
                              <Slider
                                id="silence-threshold"
                                min={0.001}
                                max={0.1}
                                step={0.001}
                                value={[silenceThreshold]}
                                onValueChange={(val) => setSilenceThreshold(val[0])}
                                className="flex-1"
                                disabled={isProcessing || !preserveNaturalPacing}
                              />
                              <Input
                                type="number"
                                value={silenceThreshold}
                                onChange={(e) => setSilenceThreshold(Number.parseFloat(e.target.value))}
                                className="w-24"
                                step="0.001"
                                disabled={isProcessing || !preserveNaturalPacing}
                              />
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Amplitude level below which audio is considered silence (0.001 - 0.1).
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="min-silence-duration">Minimum Silence Duration</Label>
                            <div className="flex items-center gap-2">
                              <Slider
                                id="min-silence-duration"
                                min={0.1}
                                max={10}
                                step={0.1}
                                value={[minSilenceDuration]}
                                onValueChange={(val) => setMinSilenceDuration(val[0])}
                                className="flex-1"
                                disabled={isProcessing || !preserveNaturalPacing}
                              />
                              <Input
                                type="number"
                                value={minSilenceDuration}
                                onChange={(e) => setMinSilenceDuration(Number.parseFloat(e.target.value))}
                                className="w-24"
                                step="0.1"
                                disabled={isProcessing || !preserveNaturalPacing}
                              />
                              <span className="text-sm text-gray-500">seconds</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Minimum duration of a pause to be considered for adjustment (0.1 - 10 seconds).
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="min-spacing-duration">Minimum Spacing Duration</Label>
                            <div className="flex items-center gap-2">
                              <Slider
                                id="min-spacing-duration"
                                min={0.1}
                                max={5}
                                step={0.1}
                                value={[minSpacingDuration]}
                                onValueChange={(val) => setMinSpacingDuration(val[0])}
                                className="flex-1"
                                disabled={isProcessing || !preserveNaturalPacing}
                              />
                              <Input
                                type="number"
                                value={minSpacingDuration}
                                onChange={(e) => setMinSpacingDuration(Number.parseFloat(e.target.value))}
                                className="w-24"
                                step="0.1"
                                disabled={isProcessing || !preserveNaturalPacing}
                              />
                              <span className="text-sm text-gray-500">seconds</span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Minimum duration of silence to maintain between content segments (0.1 - 5 seconds).
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="compatibility-mode">WAV Compatibility Mode</Label>
                            <Select
                              value={compatibilityMode}
                              onValueChange={setCompatibilityMode}
                              disabled={isProcessing}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select compatibility" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high">High (Standard WAV)</SelectItem>
                                <SelectItem value="low">
                                  Low (WebM/Opus - smaller file size, wider browser support)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              High compatibility produces standard WAV files. Low compatibility uses WebM/Opus for
                              smaller files, but may not be supported by all legacy audio players.
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>

                    <Button onClick={processAudio} className="w-full" disabled={isProcessing || !originalBuffer}>
                      {isProcessing ? "Processing..." : "Adjust Length"}
                    </Button>
                  </div>
                )}

                {audioAnalysis && (
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <h3 className="font-semibold">Analysis Results:</h3>
                    <p>Total Silence Detected: {formatTime(audioAnalysis.totalSilence * 1000)}</p>
                    <p>Content Duration: {formatTime(audioAnalysis.contentDuration * 1000)}</p>
                    <p>Silence Regions Found: {audioAnalysis.silenceRegions}</p>
                    {actualDuration !== null && <p>Actual Processed Duration: {formatTime(actualDuration * 1000)}</p>}
                    <p>Pauses Adjusted: {pausesAdjusted}</p>
                  </div>
                )}

                {processedUrl && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold">Processed Audio</h3>
                    <audio controls src={processedUrl} className="w-full" />
                    <Button onClick={handleDownload} className="w-full">
                      <Download className="mr-2 h-4 w-4" /> Download Adjusted Audio
                    </Button>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="labs">
              <Card className="p-6 space-y-6">
                <h2 className="text-2xl font-bold">Encoder (Labs)</h2>
                <p className="text-gray-500 dark:text-gray-400">
                  Create custom meditations by combining instructions, sound cues, and background audio.
                </p>

                <div className="space-y-4">
                  <Label htmlFor="meditation-title">Meditation Title</Label>
                  <Input
                    id="meditation-title"
                    value={meditationTitle}
                    onChange={(e) => setMeditationTitle(e.target.value)}
                    placeholder="e.g., 10-Minute Focus Meditation"
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold">Timeline ({formatTime(labsTotalDuration * 1000)})</h3>
                  <VisualTimeline
                    events={timelineEvents}
                    totalDuration={labsTotalDuration}
                    onUpdateEvent={handleTimelineEventStartTimeChange} // Corrected prop name
                    onRemoveEvent={deleteTimelineEvent} // Corrected prop name
                  />
                  <div className="flex gap-2">
                    <Button onClick={startPlayback} disabled={isPlaying || timeline.length === 0}>
                      <Play className="mr-2 h-4 w-4" /> Play
                    </Button>
                    <Button onClick={pausePlayback} disabled={!isPlaying}>
                      Pause
                    </Button>
                    <Button onClick={resetPlayback} disabled={currentPlaybackTime === 0 && !isPlaying}>
                      Reset
                    </Button>
                  </div>
                </div>

                <Accordion type="multiple" className="w-full">
                  <AccordionItem value="add-instructions">
                    <AccordionTrigger className="text-lg font-medium">
                      <ListPlus className="mr-2 h-5 w-5" /> Add Instructions
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 p-2">
                      <Tabs value={currentTab} onValueChange={setCurrentTab}>
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="instructions">Library</TabsTrigger>
                          <TabsTrigger value="custom-instruction">Custom</TabsTrigger>
                        </TabsList>
                        <TabsContent value="instructions" className="mt-4 space-y-4">
                          <Select
                            value={selectedLibraryInstruction?.id || ""}
                            onValueChange={(id) =>
                              setSelectedLibraryInstruction(
                                INSTRUCTIONS_LIBRARY.find((instr) => instr.id === id) || null,
                              )
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select an instruction from library" />
                            </SelectTrigger>
                            <SelectContent>
                              {instructionCategories.map((category) => (
                                <React.Fragment key={category}>
                                  <div className="px-2 py-1 text-sm font-semibold text-gray-500 dark:text-gray-400">
                                    {category}
                                  </div>
                                  {INSTRUCTIONS_LIBRARY.filter((instr) => instr.category === category).map((instr) => (
                                    <SelectItem key={instr.id} value={instr.id}>
                                      {instr.name}
                                    </SelectItem>
                                  ))}
                                </React.Fragment>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={addInstructionToTimeline}
                            disabled={!selectedLibraryInstruction}
                            className="w-full"
                          >
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Selected Instruction
                          </Button>
                        </TabsContent>
                        <TabsContent value="custom-instruction" className="mt-4 space-y-4">
                          <Label htmlFor="custom-instruction-text">Custom Instruction Text</Label>
                          <Textarea
                            id="custom-instruction-text"
                            placeholder="Enter your custom instruction here..."
                            value={customInstructionText}
                            onChange={(e) => setCustomInstructionText(e.target.value)}
                            rows={4}
                          />
                          <Button
                            onClick={addInstructionToTimeline}
                            disabled={!customInstructionText.trim()}
                            className="w-full"
                          >
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Custom Instruction
                          </Button>
                        </TabsContent>
                      </Tabs>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="add-sound-cues">
                    <AccordionTrigger className="text-lg font-medium">
                      <Music2 className="mr-2 h-5 w-5" /> Add Sound Cues
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 p-2">
                      <Select
                        value={selectedSoundCue?.id || ""}
                        onValueChange={(id) =>
                          setSelectedSoundCue(SOUND_CUES_LIBRARY.find((cue) => cue.id === id) || null)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a sound cue" />
                        </SelectTrigger>
                        <SelectContent>
                          {SOUND_CUES_LIBRARY.map((cue) => (
                            <SelectItem key={cue.id} value={cue.id}>
                              {cue.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => selectedSoundCue && playLabsSound(selectedSoundCue.src)}
                          disabled={!selectedSoundCue}
                          className="flex-1"
                        >
                          <Play className="mr-2 h-4 w-4" /> Preview
                        </Button>
                        <Button onClick={addSoundCueToTimeline} disabled={!selectedSoundCue} className="flex-1">
                          <PlusCircle className="mr-2 h-4 w-4" /> Add Sound Cue
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="record-voice">
                    <AccordionTrigger className="text-lg font-medium">
                      <Mic className="mr-2 h-5 w-5" /> Record Voice
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 p-2">
                      <Label htmlFor="recording-label">Recording Label (Optional)</Label>
                      <Input
                        id="recording-label"
                        placeholder="e.g., My opening remarks"
                        value={recordingLabel}
                        onChange={(e) => setRecordingLabel(e.target.value)}
                        disabled={isRecording}
                      />
                      <div className="flex gap-2">
                        <Button onClick={startRecording} disabled={isRecording} className="flex-1">
                          <CircleDotDashed className="mr-2 h-4 w-4" /> Start Recording
                        </Button>
                        <Button onClick={stopRecording} disabled={!isRecording} className="flex-1">
                          <StopCircle className="mr-2 h-4 w-4" /> Stop Recording
                        </Button>
                      </div>
                      {readyToAddToTimelineRecording && (
                        <div className="mt-4 space-y-2">
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Ready to add: {readyToAddToTimelineRecording.label} (
                            {formatTime(readyToAddToTimelineRecording.duration * 1000)})
                          </p>
                          <audio controls src={readyToAddToTimelineRecording.url} className="w-full" />
                          <Button onClick={addRecordedVoiceToTimeline} className="w-full">
                            <ListPlus className="mr-2 h-4 w-4" /> Add Recorded Voice to Timeline
                          </Button>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="background-audio">
                    <AccordionTrigger className="text-lg font-medium">
                      <Volume2 className="mr-2 h-5 w-5" /> Background Audio
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 p-2">
                      <div className="space-y-2">
                        <Label htmlFor="master-volume">Master Background Volume</Label>
                        <Slider
                          id="master-volume"
                          min={0}
                          max={1}
                          step={0.01}
                          value={[masterBackgroundVolume]}
                          onValueChange={(val) => setMasterBackgroundVolume(val[0])}
                          className="w-full"
                        />
                      </div>
                      <h4 className="text-md font-semibold">Available Sounds</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {AMBIENT_SOUNDS_LIBRARY.map((sound) => (
                          <Button
                            key={sound.id}
                            variant={backgroundSounds.some((s) => s.id === sound.id) ? "secondary" : "outline"}
                            onClick={() => addBackgroundSound(sound)}
                            className="justify-between"
                          >
                            {sound.name}
                            {currentPlayingBackgroundSoundId === sound.id ? (
                              <StopCircle
                                className="h-4 w-4 ml-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  stopBackgroundSoundPreview()
                                }}
                              />
                            ) : (
                              <Play
                                className="h-4 w-4 ml-2"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  playBackgroundSoundPreview(sound)
                                }}
                              />
                            )}
                          </Button>
                        ))}
                      </div>
                      <h4 className="text-md font-semibold mt-4">Selected Background Sounds</h4>
                      {backgroundSounds.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No background sounds added yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {backgroundSounds.map((sound) => (
                            <div key={sound.id} className="flex items-center gap-2">
                              <Label className="flex-1">{sound.name}</Label>
                              <Slider
                                min={0}
                                max={1}
                                step={0.01}
                                value={[sound.volume]}
                                onValueChange={(val) => updateBackgroundSoundVolume(sound.id, val[0])}
                                className="w-24"
                              />
                              <Button variant="ghost" size="icon" onClick={() => removeBackgroundSound(sound.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="flex gap-2">
                  <Button onClick={handleSaveTimeline} className="flex-1">
                    Save Timeline
                  </Button>
                  <Button onClick={handleLoadTimeline} className="flex-1">
                    Load Timeline
                  </Button>
                </div>

                <Button
                  onClick={handleExportAudio}
                  className="w-full"
                  disabled={isGeneratingAudio || timelineEvents.length === 0}
                >
                  {isGeneratingAudio ? `Generating Audio (${generationProgress}%) - ${generationStep}` : "Export Audio"}
                </Button>

                {generatedAudioUrl && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold">Generated Meditation Audio</h3>
                    <audio controls src={generatedAudioUrl} className="w-full" ref={labsAudioRef} />
                    <Button onClick={handleDownloadLabsAudio} className="w-full">
                      <Download className="mr-2 h-4 w-4" /> Download Generated Audio
                    </Button>
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
