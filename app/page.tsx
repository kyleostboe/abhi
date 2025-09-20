"use client"

import type React from "react"
import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, StopCircle, PlusCircle } from "lucide-react" // Import Copy icon
import { motion, AnimatePresence } from "framer-motion"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { cn, formatTime } from "@/lib/utils"
import type { Instruction, SoundCue, TimelineEvent } from "@/lib/types" // Import types
import { useMobile } from "@/hooks/use-mobile" // Import useMobile hook
import { EVENT_COLORS } from "@/lib/constants" // Import EVENT_COLORS
import { Navigation, Alert, AlertTriangle, AlertTitle, AlertDescription } from "@/components"
import { getAudioContext, sleep } from "@/lib/utils"

interface RecorderSectionProps {
  className?: string
  inputId: string
  recordingLabel: string
  onRecordingLabelChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isRecording: boolean
  startRecording: () => void | Promise<void>
  stopRecording: () => void
  readyToAddToTimelineRecording: { url: string; label: string; duration: number } | null
  timelineEvents: TimelineEvent[]
  addEventToTimeline: (event: TimelineEvent) => void
  setReadyToAddToTimelineRecording: React.Dispatch<
    React.SetStateAction<{ url: string; label: string; duration: number } | null>
  >
  setRecordedBlobs: React.Dispatch<React.SetStateAction<Blob[]>>
  setRecordingLabel: React.Dispatch<React.SetStateAction<string>>
  recordingPreviewRef: React.RefObject<HTMLAudioElement>
}

const RecorderSection: React.FC<RecorderSectionProps> = ({
  className,
  inputId,
  recordingLabel,
  onRecordingLabelChange,
  isRecording,
  startRecording,
  stopRecording,
  readyToAddToTimelineRecording,
  timelineEvents,
  addEventToTimeline,
  setReadyToAddToTimelineRecording,
  setRecordedBlobs,
  setRecordingLabel,
  recordingPreviewRef,
}) => {
  const { toast } = useToast() // toast is now correctly initialized here

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={className}
    >
      <Card className="overflow-hidden border-none shadow-lg bg-white ">
        <div className="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500 py-3 px-6 text-center">
          <h3 className="text-white flex items-center font-serif font-black">
            <Mic className="h-4 w-4 mr-2" />
            Recorder
          </h3>
        </div>
        <div className="p-6 space-y-4 pt-3.5">
          <Input
            id={inputId}
            value={recordingLabel}
            onChange={onRecordingLabelChange}
            placeholder="Describe this recording..."
            className="mt-1 text-sm font-black border-gray-500 focus-visible:border-gray-600 text-gray-500 shadow-md placeholder-gray-500"
          />
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            disabled={!recordingLabel.trim() && !isRecording}
            className={cn(
              "w-full bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500 shadow-md text-white rounded-sm hover:shadow-none font-serif font-black",
              isRecording && "from-logo-rose-300 to-logo-rose-600",
            )}
          >
            {isRecording ? (
              <>
                <StopCircle className="mr-2 h-4 w-4" />
                <span className="font-black font-serif">Stop Recording</span>
              </>
            ) : (
              <>
                <Mic className="mr-2 h-4 w-4" />
                <span className="font-black font-serif">Start Recording</span>
              </>
            )}
          </Button>
          <AnimatePresence>
            {readyToAddToTimelineRecording && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 border-gray-100 border-t-0 pt-1"
              >
                <div className="space-y-2">
                  <audio
                    key={readyToAddToTimelineRecording.url}
                    ref={recordingPreviewRef}
                    controls
                    src={readyToAddToTimelineRecording.url}
                    className="w-full"
                    preload="metadata"
                  />
                  <p className="text-xs text-gray-600 text-center pb-1.5">
                    Duration: {formatTime(readyToAddToTimelineRecording.duration)}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    if (!readyToAddToTimelineRecording?.label.trim()) {
                      toast({
                        title: "Missing Label",
                        description: "Please provide a label for the recording.",
                        variant: "destructive",
                      })
                      return
                    }

                    const maxExistingTime =
                      timelineEvents.length > 0 ? Math.max(...timelineEvents.map((e) => e.startTime)) : 0
                    const newStartTime = timelineEvents.length > 0 ? maxExistingTime + 10 : 0

                    const newEvent: TimelineEvent = {
                      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                      type: "recorded_voice",
                      startTime: newStartTime,
                      recordedAudioUrl: readyToAddToTimelineRecording.url,
                      recordedInstructionLabel: readyToAddToTimelineRecording.label.trim(),
                      duration: readyToAddToTimelineRecording.duration,
                      color: EVENT_COLORS[timelineEvents.length % EVENT_COLORS.length],
                    }

                    addEventToTimeline(newEvent)

                    setReadyToAddToTimelineRecording(null)
                    setRecordedBlobs([])
                    setRecordingLabel("")

                    toast({
                      title: "Recording Added",
                      description: `"${readyToAddToTimelineRecording.label.trim()}" added to timeline.`,
                    })
                  }}
                  className="w-full bg-gradient-to-r from-logo-blue-400 to-logo-emerald-500 shadow-md text-white rounded-sm hover:shadow-none font-black"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add to Timeline
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  )
}

