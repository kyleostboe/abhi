"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { Info, Volume2, Clock, Wand2, Download, AlertTriangle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { Navigation } from "@/components/navigation"
import { toast } from "@/components/ui/use-toast"
import { INSTRUCTIONS_LIBRARY, SOUND_CUES_LIBRARY, generateSyntheticSound } from "@/lib/meditation-data"
import { cn, formatTime, formatFileSize } from "@/lib/utils"
import { getAudioContext } from "@/lib/audio-utils" // Import from audio-utils
import type { Instruction, SoundCue, TimelineEvent } from "@/lib/types" // Import types
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

  const handleExportAudio = async () => {}

  // Define the missing functions
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const droppedFile = event.dataTransfer.files[0]
      setFile(droppedFile)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const selectedFile = event.target.files[0]
      setFile(selectedFile)
    }
  }

  const processAudio = async () => {
    // Placeholder function
  }

  const downloadProcessedAudio = async () => {
    // Placeholder function
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />

      {memoryWarning && activeMode === "adjuster" && (
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
          <div className="relative text-center px-[69px]">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1
                className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal dark:from-logo-amber dark:via-logo-rose dark:via-logo-purple dark:to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 tracking-tighter text-center mt-16"
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
              <div className="flex justify-center items-center space-y-4 flex-row my-[33px] mb-6">
                <div className="grid mx-auto grid-cols-2 bg-gray-100/70 p-1 dark:bg-gray-800/70 font-serif text-gray-600 w-64 h-auto shadow-inner rounded-md">
                  <button
                    onClick={() => setActiveMode("adjuster")}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-black text-sm py-3 tracking-tight",
                      activeMode === "adjuster"
                        ? "bg-white text-gray-600 shadow-sm dark:shadow-white/20 dark:bg-gray-700 dark:text-gray-600"
                        : "text-gray-600 dark:text-gray-600",
                    )}
                  >
                    Adjuster
                  </button>
                  <button
                    onClick={() => setActiveMode("labs")}
                    className={cn(
                      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-3 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-black text-sm text-gray-600 tracking-tight",
                      activeMode === "labs"
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
            {/* Mode Description Notes */}
            <AnimatePresence mode="wait">
              {activeMode === "adjuster" && (
                <motion.div
                  key="adjuster-note"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 mb-6 border border-gray-600 rounded-md text-gray-600 font-serif font-black text-sm dark:border-gray-700 dark:text-gray-300 max-w-2xl mx-auto shadow-inner"
                >
                  <p className="text-center">
                    The <strong className="text-gray-700 dark:text-gray-200">Adjuster</strong> can change the duration
                    of guided meditations by intelligently adjusting silence periods. Upload an audio file, set your
                    target duration, and this tool will re-space content to fit your schedule.
                  </p>
                </motion.div>
              )}
              {activeMode === "labs" && (
                <motion.div
                  key="encoder-note"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 mb-6 border border-gray-600 rounded-md text-gray-600 font-serif font-black text-sm dark:border-gray-700 dark:text-gray-300 max-w-2xl mx-auto text-center shadow-inner"
                >
                  <p>
                    The <strong className="text-gray-700 dark:text-gray-200">Encoder</strong> lets you create custom
                    meditations by associating instructions with sound cues and placing them along a timeline. This tool
                    aims to help bridge the gap between guided and self-directed meditation.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
            {/* Conditional Rendering based on activeMode */}
            {activeMode === "adjuster" ? (
              // == Length Adjuster UI ==
              <>
                {/* Note and Resources sections - moved to proper position */}
                <div className="space-y-4 mb-[27px]">
                  <div className="p-4 max-w-2xl dark:border-logo-rose-700 border-solid border text-center border-logo-rose-600 mx-auto rounded-md shadow-inner">
                    <p className="text-logo-rose-600 leading-relaxed dark:text-logo-rose-300 font-serif font-black text-xs">
                      <strong className="pr-1.5 font-black font-serif text-center text-sm text-logo-amber-600">
                        Note:
                      </strong>
                      This tool is designed to help you adjust the length of existing guided meditations to fit your
                      schedules. Teachers, please feel free to
                      <a
                        href="/contact"
                        className="hover:text-logo-rose-600 underline px-1 rounded transition-colors transition-shadow dark:hover:text-logo-rose-300 font-black text-sm text-logo-purple-300"
                      >
                        contact me
                      </a>
                      to opt out. Depending on the audio, users may need to tweak the advanced settings for optimal
                      results. Any guided meditation, talk, podcast, or audiobook (under
                      {isMobileDevice ? "50MB" : "500MB"}) should be compatible. Enjoy:)
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border-logo-rose-300 max-w-2xl mx-auto dark:border-logo-rose-700 backdrop-blur-sm dark:bg-gray-900/60 border-0 py-4 px-0 bg-transparent pt-0 pb-3">
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
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="p-10 md:p-16 text-center md:py-14 border-2 rounded-2xl border-dashed border-gray-600">
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="dark:text-gray-200 font-serif mb-2.5 font-black text-base text-gray-600">
                        Drop your audio file here or click to browse
                      </div>
                      <div className="dark:text-gray-400/70 text-stone-400 font-serif text-xs">
                        Supports MP3, WAV, OGG, and M4A files (Max: {isMobileDevice ? "50MB" : "500MB"})
                      </div>
                    </motion.div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".mp3,.wav,.ogg,.m4a,audio/*"
                    onChange={handleFileSelect}
                  />
                </motion.div>

                <AnimatePresence>
                  {file && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="bg-white p-5 mb-6 border dark:shadow-white/20 overflow-hidden dark:bg-gray-900 dark:border-gray-800 rounded-xl shadow-inner border-gray-600"
                    >
                      <div className="flex items-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 }}
                          className="p-2 rounded-lg mr-4 dark:bg-gray-800 bg-transparent"
                        >
                          <Volume2 className="h-5 w-5 dark:text-gray-300 text-gray-600" />
                        </motion.div>
                        <div>
                          <motion.div
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mb-1 dark:text-gray-200 font-black text-sm text-gray-600"
                          >
                            {file.name}
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="dark:text-gray-400/70 font-black text-xs text-gray-500"
                          >
                            Size: {formatFileSize(file.size)}
                            {" • Type: "}
                            {file.type || "Unknown"}
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6"
                    >
                      <Card className="p-6 bg-gradient-to-r from-logo-rose-50 to-logo-purple-50 border-logo-rose-200 shadow-sm dark:shadow-white/10 dark:from-logo-rose-950 dark:to-logo-purple-950">
                        <div className="text-center mb-4">
                          <h3 className="text-lg font-medium text-logo-rose-700 dark:text-logo-rose-300 mb-2">
                            Processing Audio
                          </h3>
                          <p className="text-sm text-logo-rose-600 dark:text-logo-rose-400">{processingStep}</p>
                        </div>
                        <div className="w-full bg-logo-rose-200 rounded-full h-2 mb-2 dark:bg-logo-rose-800">
                          <div
                            className="bg-gradient-to-r from-logo-rose-500 to-logo-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${processingProgress}%` }}
                          ></div>
                        </div>
                        <div className="text-center text-sm text-logo-rose-600 dark:text-logo-rose-400">
                          {processingProgress}% complete
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {audioAnalysis && durationLimits && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: 0.1 }}
                      className="mb-10 mt-8"
                    >
                      <Alert className="bg-white dark:bg-gray-900 shadow-lg dark:shadow-white/10 p-1 border border-indigo-400 shadow-inner">
                        <div className="p-4">
                          <div className="flex items-center mb-4">
                            <div className="p-2 rounded-lg mr-3 dark:bg-gray-700 bg-transparent">
                              <Info className="h-4 w-4 dark:text-gray-300 text-indigo-400" />
                            </div>
                            <div className="text-lg dark:text-gray-200 font-black text-indigo-400">Audio Analysis</div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-3 text-center dark:bg-gray-900 dark:shadow-white/10 border rounded-md shadow-md border-indigo-400">
                              <div className="text-xs uppercase tracking-wide mb-1 dark:text-gray-400 text-indigo-400">
                                Content
                              </div>
                              <div className="dark:text-black font-black text-indigo-400">
                                {formatTime(audioAnalysis.contentDuration)}
                              </div>
                            </div>
                            <div className="bg-white p-3 text-center dark:bg-gray-900 dark:shadow-white/10 border rounded-md shadow-md border-indigo-400">
                              <div className="text-xs uppercase tracking-wide mb-1 dark:text-gray-400 text-indigo-400">
                                Silence
                              </div>
                              <div className="dark:text-gray-200 font-black rounded-xl text-indigo-400">
                                {formatTime(audioAnalysis.totalSilence)}
                              </div>
                            </div>
                            <div className="bg-white p-3 text-center dark:bg-gray-900 dark:shadow-white/10 border rounded-md shadow-md border-indigo-400">
                              <div className="text-xs uppercase tracking-wide mb-1 dark:text-gray-400 text-indigo-400">
                                Pauses
                              </div>
                              <div className="dark:text-gray-200 font-black text-indigo-400">
                                {audioAnalysis.silenceRegions}
                              </div>
                            </div>
                            <div className="bg-white p-3 text-center dark:bg-gray-900 dark:shadow-white/10 border rounded-md shadow-md border-indigo-400">
                              <div className="text-xs uppercase tracking-wide mb-1 dark:text-gray-400 text-indigo-400">
                                Range
                              </div>
                              <div className="text-xs uppercase tracking-wide mb-1 dark:text-gray-400 text-indigo-400">
                                {durationLimits.min} min to {isMobileDevice ? "1 hour" : "2 hours"}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-8"
                >
                  <Tabs defaultValue="basic" className="w-full font-serif font-black">
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100/70 p-1 rounded-md dark:bg-gray-800/70">
                      <TabsTrigger
                        value="basic"
                        className="data-[state=active]:bg-white data-[state=active]:text-logo-teal-700 data-[state=active]:shadow-sm dark:data-[state=active]:shadow-white/20 rounded-sm dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-logo-teal-300 dark:text-gray-300"
                      >
                        Basic Settings
                      </TabsTrigger>
                      <TabsTrigger
                        value="advanced"
                        className="data-[state=active]:bg-white data-[state=active]:text-logo-teal-700 data-[state=active]:shadow-sm dark:data-[state=active]:shadow-white/20 rounded-sm dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-logo-teal-300 dark:text-gray-300"
                      >
                        Advanced Settings
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="mt-0 space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
                          <div className="bg-gradient-to-r from-logo-teal-500 to-indigo-500 py-3 px-6 dark:from-logo-teal-700 dark:to-indigo-700">
                            <h3 className="text-white flex items-center font-black">
                              <Clock className="h-4 w-4 mr-2" />
                              Target Duration
                            </h3>
                          </div>
                          <div className="p-6">
                            <div className="mb-4">
                              <Slider
                                value={[targetDuration]}
                                min={durationLimits?.min || 5}
                                max={durationLimits?.max || (isMobileDevice ? 60 : 120)}
                                step={1}
                                onValueChange={(value) => setTargetDuration(value[0])}
                                disabled={!durationLimits}
                                className="py-4"
                                rangeClassName="bg-gradient-to-r from-logo-teal-500 to-indigo-500 dark:from-logo-teal-700 dark:to-indigo-700"
                              />
                            </div>
                            <div className="text-center font-serif font-black">
                              <span className="dark:text-logo-amber-300 text-2xl font-black text-logo-teal-600">
                                {targetDuration}
                              </span>
                              <span className="text-lg ml-1 dark:text-logo-amber-400 text-logo-teal">minutes</span>
                            </div>
                            {durationLimits && (
                              <div className="text-center text-xs mt-2 dark:text-logo-amber-400/70 text-logo-teal">
                                Range: {durationLimits.min} min to {isMobileDevice ? "1 hour" : "2 hours"}
                              </div>
                            )}
                          </div>
                        </Card>
                        <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
                          <div className="bg-gradient-to-r from-indigo-500 to-logo-amber-500 py-3 px-6 dark:from-indigo-700 dark:to-logo-amber-700">
                            <h3 className="text-white flex items-center font-black">
                              <Volume2 className="h-4 w-4 mr-2" />
                              Silence Threshold
                            </h3>
                          </div>
                          <div className="p-6">
                            <div className="mb-4">
                              <Slider
                                value={[silenceThreshold]}
                                min={0.001}
                                max={0.05}
                                step={0.001}
                                onValueChange={(value) => setSilenceThreshold(value[0])}
                                className="py-4"
                                rangeClassName="bg-gradient-to-r from-indigo-500 to-logo-amber-500 dark:from-indigo-700 dark:to-logo-amber-700"
                              />
                            </div>
                            <div className="text-center">
                              <span className="text-indigo-700 dark:text-indigo-300 font-serif font-black text-2xl">
                                {silenceThreshold.toFixed(3)}
                              </span>
                            </div>
                            <div className="text-center text-indigo-500/70 dark:text-indigo-400/70 font-black font-serif mt-0 text-sm">
                              Lower = more sensitive
                            </div>
                          </div>
                        </Card>
                      </div>
                    </TabsContent>
                    <TabsContent value="advanced" className="mt-0 space-y-6">
                      <div className="grid md:grid-cols-2 gap-6 font-serif font-black">
                        <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
                          <div className="bg-gradient-to-r from-logo-amber-500 to-logo-rose-500 py-3 px-6 dark:from-logo-amber-700 dark:to-logo-rose-700">
                            <h3 className="text-white font-black">Min Silence Duration</h3>
                          </div>
                          <div className="p-6 font-serif font-black">
                            <div className="mb-4">
                              <Slider
                                value={[minSilenceDuration]}
                                min={1}
                                max={15}
                                step={0.5}
                                onValueChange={(value) => setMinSilenceDuration(value[0])}
                                className="py-4"
                                rangeClassName="bg-gradient-to-r from-logo-amber-500 to-logo-rose-500 dark:from-logo-amber-700 dark:to-logo-rose-700"
                              />
                            </div>
                            <div className="text-center">
                              <span className="dark:text-logo-amber-300 text-2xl font-black text-logo-rose-600">
                                {minSilenceDuration}
                              </span>
                              <span className="text-lg ml-1 dark:text-logo-rose-400 text-logo-rose-500">seconds</span>
                            </div>
                            <div className="text-center text-logo-amber-500/70 mt-2 dark:text-logo-amber-400/70 text-sm">
                              Shorter = detect more pauses
                            </div>
                          </div>
                        </Card>
                        <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
                          <div className="bg-gradient-to-r from-logo-purple-500 to-logo-teal-500 py-3 px-6 dark:from-logo-purple-700 dark:to-logo-teal-700">
                            <h3 className="text-white font-black">Min Spacing Between Content</h3>
                          </div>
                          <div className="p-6">
                            <div className="mb-4">
                              <Slider
                                value={[minSpacingDuration]}
                                min={0.0}
                                max={5}
                                step={0.1}
                                onValueChange={(value) => setMinSpacingDuration(value[0])}
                                className="py-4"
                                rangeClassName="bg-gradient-to-r from-logo-purple-500 to-logo-teal-500 dark:from-logo-purple-700 dark:to-logo-teal-700"
                              />
                            </div>
                            <div className="text-center">
                              <span className="dark:text-logo-purple-300 font-black text-2xl text-logo-teal-600">
                                {minSpacingDuration.toFixed(1)}
                              </span>
                              <span className="text-lg ml-1 dark:text-logo-teal-400 text-logo-teal">seconds</span>
                            </div>
                            <div className="text-center text-logo-purple-500/70 mt-2 dark:text-logo-purple-400/70 text-sm">
                              Minimum pause between speaking parts
                            </div>
                          </div>
                        </Card>
                        <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
                          <div className="bg-gradient-to-r from-logo-rose-500 to-logo-purple-500 py-3 px-6 dark:from-logo-rose-700 dark:to-logo-purple-700">
                            <h3 className="text-white font-black">Preserve Natural Pacing</h3>
                          </div>
                          <div className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm mb-1 dark:text-logo-rose-300 text-logo-rose-500">
                                  Maintain the relative length of pauses
                                </p>
                              </div>
                              <Switch
                                checked={preserveNaturalPacing}
                                onCheckedChange={setPreserveNaturalPacing}
                                className="data-[state=checked]:bg-logo-rose-500 dark:data-[state=checked]:bg-logo-rose-700"
                              />
                            </div>
                          </div>
                        </Card>
                        <Card className="overflow-hidden border-none shadow-lg dark:shadow-white/20 bg-white dark:bg-gray-900">
                          <div className="bg-gradient-to-r from-logo-teal-500 to-logo-amber-500 py-3 px-6 dark:from-logo-teal-700 dark:to-logo-amber-700">
                            <h3 className="text-white font-black">Compatibility Mode</h3>
                          </div>
                          <div className="p-6">
                            <Select value={compatibilityMode} onValueChange={(value) => setCompatibilityMode(value)}>
                              <SelectTrigger className="w-full mb-2 border-logo-teal-200 focus:ring-logo-teal-500 dark:border-logo-teal-700 dark:bg-gray-800 dark:text-gray-200">
                                <SelectValue placeholder="Select compatibility mode" />
                              </SelectTrigger>
                              <SelectContent className="dark:bg-gray-800 dark:text-gray-200">
                                <SelectItem value="standard">Standard Quality (Original SR)</SelectItem>
                                <SelectItem value="high">
                                  High Compatibility (44.1kHz or 22.05kHz for Mobile Long Audio)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="text-xs dark:text-logo-teal-400/70 mt-3.5 text-gray-500">
                              High Compatibility for better playback on mobile/AirPods. May reduce sample rate for long
                              audio on mobile.
                            </div>
                          </div>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-4 text-center font-serif font-black text-base"
                >
                  <Button
                    className={cn(
                      "w-full py-7 text-lg font-medium tracking-wider rounded-xl transition-all",
                      "shadow-lg dark:shadow-white/20 hover:shadow-none active:shadow-none",
                      "bg-gradient-to-r from-logo-teal-500 to-logo-purple-500 text-white dark:from-logo-teal-700 dark:to-logo-purple-700",
                    )}
                    disabled={!originalBuffer || isProcessing || !durationLimits}
                    onClick={processAudio}
                  >
                    <div className="flex items-center justify-center">
                      <Wand2 className="mr-2 h-6 w-6" />
                      <span className="font-black">Process Audio</span>
                    </div>
                  </Button>
                </motion.div>

                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-4 text-center"
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.reload()}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-black"
                      aria-label="Cancel processing and reload page"
                    >
                      Cancel
                    </Button>
                  </motion.div>
                )}

                <AnimatePresence>
                  {status && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className={`p-4 rounded-xl mb-8 text-center dark:shadow-white/10 overflow-hidden bg-white dark:bg-gray-900 shadow-none border border-indigo-400 ${status.type === "info" ? "text-logo-teal-700 dark:text-logo-teal-300" : status.type === "success" ? "text-logo-emerald-700 dark:text-logo-emerald-300" : "text-red-700 dark:text-red-300"}`}
                    >
                      <motion.div
                        className="text-sm text-indigo-400"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {status.message}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-6">
                  {originalUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Card className="overflow-hidden border-none shadow-xl dark:shadow-white/25 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                        <div className="bg-gradient-to-r from-gray-700 to-gray-800 py-3 px-6 dark:from-gray-800 dark:to-gray-900">
                          <h3 className="text-white font-black">Original Audio</h3>
                        </div>
                        <div className="p-6">
                          <div className="bg-white rounded-lg p-3 shadow-sm dark:shadow-white/10 mb-4 dark:bg-gray-700">
                            <audio controls className="w-full" src={originalUrl}></audio>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60 shadow-lg">
                              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 dark:text-gray-400">
                                Duration
                              </div>
                              <div className="dark:text-black font-black text-black">
                                {originalBuffer ? formatTime(originalBuffer.duration) : "--"}
                              </div>
                            </div>
                            <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60 shadow-lg">
                              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 dark:text-gray-400">
                                File Size
                              </div>
                              <div className="dark:text-gray-200 font-black text-black">
                                {formatFileSize(file?.size || 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                  {processedUrl && processedBufferState && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <Card className="overflow-hidden border-none shadow-xl dark:shadow-white/25 bg-gradient-to-br from-logo-teal-50 to-logo-emerald-50 dark:from-logo-teal-950 dark:to-logo-emerald-950">
                        <div className="bg-gradient-to-r from-logo-teal-600 to-logo-emerald-600 py-3 px-6 dark:from-logo-teal-700 dark:to-logo-emerald-700">
                          <h3 className="text-white font-black">Processed Audio</h3>
                        </div>
                        <div className="p-6">
                          <div className="bg-white rounded-lg p-3 shadow-sm dark:shadow-white/10 mb-4 dark:bg-gray-700">
                            <audio controls className="w-full" src={processedUrl}></audio>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60 shadow-lg">
                              <div className="text-xs text-logo-teal-500 uppercase tracking-wide mb-1 dark:text-logo-teal-400">
                                Duration
                              </div>
                              <div className="dark:text-black font-black text-black">
                                {formatTime(actualDuration || 0)}
                                {actualDuration && targetDuration && (
                                  <div className="text-xs text-logo-teal-600 mt-1 dark:text-gray-900">
                                    {((actualDuration / (targetDuration * 60)) * 100).toFixed(1)}% of target
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60 shadow-lg">
                              <div className="text-xs text-logo-teal-500 uppercase tracking-wide mb-1 dark:text-logo-teal-400">
                                Pauses Adjusted
                              </div>
                              <div className="dark:text-logo-teal-200 font-black text-black">{pausesAdjusted}</div>
                            </div>
                          </div>
                          <Button
                            className="w-full py-4 rounded-xl shadow-md dark:shadow-white/20 bg-gradient-to-r from-logo-teal-600 to-logo-emerald-600 hover:from-logo-teal-700 hover:to-logo-emerald-700 transition-all border-none dark:from-logo-teal-700 dark:to-logo-emerald-700 dark:hover:from-logo-teal-800 dark:hover:to-logo-emerald-800"
                            onClick={downloadProcessedAudio}
                          >
                            <div className="flex items-center justify-center font-black">
                              <Download className="mr-2 h-5 w-5" />
                              Download Audio
                            </div>
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
