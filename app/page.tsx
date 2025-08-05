"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  Menu,
  BookOpenText,
  Music,
  Timer,
  Heart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatTime } from "@/lib/audio-utils"
import { meditations } from "@/app/labs/lib/meditation-data"
import type { Meditation, SoundCue } from "@/lib/types"
import { Navigation } from "@/components/navigation"
import { useMobile } from "@/hooks/use-mobile"

import type React from "react"
import { toast } from "@/components/ui/use-toast"
import {
  INSTRUCTIONS_LIBRARY,
  SOUND_CUES_LIBRARY,
  generateSyntheticSound,
  generateAmbientSound,
  AMBIENT_SOUNDS_LIBRARY,
  NOTE_FREQUENCIES, // Keep NOTE_FREQUENCIES here as it's used by MUSICAL_NOTES
} from "@/lib/meditation-data"
import { sleep, monitorMemory, forceGarbageCollection } from "@/lib/utils"
import { getAudioContext, bufferToWav } from "@/lib/audio-utils" // Import from audio-utils
import type {
  Instruction as InstructionType,
  SoundCue as SoundCueType,
  TimelineEvent as TimelineEventType,
  AmbientSound as AmbientSoundType,
} from "@/lib/types" // Import types
// import { useMobile } from "@/hooks/use-mobile" // Import useMobile hook

interface TimelineItem {
  id: string
  type: "instruction" | "sound"
  duration: number // in seconds
  content: InstructionType | SoundCueType
}

const defaultMeditation: Meditation = {
  id: "custom",
  title: "Custom Meditation",
  description: "Create your own unique meditation experience.",
  duration: 600, // Default to 10 minutes
  timeline: [],
  instructions: [],
  ambientSounds: [],
}