interface TimelineItem {
  id: string
  type: "instruction" | "sound"
  duration: number // in seconds
  content: Instruction | SoundCue
}

const INSTRUCTIONS_LIBRARY = [
  // Metta (Loving Kindness) Instructions
  {
    id: "metta-1",
    text: "May I/you/we be safe",
    category: "Metta",
  },
  {
    id: "metta-2",
    text: "May I/you/we be filled with happiness",
    category: "Metta",
  },
  {
    id: "metta-3",
    text: "May I/you/we be peaceful",
    category: "Metta",
  },
  {
    id: "metta-4",
    text: "May I/you/we live with ease and kindness",
    category: "Metta",
  },
  {
    id: "metta-5",
    text: "May I/you/we be healthy",
    category: "Metta",
  },
  {
    id: "metta-6",
    text: "May I/you/we be strong",
    category: "Metta",
  },
  {
    id: "metta-7",
    text: "May I/you/we be free from suffering",
    category: "Metta",
  },
  {
    id: "metta-8",
    text: "May I/you/we be filled with loving kindness",
    category: "Metta",
  },
  {
    id: "metta-9",
    text: "May I/you/we accept myself/yourself/ourselves as I am/you are/we are",
    category: "Metta",
  },
  {
    id: "metta-10",
    text: "May I/you/we forgive myself/yourself/ourselves",
    category: "Metta",
  },
  // Mindfulness Instructions
  {
    id: "mindfulness-1",
    text: "Breathing in, I know I am breathing in",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-2",
    text: "Breathing out, I know I am breathing out",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-3",
    text: "Long breath, I know it is long",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-4",
    text: "Short breath, I know it is short",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-5",
    text: "Breathing in, I calm my body",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-6",
    text: "I am aware of my whole body",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-7",
    text: "I release tension from my body",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-8",
    text: "Thinking, thinking",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-9",
    text: "Feeling this emotion",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-10",
    text: "Hearing sounds",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-11",
    text: "Seeing what appears",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-12",
    text: "Noticing bodily sensations",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-13",
    text: "This too shall pass",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-14",
    text: "Watching thoughts arise",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-15",
    text: "Watching thoughts pass away",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-16",
    text: "Resting in spacious awareness",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-17",
    text: "Here, now, this moment",
    category: "Mindfulness",
  },
  // Nonduality Instructions
  {
    id: "nonduality-1",
    text: "Who is aware of this awareness?",
    category: "Nonduality",
  },
  {
    id: "nonduality-2",
    text: "Tat tvam asi - Thou art That",
    category: "Nonduality",
  },
  {
    id: "nonduality-3",
    text: "All is Consciousness appearing as the many",
    category: "Nonduality",
  },
  {
    id: "nonduality-4",
    text: "The seer, seeing, and seen are one",
    category: "Nonduality",
  },
  {
    id: "nonduality-5",
    text: "Pure being-consciousness-bliss (sat-chit-ananda)",
    category: "Nonduality",
  },
  {
    id: "nonduality-6",
    text: "I am Shiva - pure consciousness at rest",
    category: "Nonduality",
  },
  {
    id: "nonduality-7",
    text: "I am Shakti - consciousness in movement",
    category: "Nonduality",
  },
  {
    id: "nonduality-8",
    text: "Everything arises within me as me",
    category: "Nonduality",
  },
  {
    id: "nonduality-9",
    text: "No coming, no going - only being",
    category: "Nonduality",
  },
  {
    id: "nonduality-10",
    text: "The heart is the supreme abode",
    category: "Nonduality",
  },
  {
    id: "nonduality-11",
    text: "Recognizing what I already am",
    category: "Nonduality",
  },
  {
    id: "nonduality-12",
    text: 'Resting as the source of the "I" thought',
    category: "Nonduality",
  },
  // Body Scan Instructions
  {
    id: "body-scan-1",
    text: "Awareness at the crown of my head",
    category: "Body Scan",
  },
  {
    id: "body-scan-2",
    text: "Softening my forehead",
    category: "Body Scan",
  },
  {
    id: "body-scan-3",
    text: "Relaxing around my eyes",
    category: "Body Scan",
  },
  {
    id: "body-scan-4",
    text: "Unclenching my jaw",
    category: "Body Scan",
  },
  {
    id: "body-scan-5",
    text: "Releasing tension from my neck",
    category: "Body Scan",
  },
  {
    id: "body-scan-6",
    text: "Dropping my shoulders",
    category: "Body Scan",
  },
  {
    id: "body-scan-7",
    text: "Arms heavy and relaxed",
    category: "Body Scan",
  },
  {
    id: "body-scan-8",
    text: "Hands soft and open",
    category: "Body Scan",
  },
  {
    id: "body-scan-9",
    text: "Heart space open and free",
    category: "Body Scan",
  },
  {
    id: "body-scan-10",
    text: "Belly soft and natural",
    category: "Body Scan",
  },
  {
    id: "body-scan-11",
    text: "Spine long and supported",
    category: "Body Scan",
  },
  {
    id: "body-scan-12",
    text: "Hips heavy and grounded",
    category: "Body Scan",
  },
  {
    id: "body-scan-13",
    text: "Legs relaxed and still",
    category: "Body Scan",
  },
  {
    id: "body-scan-14",
    text: "Feet connected to earth",
    category: "Body Scan",
  },
  {
    id: "body-scan-15",
    text: "Whole body at peace",
    category: "Body Scan",
  },
  // Concentration Instructions
  {
    id: "concentration-1",
    text: "One breath, complete attention",
    category: "Concentration",
  },
  {
    id: "concentration-2",
    text: "In breath, counting one",
    category: "Concentration",
  },
  {
    id: "concentration-3",
    text: "Out breath, counting two",
    category: "Concentration",
  },
  {
    id: "concentration-4",
    text: "Air touching my nostrils",
    category: "Concentration",
  },
  {
    id: "concentration-5",
    text: "Belly rising and falling",
    category: "Concentration",
  },
  {
    id: "concentration-6",
    text: "Resting in the pause between breaths",
    category: "Concentration",
  },
  {
    id: "concentration-7",
    text: "Gently returning to my anchor",
    category: "Concentration",
  },
  // Gratitude Instructions
  {
    id: "gratitude-1",
    text: "Grateful for this breath",
    category: "Gratitude",
  },
  {
    id: "gratitude-2",
    text: "Thankful for my body",
    category: "Gratitude",
  },
  {
    id: "gratitude-3",
    text: "Grateful for this moment",
    category: "Gratitude",
  },
  {
    id: "gratitude-4",
    text: "Thankful to be alive",
    category: "Gratitude",
  },
  {
    id: "gratitude-5",
    text: "Grateful for all my teachers",
    category: "Gratitude",
  },
  // Forgiveness Instructions
  {
    id: "forgiveness-1",
    text: "I forgive myself completely",
    category: "Forgiveness",
  },
  {
    id: "forgiveness-2",
    text: "I forgive all who have hurt me",
    category: "Forgiveness",
  },
  {
    id: "forgiveness-3",
    text: "I release all past mistakes",
    category: "Forgiveness",
  },
  {
    id: "forgiveness-4",
    text: "I am free from resentment",
    category: "Forgiveness",
  },
  // Transition Instructions
  {
    id: "transitions-1",
    text: "I am ready to begin",
    category: "Transitions",
  },
  {
    id: "transitions-2",
    text: "Settling into stillness",
    category: "Transitions",
  },
  {
    id: "transitions-3",
    text: "Going deeper within",
    category: "Transitions",
  },
  {
    id: "transitions-4",
    text: "Preparing for the next phase",
    category: "Transitions",
  },
  {
    id: "transitions-5",
    text: "Gently returning to awareness",
    category: "Transitions",
  },
  {
    id: "transitions-6",
    text: "This meditation is complete",
    category: "Transitions",
  },
  {
    id: "transitions-7",
    text: "Carrying this peace forward",
    category: "Transitions",
  },
]

