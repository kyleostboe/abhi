"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { toast } from "@/components/ui/use-toast"
import {
  INSTRUCTIONS_LIBRARY,
  SOUND_CUES_LIBRARY,
  generateSyntheticSound,
  generateAmbientSound,
  AMBIENT_SOUNDS_LIBRARY,
  NOTE_FREQUENCIES, // Keep NOTE_FREQUENCIES here as it's used by MUSICAL_NOTES
} from "@/lib/meditation-data"
import { formatTime, sleep, forceGarbageCollection } from "@/lib/utils"
import { getAudioContext, bufferToWav, bufferToCompressedAudio } from "@/lib/audio-utils" // Import from audio-utils
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
  const [processedFileSize, setProcessedFileSize] = useState<number>(0)
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
              // Pass the OfflineAudioContext directly to generateSyntheticSound
              await generateSyntheticSound(soundCue, ctx)
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
            const finalVolume = 0.8 // Higher volume for voice
            gainNode.gain.setValueAtTime(finalVolume, eventStartTime)
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

  // Define the missing functions
  const handleDragOverLocal = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleDragLeaveLocal = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleDropLocal = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const droppedFile = event.dataTransfer.files[0]
      setFile(droppedFile)
    }
  }

  const processAudioAdjuster = async () => {
    // Placeholder function
  }

  const downloadProcessedAudioAdjuster = async () => {
    // Placeholder function
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
    setIsProcessingComplete(false) // Add this line
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

  const processAudioAdjusterAction = async () => {
    setIsProcessingComplete(false) // Add this line
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
      const compressedBlob = await bufferToCompressedAudio(
        processedAudioBuffer,
        compatibilityMode === "high",
        (p) => setProcessingProgress(90 + Math.floor(p * 0.1)),
        isMobileDevice,
      )
      if (compressedBlob.size === 0) {
        throw new Error("Generated audio blob is empty. Audio conversion failed or resulted in no data.")
      }
      const url = URL.createObjectURL(compressedBlob)
      setProcessedUrl(url)
      setActualDuration(processedAudioBuffer.duration)
      setProcessedBufferState(processedAudioBuffer)
      setProcessedFileSize(compressedBlob.size)
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

  const downloadProcessedAudioAction = async () => {
    if (!processedUrl) {
      setStatus({ message: "No processed audio available to download.", type: "warning" })
      return
    }
    const a = document.createElement("a")
    a.href = processedUrl
    a.download = file ? `processed_${file.name.replace(/\.[^/.]+$/, "")}.webm` : "processed_audio.webm"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 shadow-lg">
            <button
              onClick={() => setActiveMode("adjuster")}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                activeMode === "adjuster"
                  ? "bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              Length Adjuster
            </button>
            <button
              onClick={() => setActiveMode("labs")}
              className={`px-6 py-2 rounded-md font-medium transition-all ${
                activeMode === "labs"
                  ? "bg-gradient-to-r from-logo-purple-500 to-logo-rose-500 text-white shadow-md"
                  : "text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              Encoder
            </button>
          </div>
        </div>

        {/* Content based on active mode */}
        {activeMode === "adjuster" ? (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">Audio Length Adjuster</h1>

            {/* File Upload Area */}
            <div
              ref={uploadAreaRef}
              onClick={() => {
                console.log("Upload area clicked, triggering file input")
                fileInputRef.current?.click()
              }}
              onDragOver={handleDragOverLocal}
              onDragLeave={handleDragLeaveLocal}
              onDrop={handleDropLocal}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-logo-teal-500 dark:hover:border-logo-teal-400 transition-colors"
            >
              <p className="text-gray-600 dark:text-gray-300 mb-2">Click to upload or drag and drop your audio file</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Supports MP3, WAV, M4A, and other audio formats
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  console.log("File input changed")
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0])
                  }
                }}
                className="hidden"
              />
            </div>

            {/* Status Messages */}
            {status && (
              <div
                className={`p-4 rounded-lg ${
                  status.type === "error"
                    ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    : status.type === "success"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                }`}
              >
                {status.message}
              </div>
            )}

            {/* Processing Progress */}
            {isProcessing && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{processingStep}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{processingProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Settings Cards */}
            {originalBuffer && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Target Duration Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-logo-blue-400 to-logo-amber-300 py-3 px-6 dark:from-logo-teal-700 dark:to-indigo-700">
                    <h3 className="text-white font-black">Target Duration</h3>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Duration: {targetDuration} minutes
                      </label>
                      <input
                        type="range"
                        min={durationLimits?.min || 1}
                        max={durationLimits?.max || 60}
                        value={targetDuration}
                        onChange={(e) => setTargetDuration(Number(e.target.value))}
                        className="w-full h-2 bg-gradient-to-r from-logo-blue-400 to-logo-amber-300 dark:from-logo-teal-700 dark:to-indigo-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Silence Threshold Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500 py-3 px-6 dark:from-indigo-700 dark:to-logo-teal-700">
                    <h3 className="text-white font-black">Silence Threshold</h3>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Threshold: {(silenceThreshold * 100).toFixed(1)}%
                      </label>
                      <input
                        type="range"
                        min="0.001"
                        max="0.1"
                        step="0.001"
                        value={silenceThreshold}
                        onChange={(e) => setSilenceThreshold(Number(e.target.value))}
                        className="w-full h-2 bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500 dark:from-indigo-700 dark:to-logo-teal-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Min Silence Duration Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-logo-purple-300 to-logo-emerald-500 py-3 px-6 dark:from-logo-amber-700 dark:to-logo-rose-700">
                    <h3 className="text-white font-black">Min Silence Duration</h3>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Duration: {minSilenceDuration}s
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="10"
                        step="0.1"
                        value={minSilenceDuration}
                        onChange={(e) => setMinSilenceDuration(Number(e.target.value))}
                        className="w-full h-2 bg-gradient-to-r from-logo-purple-300 to-logo-emerald-500 dark:from-logo-amber-700 dark:to-logo-rose-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Min Spacing Card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                  <div className="bg-gradient-to-r from-orange-300 to-pink-400 py-3 px-6 dark:from-logo-purple-700 dark:to-logo-teal-700">
                    <h3 className="text-white font-black">Min Spacing Between Content</h3>
                  </div>
                  <div className="p-6">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Spacing: {minSpacingDuration}s
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="5"
                        step="0.1"
                        value={minSpacingDuration}
                        onChange={(e) => setMinSpacingDuration(Number(e.target.value))}
                        className="w-full h-2 bg-gradient-to-r from-orange-300 to-pink-400 dark:from-logo-purple-700 dark:to-logo-teal-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Process Button */}
            {originalBuffer && !isProcessing && (
              <div className="text-center">
                <button
                  onClick={processAudioAdjusterAction}
                  className="bg-[linear-gradient(90deg,#1a9d8a_0%,#3b82f6_33%,#f59e0b_66%,#f9a8d4_100%)] hover:shadow-lg text-white font-bold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105"
                >
                  Process Audio
                </button>
              </div>
            )}

            {/* Results */}
            {processedUrl && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 py-3 px-6 dark:from-logo-teal-700 dark:to-logo-emerald-700">
                  <h3 className="text-white font-black">Adjusted Audio</h3>
                </div>
                <div className="p-6">
                  <div className="bg-white p-3 dark:shadow-white/10 mb-4 dark:bg-gray-700 shadow-md hover:shadow-none transition-shadow rounded-sm">
                    <audio controls className="w-full" src={processedUrl}></audio>
                  </div>

                  {/* File Info */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-3 text-center dark:bg-gray-800/60 shadow-md rounded-sm bg-white py-3.5">
                      <div className="text-xs uppercase tracking-wide mb-1 dark:text-logo-teal-400 text-gray-500">
                        File Size
                      </div>
                      <div className="text-lg font-bold dark:text-white text-gray-800">
                        {processedFileSize > 0
                          ? `${(processedFileSize / (1024 * 1024)).toFixed(1)} MB`
                          : "Calculating..."}
                      </div>
                    </div>
                    <div className="p-3 text-center dark:bg-gray-800/60 shadow-md rounded-sm bg-white py-3.5">
                      <div className="text-xs uppercase tracking-wide mb-1 dark:text-logo-teal-400 text-gray-500">
                        Duration
                      </div>
                      <div className="text-lg font-bold dark:text-white text-gray-800">
                        {actualDuration ? formatTime(actualDuration) : "Calculating..."}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={downloadProcessedAudioAction}
                    className="w-full bg-[linear-gradient(90deg,#1a9d8a_0%,#3b82f6_33%,#f59e0b_66%,#f9a8d4_100%)] hover:shadow-lg text-white font-bold py-3 px-6 rounded-lg transition-all duration-300"
                  >
                    Download Adjusted Audio
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">Meditation Encoder</h1>
            <p className="text-center text-gray-600 dark:text-gray-300">Encoder mode functionality coming soon...</p>
          </div>
        )}
      </div>
    </div>
  )
}