export default function HomePage() {
  const [currentMeditation, setCurrentMeditation] = useState<Meditation>(defaultMeditation)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)
  const [instructionText, setInstructionText] = useState(
    "Enter your meditation instruction here... For example: 'Take a deep breath and focus on the sensation of air entering and leaving your nostrils. Allow your mind to settle into this natural rhythm.'",
  )
  const [customInstructionTime, setCustomInstructionTime] = useState(60) // Default to 60 seconds for custom instruction
  const [showSidebar, setShowSidebar] = useState(false)
  const [activeTab, setActiveTab] = useState("instructions") // 'instructions', 'sounds', 'timer'

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const instructionAudioRef = useRef<HTMLAudioElement | null>(null)

  const isMobile = useMobile()

  const playSound = useCallback((src: string, volume: number) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = src
      audioRef.current.volume = volume
      audioRef.current.play()
    } else {
      audioRef.current = new Audio(src)
      audioRef.current.volume = volume
      audioRef.current.play()
    }
  }, [])

  const playInstruction = useCallback(
    (text: string) => {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = "en-US"
        utterance.rate = 0.9 // Slightly slower for meditation
        utterance.volume = 1 // Full volume for instructions

        // If there's an existing instruction playing, stop it
        if (instructionAudioRef.current) {
          instructionAudioRef.current.pause()
          instructionAudioRef.current.src = "" // Clear source
        }

        // Use a dummy audio element to track speech synthesis state
        // This is a workaround as SpeechSynthesisUtterance doesn't directly expose play/pause state
        instructionAudioRef.current = new Audio()
        instructionAudioRef.current.play().catch(() => {
          // This catch is important for preventing errors if play() is called without user interaction
          // and for handling cases where the browser blocks autoplay.
          console.warn("Autoplay prevented for instruction audio.")
        })

        utterance.onstart = () => {
          // Pause ambient sound slightly during instruction
          if (audioRef.current) {
            audioRef.current.volume = volume * 0.3
          }
        }
        utterance.onend = () => {
          // Resume ambient sound volume
          if (audioRef.current) {
            audioRef.current.volume = volume
          }
          if (instructionAudioRef.current) {
            instructionAudioRef.current.pause()
            instructionAudioRef.current.src = ""
          }
        }
        utterance.onerror = (event) => {
          console.error("Speech synthesis error:", event.error)
          // Ensure ambient sound volume is reset even on error
          if (audioRef.current) {
            audioRef.current.volume = volume
          }
          if (instructionAudioRef.current) {
            instructionAudioRef.current.pause()
            instructionAudioRef.current.src = ""
          }
        }
        window.speechSynthesis.speak(utterance)
      } else {
        console.warn("Speech synthesis not supported in this browser.")
        // Fallback: play a generic chime or notification sound if available
        // For now, just log
      }
    },
    [volume],
  )

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    timerRef.current = setInterval(() => {
      setCurrentTime((prevTime) => {
        const newTime = prevTime + 1
        // Check for timeline events
        currentMeditation.timeline.forEach((event) => {
          if (event.time === newTime) {
            if (event.type === "sound" && event.soundCueSrc) {
              playSound(event.soundCueSrc, volume)
            } else if (event.type === "instruction" && event.instructionText) {
              playInstruction(event.instructionText)
            }
          }
        })

        // Check for custom instruction
        if (activeTab === "instructions" && instructionText && newTime === customInstructionTime) {
          playInstruction(instructionText)
        }

        if (newTime >= currentMeditation.duration) {
          setIsPlaying(false)
          if (timerRef.current) clearInterval(timerRef.current)
          if (audioRef.current) audioRef.current.pause()
          if (window.speechSynthesis) window.speechSynthesis.cancel()
          return currentMeditation.duration
        }
        return newTime
      })
    }, 1000)
  }, [currentMeditation, volume, playSound, playInstruction, activeTab, instructionText, customInstructionTime])

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false)
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioRef.current) audioRef.current.pause()
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    } else {
      setIsPlaying(true)
      startTimer()
      if (audioRef.current && audioRef.current.src) {
        audioRef.current.play()
      } else if (currentMeditation.ambientSounds.length > 0) {
        playSound(currentMeditation.ambientSounds[0].src, volume)
      }
    }
  }, [isPlaying, startTimer, playSound, currentMeditation, volume])

  const handleReset = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    if (timerRef.current) clearInterval(timerRef.current)
    if (audioRef.current) audioRef.current.pause()
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    if (audioRef.current) audioRef.current.currentTime = 0
  }, [])

  const handleVolumeChange = useCallback((val: number[]) => {
    const newVolume = val[0] / 100
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    setIsMuted(newVolume === 0)
  }, [])

  const handleMuteToggle = useCallback(() => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    if (audioRef.current) {
      audioRef.current.volume = newMutedState ? 0 : volume
    }
  }, [isMuted, volume])

  const handleDurationChange = useCallback((val: number[]) => {
    setCurrentMeditation((prev) => ({ ...prev, duration: val[0] }))
  }, [])

  const handleInstructionTimeChange = useCallback((val: number[]) => {
    setCustomInstructionTime(val[0])
  }, [])

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => {
    // When meditation changes, reset timer and potentially load new ambient sound
    handleReset()
    if (currentMeditation.ambientSounds.length > 0) {
      playSound(currentMeditation.ambientSounds[0].src, volume)
    } else if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
    }
  }, [currentMeditation, handleReset, playSound, volume])

  const handleAddInstruction = useCallback(() => {
    setCurrentMeditation((prev) => ({
      ...prev,
      timeline: [
        ...prev.timeline,
        {
          time: customInstructionTime,
          type: "instruction",
          instructionText: instructionText,
        },
      ].sort((a, b) => a.time - b.time),
    }))
  }, [customInstructionTime, instructionText])

  const handleAddSoundCue = useCallback(
    (sound: SoundCue) => {
      setCurrentMeditation((prev) => ({
        ...prev,
        timeline: [
          ...prev.timeline,
          {
            time: currentTime, // Add at current playback time
            type: "sound",
            soundCueName: sound.name,
            soundCueSrc: sound.src,
          },
        ].sort((a, b) => a.time - b.time),
      }))
    },
    [currentTime],
  )

  const handleRemoveTimelineEvent = useCallback((index: number) => {
    setCurrentMeditation((prev) => {
      const newTimeline = [...prev.timeline]
      newTimeline.splice(index, 1)
      return { ...prev, timeline: newTimeline }
    })
  }, [])

  const handleSelectMeditation = useCallback((meditation: Meditation) => {
    setCurrentMeditation(meditation)
    setShowSidebar(false) // Close sidebar after selection
  }, [])

  // State for mode toggle (Length Adjuster vs Labs)
  const [activeMode, setActiveMode] = useState<"adjuster" | "labs">("adjuster")

  // == States for Length Adjuster ==
  const [file, setFile] = useState<File | null>(null)
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null)
  const [processedBufferState, setProcessedBufferState] = useState<AudioBuffer | null>(null)
  const audioContextRefAdjuster = useRef<AudioContext | null>(null) // Still needed for Adjuster's specific context management
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
  const [memoryWarning, setMemoryWarning] = useState<boolean>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Add these new state variables and ref at the top of the HomePage component, near other state declarations:
  const backgroundAudioRef = useRef<HTMLAudioElement | AudioBufferSourceNode | null>(null) // Can be HTMLAudioElement or AudioBufferSourceNode
  const [currentPlayingBackgroundSoundId, setCurrentPlayingBackgroundSoundId] = useState<string | null>(null)

  // == States for Labs ==
  const [meditationTitle, setMeditationTitleLabs] = useState<string>("My Custom Meditation")
  const [labsTotalDuration, setLabsTotalDuration] = useState<number>(600)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEventType[]>([])
  const [selectedLibraryInstruction, setSelectedLibraryInstruction] = useState<InstructionType | null>(null)
  const [customInstructionTextLabs, setCustomInstructionTextLabs] = useState<string>("")
  const [selectedSoundCue, setSelectedSoundCueLabs] = useState<SoundCueType | null>(null)
  const [isRecording, setIsRecordingLabs] = useState<boolean>(false)
  // State to hold the recorded audio data ready for adding to timeline
  const [readyToAddToTimelineRecording, setReadyToAddToTimelineRecordingLabs] = useState<{
    url: string
    duration: number
    label: string
  } | null>(null)
  const [recordedBlobs, setRecordedBlobsLabs] = useState<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const labsAudioRef = useRef<HTMLAudioElement | null>(null)
  const instructionCategories = Array.from(new Set(INSTRUCTIONS_LIBRARY.map((instr) => instr.category)))
  const [recordingLabel, setRecordingLabelLabs] = useState<string>("")

  // Audio generation states
  const [isGeneratingAudio, setIsGeneratingAudioLabs] = useState<boolean>(false)
  const [generationProgress, setGenerationProgressLabs] = useState<number>(0)
  const [generationStep, setGenerationStepLabs] = useState<string>("")
  const [generatedAudioUrl, setGeneratedAudioUrlLabs] = useState<string | null>(null)

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
  const [currentTabLabs, setCurrentTabLabs] = useState<string>("instructions")
  const [isPlayingLabs, setIsPlayingLabs] = useState<boolean>(false)
  const [currentPlaybackTime, setCurrentPlaybackTimeLabs] = useState<number>(0) // in seconds
  const [activeItemIndex, setActiveItemIndexLabs] = useState<number | null>(null)
  const [volumeLabs, setVolumeLabs] = useState<number>(75) // Default volume 75%
  const audioRefLabs = useRef<HTMLAudioElement | null>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentItemStartTimeRef = useRef<number>(0)

  const totalDuration = timeline.reduce((sum, item) => sum + item.duration, 0)

  const addTimelineItem = useCallback((item: InstructionType | SoundCueType, type: "instruction" | "sound") => {
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
        setActiveItemIndexLabs(null)
      } else if (activeItemIndex !== null && activeItemIndex > index) {
        setActiveItemIndexLabs((prev) => (prev !== null ? prev - 1 : null))
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
            labsAudioRef.current.volume = volumeLabs / 100
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
    [volumeLabs],
  )

  const startPlayback = useCallback(() => {
    if (timeline.length === 0) return

    setIsPlayingLabs(true)
    currentItemStartTimeRef.current = currentPlaybackTime // Store start time of current item

    playbackIntervalRef.current = setInterval(() => {
      setCurrentPlaybackTimeLabs((prevTime) => {
        const newTime = prevTime + 0.1 // Increment by 100ms

        let accumulatedDuration = 0
        let foundActiveItem = false
        for (let i = 0; i < timeline.length; i++) {
          const item = timeline[i]
          if (newTime >= accumulatedDuration && newTime < accumulatedDuration + item.duration) {
            if (activeItemIndex !== i) {
              setActiveItemIndexLabs(i)
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
          setActiveItemIndexLabs(null)
        }

        if (newTime >= totalDuration) {
          // End of timeline
          clearInterval(playbackIntervalRef.current!)
          setIsPlayingLabs(false)
          setCurrentPlaybackTimeLabs(0)
          setActiveItemIndexLabs(null)
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
    setIsPlayingLabs(false)
  }, [])

  const resetPlayback = useCallback(() => {
    pausePlayback()
    setCurrentPlaybackTimeLabs(0)
    setActiveItemIndexLabs(null)
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
    if (audioRefLabs.current) {
      audioRefLabs.current.volume = volumeLabs / 100
    }
  }, [volumeLabs])

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
    setIsGeneratingAudioLabs(true)
    setGenerationProgressLabs(0)
    setGenerationStepLabs("Initializing...")

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
          setGenerationStepLabs(`Adding sound: ${event.soundCueName || "Sound Cue"}`)
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
          setGenerationStepLabs(`Adding recorded voice: ${event.recordedInstructionLabel || "Untitled"}`)
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
        setGenerationProgressLabs(Math.floor((processedEventsCount / totalEvents) * 80)) // Progress up to 80% for event processing
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

      setGenerationStepLabs("Rendering audio...")
      setGenerationProgressLabs(80) // Set to 80% before rendering
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
      setGeneratedAudioUrlLabs(url)

      // Directly assign to the audio element for immediate playback readiness
      if (labsAudioRef.current) {
        labsAudioRef.current.src = url
        labsAudioRef.current.volume = volumeLabs / 100
      }

      setIsGeneratingAudioLabs(false)
      setGenerationProgressLabs(100)
      setGenerationStepLabs("Export Complete")

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
      setIsGeneratingAudioLabs(false)
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
      audioContextRefAdjuster.current = ctx
    } catch (error) {
      setStatus({
        message: `Error initializing audio system: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
    }

    return () => {
      if (audioContextRefAdjuster.current && audioContextRefAdjuster.current.state !== "closed") {
        audioContextRefAdjuster.current
          .close()
          .catch((err) => console.warn("Error closing AudioContext in main useEffect cleanup:", err))
        audioContextRefAdjuster.current = null
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
    if (!audioContextRefAdjuster.current || audioContextRefAdjuster.current.state === "closed") {
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
      const currentAudioContext = audioContextRefAdjuster.current
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
    const currentAudioContext = audioContextRefAdjuster.current
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
      const currentAudioContext = audioContextRefAdjuster.current
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

  const handleFileSelectAction = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) handleFile(selectedFile)
    if (e.target) e.target.value = ""
  }

  const handleDragOverAction = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadAreaRef.current) uploadAreaRef.current.classList.add("border-primary")
  }

  const handleDragLeaveAction = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadAreaRef.current) uploadAreaRef.current.classList.remove("border-primary")
  }

  const handleDropAction = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadAreaRef.current) uploadAreaRef.current.classList.remove("border-primary")
    const files = e.dataTransfer.files
    if (files.length > 0) handleFile(files[0])
  }

  const downloadProcessedAudioAction = async () => {
    if (!processedUrl) {
      setStatus({ message: "No processed audio available to download.", type: "warning" })
      return
    }
    const a = document.createElement("a")
    a.href = processedUrl
    a.download = file ? `processed_${file.name.replace(/\.[^/.]+$/, "")}.wav` : "processed_audio.wav"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  useEffect(() => {
    // This effect no longer resets isProcessingComplete.
    // It's now reset at the start of processAudioAdjusterAction or handleFile.
  }, [targetDuration, silenceThreshold, minSilenceDuration, minSpacingDuration, preserveNaturalPacing])

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (isProcessing) interval = setInterval(monitorMemory, 3000)
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isProcessing])

  // == Effects and Handlers for Labs ==
  useEffect(() => {
    labsAudioRef.current = new Audio()
    labsAudioRef.current.preload = "none"
    labsAudioRef.current.volume = 0.7
    if (labsAudioRef.current) {
      labsAudioRef.current.onerror = (e) => console.warn("Labs Audio error:", e)
    }
    return () => {
      if (labsAudioRef.current) {
        labsAudioRef.current.pause()
        labsAudioRef.current.src = ""
        labsAudioRef.current = null
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  // Helper function to add events to timelineEvents without automatic spacing
  const addEventToTimeline = useCallback((newEvent: TimelineEventType) => {
    setTimelineEvents((prevEvents) => {
      const updatedEvents = [...prevEvents, newEvent]
      // Sort by current startTime to maintain chronological order for display
      // Do NOT re-calculate or re-assign startTimes based on spacing.
      return updatedEvents.sort((a, b) => a.startTime - b.startTime)
    })
  }, [])

  const handleAddInstructionSoundEvent = () => {
    const instructionTextToAdd = customInstructionTextLabs.trim()

    if (!instructionTextToAdd) {
      toast({
        title: "Missing Instruction",
        description: "Please enter an instruction.",
        variant: "destructive",
      })
      return
    }
    if (!selectedSoundCue) {
      toast({ title: "Missing Sound Cue", description: "Please select a sound cue.", variant: "destructive" })
      return
    }

    // Calculate new startTime based on existing events
    const maxExistingTime = timelineEvents.length > 0 ? Math.max(...timelineEvents.map((e) => e.startTime)) : 0
    const newStartTime = timelineEvents.length > 0 ? maxExistingTime + 33 : 0

    const newEvent: TimelineEventType = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type: "instruction_sound",
      startTime: newStartTime,
      instructionText: instructionTextToAdd,
      soundCueId: selectedSoundCue.id,
      soundCueName: selectedSoundCue.name,
      soundCueSrc: selectedSoundCue.src,
    }
    addEventToTimeline(newEvent)
    setCustomInstructionTextLabs("")
    toast({
      title: "Event Added",
      description: `"${instructionTextToAdd.substring(0, 30)}..." with ${selectedSoundCue.name} added.`,
    })
  }

  const startRecording = async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mimeType = MediaRecorder.isTypeSupported("audio/mp4;codecs=aac")
          ? "audio/mp4;codecs=aac"
          : MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : ""

        if (!mimeType) {
          toast({
            title: "Unsupported Audio Format",
            description: "Your browser does not support a compatible audio recording format.",
            variant: "destructive",
          })
          return
        }

        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType })
        const blobs: Blob[] = []

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            blobs.push(event.data)
          }
        }

        mediaRecorderRef.current.onstop = async () => {
          const blob = new Blob(blobs, { type: mimeType })
          const url = URL.createObjectURL(blob)

          // Create a temporary audio element to load metadata and get duration
          const tempAudio = new Audio()
          tempAudio.preload = "metadata"
          tempAudio.src = url

          tempAudio.onloadedmetadata = () => {
            const duration =
              tempAudio.duration && !isNaN(tempAudio.duration) && isFinite(tempAudio.duration) ? tempAudio.duration : 0

            setReadyToAddToTimelineRecordingLabs({
              url,
              duration,
              label: recordingLabel.trim(),
            })
            setRecordedBlobsLabs([blob]) // Keep the blob for potential future use if needed
            URL.revokeObjectURL(url) // Revoke the temporary URL after duration is captured
            toast({ title: "Recording Stopped", description: `Duration: ${formatTime(duration)}` })
          }

          tempAudio.onerror = (e) => {
            console.error("Error loading recorded audio metadata:", e)
            toast({
              title: "Recording Error",
              description: "Could not load recorded audio metadata. Try again.",
              variant: "destructive",
            })
            URL.revokeObjectURL(url)
            setReadyToAddToTimelineRecordingLabs(null)
          }

          // Stop all tracks to release microphone
          if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
          }
        }

        mediaRecorderRef.current.start()
        setIsRecordingLabs(true)
        setReadyToAddToTimelineRecordingLabs(null) // Clear previous recording
        setRecordedBlobsLabs([])
        toast({ title: "Recording Started" })
      } catch (err) {
        toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" })
      }
    } else {
      toast({
        title: "Unsupported",
        description: "Audio recording not supported by your browser.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecordingLabs(false)
    }
  }

  const updateEventStartTime = (eventId: string, newTime: number) => {
    setTimelineEvents((prev) => {
      const updated = prev.map((event) =>
        event.id === eventId ? { ...event, startTime: Math.max(0, Math.min(newTime, labsTotalDuration)) } : event,
      )
      // Simple sort by startTime, with stable sorting for events at the same time
      return updated.sort((a, b) => {
        if (a.startTime === b.startTime) {
          // For events at the same time, maintain their relative order based on original array position
          const aIndex = prev.findIndex((e) => e.id === a.id)
          const bIndex = prev.findIndex((e) => e.id === b.id)
          return aIndex - bIndex
        }
        return a.startTime - b.startTime
      })
    })
  }

  const removeTimelineEvent = (eventId: string) => {
    setTimelineEvents((prev) => prev.filter((event) => event.id !== eventId))
    toast({ title: "Event Removed" })
  }

  // Safe input handlers with validation
  const handleMeditationTitleChangeLabs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target?.value
    if (typeof value === "string") {
      setMeditationTitleLabs(value)
    }
  }

  const handleCustomInstructionChangeLabs = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target?.value
    if (typeof value === "string") {
      setCustomInstructionTextLabs(value)
      setSelectedLibraryInstruction(null)
    }
  }

  const handleRecordingLabelChangeLabs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target?.value
    if (typeof value === "string") {
      setRecordingLabelLabs(value)
    }
  }

  const handleDurationChangeLabs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target?.value
    if (typeof value === "string" && !isNaN(Number(value))) {
      setLabsTotalDuration(Math.max(60, Number(value) * 60) || 60)
    }
  }

  // Add this useCallback function for toggling background sound previews, after other useCallback functions:
  const toggleBackgroundSoundPreview = useCallback(
    async (sound: AmbientSoundType) => {
      const audioEl = backgroundAudioRef.current
      const isSynthetic = sound.src.startsWith("synthetic:")
      const isCurrentlyPlaying = currentPlayingBackgroundSoundId === sound.id && audioEl && !audioEl.paused

      // If this sound is playing, pause it.
      if (isCurrentlyPlaying) {
        if (audioEl instanceof AudioBufferSourceNode) {
          audioEl.stop()
        } else if (audioEl instanceof HTMLAudioElement) {
          audioEl.pause()
        }
        setCurrentPlayingBackgroundSoundId(null)
        toast({ title: "Preview Paused", description: `${sound.name} preview paused.` })
        return
      }

      // Stop any currently playing sound before starting a new one
      if (audioEl) {
        if (audioEl instanceof AudioBufferSourceNode) {
          audioEl.stop()
        } else if (audioEl instanceof HTMLAudioElement) {
          audioEl.pause()
          audioEl.src = "" // Clear src to ensure new sound loads
        }
        backgroundAudioRef.current = null
      }

      try {
        const audioContext = getAudioContext()
        if (audioContext.state === "suspended") {
          await audioContext.resume()
        }

        if (isSynthetic) {
          // For synthetic sounds, generate into a buffer and play via AudioBufferSourceNode
          const tempCtx = new OfflineAudioContext(1, audioContext.sampleRate * 5, audioContext.sampleRate) // 5s buffer for preview
          await generateAmbientSound(sound, tempCtx, 5, sound.volume || 0.5) // Use sound's volume or default
          const renderedBuffer = await tempCtx.startRendering()

          const source = audioContext.createBufferSource()
          source.buffer = renderedBuffer
          source.loop = true
          const gainNode = audioContext.createGain()
          source.connect(gainNode)
          gainNode.connect(audioContext.destination)
          gainNode.gain.value = (sound.volume || 0.5) * masterBackgroundVolume * 0.5 // Apply master volume
          source.start(0)

          backgroundAudioRef.current = source
        } else {
          // For file-based sounds, use HTMLAudioElement
          const audio = new Audio(sound.src)
          audio.loop = true
          audio.volume = (sound.volume || 0.5) * masterBackgroundVolume * 0.5 // Apply master volume
          await audio.play().catch((e) => console.error("Error playing background audio:", e))
          backgroundAudioRef.current = audio
        }

        setCurrentPlayingBackgroundSoundId(sound.id)
        toast({ title: "Playing Preview", description: `Now playing: ${sound.name}` })
      } catch (error) {
        console.error("Failed to play background sound:", error)
        toast({
          title: "Background Sound Error",
          description: `Could not play ${sound.name}. Error: ${error instanceof Error ? error.message : "Unknown"}`,
          variant: "destructive",
        })
        setCurrentPlayingBackgroundSoundId(null)
      }
    },
    [currentPlayingBackgroundSoundId, masterBackgroundVolume],
  )

  const stopBackgroundSound = useCallback(() => {
    if (backgroundAudioRef.current) {
      if (backgroundAudioRef.current instanceof AudioBufferSourceNode) {
        backgroundAudioRef.current.stop()
      } else if (backgroundAudioRef.current instanceof HTMLAudioElement) {
        backgroundAudioRef.current.pause()
        backgroundAudioRef.current.src = "" // Clear src to ensure it stops loading/playing
      }
      backgroundAudioRef.current = null
      setCurrentPlayingBackgroundSoundId(null)
      toast({ title: "Preview Stopped", description: "Background sound preview stopped." })
    }
  }, [])

  // Add this useEffect hook to update background audio volume when masterBackgroundVolume changes:
  useEffect(() => {
    if (backgroundAudioRef.current) {
      // If it's an AudioBufferSourceNode, its gain is set at creation.
      // For HTMLAudioElement, we can update volume directly.
      if (backgroundAudioRef.current instanceof HTMLAudioElement) {
        const currentSound = AMBIENT_SOUNDS_LIBRARY.find((s) => s.id === currentPlayingBackgroundSoundId)
        if (currentSound) {
          backgroundAudioRef.current.volume = (currentSound.volume || 0.5) * masterBackgroundVolume * 0.5
        }
      }
      // For AudioBufferSourceNode, the gain node would need to be exposed or recreated,
      // which is more complex for a simple preview. For now, it's set once.
    }
  }, [masterBackgroundVolume, currentPlayingBackgroundSoundId])

  // Add this useEffect hook for background audio initialization and cleanup, after other useEffects:
  useEffect(() => {
    // Initialize a dummy Audio element for file-based previews
    labsAudioRef.current = new Audio()
    labsAudioRef.current.preload = "none"
    labsAudioRef.current.volume = 0.7
    if (labsAudioRef.current) {
      labsAudioRef.current.onerror = (e) => console.warn("Labs Audio error:", e)
    }

    return () => {
      if (labsAudioRef.current) {
        labsAudioRef.current.pause()
        labsAudioRef.current.src = ""
        labsAudioRef.current = null
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
      stopBackgroundSound() // Ensure background preview is stopped on unmount
    }
  }, [stopBackgroundSound])

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center bg-neutral-50 p-4 text-neutral-800 md:p-8">
      {/* Sidebar Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute left-4 top-4 z-50 md:hidden"
        onClick={() => setShowSidebar(true)}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-lg transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:shadow-none",
          {
            "translate-x-0": showSidebar,
            "-translate-x-full": !showSidebar,
          },
        )}
      >
        <Navigation
          meditations={meditations}
          onSelectMeditation={handleSelectMeditation}
          onClose={() => setShowSidebar(false)}
        />
      </div>

      {/* Main Content */}
      <main className="flex w-full max-w-4xl flex-grow flex-col items-center space-y-8 p-4 md:p-0">
        <h1 className="mb-4 text-4xl font-bold text-logo-teal-700">Abhī Meditation</h1>

        {/* Meditation Display Card */}
        <Card className="w-full max-w-2xl overflow-hidden rounded-lg border-none bg-white shadow-lg">
          <CardHeader className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 p-4 text-white">
            <CardTitle className="flex items-center justify-between text-2xl">
              <span>{currentMeditation.title}</span>
              <Timer className="h-6 w-6" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="mb-4 text-neutral-600">{currentMeditation.description}</p>
            <div className="mb-6 text-center text-5xl font-extrabold text-logo-teal-700">
              {formatTime(currentTime)} / {formatTime(currentMeditation.duration)}
            </div>

            {/* Timeline Display */}
            {currentMeditation.timeline.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-2 text-lg font-semibold text-neutral-700">Timeline Events:</h3>
                <div className="max-h-40 overflow-y-auto rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  {currentMeditation.timeline.map((event, index) => (
                    <div key={index} className="mb-1 flex items-center justify-between text-sm text-neutral-600">
                      <span>
                        {formatTime(event.time)} -{" "}
                        {event.type === "sound"
                          ? `Sound: ${event.soundCueName}`
                          : `Instruction: "${event.instructionText?.substring(0, 30)}..."`}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTimelineEvent(index)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center space-x-4">
              <Button
                size="icon"
                variant="outline"
                onClick={handleReset}
                className="h-12 w-12 rounded-full border-2 border-logo-teal-400 text-logo-teal-600 hover:bg-logo-teal-50 hover:text-logo-teal-700 bg-transparent"
              >
                <RotateCcw className="h-6 w-6" />
                <span className="sr-only">Reset</span>
              </Button>
              <Button
                size="lg"
                className="h-16 w-16 rounded-full bg-logo-teal-500 text-white shadow-lg hover:bg-logo-teal-600"
                onClick={handlePlayPause}
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-8 w-8" />
                    <span className="sr-only">Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="h-8 w-8" />
                    <span className="sr-only">Play</span>
                  </>
                )}
              </Button>
              <div className="flex items-center space-x-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleMuteToggle}
                  className="h-12 w-12 rounded-full border-2 border-logo-teal-400 text-logo-teal-600 hover:bg-logo-teal-50 hover:text-logo-teal-700 bg-transparent"
                >
                  {isMuted || volume === 0 ? (
                    <>
                      <VolumeX className="h-6 w-6" />
                      <span className="sr-only">Unmute</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-6 w-6" />
                      <span className="sr-only">Mute</span>
                    </>
                  )}
                </Button>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[isMuted ? 0 : volume * 100]}
                  onValueChange={handleVolumeChange}
                  className="w-24"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Instructions, Sounds, Timer */}
        <div className="w-full max-w-2xl rounded-lg bg-white p-2 shadow-md">
          <div className="flex justify-around">
            <Button
              variant="ghost"
              className={cn(
                "flex-1 rounded-md py-3 text-lg font-semibold",
                activeTab === "instructions"
                  ? "bg-logo-purple-500 text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100",
              )}
              onClick={() => setActiveTab("instructions")}
            >
              <BookOpenText className="mr-2 h-5 w-5" /> Instructions
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "flex-1 rounded-md py-3 text-lg font-semibold",
                activeTab === "sounds"
                  ? "bg-logo-purple-500 text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100",
              )}
              onClick={() => setActiveTab("sounds")}
            >
              <Music className="mr-2 h-5 w-5" /> Sounds
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "flex-1 rounded-md py-3 text-lg font-semibold",
                activeTab === "timer"
                  ? "bg-logo-purple-500 text-white shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-100",
              )}
              onClick={() => setActiveTab("timer")}
            >
              <Timer className="mr-2 h-5 w-5" /> Timer
            </Button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="w-full max-w-2xl">
          {activeTab === "instructions" && (
            <div className="space-y-4">
              <Label htmlFor="custom-instruction" className="text-lg font-semibold text-neutral-700">
                Enter Your Meditation Instruction
              </Label>
              <Textarea
                id="custom-instruction"
                placeholder="Enter your meditation instruction here... For example: 'Take a deep breath and focus on the sensation of air entering and leaving your nostrils. Allow your mind to settle into this natural rhythm.'"
                value={instructionText}
                onChange={(e) => setInstructionText(e.target.value)}
                rows={6}
                className="min-h-[120px] rounded-lg border border-neutral-300 p-4 text-neutral-700 shadow-sm focus:border-logo-teal-500 focus:ring-0"
              />
              <div className="flex items-center justify-between">
                <Label htmlFor="instruction-time" className="text-neutral-700">
                  Play at: {formatTime(customInstructionTime)}
                </Label>
                <Slider
                  id="instruction-time"
                  min={0}
                  max={currentMeditation.duration}
                  step={1}
                  value={[customInstructionTime]}
                  onValueChange={handleInstructionTimeChange}
                  className="w-48"
                />
                <Button
                  onClick={handleAddInstruction}
                  className="bg-logo-emerald-500 text-white hover:bg-logo-emerald-600"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add to Timeline
                </Button>
              </div>
            </div>
          )}

          {activeTab === "sounds" && (
            <Card className="w-full rounded-lg border-none bg-white shadow-lg">
              <CardHeader className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 p-4 text-white">
                <CardTitle className="flex items-center justify-between text-2xl">
                  <span>Ambient Sounds</span>
                  <Music className="h-6 w-6" />
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 p-6 md:grid-cols-3">
                {currentMeditation.ambientSounds.map((sound) => (
                  <Button
                    key={sound.id}
                    variant="outline"
                    className="flex flex-col items-center justify-center space-y-2 rounded-lg border-2 border-logo-teal-300 p-4 text-logo-teal-700 hover:bg-logo-teal-50 hover:text-logo-teal-800 bg-transparent"
                    onClick={() => playSound(sound.src, volume)}
                  >
                    <Music className="h-8 w-8" />
                    <span className="text-center text-sm font-medium">{sound.name}</span>
                  </Button>
                ))}
                <h3 className="col-span-full text-lg font-semibold text-neutral-700">Sound Cues:</h3>
                {currentMeditation.soundCues?.map((sound) => (
                  <Button
                    key={sound.id}
                    variant="outline"
                    className="flex flex-col items-center justify-center space-y-2 rounded-lg border-2 border-logo-emerald-300 p-4 text-logo-emerald-700 hover:bg-logo-emerald-50 hover:text-logo-emerald-800 bg-transparent"
                    onClick={() => handleAddSoundCue(sound)}
                  >
                    <Plus className="h-8 w-8" />
                    <span className="text-center text-sm font-medium">{sound.name}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "timer" && (
            <Card className="w-full rounded-lg border-none bg-white shadow-lg">
              <CardHeader className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 p-4 text-white">
                <CardTitle className="flex items-center justify-between text-2xl">
                  <span>Meditation Timer</span>
                  <Timer className="h-6 w-6" />
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-between">
                  <Label htmlFor="meditation-duration" className="text-lg font-semibold text-neutral-700">
                    Set Duration: {formatTime(currentMeditation.duration)}
                  </Label>
                  <Slider
                    id="meditation-duration"
                    min={60}
                    max={3600} // Max 60 minutes
                    step={10}
                    value={[currentMeditation.duration]}
                    onValueChange={handleDurationChange}
                    className="w-48"
                  />
                </div>
                <p className="text-sm text-neutral-600">Adjust the total duration of your meditation.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 w-full max-w-2xl text-center text-sm text-neutral-500">
          <p>
            Built with <Heart className="inline h-4 w-4 text-red-500" /> by{" "}
            <a
              href="https://vercel.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-logo-teal-600 hover:underline"
            >
              Vercel
            </a>{" "}
            and{" "}
            <a
              href="https://github.com/your-github"
              target="_blank"
              rel="noopener noreferrer"
              className="text-logo-teal-600 hover:underline"
            >
              Abhī
            </a>
            .
          </p>
          <p className="mt-2">
            <a href="/contact" className="text-neutral-600 hover:underline">
              Contact
            </a>{" "}
            |{" "}
            <a href="/donate" className="text-neutral-600 hover:underline">
              Donate
            </a>{" "}
            |{" "}
            <a href="/encoder" className="text-neutral-600 hover:underline">
              Encoder
            </a>
          </p>
        </footer>
      </main>
    </div>
  )
}
