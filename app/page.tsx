"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert" // Import Alert component
import {
  Volume2,
  Wand2,
  AlertTriangle,
  Music2,
  Mic,
  StopCircle,
  Play,
  PlusCircle,
  CircleDotDashed,
  BookmarkPlus,
} from "lucide-react" // Import Copy icon
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { HeroCardWrapper } from "@/components/hero-card-wrapper"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"
import { VisualTimeline } from "@/components/visual-timeline"
import { cn, formatTime, sleep, monitorMemory, forceGarbageCollection, formatFileSize } from "@/lib/utils"
import { getAudioContext, bufferToWav } from "@/lib/audio-utils" // Import from audio-utils
import type { Instruction, SoundCue, TimelineEvent } from "@/lib/types" // Import types
import { useMobile } from "@/hooks/use-mobile" // Import useMobile hook
import { EVENT_COLORS } from "@/lib/constants" // Import EVENT_COLORS
import * as Tone from "tone"
import { SaveMeditationDialog } from "@/components/save-meditation-dialog"

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
    setTimeline((prev) => prev.map((item, i) => (i === index ? { ...item, duration: Math.max(1, newDuration) } : item)))
  }, [])

  useEffect(() => {
    if (readyToAddToTimelineRecording && recordingPreviewRef.current) {
      recordingPreviewRef.current.load()
    }
  }, [readyToAddToTimelineRecording])

  const removeTimelineItem = useCallback(
    (index: number) => {
      setTimeline((prev) => prev.filter((_, i) => i !== index))
      if (activeItemIndex === index) {
        setActiveItemIndex(null)
      } else if (activeItemIndex !== null && activeItemIndex !== null && activeItemIndex > index) {
        setActiveItemIndex((prev) => (prev !== null ? prev - 1 : null))
      }
    },
    [activeItemIndex],
  )

  const playEncoderSound = useCallback(
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
        toast({
          title: "Sound Playback",
          description: "Sound cues are currently disabled.",
          variant: "default",
        })
      } catch (error) {
        console.error("Error playing encoder sound:", error)
        toast({
          title: "Sound Playback Error",
          description: "Failed to play the selected sound.",
          variant: "destructive",
        })
      }
    },
    [toast],
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
                playEncoderSound(item.content.src) // Pass src string to playLabsSound
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
  }, [timeline, currentPlaybackTime, totalDuration, activeItemIndex, playEncoderSound])

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
      const maxAudioDuration = encoderTotalDuration // Start with the user-defined total duration

      const ctx = new OfflineAudioContext({
        numberOfChannels: 1,
        sampleRate: 44100,
        length: Math.ceil(maxAudioDuration * 44100), // Ensure length is an integer
      })

      const Tone = await ensureTone()
      await Tone.setContext(ctx)

      // Prepare instrument instances for offline rendering
      let pianoSampler: any = null
      let pianoReverb: any = null
      const loadPiano = async () => {
        if (!pianoSampler) {
          pianoSampler = new Tone.Sampler({
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
          })

          pianoReverb = new Tone.Reverb({ wet: 0.18, decay: 2.8, preDelay: 0.01 })
          pianoSampler.connect(pianoReverb)
          pianoReverb.toDestination()
          await pianoReverb.generate()
          await Tone.loaded()
        }
      }

      let synth: any = null
      let synthGain: any = null
      const loadSynth = async () => {
        if (!synth) {
          synth = new Tone.Synth({
            oscillator: { type: "fatsawtooth" },
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
            filter: { frequency: 2000, type: "lowpass", rolloff: -12 },
            filterEnvelope: {
              attack: 0.02,
              decay: 0.2,
              sustain: 0.5,
              release: 0.8,
              baseFrequency: 200,
              octaves: 4,
            },
          })

          synthGain = new Tone.Gain(0.3)
          synth.connect(synthGain)
          synthGain.toDestination()
        }
      }

      let harp: any = null
      let harpReverb: any = null
      let harpGain: any = null
      const loadHarp = async () => {
        if (!harp) {
          harp = new Tone.PluckSynth({
            attackNoise: 1,
            dampening: 4000,
            resonance: 0.9,
          })

          harpReverb = new Tone.Reverb({ decay: 4, wet: 0.6 })
          harpGain = new Tone.Gain(0.8)
          harp.connect(harpReverb)
          harpReverb.connect(harpGain)
          harpGain.toDestination()
          await harpReverb.generate()
        }
      }

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
              console.log(`Skipping synthetic sound at ${eventStartTime} - functionality removed`)
            }
          } else if (event.soundCueSrc?.startsWith("musical:")) {
            const notesPart = event.soundCueSrc.replace("musical:", "")
            const noteStrings = notesPart.split("|")

            const instrument = event.instrument || noteType
            for (const [noteIndex, ns] of noteStrings.entries()) {
              const match = ns.match(/([A-G])(\d)/)
              if (match) {
                const note = match[1]
                const octave = Number.parseInt(match[2])
                const noteString = `${note}${octave}`
                console.log(`Processing musical note with Tone.js: ${noteString}`)

                try {
                  if (instrument === "piano") {
                    await loadPiano()
                    pianoSampler.triggerAttackRelease(noteString, 0.8, eventStartTime, 0.9)
                  } else if (instrument === "synth") {
                    await loadSynth()
                    synth.triggerAttackRelease(noteString, 0.8, eventStartTime)
                  } else if (instrument === "harp") {
                    await loadHarp()
                    const startDelay = noteIndex * 0.01
                    const duration = 0.8 + startDelay
                    harp.triggerAttackRelease(noteString, duration, eventStartTime + startDelay)
                  }

                  console.log(`Successfully added ${instrument} note ${noteString} at ${eventStartTime}`)
                } catch (error) {
                  console.error(`Error adding ${instrument} note ${noteString}:`, error)
                }
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

      setGeneratedAudioFileSize(wavBlob.size)

      const url = URL.createObjectURL(wavBlob)
      setGeneratedAudioUrl(url)

      // Directly assign to the audio element for immediate playback readiness
      if (encoderAudioRef.current) {
        encoderAudioRef.current.src = url
        encoderAudioRef.current.volume = volume / 100
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
      setProcessedFileSize(wavBlob.size)
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
    encoderAudioRef.current = new Audio()
    encoderAudioRef.current.preload = "none"
    encoderAudioRef.current.volume = 0.7
    if (encoderAudioRef.current) {
      encoderAudioRef.current.onerror = (e) => console.warn("Encoder Audio error:", e)
    }
    return () => {
      if (encoderAudioRef.current) {
        encoderAudioRef.current.pause()
        encoderAudioRef.current.src = ""
        encoderAudioRef.current = null
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  // Helper function to add events to timelineEvents without automatic spacing
  const addEventToTimeline = useCallback((newEvent: TimelineEvent) => {
    setTimelineEvents((prevEvents) => {
      const updatedEvents = [...prevEvents, newEvent]
      // Sort by current startTime to maintain chronological order for display
      // Do NOT re-calculate or re-assign startTimes based on spacing.
      return updatedEvents.sort((a, b) => {
        if (a.startTime === b.startTime) {
          // For events at the same time, maintain their relative order based on original array position
          const aIndex = prevEvents.findIndex((e) => e.id === a.id)
          const bIndex = prevEvents.findIndex((e) => e.id === b.id)
          return aIndex - bIndex
        }
        return a.startTime - b.startTime
      })
    })
  }, [])

  const handleAddInstructionSoundEvent = () => {
    const instructionTextToAdd = customInstructionText.trim()

    if (!instructionTextToAdd) {
      toast({
        title: "Missing Instruction",
        description: "Please enter an instruction.",
        variant: "destructive",
      })
      return
    }
    if (!selectedSoundCue && selectedNotes.length === 0) {
      toast({ title: "Missing Sound Cue", description: "Please select a sound cue.", variant: "destructive" })
      return
    }

    // Calculate new startTime based on existing events
    const maxExistingTime = timelineEvents.length > 0 ? Math.max(...timelineEvents.map((e) => e.startTime)) : 0
    const newStartTime = timelineEvents.length > 0 ? maxExistingTime + 10 : 0

    let newEvent: TimelineEvent

    if (multiNoteMode && selectedNotes.length > 0) {
      newEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type: "instruction_sound",
        startTime: newStartTime,
        instructionText: instructionTextToAdd,
        soundCueId: `chord_${Date.now()}`,
        soundCueName: selectedNotes.join(", "),
        soundCueSrc: `musical:${selectedNotes.join("|")}`,
        instrument: noteType,
        color: EVENT_COLORS[timelineEvents.length % EVENT_COLORS.length],
      }
    } else if (selectedSoundCue) {
      newEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type: "instruction_sound",
        startTime: newStartTime,
        instructionText: instructionTextToAdd,
        soundCueId: selectedSoundCue.id,
        soundCueName: selectedSoundCue.name,
        soundCueSrc: selectedSoundCue.src,
        instrument: noteType,
        color: EVENT_COLORS[timelineEvents.length % EVENT_COLORS.length],
      }
    } else {
      return
    }

    addEventToTimeline(newEvent)
    setCustomInstructionText("")
    setSelectedNotes([])
    setSelectedSoundCue(null)
    toast({
      title: "Event Added",
      description: `"${instructionTextToAdd.substring(0, 30)}..." with ${newEvent.soundCueName} added.`,
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

          tempAudio.onloadedmetadata = async () => {
            let duration =
              tempAudio.duration && !isNaN(tempAudio.duration) && isFinite(tempAudio.duration) ? tempAudio.duration : 0

            if (!duration) {
              try {
                const arrayBuffer = await blob.arrayBuffer()
                const audioBuffer = await getAudioContext().decodeAudioData(arrayBuffer)
                duration = audioBuffer.duration
              } catch (error) {
                console.error("Error decoding audio for duration:", error)
              }
            }

            setReadyToAddToTimelineRecording({
              url,
              duration,
              label: recordingLabel.trim(),
            })
            setRecordedBlobs([blob]) // Keep the blob for potential future use if needed
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
            setReadyToAddToTimelineRecording(null)
          }

          // Stop all tracks to release microphone
          if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
          }
        }

        mediaRecorderRef.current.start()
        setIsRecording(true)
        if (readyToAddToTimelineRecording) {
          URL.revokeObjectURL(readyToAddToTimelineRecording.url)
        }
        setReadyToAddToTimelineRecording(null) // Clear previous recording
        setRecordedBlobs([])
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
      setIsRecording(false)
    }
  }

  const updateEventStartTime = (eventId: string, newTime: number) => {
    setTimelineEvents((prev) => {
      const index = prev.findIndex((e) => e.id === eventId)
      if (index === -1) return prev

      const event = prev[index]
      const duration = event.duration || 0
      let start = Math.max(0, Math.min(newTime, encoderTotalDuration - duration))

      if (event.type === "recorded_voice") {
        const others = prev.filter((e) => e.id !== eventId && e.type === "recorded_voice")

        const prevRecording = others.filter((e) => e.startTime < start).sort((a, b) => b.startTime - a.startTime)[0]
        const nextRecording = others.filter((e) => e.startTime > start).sort((a, b) => a.startTime - b.startTime)[0]

        if (prevRecording) {
          const prevEnd = prevRecording.startTime + (prevRecording.duration || 0)
          if (start < prevEnd) start = prevEnd
        }

        if (nextRecording) {
          if (start + duration > nextRecording.startTime) {
            start = nextRecording.startTime - duration
          }
        }

        if (prevRecording) {
          const prevEnd = prevRecording.startTime + (prevRecording.duration || 0)
          if (start < prevEnd) start = prevEnd
        }

        start = Math.max(0, Math.min(start, encoderTotalDuration - duration))
      }

      const updated = prev.map((e) => (e.id === eventId ? { ...e, startTime: start } : e))

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

  const handleDuplicateEvent = useCallback(
    (eventToDuplicate: TimelineEvent) => {
      const newEvent: TimelineEvent = {
        ...eventToDuplicate,
        id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // New unique ID
        startTime: eventToDuplicate.startTime + 5, // Offset by 5 seconds
        // The color property is already copied by the spread operator
      }
      addEventToTimeline(newEvent)
      toast({
        title: "Event Duplicated",
        description: `"${newEvent.instructionText || newEvent.recordedInstructionLabel}" duplicated.`,
      })
    },
    [addEventToTimeline],
  )

  // Safe input handlers with validation
  const handleMeditationTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target?.value
    if (typeof value === "string") {
      setMeditationTitle(value)
    }
  }

  const handleCustomInstructionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target?.value
    if (typeof value === "string") {
      setCustomInstructionText(value)
      setSelectedLibraryInstruction(null)
    }
  }

  const handleRecordingLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target?.value
    if (typeof value === "string") {
      setRecordingLabel(value)
    }
  }

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target?.value
    if (typeof value === "string" && !isNaN(Number(value))) {
      setEncoderTotalDuration(Math.max(60, Number(value) * 60) || 60)
    }
  }

  const playSingleNote = async (note: string, octave: number, noteType: string) => {
    try {
      console.log(`[v0] Playing ${noteType} note: ${note}${octave}`)
      await startPianoAudio()

      if (noteType === "piano") {
        const noteString = `${note}${octave}`
        await playPianoNote(noteString, 0.5, 0.9)
      } else if (noteType === "synth") {
        const Tone = await ensureTone()
        const synth = new Tone.Synth({
          oscillator: { type: "fatsawtooth" },
          envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
          filter: { frequency: 2000, type: "lowpass", rolloff: -12 },
          filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.8, baseFrequency: 200, octaves: 4 },
        })

        const synthGain = new Tone.Gain(0.3).toDestination()
        synth.connect(synthGain)

        synth.triggerAttackRelease(`${note}${octave}`, 0.5)

        setTimeout(() => {
          synth.dispose()
          synthGain.dispose()
        }, 2000)
      } else if (noteType === "harp") {
        const Tone = await ensureTone()
        const harp = new Tone.PluckSynth({
          attackNoise: 1,
          dampening: 4000,
          resonance: 0.9,
        })

        const harpGain = new Tone.Gain(0.8).toDestination()
        const harpReverb = new Tone.Reverb({ decay: 4, wet: 0.6 }).connect(harpGain)
        harp.connect(harpReverb)

        harp.triggerAttackRelease(`${note}${octave}`, 0.5)

        setTimeout(() => {
          harp.dispose()
          harpReverb.dispose()
          harpGain.dispose()
        }, 3000)
      }
    } catch (error) {
      console.error(`[v0] Error playing ${noteType} note:`, error)
    }
  }

  const playChordPreview = async (notes?: string[]) => {
    const chordNotes = notes ?? selectedNotes

    console.log("[v0] playChordPreview called with notes:", notes)
    console.log("[v0] selectedNotes from state:", selectedNotes)
    console.log("[v0] chordNotes to use:", chordNotes)
    console.log("[v0] chordNotes is array:", Array.isArray(chordNotes))
    console.log("[v0] chordNotes length:", chordNotes?.length)

    if (!Array.isArray(chordNotes) || chordNotes.length === 0) {
      console.log("[v0] No valid chord notes to play, returning early")
      return
    }

    console.log("[v0] Playing chord with notes:", chordNotes, "using", noteType)

    try {
      await Tone.start()

      if (noteType === "piano") {
        // Initialize piano if not already loaded
        if (!sampler) {
          console.log("[v0] Piano not loaded, initializing for chord...")
          await loadPiano()
        }

        if (sampler && isLoaded) {
          // Play all notes simultaneously using the Salamander piano sampler
          chordNotes.forEach((noteString) => {
            console.log("[v0] Playing Salamander piano note in chord:", noteString)
            sampler.triggerAttackRelease(noteString, 0.5)
          })
        } else {
          console.error("[v0] Piano sampler not available for chord")
        }
      } else if (noteType === "synth") {
        chordNotes.forEach(async (noteString) => {
          const synth = new Tone.Synth({
            oscillator: { type: "fatsawtooth" },
            envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
            filter: { frequency: 2000, type: "lowpass", rolloff: -12 },
            filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.8, baseFrequency: 200, octaves: 4 },
          })

          const synthGain = new Tone.Gain(0.3).toDestination()
          synth.connect(synthGain)

          console.log("[v0] Playing synth note in chord:", noteString)
          synth.triggerAttackRelease(noteString, 0.5)

          setTimeout(() => {
            synth.dispose()
            synthGain.dispose()
          }, 2000)
        })
      } else if (noteType === "harp") {
        chordNotes.forEach(async (noteString, index) => {
          const harp = new Tone.PluckSynth({
            attackNoise: 1,
            dampening: 4000,
            resonance: 0.9,
          })

          const harpGain = new Tone.Gain(0.8).toDestination()
          const harpReverb = new Tone.Reverb({ decay: 4, wet: 0.6 }).connect(harpGain)
          harp.connect(harpReverb)

          console.log("[v0] Playing harp note in chord:", noteString)
          const startDelay = index * 0.01
          const duration = 0.5 + startDelay
          harp.triggerAttackRelease(noteString, duration, `+${startDelay}`)

          setTimeout(() => {
            harp.dispose()
            harpReverb.dispose()
            harpGain.dispose()
          }, 3000)
        })
      }
    } catch (error) {
      console.error("[v0] Error playing chord:", error)
    }
  }

  const handleNoteSelection = async (note: any) => {
    if (multiNoteMode) {
      // Multi-note mode: toggle selection
      setSelectedNotes((prev) => {
        const noteString = `${note.note}${note.octave}`
        if (prev.includes(noteString)) {
          return prev.filter((n) => n !== noteString)
        } else {
          return [...prev, noteString]
        }
      })
    } else {
      // Single note mode: play immediately and set as selected sound cue
      setSelectedSoundCue({
        id: note.id,
        name: note.name,
        src: `musical:${note.note}${note.octave}`,
      })
      await playSingleNote(note.note, note.octave, noteType)
    }
  }

  const timelinePlaySingleNote = async (noteString: string) => {
    try {
      console.log(`[v0] Timeline playing single note: ${noteString} using ${noteType}`)

      // Parse note string (e.g., "C4" -> note="C", octave=4)
      const match = noteString.match(/([A-G])(\d)/)
      if (!match) {
        console.error("[v0] Invalid note string format:", noteString)
        return
      }

      const note = match[1]
      const octave = Number.parseInt(match[2])

      // Use the same playSingleNote function as the sound cue section
      await playSingleNote(note, octave, noteType)
    } catch (error) {
      console.error("[v0] Timeline single note error:", error)
    }
  }

  const timelinePlayChordPreview = async (noteStrings: string[]) => {
    try {
      console.log(`[v0] Timeline playing chord: ${noteStrings} using ${noteType}`)
      // Directly play the provided notes without modifying state
      await playChordPreview(noteStrings)
    } catch (error) {
      console.error("[v0] Timeline chord preview error:", error)
    }
  }

  return (
    <HeroCardWrapper
      beforeContent={
        memoryWarning && activeMode === "adjuster" ? (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-100 to-amber-50 border border-yellow-300 shadow-sm ">
            <div className="flex items-start">
              <AlertTriangle className="text-yellow-500 mr-3 flex-shrink-0 mt-0.5 w-5 h-5" />
              <div>
                <h3 className="text-yellow-700 mb-1 font-serif font-black text-sm">High Memory Usage Expected</h3>
                <p className="text-yellow-600 font-serif font-black text-xs">
                  Large files or long target durations require significant memory. Processing may be slow or unstable on
                  devices with limited RAM.
                </p>
              </div>
            </div>
          </div>
        ) : null
      }
      hero={
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <h1
            className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 tracking-tighter text-center mt-16"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              textShadow: "0 0 25px rgba(139, 69, 69, 0.25)",
            }}
          >
            abhī
          </h1>
          <div className="font-black text-logo-rose-600 font-serif mb-[7px] text-xs">Meditation Tool</div>
          <div className="flex justify-center items-center mb-4 space-x-[3px]">
            <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[13px] h-[13px]"></div>
            <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[9px] w-[9px]"></div>
            <div className="w-4 bg-gradient-to-br from-logo-amber to-orange-300 rounded-sm transform -rotate-6 h-[9px]"></div>
            <div className="bg-gradient-to-r from-gray-600 to-gray-500 rounded-sm w-[48px] h-[4px]"></div>
            <div className="w-4 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-sm transform rotate-6 h-[9px] pl-0 ml-2"></div>
            <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[9px] w-[9px]"></div>
            <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[13px] h-[13px]"></div>
          </div>

          {/* Mode Switch */}
          <div className="flex justify-center items-center mb-4 space-y-4 flex-row my-[33px]">
            <div className="flex mx-auto items-center p-1 font-serif text-gray-600 shadow-inner rounded-sm gap-1 w-fit bg-muted">
              <button
                onClick={() => setActiveMode("adjuster")}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-black py-3 tracking-tight text-sm",
                  activeMode === "adjuster" ? "bg-white text-gray-600 shadow-sm " : "text-gray-600 ",
                )}
              >
                Adjuster
              </button>
              <button
                onClick={() => setActiveMode("encoder")}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 py-3 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-black text-gray-600 tracking-tight text-sm",
                  activeMode === "encoder" ? "bg-white text-gray-600 shadow-sm " : "text-gray-600 ",
                )}
              >
                Encoder
              </button>
            </div>
          </div>
        </motion.div>
      }
      cardProps={{
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.6 },
        role: "application",
      }}
    >
      <div className="font-serif font-black pb-7">
            {/* Mode Description Notes */}
            <AnimatePresence mode="wait">
              {activeMode === "adjuster" && (
                <motion.div
                  key="adjuster-note"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 rounded-md font-serif font-black max-w-2xl mx-auto border-solid text-logo-rose-600 border-logo-rose-500 border-0 shadow-none mb-4 py-0 px-0"
                >
                  <p className="text-center px-4 pt-1.5 text-logo-rose-600 text-xs">
                    Change the length of your guided meditations. Upload an audio file, set your target duration, and
                    this tool will re-space content to fit your schedule.
                  </p>
                </motion.div>
              )}
              {activeMode === "encoder" && (
                <motion.div
                  key="encoder-note"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 rounded-md font-serif font-black max-w-2xl mx-auto border-solid text-logo-rose-600 border-logo-rose-500 border-0 shadow-none mb-4 py-0 px-0"
                >
                  <p className="text-center px-4 pt-1.5 text-logo-rose-600 text-xs pb-1.5">
                    Design custom guided meditations by pairing instructions with sound cues or using the recorder, then
                    arranging events on the timeline.
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
                  <div className="p-4 max-w-2xl text-center mx-auto rounded-md border-logo-rose-500 border-0 shadow-none pt-0 pb-1">
                    <p className="leading-relaxed font-serif font-black text-xs text-gray-600">
                      <strong className="pr-1.5 font-black font-serif text-center text-sm text-logo-amber-400">
                        Note:
                      </strong>
                      Depending on the audio, users may need to tweak the advanced settings for optimal results. Only
                      pauses are adjusted, spoken instruction is preserved. Any guided meditation{" "}
                      {"under " + (isMobileDevice ? "50MB" : "500MB") + ""} should be compatible. Teachers, please feel
                      free to
                      <a
                        href="/contact"
                        className=" underline px-1 rounded transition-colors transition-shadow font-black text-sm text-logo-purple-300"
                      >
                        contact me
                      </a>
                      to opt out. Enjoy:)
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border-logo-rose-300 max-w-2xl mx-auto backdrop-blur-sm border-0 py-4 px-0 bg-transparent pt-0 pb-0">
                    <h3 className="mb-2 text-center font-black px-0 rounded text-base text-gray-600 pb-0.5">
                      Resources
                    </h3>
                    <div className="text-sm text-gray-600 leading-relaxed flex flex-wrap justify-center text-center gap-[5px] px-2">
                      <a
                        href="https://dharmaseed.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-black text-gray-600 px-5 py-1 transition-all duration-200 ease-out hover:shadow-none shadow-md border-gray-500 text-xs border-[3px] rounded-sm"
                      >
                        Dharma Seed
                      </a>
                      <a
                        href="https://dharmaseed.org/teacher/210/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-black font-serif hover:shadow-none shadow-md border-gray-500 text-xs border-[3px] rounded-sm"
                      >
                        Rob Burbea's talks &amp; retreats
                      </a>
                      <a
                        href="https://tasshin.com/guided-meditations/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-black font-serif hover:shadow-none shadow-md border-gray-500 text-xs border-[3px] rounded-sm"
                      >
                        Tasshin &amp; friend's meditations
                      </a>
                      <a
                        href="https://www.tarabrach.com/guided-meditations/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-serif font-black hover:shadow-none shadow-md rounded-xlder-2 border-gray-500 text-xs border-[3px] rounded-sm"
                      >
                        Tara Brach's meditations
                      </a>
                      <a
                        href="https://drive.google.com/drive/folders/1k4plsQfxTF_1BXffShz7w3P6q4IDDo3?usp=drive_link"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-serif font-black hover:shadow-none shadow-md rounded-xlder-2 border-gray-500 text-xs border-[3px] rounded-sm"
                      >
                        Toby Sola's meditations
                      </a>
                      <a
                        href="https://meditofoundation.org/meditations"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-serif font-black hover:shadow-none shadow-md rounded-xlder-2 border-gray-500 text-xs border-[3px] rounded-sm"
                      >
                        Medito Foundation
                      </a>
                      <a
                        href="https://www.freebuddhistaudio.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-black text-gray-600 px-5 py-1 transition-all duration-200 ease-out hover:shadow-none shadow-md border-gray-500 text-xs border-[3px] rounded-sm"
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
                  className="overflow-hidden border-none bg-white rounded-2xl mb-5 cursor-pointer transition-all duration-300 shadow-none hover:shadow-md "
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOverAction}
                  onDragLeave={handleDragLeaveAction}
                  onDrop={handleDropAction}
                >
                  <div className="p-0.5 bg-gradient-to-r from-logo-teal-500 to-logo-purple-300 border-indigo-200 border-0 px-[5px] py-1 pl-1 pr-1 shadow-lg rounded-sm">
                    <div className="p-10 md:p-16 text-center md:py-14 bg-white border-white border-0 rounded-sm">
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="font-serif mb-2.5 font-black text-base text-gray-600">
                          Drop your audio file here or click to browse
                        </div>
                        <div className="font-serif text-xs text-gray-500">
                          Supports MP3, WAV, OGG, and M4A files {"(Max: " + (isMobileDevice ? "50MB" : "500MB") + ")"}
                        </div>
                      </motion.div>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".mp3,.wav,.ogg,.m4a,audio/*"
                    onChange={handleFileSelectAction}
                  />
                </motion.div>

                <AnimatePresence>
                  {file && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                      className="p-0.5 mb-3.5 overflow-hidden bg-gradient-to-r from-logo-amber-300 to-logo-purple-300 py-1 px-[5px] shadow-md rounded-sm pr-1 pl-1"
                    >
                      <div className="bg-white p-5 py-4 rounded-sm">
                        <div className="flex items-center">
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 }}
                            className="p-2 rounded-lg mr-4 bg-transparent text-purple-300"
                          >
                            <Volume2 className="h-4 w-4 text-gray-600" />
                          </motion.div>
                          <div className="flex-1">
                            <motion.div
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 }}
                              className="mb-1 font-black text-gray-600 text-xs"
                            >
                              {file.name}
                            </motion.div>
                            <motion.div
                              initial={{ opacity: 0, x: -5 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.3 }}
                              className="mb-1 font-black text-sm text-gray-500"
                            >
                              Size: {formatFileSize(file.size)}
                              {" • Type: "}
                              {file.type}
                            </motion.div>
                          </div>
                        </div>
                      </div>
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
                      className="mb-6 mt-4"
                    >
                      <Alert className="bg-white p-0 border-0 shadow-none">
                        <div className="p-3 text-center min-h-[76px] rounded-sm shadow-none bg-transparent pt-1 pb-0.5">
                          <div className="flex items-center mb-2 justify-center">
                            {/* Removed the Info icon div */}
                            <div className="text-lg font-black text-gray-600">Audio Analysis</div>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            <div className="p-[3px] bg-gradient-to-r from-gray-500 to-gray-500 shadow-md py-1 px-[3px] rounded-sm pl-1 pr-1">
                              <div className="bg-white p-3 text-center min-h-[76px] rounded-sm">
                                <div className="uppercase tracking-wide mb-1 text-gray-600 text-xs">Content:</div>
                                <div className="font-black text-gray-600">
                                  {formatTime(audioAnalysis.contentDuration)}
                                </div>
                              </div>
                            </div>
                            <div className="p-[3px] bg-gradient-to-r from-gray-500 to-gray-500 shadow-md py-1 px-[3px] rounded-sm pl-1 pr-1">
                              <div className="bg-white p-3 text-center min-h-[76px] rounded-sm">
                                <div className="text-xs uppercase tracking-wide mb-1 text-gray-600">Silence:</div>
                                <div className="font-black text-gray-600">{formatTime(audioAnalysis.totalSilence)}</div>
                              </div>
                            </div>
                            <div className="p-[3px] bg-gradient-to-r from-gray-500 to-gray-500 py-1 px-[3px] rounded-sm pr-1 pl-1 shadow-md">
                              <div className="bg-white p-3 text-center min-h-[76px] rounded-sm">
                                <div className="text-xs uppercase tracking-wide mb-1 text-gray-600">Pauses:</div>
                                <div className="font-black text-gray-600">{audioAnalysis.silenceRegions}</div>
                              </div>
                            </div>
                            <div className="p-[3px] bg-gradient-to-r from-gray-500 to-gray-500 shadow-md py-1 px-[3px] rounded-sm pr-1 pl-1">
                              <div className="bg-white p-3 text-center min-h-[76px] rounded-sm">
                                <div className="text-xs uppercase tracking-wide text-gray-600 mb-1.5">Range:</div>
                                <div className="uppercase text-gray-600 text-xs tracking-wide">
                                  {durationLimits.min} min - {isMobileDevice ? "1 hour" : "2 hours"}
                                </div>
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
                    <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted p-1 rounded-sm ">
                      <TabsTrigger
                        value="basic"
                        className="data-[state=active]:bg-white data-[state=active]:text-logo-teal-700 data-[state=active]:shadow-sm rounded-sm "
                      >
                        Basic Settings
                      </TabsTrigger>
                      <TabsTrigger
                        value="advanced"
                        className="data-[state=active]:bg-white data-[state=active]:text-logo-teal-700 data-[state=active]:shadow-sm rounded-sm "
                      >
                        Advanced Settings
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="mt-0 space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <Card className="overflow-hidden border-none shadow-lg bg-white ">
                          <div className="bg-gradient-to-r from-logo-blue-400 to-logo-amber-300 py-3 px-6 text-cyan-500">
                            <h3 className="text-white flex items-center font-black text-base">Target Duration</h3>
                          </div>
                          <div className="p-6 py-6 px-11 pb-6">
                            <div className="mb-4">
                              <Slider
                                value={[targetDuration]}
                                min={durationLimits?.min || 5}
                                max={durationLimits?.max || (isMobileDevice ? 60 : 120)}
                                step={1}
                                onValueChange={(value) => setTargetDuration(value[0])}
                                disabled={!durationLimits}
                                className="py-4"
                                rangeClassName="bg-gradient-to-r from-logo-blue-400 to-logo-amber-300 "
                              />
                            </div>
                            <div className="text-center font-serif font-black">
                              <span className="font-black text-xl text-gray-600">{targetDuration}</span>
                              <span className="ml-1 text-base text-gray-600">minutes</span>
                            </div>
                            {durationLimits && (
                              <div className="text-center text-sm mt-0 text-gray-500">
                                Range: {durationLimits.min} min to {isMobileDevice ? "1 hour" : "2 hours"}
                              </div>
                            )}
                          </div>
                        </Card>
                        <Card className="overflow-hidden border-none shadow-lg bg-white ">
                          <div className="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500 py-3 px-6 ">
                            <h3 className="text-white flex items-center font-black text-base">Silence Threshold</h3>
                          </div>
                          <div className="p-6 px-11">
                            <div className="mb-4">
                              <Slider
                                value={[silenceThreshold]}
                                min={0.001}
                                max={0.05}
                                step={0.001}
                                onValueChange={(value) => setSilenceThreshold(value[0])}
                                className="py-4"
                                rangeClassName="bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500 "
                              />
                            </div>
                            <div className="text-center">
                              <span className="font-serif font-black text-xl text-gray-600">
                                {silenceThreshold.toFixed(3)}
                              </span>
                            </div>
                            <div className="text-center text-sm mt-0 text-gray-500">Lower = more sensitive</div>
                          </div>
                        </Card>
                      </div>
                    </TabsContent>
                    <TabsContent value="advanced" className="mt-0 space-y-6">
                      <div className="grid md:grid-cols-2 gap-6 font-serif font-black">
                        <Card className="overflow-hidden border-none shadow-lg bg-white ">
                          <div className="bg-gradient-to-r from-logo-purple-300 to-logo-emerald-500 py-3 px-6 ">
                            <h3 className="text-white font-black">Min Silence Duration</h3>
                          </div>
                          <div className="p-6 font-serif font-black px-11 py-6">
                            <div className="mb-4">
                              <Slider
                                value={[minSilenceDuration]}
                                min={1}
                                max={15}
                                step={0.5}
                                onValueChange={(value) => setMinSilenceDuration(value[0])}
                                className="py-4"
                                rangeClassName="bg-gradient-to-r from-logo-purple-300 to-logo-emerald-500 "
                              />
                            </div>
                            <div className="text-center">
                              <span className="font-black text-xl text-gray-600">{minSilenceDuration}</span>
                              <span className="ml-1 text-base text-gray-600">seconds</span>
                            </div>
                            <div className="text-center mt-0 text-sm text-gray-500">Shorter = detect more pauses</div>
                          </div>
                        </Card>
                        <Card className="overflow-hidden border-none shadow-lg bg-white ">
                          <div className="bg-gradient-to-r from-orange-300 to-logo-rose-300 py-3 px-6 ">
                            <h3 className="text-white font-black">Min Spacing Between Content</h3>
                          </div>
                          <div className="p-6 px-11 py-6">
                            <div className="mb-4">
                              <Slider
                                value={[minSpacingDuration]}
                                min={0.0}
                                max={5}
                                step={0.1}
                                onValueChange={(value) => setMinSpacingDuration(value[0])}
                                className="py-4"
                                rangeClassName="bg-gradient-to-r from-orange-300 to-logo-rose-300 "
                              />
                            </div>
                            <div className="text-center">
                              <span className="font-black text-xl text-gray-600">{minSpacingDuration.toFixed(1)}</span>
                              <span className="ml-1 text-base text-gray-600">seconds</span>
                            </div>
                            <div className="text-center text-sm mt-0 text-gray-500">
                              Minimum pause between speaking parts
                            </div>
                          </div>
                        </Card>
                        <Card className="overflow-hidden border-none shadow-lg bg-white ">
                          <div className="bg-gradient-to-r from-pink-400 to-cyan-400 py-3 px-6 ">
                            <h3 className="text-white font-black">Preserve Natural Pacing</h3>
                          </div>
                          <div className="p-6 px-11 py-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="mb-1 text-gray-600 text-sm mr-2">
                                  Maintain the relative length of pauses
                                </p>
                              </div>
                              <Switch
                                checked={preserveNaturalPacing}
                                onCheckedChange={setPreserveNaturalPacing}
                                className="data-[state=checked]:bg-gray-400 "
                              />
                            </div>
                          </div>
                        </Card>
                        <Card className="overflow-hidden border-none shadow-lg bg-white ">
                          <div className="bg-gradient-to-r from-logo-teal-500 to-logo-amber-300 py-3 px-6 ">
                            <h3 className="text-white font-black">Compatibility Mode</h3>
                          </div>
                          <div className="p-6 px-11">
                            <Select value={compatibilityMode} onValueChange={(value) => setCompatibilityMode(value)}>
                              <SelectTrigger className="w-full mb-2 border-logo-teal-200 focus:ring-logo-teal-500 ">
                                <SelectValue placeholder="Select compatibility mode" />
                              </SelectTrigger>
                              <SelectContent className="">
                                <SelectItem value="standard">Standard Quality (Original SR)</SelectItem>
                                <SelectItem value="high">
                                  High Compatibility (44.1kHz or 22.05kHz for Mobile Long Audio)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="text-xs mt-3.5 text-gray-500">
                              High Compatibility for better playback on mobile/AirPods. May reduce sample rate for long
                              audio on mobile.
                            </div>
                          </div>
                        </Card>
                      </div>
                    </TabsContent>
                  </Tabs>
                </motion.div>

                {/* Gradient order: emerald/teal → pink → orange → gray-600 (center) → purple → sky → teal/emerald */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mb-6 text-center font-serif font-black text-base rounded-sm"
                >
                  <Button
                    className={cn(
                      "w-full py-7 text-lg font-medium tracking-wider rounded-xl transition-all",
                      "shadow-lg hover:shadow-none active:shadow-none text-white",
                      // Multi-stop gradient
                      "bg-gradient-to-r from-logo-purple-300 via-logo-teal-500 to-orange-300",
                      "",
                      "hover:brightness-[1.06] active:brightness-95",
                    )}
                    disabled={!originalBuffer || isProcessing || !durationLimits}
                    onClick={processAudioAdjusterAction}
                  >
                    <div className="flex items-center justify-center">
                      {isProcessing && (
                        <div className="mr-3 h-5 w-5">
                          <svg
                            className="animate-spin h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291
  A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        </div>
                      )}
                      <Wand2 className="mr-2 h-4 w-4 text-white" />
                      <span className="font-black text-base text-white tracking-tight">
                        {isProcessing ? "Processing..." : "Process Audio"}
                      </span>
                    </div>
                  </Button>
                </motion.div>

                <div className="space-y-6 mt-6">
                  {originalUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-gray-50 to-muted ">
                        <div className="bg-gradient-to-r from-gray-600 to-gray-500 py-3 px-6 ">
                          <h3 className="text-white font-black">Original Audio</h3>
                        </div>
                        <div className="p-6 py-4 px-3.5">
                          <div className="bg-white rounded-sm p-3 shadow-md mb-3.5 px-0">
                            <audio controls className="w-full" src={originalUrl}></audio>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 text-center shadow-md bg-white rounded-smll rounded-sm py-3.5">
                              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 ">Duration</div>
                              <div className="font-black text-gray-600 text-sm">
                                {originalBuffer ? formatTime(originalBuffer.duration) : "--"}
                              </div>
                            </div>
                            <div className="p-3 text-center shadow-md bg-white rounded-smll rounded-sm py-3.5">
                              <div className="text-xs uppercase tracking-wide mb-1  text-gray-500 ">File Size</div>
                              <div className="font-black text-gray-600 text-sm">{formatFileSize(file?.size || 0)}</div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                  {isProcessingComplete && processedUrl && (
                    <Card className="p-6 bg-white shadow-lg border border-gray-200">
                      <h3 className="text-xl font-bold mb-4 text-gray-800">Processed Audio</h3>
                      <div className="space-y-4">
                        <audio controls className="w-full" src={processedUrl} />
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button
                            onClick={downloadProcessedAudioAction}
                            className="flex-1 bg-gradient-to-r from-logo-teal-500 to-logo-blue-400 hover:from-logo-teal-600 hover:to-logo-blue-500 text-white"
                          >
                            Download Processed Audio
                          </Button>
                          <SaveMeditationDialog
                            audioUrl={processedUrl}
                            originalFileName={file?.name || "meditation"}
                            duration={actualDuration || targetDuration * 60}
                            source="adjuster"
                            metadata={{
                              targetDuration,
                              pausesAdjusted,
                            }}
                          >
                            <Button className="flex-1 bg-gradient-to-r from-logo-purple-500 to-logo-rose-400 hover:from-logo-purple-600 hover:to-logo-rose-500 text-white">
                              <BookmarkPlus className="w-4 h-4 mr-2" />
                              Save to Library
                            </Button>
                          </SaveMeditationDialog>
                        </div>
                        {actualDuration && (
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              <strong>Actual Duration:</strong> {formatTime(actualDuration)}
                            </p>
                            <p>
                              <strong>Target Duration:</strong> {formatTime(targetDuration * 60)}
                            </p>
                            <p>
                              <strong>Pauses Adjusted:</strong> {pausesAdjusted}
                            </p>
                            <p>
                              <strong>File Size:</strong> {(processedFileSize / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              </>
            ) : (
              // == Encoder UI ==
              <motion.div
                key="encoder-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <motion.div
                  className="text-gray-600"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="overflow-hidden bg-white max-w-2xl mx-auto rounded-2xl shadow-none">
                    <div className="p-6 text-sm font-black py-0 bg-transparent shadow-none">
                      <div className="grid md:grid-cols-2 gap-6 text-gray-600 pb-2">
                        <div className="text-center">
                          <Label htmlFor="meditation-title" className="text-gray-600 font-black">
                            Meditation Title
                          </Label>
                          <Input
                            id="meditation-title"
                            type="text"
                            value={meditationTitle}
                            onChange={handleMeditationTitleChange}
                            placeholder="My Custom Meditation"
                            className="mt-1 text-xs border-gray-500 focus-visible:border-gray-600 placeholder:text-gray-500 font-black text-gray-500 shadow-md"
                          />
                        </div>
                        <div className="text-center">
                          <Label htmlFor="encoder-duration" className="text-gray-600 font-black">
                            Duration (minutes)
                          </Label>
                          <Input
                            id="encoder-duration"
                            type="number"
                            value={encoderTotalDuration / 60}
                            onChange={handleDurationChange}
                            min="1"
                            className="mt-1 text-xs font-black border-gray-500 focus-visible:border-gray-600 text-gray-500 shadow-md"
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-4"
                >
                  <div className="flex flex-col gap-6">
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="p-6 bg-transparent px-0 py-3 pb-0 pt-0"
                    >
                      <div className="p-0.5 bg-gradient-to-r from-logo-teal-500 to-logo-purple-300 border-indigo-200 border-0 px-[5px] py-1 pl-1 pr-1 shadow-lg rounded-sm">
                        <div className="bg-white p-4 border-rose-200 border-0 rounded-sm shadow-inner">
                          <div className="text-center">
                            <Textarea
                              id="custom-instruction"
                              value={customInstructionText}
                              onChange={handleCustomInstructionChange}
                              placeholder="Enter an instruction..."
                              className="mt-2 text-sm font-serif font-black text-indigo-400 placeholder-indigo-400 resize-none bg-transparent border-none focus:border-none focus:ring-0 focus:ring-offset-0 focus:outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                    <RecorderSection
                      className="hidden lg:block"
                      inputId="recording-label-desktop"
                      recordingLabel={recordingLabel}
                      onRecordingLabelChange={handleRecordingLabelChange}
                      isRecording={isRecording}
                      startRecording={startRecording}
                      stopRecording={stopRecording}
                      readyToAddToTimelineRecording={readyToAddToTimelineRecording}
                      timelineEvents={timelineEvents}
                      addEventToTimeline={addEventToTimeline}
                      setReadyToAddToTimelineRecording={setReadyToAddToTimelineRecording}
                      setRecordedBlobs={setRecordedBlobs}
                      setRecordingLabel={setRecordingLabel}
                      recordingPreviewRef={recordingPreviewRef}
                    />
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="overflow-hidden border-none shadow-lg bg-white ">
                      <div className="bg-gradient-to-r from-logo-blue-400 to-logo-amber-300 py-3 px-6 text-center">
                        <h3 className="text-white flex items-center font-black text-left">
                          <Music2 className="h-4 w-4 mr-2" />
                          Sound Cues
                        </h3>
                      </div>
                      <div className="p-6 pt-[5px] flex flex-col space-y-4">
                        <div className="flex-1 h-auto">
                          <Accordion type="single" collapsible className="w-full">
                            <AccordionItem value="musical-notes">
                              <AccordionTrigger className="text-gray-600 hover:no-underline py-3 font-serif font-black">
                                <div className="flex items-center justify-between w-full">
                                  <span>Notes</span>
                                  <div className="flex flex-col gap-2 mr-6" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center gap-2 mb-[3px]">
                                      <span className="text-xs text-gray-500">Type</span>
                                      <select
                                        value={noteType}
                                        onChange={(e) => setNoteType(e.target.value as "piano" | "synth" | "harp")}
                                        className="text-xs bg-white border border-gray-300 rounded px-2 py-1"
                                      >
                                        <option value="piano">Piano</option>
                                        <option value="synth">Synth</option>
                                        <option value="harp">Harp</option>
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-500">Multi-Note</span>
                                      <button
                                        onClick={() => {
                                          setMultiNoteMode(!multiNoteMode)
                                          setSelectedNotes([])
                                        }}
                                        className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
                                          multiNoteMode ? "bg-gray-500" : "bg-gray-200"
                                        }`}
                                      >
                                        <span
                                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                            multiNoteMode ? "translate-x-[1.125rem]" : "translate-x-0.5"
                                          }`}
                                        />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pb-4">
                                {multiNoteMode && (
                                  <div className="p-3 bg-gray-50 rounded-sm mb-1.5 shadow-inner py-3 px-3">
                                    <div className="flex items-center justify-between">
                                      <div className="text-gray-500 text-sm">
                                        {selectedNotes.length > 0 ? selectedNotes.join(", ") : "None"}
                                      </div>
                                      {selectedNotes.length > 1 && (
                                        <Button
                                          size="sm"
                                          onClick={() => {
                                            console.log("[v0] Chord button clicked, selectedNotes:", selectedNotes)
                                            console.log("[v0] multiNoteMode:", multiNoteMode)
                                            playChordPreview()
                                          }}
                                          className="bg-gradient-to-r from-gray-600 to-gray-500 text-white font-serif font-black text-xs rounded-sm shadow-md"
                                        >
                                          Play Chord
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <Accordion type="single" collapsible className="w-full">
                                  {Object.entries(
                                    Object.entries(MUSICAL_NOTES).reduce(
                                      (acc, [_, notes]) => {
                                        notes.forEach((note) => {
                                          const octave = `Octave ${note.octave}`
                                          if (!acc[octave]) acc[octave] = []
                                          acc[octave].push(note)
                                        })
                                        return acc
                                      },
                                      {} as Record<string, any[]>,
                                    ),
                                  ).map(([octave, notes]) => (
                                    <AccordionItem value={octave} key={octave} className="border-b border-gray-100 ">
                                      <AccordionTrigger className="text-gray-500 hover:no-underline py-3 font-serif font-black">
                                        {octave}
                                      </AccordionTrigger>
                                      <AccordionContent className="pb-4">
                                        <div className="space-y-2 text-gray-600">
                                          {notes.map((note) => {
                                            const noteString = `${note.note}${note.octave}`
                                            const isSelected = multiNoteMode && selectedNotes.includes(noteString)
                                            const isSingleSelected = !multiNoteMode && selectedSoundCue?.id === note.id

                                            return (
                                              <div
                                                key={note.id}
                                                className="flex items-center gap-2 font-black font-serif"
                                              >
                                                <Button
                                                  variant={isSingleSelected ? "default" : "ghost"}
                                                  size="sm"
                                                  className={`flex-1 justify-start rounded-sm font-black font-serif text-gray-600 ${
                                                    isSelected
                                                      ? "bg-white shadow-md border-2 border-gray-500 "
                                                      : isSingleSelected
                                                        ? "bg-white shadow-md text-gray-600 border-gray-500 border-2 hover:bg-gray-50 "
                                                        : "hover:bg-gray-50 "
                                                  }`}
                                                  onClick={() => handleNoteSelection(note)}
                                                >
                                                  {note.name}
                                                </Button>
                                                {!multiNoteMode && (
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={async () =>
                                                      await playSingleNote(note.note, note.octave, noteType)
                                                    }
                                                    className="hover:bg-logo-emerald-50 "
                                                    title={`Preview ${note.name}`}
                                                  >
                                                    <Play className="h-4 w-4" />
                                                  </Button>
                                                )}
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  ))}
                                </Accordion>
                              </AccordionContent>
                            </AccordionItem>
                            <AccordionItem value="miscellaneous">
                              <AccordionTrigger className="text-gray-600 hover:no-underline py-3 font-serif font-black">
                                Miscellaneous
                              </AccordionTrigger>
                              <AccordionContent className="pb-4">
                                <div className="text-center py-8 text-gray-500 ">
                                  <div className="mb-2 text-lg font-black">Coming Soon!</div>
                                  <div className="text-sm">
                                    Additional sound cues are being developed and will be available in a future update.
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                        <div className="h-[11px]"></div>
                        <Button
                          className="bg-gradient-to-r from-logo-blue-400 to-logo-amber-300 shadow-md text-white rounded-sm hover:shadow-none font-serif font-black mt-4"
                          onClick={handleAddInstructionSoundEvent}
                          disabled={!customInstructionText.trim() || (!selectedSoundCue && selectedNotes.length === 0)}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" />
                          <span className="font-black font-serif">Add to Timeline</span>
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                </motion.div>
                <RecorderSection
                  className="lg:hidden"
                  inputId="recording-label-mobile"
                  recordingLabel={recordingLabel}
                  onRecordingLabelChange={handleRecordingLabelChange}
                  isRecording={isRecording}
                  startRecording={startRecording}
                  stopRecording={stopRecording}
                  readyToAddToTimelineRecording={readyToAddToTimelineRecording}
                  timelineEvents={timelineEvents}
                  addEventToTimeline={addEventToTimeline}
                  setReadyToAddToTimelineRecording={setReadyToAddToTimelineRecording}
                  setRecordedBlobs={setRecordedBlobs}
                  setRecordingLabel={setRecordingLabel}
                  recordingPreviewRef={recordingPreviewRef}
                />

                {/* Timeline Editor for Labs */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                  <Card className="overflow-hidden border-none shadow-lg bg-white ">
                    <div className="bg-gradient-to-r from-gray-600 to-gray-500 px-6 py-3">
                      <h3 className="text-white flex items-center font-black text-base">
                        <CircleDotDashed className="h-5 w-5 mr-2" />
                        Timeline Editor
                      </h3>
                    </div>
                    <div className="p-6 px-7">
                      <VisualTimeline
                        events={timelineEvents}
                        totalDuration={encoderTotalDuration}
                        onUpdateEvent={updateEventStartTime}
                        onRemoveEvent={removeTimelineEvent}
                        onDuplicateEvent={handleDuplicateEvent}
                        selectedInstrument={noteType}
                        playSingleNote={timelinePlaySingleNote}
                        playChordPreview={timelinePlayChordPreview}
                      />
                    </div>
                  </Card>
                </motion.div>

                {/* Generate Audio Button */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
                  <Button
                    onClick={handleExportAudio}
                    disabled={isGeneratingAudio || timelineEvents.length === 0}
                    className={cn(
                      "w-full py-7 text-lg font-medium tracking-wider rounded-sm transition-all",
                      "shadow-lg hover:shadow-none active:shadow-none text-white",
                      "bg-gradient-to-r from-logo-purple-300 via-logo-teal-500 to-orange-300",
                      "",
                      "hover:brightness-[1.06] active:brightness-95",
                    )}
                  >
                    <div className="flex items-center justify-center font-black">
                      {isGeneratingAudio && (
                        <div className="mr-3 h-5 w-5">
                          <svg
                            className="animate-spin h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                        </div>
                      )}
                      <Mic className="mr-2 h-4 w-4" />
                      <span className="font-black tracking-tight text-base">
                        {isGeneratingAudio ? "Generating..." : "Generate Audio"}
                      </span>
                    </div>
                  </Button>
                </motion.div>

                {generatedAudioUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-gray-50 to-muted ">
                      <div className="bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 py-3 px-6 ">
                        <h3 className="text-white font-black">Generated Audio</h3>
                      </div>
                      <div className="p-6 px-3.5 py-4">
                        <div className="bg-white p-3 rounded-sm shadow-md mb-3.5 px-0">
                          <audio ref={encoderAudioRef} controls className="w-full" src={generatedAudioUrl}></audio>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3.5">
                          <div className="p-3 rounded-lg text-center bg-white shadow-md py-3.5">
                            <div className="text-xs uppercase tracking-wide mb-1 text-gray-500">Duration</div>
                            <div className="font-black text-gray-600 text-sm">{formatTime(encoderTotalDuration)}</div>
                          </div>
                          <div className="p-3 rounded-lg text-center bg-white shadow-md py-3.5">
                            <div className="text-xs uppercase tracking-wide mb-1 text-gray-500">File Size</div>
                            <div className="font-black text-sm text-gray-600">
                              {formatFileSize(generatedAudioFileSize || 0)}
                            </div>
                          </div>
                        </div>
                        <Button
                          className="w-full py-4 rounded-xl shadow-md bg-gradient-to-r from-logo-teal-500 to-logo-emerald-500 hover:shadow-none transition-shadow border-none "
                          onClick={() => {
                            if (generatedAudioUrl) {
                              const a = document.createElement("a")
                              a.href = generatedAudioUrl
                              a.download = `${meditationTitle.replace(/\s/g, "_") || "meditation"}.wav`
                              document.body.appendChild(a)
                              a.click()
                              document.body.removeChild(a)
                            }
                          }}
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          Download
                        </Button>
                        <SaveMeditationDialog
                          audioUrl={generatedAudioUrl}
                          originalFileName={meditationTitle || "meditation"}
                          duration={encoderTotalDuration}
                          source="encoder"
                          metadata={{
                            instructionCount: timelineEvents.length,
                            meditationTitle,
                          }}
                        >
                          <Button className="w-full py-4 rounded-xl shadow-md bg-gradient-to-r from-logo-purple-500 to-logo-rose-400 hover:from-logo-purple-600 hover:to-logo-rose-500 text-white mt-3">
                            <BookmarkPlus className="w-4 h-4 mr-2" />
                            Save to Library
                          </Button>
                        </SaveMeditationDialog>
                      </div>
                    </Card>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </HeroCardWrapper>
  )
}