const SOUND_CUES_LIBRARY = []

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
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  F6: 1396.91,
  G6: 1567.98,
  A6: 1760.0,
  C7: 1046.5 * 2,
  C8: 1046.5 * 4,
}

const NOTES = [
  "C4",
  "D4",
  "E4",
  "F4",
  "G4",
  "A4",
  "B4",
  "C5",
  "D5",
  "E5",
  "F5",
  "G5",
  "A5",
  "B5",
  "C6",
  "D6",
  "E6",
  "F6",
  "G6",
  "A6",
]

const MUSICAL_NOTES = {
  Beautiful: NOTES.map((note, index) => ({
    id: `note-${note.toLowerCase().replace("#", "s")}`,
    name: note,
    note: note.charAt(0),
    octave: Number.parseInt(note.charAt(1)),
  })),
}

let sampler = null
let reverb = null
let isLoading = false
let isLoaded = false

const ensureTone = async () => {
  if (typeof window !== "undefined" && (window as any).Tone) {
    return (window as any).Tone
  }
  const mod = await import("tone")
  return mod
}

const startPianoAudio = async () => {
  const Tone = await ensureTone()

  if (Tone.context.state === "closed") {
    console.log("[v0] AudioContext is closed, creating new context...")
    const newContext = new AudioContext()
    await Tone.setContext(newContext)
    console.log("[v0] New AudioContext created and set")
  }

  if (Tone.context.state !== "running") {
    console.log("[v0] Starting Tone.js audio context...")
    try {
      await Tone.start()
      console.log("[v0] AudioContext started successfully")
    } catch (error) {
      console.error("[v0] Error starting AudioContext:", error)
      const newContext = new AudioContext()
      await Tone.setContext(newContext)
      await Tone.start()
      console.log("[v0] New AudioContext created and started after error")
    }
  }
}

const loadPiano = async ({ wet = 0.18, decay = 2.8 } = {}) => {
  if (isLoading || isLoaded) return

  isLoading = true
  const Tone = await ensureTone()

  try {
    await startPianoAudio()

    if (sampler) {
      try {
        sampler.dispose()
      } catch (e) {
        console.warn("[v0] Error disposing sampler:", e)
      }
      sampler = null
    }
    if (reverb) {
      try {
        reverb.dispose()
      } catch (e) {
        console.warn("[v0] Error disposing reverb:", e)
      }
      reverb = null
    }

    reverb = new Tone.Reverb({ wet, decay, preDelay: 0.01 }).toDestination()
    await reverb.generate()

    sampler = new Tone.Sampler({
      urls: {
        A0: "A0.mp3",
        C1: "C1.mp3",
        "D#1": "Ds1.mp3",
        "F#1": "Fs1.mp3",
        A1: "A1.mp3",
        C2: "C2.mp3",
        "D#2": "Ds2.mp3",
        "F#2": "Fs2.mp3",
        A2: "A2.mp3",
        C3: "C3.mp3",
        "D#3": "Ds3.mp3",
        "F#3": "Fs3.mp3",
        A3: "A3.mp3",
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
        "D#5": "Ds5.mp3",
        "F#5": "Fs5.mp3",
        A5: "A5.mp3",
        C6: "C6.mp3",
        "D#6": "Ds6.mp3",
        "F#6": "Fs6.mp3",
        A6: "A6.mp3",
        C7: "C7.mp3",
        "D#7": "Ds7.mp3",
        "F#7": "Fs7.mp3",
        A7: "A7.mp3",
        C8: "C8.mp3",
      },
      release: 1.2,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    }).connect(reverb)

    await new Promise((resolve) => {
      const checkLoaded = () => {
        if (sampler.loaded) {
          resolve(true)
        } else {
          setTimeout(checkLoaded, 100)
        }
      }
      checkLoaded()
    })

    isLoaded = true
    console.log("[v0] Piano sampler fully loaded and ready")
  } catch (error) {
    console.error("[v0] Error loading piano:", error)
    isLoaded = false
    isLoading = false
    throw error
  } finally {
    isLoading = false
  }
}

const playPianoNote = async (noteString: string, duration = 0.45, velocity = 0.9) => {
  try {
    await startPianoAudio()

    if (!isLoaded) {
      console.log("[v0] Piano not loaded, initializing...")
      await loadPiano()
    }

    if (!sampler || !sampler.loaded) {
      throw new Error("Piano sampler is not loaded")
    }

    const Tone = await ensureTone()
    console.log(`[v0] Playing piano note: ${noteString}`)
    sampler.triggerAttackRelease(noteString, duration, Tone.now(), velocity)
  } catch (error) {
    console.error("[v0] Error playing piano note:", error)
    isLoaded = false
    throw error
  }
}

export default function Home() {
  const { toast } = useToast()

  const [activeMode, setActiveMode] = useState<"adjuster" | "encoder">("adjuster")

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
  const [memoryWarning, setMemoryWarning] = useState<boolean>(false) // Corrected type to boolean
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // == States for Labs ==
  const [meditationTitle, setMeditationTitle] = useState<string>("My Custom Meditation")
  const [encoderTotalDuration, setEncoderTotalDuration] = useState<number>(600)
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
  const encoderAudioRef = useRef<HTMLAudioElement | null>(null)
  const instructionCategories = Array.from(new Set(INSTRUCTIONS_LIBRARY.map((instr) => instr.category)))
  const [recordingLabel, setRecordingLabel] = useState<string>("")

  // Audio generation states
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false)
  const [generationProgress, setGenerationProgress] = useState<number>(0)
  const [generationStep, setGenerationStep] = useState<string>("")
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null)
  const [generatedAudioFileSize, setGeneratedAudioFileSize] = useState<number>(0)

  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [currentTab, setCurrentTab] = useState<string>("instructions")
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0) // in seconds
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null)
  const [volume, setVolume] = useState<number>(75) // Default volume 75%
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const recordingPreviewRef = useRef<HTMLAudioElement | null>(null)
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentItemStartTimeRef = useRef<number>(0)

  const [multiNoteMode, setMultiNoteMode] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])
  const [noteType, setNoteType] = useState<"piano" | "synth" | "harp">("piano")

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
    setTimeline((prev) => prev.map((item, i) => (i === index ? { ...item, duration: newDuration } : item)))
  }, [])

  const loadAudioFile = useCallback(
    async (fileToLoad: File) => {
      const currentAudioContext = audioContextRef.current
      if (!currentAudioContext) {
        try {
          audioContextRef.current = getAudioContext()
          if (!audioContextRef.current) {
            setStatus({ message: "Audio context not initialized.", type: "error" })
            throw new Error("AudioContext not initialized")
          }
        } catch (error) {
          setStatus({ message: "Failed to initialize audio context.", type: "error" })
          throw new Error("AudioContext initialization failed")
        }
      }

      let attempts = 0
      const maxAttempts = 3
      const contextToUse = audioContextRef.current

      while (contextToUse.state !== "running" && attempts < maxAttempts) {
        attempts++
        if (contextToUse.state === "suspended") {
          try {
            await contextToUse.resume()
            if (contextToUse.state !== "running") await sleep(50 * attempts)
          } catch (err) {
            break
          }
        } else if (contextToUse.state === "closed") {
          setStatus({ message: "Audio system closed.", type: "error" })
          throw new Error("AudioContext closed")
        }
        if (contextToUse.state !== "running" && contextToUse.state !== "closed" && attempts < maxAttempts)
          await sleep(100 * attempts)
      }

      if (contextToUse.state !== "running") {
        setStatus({ message: "Failed to start audio system.", type: "error" })
        throw new Error(`AudioContext not running: ${contextToUse.state}`)
      }

      setProcessingStep("Reading file data...")
      setProcessingProgress(10)
      const arrayBuffer = await fileToLoad.arrayBuffer()
      setProcessingStep("Decoding audio data...")
      setProcessingProgress(50)

      try {
        const decodePromise = contextToUse.decodeAudioData(arrayBuffer.slice(0))
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

  const handleFile = useCallback(
    async (selectedFile: File) => {
      if (!selectedFile) return

      setFile(selectedFile)
      setStatus(null)
      setProcessingProgress(0)
      setProcessingStep("")
      setIsProcessing(true)
      setIsProcessingComplete(false)

      try {
        await loadAudioFile(selectedFile)
      } catch (error) {
        console.error("Error loading file:", error)
        setStatus({
          message: `Failed to load audio file: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "error",
        })
      } finally {
        setIsProcessing(false)
      }
    },
    [loadAudioFile],
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Audio Length Adjuster & Meditation Encoder</h1>
            <p className="text-lg text-gray-600">Adjust audio length or create custom meditations</p>
          </div>

          <div className="mb-8">
            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => setActiveMode("adjuster")}
                variant={activeMode === "adjuster" ? "default" : "outline"}
                className="px-6 py-2"
              >
                Length Adjuster
              </Button>
              <Button
                onClick={() => setActiveMode("encoder")}
                variant={activeMode === "encoder" ? "default" : "outline"}
                className="px-6 py-2"
              >
                Meditation Encoder
              </Button>
            </div>
          </div>

          {activeMode === "adjuster" && (
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Audio Length Adjuster</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Upload Audio File</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0]
                      if (selectedFile) {
                        handleFile(selectedFile)
                      }
                    }}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {status && (
                  <Alert
                    className={status.type === "error" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{status.type === "error" ? "Error" : "Success"}</AlertTitle>
                    <AlertDescription>{status.message}</AlertDescription>
                  </Alert>
                )}

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{processingStep}</span>
                      <span>{processingProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${processingProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {originalUrl && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Original Audio</label>
                      <audio controls className="w-full" src={originalUrl} />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeMode === "encoder" && (
            <Card className="p-6">
              <h2 className="text-2xl font-semibold mb-4">Meditation Encoder</h2>
              <p className="text-gray-600 mb-6">Create custom guided meditations with instructions and sound cues</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Meditation Title</label>
                  <Input
                    value={meditationTitle}
                    onChange={(e) => setMeditationTitle(e.target.value)}
                    placeholder="Enter meditation title"
                  />
                </div>

                <RecorderSection
                  className="mb-6"
                  inputId="recording-label"
                  recordingLabel={recordingLabel}
                  onRecordingLabelChange={(e) => setRecordingLabel(e.target.value)}
                  isRecording={isRecording}
                  startRecording={async () => {
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
                        const audio = new Audio(url)

                        audio.onloadedmetadata = () => {
                          setReadyToAddToTimelineRecording({
                            url,
                            duration: audio.duration,
                            label: recordingLabel,
                          })
                        }

                        setRecordedBlobs(chunks)
                        stream.getTracks().forEach((track) => track.stop())
                      }

                      mediaRecorder.start()
                      setIsRecording(true)
                    } catch (error) {
                      console.error("Error starting recording:", error)
                      toast({
                        title: "Recording Error",
                        description: "Could not start recording. Please check microphone permissions.",
                        variant: "destructive",
                      })
                    }
                  }}
                  stopRecording={() => {
                    if (mediaRecorderRef.current && isRecording) {
                      mediaRecorderRef.current.stop()
                      setIsRecording(false)
                    }
                  }}
                  readyToAddToTimelineRecording={readyToAddToTimelineRecording}
                  timelineEvents={timelineEvents}
                  addEventToTimeline={(event) => setTimelineEvents((prev) => [...prev, event])}
                  setReadyToAddToTimelineRecording={setReadyToAddToTimelineRecording}
                  setRecordedBlobs={setRecordedBlobs}
                  setRecordingLabel={setRecordingLabel}
                  recordingPreviewRef={recordingPreviewRef}
                />

                <div className="text-center text-gray-500">
                  <p>More encoder features coming soon...</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
