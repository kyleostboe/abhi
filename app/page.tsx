"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert" // Import Alert component
import {
  AlertTriangle,
  Music2Icon,
  Mic,
  StopCircle,
  Play,
  PlusCircle,
  CircleDotDashed,
  BookmarkPlus,
  Volume2,
  Upload,
} from "lucide-react" // Import Copy icon
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { Navigation } from "@/components/navigation"
import { TimerWheel } from "@/components/timer-wheel"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { useToast } from "@/hooks/use-toast"
import { VisualTimeline } from "@/components/visual-timeline"
import { cn, formatTime, monitorMemory, formatFileSize } from "@/lib/utils"
import { getAudioContext, bufferToWav, bufferToWebM, type BufferToWavMetadata } from "@/lib/audio-utils" // Import from audio-utils
import {
  runAdjusterWorkflow,
  detectSilenceRegions as computeSilenceRegions,
  type DetectSilenceOptions,
} from "@/lib/adjuster-workflow"
import type { SavedMeditation } from "@/lib/meditation-library"
import type { Instruction, SoundCue, TimelineEvent } from "@/lib/types" // Import types
import { useMobile } from "@/hooks/use-mobile" // Import useMobile hook
import { EVENT_COLORS } from "@/lib/constants" // Import EVENT_COLORS
import * as Tone from "tone"
import { SaveMeditationDialog } from "@/components/save-meditation-dialog"
import { AudioInfoMenu } from "@/components/audio-info-menu"

const ADJUSTER_SESSION_KEY = "abhi_last_adjuster_session"
const ENCODER_SESSION_KEY = "abhi_last_encoder_session"
const ACTIVE_MODE_SESSION_KEY = "abhi_last_active_mode"

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
        <div className="bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 py-3 px-6 text-center">
          <h3 className="text-white flex items-center font-serif font-black">
            <Mic className="h-4 w-4 mr-2" />
            Recorder
          </h3>
        </div>
        <div className="p-6 pt-3.5 space-y-4">
          <input
            id={inputId}
            value={recordingLabel}
            onChange={onRecordingLabelChange}
            placeholder="Describe this recording..."
            className="flex w-full ring-offset-background file:border-0 file:bg-white file:text-xs file:font-medium file:text-foreground placeholder:text-logo-rose-300 focus-visible:outline-none disabled:cursor-not-allowed md:text-xs rounded-[10px] bg-white py-4 px-4 text-xs focus-visible: text-logo-rose-400 font-black text-gray-500 border-stone-300 mt-2 border-0 shadow-2xl h-9"
          />
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            variant={isRecording ? "destructive" : "default"}
            disabled={!recordingLabel.trim() && !isRecording}
            className={cn(
              "w-full bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 shadow-md text-white rounded-[11px] hover:shadow-none font-serif font-black",
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
                  className="w-full bg-gradient-to-br from-logo-blue-400 to-logo-emerald-500 shadow-md text-white rounded-sm hover:shadow-none font-black"
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

type SavedTimelineEntry = NonNullable<SavedMeditation["metadata"]["timeline"]>[number]

const deriveMeditationTitle = (meditation: any): string => {
  const metadataTitle =
    typeof meditation?.metadata?.meditationTitle === "string" && meditation.metadata.meditationTitle.trim().length > 0
      ? meditation.metadata.meditationTitle.trim()
      : null

  const savedTitle =
    typeof meditation?.title === "string" && meditation.title.trim().length > 0 ? meditation.title.trim() : null

  const originalFileName =
    typeof meditation?.originalFileName === "string" && meditation.originalFileName.trim().length > 0
      ? meditation.originalFileName.replace(/\.[^/.]+$/, "").trim()
      : null

  return metadataTitle ?? savedTitle ?? originalFileName ?? "My Custom Meditation"
}

const deriveMeditationFileName = (meditation: any): string => {
  const providedName =
    typeof meditation?.originalFileName === "string" && meditation.originalFileName.trim().length > 0
      ? meditation.originalFileName.trim()
      : null

  if (providedName) return providedName

  const derivedTitle = deriveMeditationTitle(meditation).trim() || "Imported Meditation"
  const lower = derivedTitle.toLowerCase()
  const hasExtension = [".wav", ".mp3", ".m4a", ".ogg"].some((ext) => lower.endsWith(ext))

  return hasExtension ? derivedTitle : `${derivedTitle}.wav`
}

interface TimelineItem {
  id: string
  type: "instruction" | "sound" | "recorded_voice" | "instruction_sound" | "recording" | "recorded"
  duration: number // in seconds
  content?: Instruction | SoundCue | { url: string; label: string; duration: number }
  instructionText?: string
  soundCueId?: string
  soundCueName?: string
  soundCueSrc?: string
  instrument?: string
  recordedAudioUrl?: string
  recordedInstructionLabel?: string
  color?: string
  startTime: number
  recordingStoragePath?: string
}

const SOUND_CUES_LIBRARY: SoundCue[] = [
  { id: "ambient-forest", name: "Forest Ambiance", src: "/sounds/forest.mp3", duration: 60 },
  { id: "ocean-waves", name: "Ocean Waves", src: "/sounds/ocean.mp3", duration: 60 },
  { id: "gentle-rain", name: "Gentle Rain", src: "/sounds/rain.mp3", duration: 60 },
  { id: "singing-bowl", name: "Singing Bowl", src: "/sounds/singing_bowl.mp3", duration: 15 },
  { id: "chimes", name: "Wind Chimes", src: "/sounds/chimes.mp3", duration: 30 },
]

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

let sampler: Tone.Sampler | null = null
let reverb: Tone.Reverb | null = null
let isLoading = false
let isLoaded = false
let loadPianoPromise: Promise<void> | null = null

const ensureTone = async () => {
  if (typeof window !== "undefined" && (window as any).Tone) {
    return (window as any).Tone
  }
  const mod = await import("tone")
  return mod
}

const isAbortError = (error: unknown): boolean => {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "AbortError"
  }
  if (typeof error === "object" && error !== null && "name" in error) {
    return (error as { name?: string }).name === "AbortError"
  }
  return false
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
  if (isLoaded && sampler) return

  if (loadPianoPromise) {
    await loadPianoPromise
    return
  }

  const ToneModule = await ensureTone()

  const loadPromise = async () => {
    isLoading = true

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

    const createdReverb = new ToneModule.Reverb({ wet, decay, preDelay: 0.01 }).toDestination()
    await createdReverb.generate()

    const loadedSampler = new ToneModule.Sampler({
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
    }).connect(createdReverb)

    await ToneModule.loaded()

    reverb = createdReverb
    sampler = loadedSampler
    isLoaded = true
    console.log("[v0] Piano sampler fully loaded and ready")
  }

  loadPianoPromise = loadPromise()

  try {
    await loadPianoPromise
  } catch (error) {
    console.error("[v0] Error loading piano:", error)
    isLoaded = false
    if (sampler) {
      try {
        sampler.dispose()
      } catch (e) {
        console.warn("[v0] Error disposing sampler after failure:", e)
      }
      sampler = null
    }
    if (reverb) {
      try {
        reverb.dispose()
      } catch (e) {
        console.warn("[v0] Error disposing reverb after failure:", e)
      }
      reverb = null
    }
    throw error
  } finally {
    isLoading = false
    loadPianoPromise = null
  }
}

const playPianoNote = async (noteString: string, duration = 0.45, velocity = 0.9) => {
  try {
    await startPianoAudio()

    if (!isLoaded || !sampler || !sampler.loaded) {
      console.log("[v0] Piano not loaded, initializing...")
      await loadPiano()
    }

    if (!sampler || !sampler.loaded) {
      throw new Error("Piano sampler is not loaded")
    }

    const Tone = await ensureTone()
    console.log(`[v0] Playing piano note: ${noteString}`)
    const activeSampler = sampler
    if (!activeSampler) {
      throw new Error("Piano sampler reference unavailable")
    }
    activeSampler.triggerAttackRelease(noteString, duration, Tone.now(), velocity)
  } catch (error) {
    console.error("[v0] Error playing piano note:", error)
    // Don't reset isLoaded here to avoid constant reloading
    throw error
  }
}

export default function Home() {
  const { toast } = useToast()

  const [activeMode, setActiveMode] = useState<"adjuster" | "encoder">("adjuster")
  const [shouldScrollToAdjuster, setShouldScrollToAdjuster] = useState(false)
  const [activeTab, setActiveTab] = useState<"adjuster" | "encoder">("adjuster") // State for tab navigation

  // == States for Length Adjuster ==
  const [file, setFile] = useState<File | null>(null)
  const [displayedFileName, setDisplayedFileName] = useState<string | null>(null)
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null)
  const [processedBufferState, setProcessedBufferState] = useState<AudioBuffer | null>(null)
  const [processedAudioMetadata, setProcessedAudioMetadata] = useState<BufferToWavMetadata | null>(null)
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
  const [analysisProgress, setAnalysisProgress] = useState<number | null>(null)
  const [quickAdjustRange, setQuickAdjustRange] = useState<{ minSeconds: number } | null>(null)
  const [actualDuration, setActualDuration] = useState<number | null>(null)
  const [isProcessingComplete, setIsProcessingComplete] = useState<boolean>(false)
  const [processedFileSize, setProcessedFileSize] = useState<number>(0)
  const isMobileDevice = useMobile() // Use the useMobile hook
  const [memoryWarning, setMemoryWarning] = useState<boolean>(false) // Corrected type to boolean
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const adjusterSectionRef = useRef<HTMLDivElement>(null)
  const timelineEditorRef = useRef<HTMLDivElement>(null)
  const timelineUploadInputRef = useRef<HTMLInputElement>(null)
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const silenceAnalysisAbortRef = useRef<AbortController | null>(null)
  const adjusterCompressionTokenRef = useRef(0)
  const encoderCompressionTokenRef = useRef(0)
  const [processedDistributionBlob, setProcessedDistributionBlob] = useState<Blob | null>(null)
  const [generatedDistributionBlob, setGeneratedDistributionBlob] = useState<Blob | null>(null)
  const [loadedLibraryContext, setLoadedLibraryContext] = useState<{
    id: string
    title: string
    duration: number
  } | null>(null)

  const analysisLowerBoundSeconds = useMemo(() => {
    if (!audioAnalysis) {
      return null
    }

    const minSeconds = audioAnalysis.contentDuration + audioAnalysis.silenceRegions * minSpacingDuration
    if (!Number.isFinite(minSeconds) || minSeconds <= 0) {
      return null
    }

    return Math.max(1, Math.round(minSeconds))
  }, [audioAnalysis, minSpacingDuration])

  // == States for Labs ==
  const [meditationTitle, setMeditationTitle] = useState<string>("My Custom Meditation")
  const [encoderTotalDuration, setEncoderTotalDuration] = useState<number>(600)
  const [encoderTimelineOriginalDuration, setEncoderTimelineOriginalDuration] = useState<number | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const lastEncoderDurationAdjustmentRef = useRef<number | null>(null)
  const [isTimerMode, setIsTimerMode] = useState(false)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [timerRemaining, setTimerRemaining] = useState<number>(600)
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const exportableTimelineMetadata = useMemo(() => {
    return timelineEvents.map((event) => {
      const isRecording = event.type === "recorded_voice"
      const text = isRecording
        ? event.recordedInstructionLabel?.trim() || "Recorded Instruction"
        : event.instructionText?.trim() || "Instruction"

      const safeStartTime = Number.isFinite(event.startTime) ? event.startTime : 0
      const rawDuration = typeof event.duration === "number" && Number.isFinite(event.duration) ? event.duration : 0
      const duration = rawDuration >= 0 ? rawDuration : 0
      const endTime = safeStartTime + duration

      return {
        id: event.id,
        text,
        startTime: safeStartTime,
        endTime,
        soundCueId: !isRecording ? event.soundCueId : undefined,
        soundId: isRecording ? (event.recordedAudioUrl ?? event.id) : (event.soundCueId ?? event.id),
        soundName: event.soundCueName,
        soundCueSrc: event.soundCueSrc,
        instrument: event.instrument,
        keepOriginal: isRecording,
        originalVolume: isRecording ? 100 : 0,
        soundVolume: !isRecording ? 100 : 0,
        recordingUrl: event.recordedAudioUrl,
        recordingLabel: event.recordedInstructionLabel,
        duration,
        eventType: event.type,
        color: event.color,
        recordingStoragePath: event.recordingStoragePath,
      }
    })
  }, [timelineEvents])

  const encoderSoundCuesUsed = useMemo(() => {
    const cues = new Set<string>()

    for (const event of timelineEvents) {
      if (event.type === "instruction_sound") {
        if (event.soundCueName?.trim()) {
          cues.add(event.soundCueName.trim())
        } else if (event.soundCueId?.trim()) {
          cues.add(event.soundCueId.trim())
        }
      }
    }

    return Array.from(cues)
  }, [timelineEvents])

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
  const [recordingLabel, setRecordingLabel] = useState<string>("")

  // Audio generation states
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false)
  const [generationProgress, setGenerationProgress] = useState<number>(0)
  const [generationStep, setGenerationStep] = useState<string>("")
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null)
  const [generatedAudioFileSize, setGeneratedAudioFileSize] = useState<number>(0)
  const [generatedAudioMetadata, setGeneratedAudioMetadata] = useState<BufferToWavMetadata | null>(null)

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
  const processedQualityWarning =
    processedAudioMetadata && (processedAudioMetadata.bitDepth === 8 || processedAudioMetadata.sampleRate <= 16000)
  const generatedQualityWarning =
    generatedAudioMetadata && (generatedAudioMetadata.bitDepth === 8 || generatedAudioMetadata.sampleRate <= 16000)
  const processedQualityWarningShownRef = useRef(false)
  const generatedQualityWarningShownRef = useRef(false)

  useEffect(() => {
    if (processedQualityWarning && processedAudioMetadata && !processedQualityWarningShownRef.current) {
      toast({
        title: "Reduced quality export",
        description: `Exported audio was downsampled to ${processedAudioMetadata.sampleRate.toLocaleString()} Hz and ${processedAudioMetadata.bitDepth}-bit mono to meet the size cap. Consider shorter sessions for higher fidelity.`,
      })
      processedQualityWarningShownRef.current = true
    } else if (!processedQualityWarning) {
      processedQualityWarningShownRef.current = false
    }
  }, [processedQualityWarning, processedAudioMetadata, toast])

  useEffect(() => {
    if (generatedQualityWarning && generatedAudioMetadata && !generatedQualityWarningShownRef.current) {
      toast({
        title: "Reduced quality export",
        description: `Output audio was downsampled to ${generatedAudioMetadata.sampleRate.toLocaleString()} Hz and ${generatedAudioMetadata.bitDepth}-bit mono to respect the file size limit. Shorter meditations will export at higher fidelity.`,
      })
      generatedQualityWarningShownRef.current = true
    } else if (!generatedQualityWarning) {
      generatedQualityWarningShownRef.current = false
    }
  }, [generatedQualityWarning, generatedAudioMetadata, toast])

  const addTimelineItem = useCallback((item: Instruction | SoundCue, type: "instruction" | "sound") => {
    const newItem: TimelineItem = {
      id: `${type}-${Date.now()}`,
      type,
      duration: type === "instruction" ? 60 : 5, // Default duration: 60s for instruction, 5s for sound
      content: item,
      startTime: 0, // Will be set by addEventToTimeline
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
        // Play the sound cue using the audio element
        if (encoderAudioRef.current) {
          encoderAudioRef.current.src = soundCue.src
          encoderAudioRef.current.play().catch((e) => console.error("Error playing sound cue:", e))
        }
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
              if (item.type === "sound" && item.content && typeof item.content.src === "string") {
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
    setGeneratedAudioMetadata(null)
    setGeneratedDistributionBlob(null)
    setGeneratedAudioFileSize(0)

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

      const audioBufferCache = new Map<string, AudioBuffer>()
      const fetchAudioBuffer = async (src: string) => {
        const cached = audioBufferCache.get(src)
        if (cached) {
          return cached
        }

        const response = await fetch(src)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
        audioBufferCache.set(src, audioBuffer)
        return audioBuffer
      }

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
                    const startDelay = noteIndex * 0.01
                    pianoSampler.triggerAttackRelease(noteString, 0.8, eventStartTime + startDelay, 0.9)
                  } else if (instrument === "synth") {
                    await loadSynth()
                    const startDelay = noteIndex * 0.01
                    synth.triggerAttackRelease(noteString, 0.8, eventStartTime + startDelay)
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
              const audioBuffer = await fetchAudioBuffer(event.soundCueSrc)
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
            const audioBuffer = await fetchAudioBuffer(event.recordedAudioUrl)
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
        } else if (event.type === "recording" && event.content?.url) {
          setGenerationStep(`Adding recorded block: ${event.content.label || "Untitled"}`)
          console.log(`Processing recorded block: ${event.content.url}`)

          try {
            const audioBuffer = await fetchAudioBuffer(event.content.url)
            const source = ctx.createBufferSource()
            const gainNode = ctx.createGain()

            source.buffer = audioBuffer
            source.connect(gainNode)
            gainNode.connect(ctx.destination)
            gainNode.gain.setValueAtTime(0.8, eventStartTime) // Higher volume for voice
            source.start(eventStartTime)

            console.log(`Successfully added recorded block at ${eventStartTime}`)
          } catch (error) {
            console.warn(`Could not load recorded block audio: ${event.content.url}`, error)
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

      setGenerationStep("Creating audio file...")
      setGenerationProgress(80)

      const wavResult = await bufferToWav(rendered, {
        preferCompatibility: compatibilityMode === "high",
        maxBytes: 48 * 1024 * 1024, // 48MB limit (under 50MB)
        onProgress: (p) => setGenerationProgress(80 + Math.floor((p / 100) * 20)),
        isMobile: isMobileDevice,
      })

      if (wavResult.blob.size === 0) {
        throw new Error("Generated WAV blob is empty. WAV conversion failed or resulted in no data.")
      }

      const { blob: wavBlob, ...metadata } = wavResult
      const url = URL.createObjectURL(wavBlob)

      setGeneratedAudioUrl(url)
      setGeneratedDistributionBlob(wavBlob)
      setGeneratedAudioFileSize(wavBlob.size)
      setGeneratedAudioMetadata(metadata)
      setGenerationProgress(100)
      setGenerationStep("Complete!")

      console.log("Audio export completed successfully!")
      toast({ title: "Export Complete", description: "Timeline audio exported with sound cues included!" })

      if (
        typeof window !== "undefined" &&
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ) {
        const compressionToken = ++encoderCompressionTokenRef.current
        void (async () => {
          try {
            await ensureTone()
            const { blob } = await bufferToWebM(rendered, {})
            if (encoderCompressionTokenRef.current === compressionToken) {
              setGeneratedDistributionBlob(blob)
              setGeneratedAudioFileSize(blob.size)
            }
          } catch (compressionError) {
            if (encoderCompressionTokenRef.current === compressionToken) {
              console.warn("[v0] Failed to prepare compressed encoder distribution:", compressionError)
            }
          }
        })()
      }
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
    }
  }

  const handleRecordingLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target?.value
    if (typeof value === "string") {
      setRecordingLabel(value)
    }
  }

  const normalizeDuration = useCallback((value: number) => {
    return Math.max(1, Math.floor(Number.isFinite(value) ? value : 0))
  }, [])

  const handleEncoderDurationChange = useCallback(
    (totalSeconds: number) => {
      setEncoderTotalDuration(normalizeDuration(totalSeconds))
    },
    [normalizeDuration],
  )

  useEffect(() => {
    if (!isTimerMode) {
      setTimerRemaining(normalizeDuration(encoderTotalDuration))
    }
  }, [encoderTotalDuration, isTimerMode, normalizeDuration])

  const clearTimerInterval = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }, [])

  const handleActivateTimer = useCallback(() => {
    clearTimerInterval()
    setTimerRemaining(normalizeDuration(encoderTotalDuration))
    setIsTimerMode(true)
    setIsTimerRunning(false)
  }, [clearTimerInterval, encoderTotalDuration, normalizeDuration])

  const handleStartTimer = useCallback(() => {
    const normalizedDuration = normalizeDuration(encoderTotalDuration)
    if (normalizedDuration <= 0) {
      return
    }

    setTimerRemaining((previous) => {
      if (previous <= 0 || previous > normalizedDuration) {
        return normalizedDuration
      }
      return previous
    })
    setIsTimerRunning(true)
  }, [encoderTotalDuration, normalizeDuration])

  const handleStopTimer = useCallback(() => {
    clearTimerInterval()
    setIsTimerRunning(false)
  }, [clearTimerInterval])

  const handleResetTimer = useCallback(() => {
    clearTimerInterval()
    setTimerRemaining(normalizeDuration(encoderTotalDuration))
    setIsTimerRunning(false)
  }, [clearTimerInterval, encoderTotalDuration, normalizeDuration])

  const handleReturnToEncoder = useCallback(() => {
    clearTimerInterval()
    setIsTimerRunning(false)
    setIsTimerMode(false)
    setTimerRemaining(normalizeDuration(encoderTotalDuration))
  }, [clearTimerInterval, encoderTotalDuration, normalizeDuration])

  useEffect(() => {
    if (!isTimerMode || !isTimerRunning) {
      clearTimerInterval()
      return
    }

    clearTimerInterval()
    timerIntervalRef.current = setInterval(() => {
      setTimerRemaining((previous) => {
        if (previous <= 1) {
          clearTimerInterval()
          setIsTimerRunning(false)
          return 0
        }
        return previous - 1
      })
    }, 1000)

    return () => {
      clearTimerInterval()
    }
  }, [clearTimerInterval, isTimerMode, isTimerRunning])

  useEffect(() => {
    return () => {
      clearTimerInterval()
    }
  }, [clearTimerInterval])

  const playSingleNote = async (note: string, octave: number, noteType: string) => {
    try {
      console.log(`[v0] Playing ${noteType} note: ${note}${octave}`)
      await startPianoAudio()

      const noteString = `${note}${octave}`

      if (noteType === "piano") {
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

        synth.triggerAttackRelease(noteString, 0.5)

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

        harp.triggerAttackRelease(noteString, 0.5)

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

  const playChordPreview = useCallback(
    async (notes?: string[]) => {
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

          const activeSampler = sampler
          if (activeSampler && isLoaded) {
            // Play all notes simultaneously using the Salamander piano sampler
            chordNotes.forEach((noteString) => {
              console.log("[v0] Playing Salamander piano note in chord:", noteString)
              activeSampler.triggerAttackRelease(noteString, 0.5)
            })
          } else {
            console.error("[v0] Piano sampler not available for chord")
          }
        } else if (noteType === "synth") {
          chordNotes.forEach(async (noteString, index) => {
            const synth = new Tone.Synth({
              oscillator: { type: "fatsawtooth" },
              envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
              filter: { frequency: 2000, type: "lowpass", rolloff: -12 },
              filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 0.8, baseFrequency: 200, octaves: 4 },
            })

            const synthGain = new Tone.Gain(0.3).toDestination()
            synth.connect(synthGain)

            console.log("[v0] Playing synth note in chord:", noteString)
            const startDelay = index * 0.01
            synth.triggerAttackRelease(noteString, 0.5, `+${startDelay}`)

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
    },
    [selectedNotes, noteType],
  )

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

  const clearLibraryData = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("abhi_meditation_library")
      localStorage.removeItem("abhi_meditation_playlists")
      localStorage.removeItem("abhi_adjuster_import")
      localStorage.removeItem("abhi_encoder_import")
      toast({
        title: "Library cleared",
        description: "All meditation data has been cleared for testing.",
      })
    }
  }, [toast])

  // Helper function to handle file loading and initial analysis
  const handleFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setDisplayedFileName(selectedFile.name)
    setOriginalUrl("")
    setProcessedUrl("")
    setAudioAnalysis(null)
    setActualDuration(null)
    setAnalysisProgress(null)
    setProcessedBufferState(null)
    setProcessedAudioMetadata(null)
    setIsProcessingComplete(false)
    setStatus(null)
    setMemoryWarning(false)
    setPausesAdjusted(0)
    setProcessingProgress(0)
    setProcessingStep("Loading audio...")
    setGeneratedAudioMetadata(null)
    setProcessedDistributionBlob(null)
    setProcessedFileSize(0)
    setQuickAdjustRange(null)
    setLoadedLibraryContext(null)

    if (typeof window === "undefined") return
    window.sessionStorage.removeItem(ADJUSTER_SESSION_KEY)

    if (silenceAnalysisAbortRef.current) {
      silenceAnalysisAbortRef.current.abort()
    }

    if (audioContextRef.current && audioContextRef.current.state === "running") {
      try {
        await audioContextRef.current.suspend()
      } catch (e) {
        console.warn("Error suspending AudioContext before loading new file:", e)
      }
    }

    let playbackUrl: string | null = null
    try {
      const context = audioContextRef.current || new AudioContext()
      audioContextRef.current = context

      if (context.state === "suspended") {
        await context.resume()
      }

      const arrayBuffer = await selectedFile.arrayBuffer()
      const buffer = await context.decodeAudioData(arrayBuffer.slice(0))
      setOriginalBuffer(buffer)
      playbackUrl = URL.createObjectURL(selectedFile)
      setOriginalUrl(playbackUrl)
      setProcessingStep("Analyzing audio...")
      setAnalysisProgress(0)
      setStatus({ message: "Analyzing audio...", type: "info" })

      const metadataUrl = URL.createObjectURL(selectedFile)
      const tempAudio = new Audio(metadataUrl)
      tempAudio.preload = "metadata"
      tempAudio.onloadedmetadata = () => {
        setActualDuration(tempAudio.duration)
        URL.revokeObjectURL(metadataUrl)
      }
      tempAudio.onerror = () => {
        console.error("Error loading audio metadata for duration.")
        URL.revokeObjectURL(metadataUrl)
      }
    } catch (error) {
      console.error("Error accessing audio context:", error)
      setStatus({ message: `Audio system error: ${error instanceof Error ? error.message : "Unknown"}`, type: "error" })
      setFile(null)
      setDisplayedFileName(null)
      setOriginalBuffer(null)
      setAnalysisProgress(null)
      if (playbackUrl) {
        URL.revokeObjectURL(playbackUrl)
      }
      setOriginalUrl("")
    }
  }

  const detectSilenceRegions = useCallback(
    (buffer: AudioBuffer, threshold: number, minDuration: number, options?: DetectSilenceOptions) =>
      computeSilenceRegions(buffer, threshold, minDuration, options),
    [],
  )

  const parseTimelineMetadata = useCallback((timelineMetadata: SavedTimelineEntry[]): TimelineEvent[] => {
    const parseNumber = (value: unknown): number | undefined => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value
      }
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) {
          return parsed
        }
      }
      return undefined
    }

    let lastKnownEnd = 0

    const events = timelineMetadata
      .map((entry, index) => {
        const id = typeof entry.id === "string" && entry.id.trim() ? entry.id : `timeline_${index}`
        const startTime = parseNumber(entry.startTime) ?? lastKnownEnd
        const explicitDuration = parseNumber(entry.duration)
        const endTimeFromMetadata = parseNumber(entry.endTime)
        const computedDuration =
          explicitDuration ??
          (endTimeFromMetadata !== undefined ? Math.max(0, endTimeFromMetadata - startTime) : undefined)
        const duration = computedDuration !== undefined && computedDuration > 0 ? computedDuration : undefined
        const endTime = startTime + (duration ?? 0)
        lastKnownEnd = Math.max(lastKnownEnd, endTime)

        const color =
          typeof entry.color === "string" && entry.color.trim()
            ? entry.color
            : EVENT_COLORS[index % EVENT_COLORS.length]

        const text = entry.text?.trim()
        const derivedType: TimelineEvent["type"] =
          entry.eventType === "recorded_voice" || entry.eventType === "instruction_sound"
            ? entry.eventType
            : entry.keepOriginal
              ? "recorded_voice"
              : "instruction_sound"

        if (derivedType === "recorded_voice") {
          const label = entry.recordingLabel?.trim() || text || `Recording ${index + 1}`
          const recordingUrl =
            typeof entry.recordingUrl === "string" && entry.recordingUrl.trim().length > 0
              ? entry.recordingUrl
              : typeof entry.soundSrc === "string" && entry.soundSrc.trim().length > 0
                ? entry.soundSrc
                : undefined

          const recordedEvent: TimelineEvent = {
            id,
            type: "recorded_voice",
            startTime,
            duration: duration ?? explicitDuration ?? 0,
            instructionText: text || label,
            recordedInstructionLabel: label,
            recordedAudioUrl: recordingUrl,
            color,
            keepOriginal: true,
          }

          if (entry.recordingStoragePath) {
            recordedEvent.recordingStoragePath = entry.recordingStoragePath
          }

          return recordedEvent
        }

        const matchingCue = SOUND_CUES_LIBRARY.find(
          (cue) =>
            (entry.soundCueId && cue.id === entry.soundCueId) ||
            (entry.soundId && cue.id === entry.soundId) ||
            (entry.soundName && cue.name === entry.soundName) ||
            (entry.soundCueSrc && cue.src === entry.soundCueSrc),
        )

        const soundCueName = entry.soundName?.trim() || matchingCue?.name || entry.soundId || `Sound Cue ${index + 1}`

        const instructionEvent: TimelineEvent = {
          id,
          type: "instruction_sound",
          startTime,
          instructionText: text || `Instruction ${index + 1}`,
          soundCueId: entry.soundCueId ?? entry.soundId ?? matchingCue?.id ?? undefined,
          soundCueName,
          soundCueSrc: entry.soundCueSrc ?? matchingCue?.src ?? undefined,
          instrument: entry.instrument ?? undefined,
          color,
          keepOriginal: Boolean(entry.keepOriginal),
        }

        if (duration !== undefined) {
          instructionEvent.duration = duration
        } else if (explicitDuration !== undefined) {
          instructionEvent.duration = explicitDuration
        } else if (matchingCue?.duration) {
          instructionEvent.duration = matchingCue.duration
        }

        return instructionEvent
      })
      .filter((event): event is TimelineEvent => Boolean(event))

    return events.sort((a, b) => a.startTime - b.startTime)
  }, [])

  const reconstructEncoderMeditation = useCallback(
    async (importData: any) => {
      console.log("[v0] Reconstructing encoder meditation with original cues:", importData)

      try {
        // Load the audio for analysis
        const response = await fetch(importData.processedAudioUrl)
        const audioBlob = await response.blob()
        const reconstructedFileName = deriveMeditationFileName(importData)
        const audioFile = new File([audioBlob], reconstructedFileName, { type: "audio/wav" })

        // Set the file for encoder
        setFile(audioFile)
        setOriginalUrl(URL.createObjectURL(audioFile))
        setDisplayedFileName(reconstructedFileName)

        setMeditationTitle(deriveMeditationTitle(importData))

        const timelineMetadata = Array.isArray(importData.metadata?.timeline)
          ? (importData.metadata.timeline as SavedTimelineEntry[])
          : null

        let reconstructedEvents: TimelineEvent[] = []

        if (timelineMetadata && timelineMetadata.length > 0) {
          reconstructedEvents = parseTimelineMetadata(timelineMetadata)
        } else {
          // Fallback for older saves without explicit timeline metadata
          if (importData.metadata?.instructionCount) {
            const eventDuration = importData.duration / importData.metadata.instructionCount

            for (let i = 0; i < importData.metadata.instructionCount; i++) {
              reconstructedEvents.push({
                id: `reconstructed_${i}`,
                type: "instruction_sound",
                startTime: i * eventDuration,
                duration: Math.min(eventDuration * 0.8, 60),
                instructionText: `Reconstructed instruction ${i + 1}`,
                soundCueId: SOUND_CUES_LIBRARY[0]?.id || "default_sound",
                soundCueName: SOUND_CUES_LIBRARY[0]?.name || "Default Sound",
                soundCueSrc: SOUND_CUES_LIBRARY[0]?.src || "",
                color: EVENT_COLORS[i % EVENT_COLORS.length],
              })
            }
          }
        }

        setTimelineEvents(reconstructedEvents)

        const reconstructedEnd = reconstructedEvents.reduce(
          (max, event) => Math.max(max, event.startTime + (event.duration ?? 0)),
          0,
        )
        const totalDuration = Math.max(importData.duration ?? 0, reconstructedEnd)
        setEncoderTotalDuration(totalDuration)
        setEncoderTimelineOriginalDuration(totalDuration)
        lastEncoderDurationAdjustmentRef.current = totalDuration

        setStatus({
          message: `Reconstructed "${importData.title}" with ${reconstructedEvents.length} timeline events.`,
          type: "success",
        })
        setGeneratedAudioMetadata(importData.metadata?.wav ?? null)
      } catch (error) {
        console.error("[v0] Error reconstructing encoder meditation:", error)
        setStatus({
          message: "Failed to reconstruct meditation timeline. Loading as basic audio file.",
          type: "error",
        })

        // Fallback to basic import
        const response = await fetch(importData.processedAudioUrl)
        const audioBlob = await response.blob()
        const fallbackFileName = deriveMeditationFileName(importData)
        const audioFile = new File([audioBlob], fallbackFileName, { type: "audio/wav" })
        setFile(audioFile)
        setOriginalUrl(URL.createObjectURL(audioFile))
        setDisplayedFileName(fallbackFileName)
        setEncoderTimelineOriginalDuration(null)
        lastEncoderDurationAdjustmentRef.current = null
      }
    },
    [
      setFile,
      setOriginalUrl,
      setMeditationTitle,
      setTimelineEvents,
      setEncoderTotalDuration,
      setStatus,
      setEncoderTimelineOriginalDuration,
      parseTimelineMetadata,
    ],
  )

  const importAsRecordedBlock = useCallback(
    async (importData: any) => {
      console.log("[v0] Importing meditation as recorded block:", importData)

      try {
        // Load the audio
        const response = await fetch(importData.processedAudioUrl)
        const audioBlob = await response.blob()
        const recordedBlockFileName = deriveMeditationFileName(importData)
        const audioFile = new File([audioBlob], recordedBlockFileName, { type: "audio/wav" })
        const objectUrl = URL.createObjectURL(audioFile)

        setFile(audioFile)
        setDisplayedFileName(recordedBlockFileName)
        setOriginalUrl(objectUrl)

        // Decode audio buffer for analysis
        const arrayBuffer = await audioFile.arrayBuffer()
        const buffer = await getAudioContext().decodeAudioData(arrayBuffer)
        if (silenceAnalysisAbortRef.current) {
          silenceAnalysisAbortRef.current.abort()
        }
        setOriginalBuffer(buffer)

        // Perform the same analysis as normal file upload
        setProcessingStep("Analyzing imported audio...")
        setAnalysisProgress(0)
        setStatus({ message: "Analyzing audio...", type: "info" })

        const metadataUrl = URL.createObjectURL(audioFile)
        const tempAudio = new Audio(metadataUrl)
        tempAudio.preload = "metadata"
        tempAudio.onloadedmetadata = () => {
          const duration = tempAudio.duration
          setActualDuration(duration)
          URL.revokeObjectURL(metadataUrl)
        }
        tempAudio.onerror = () => {
          console.error("Error loading audio metadata for duration.")
          URL.revokeObjectURL(metadataUrl)
        }

        // Create a single recorded block event for encoder
        const rawDurationCandidate =
          Number.isFinite(importData.duration) && importData.duration > 0 ? importData.duration : buffer.duration
        const safeDuration =
          Number.isFinite(rawDurationCandidate) && rawDurationCandidate > 0 ? rawDurationCandidate : 1
        const recordedLabel =
          typeof importData.title === "string" && importData.title.trim().length > 0
            ? importData.title.trim()
            : "Imported Meditation"

        const recordedEvent: TimelineEvent = {
          id: `imported_${Date.now()}`,
          type: "recorded_voice",
          startTime: 0,
          duration: safeDuration,
          recordedAudioUrl: objectUrl,
          recordedInstructionLabel: recordedLabel,
          color: EVENT_COLORS[0],
        }

        setTimelineEvents([recordedEvent])
        setEncoderTotalDuration(safeDuration)
        setEncoderTimelineOriginalDuration(safeDuration)
        lastEncoderDurationAdjustmentRef.current = safeDuration
        setGeneratedAudioMetadata(importData.metadata?.wav ?? null)
      } catch (error) {
        console.error("[v0] Error importing as recorded block:", error)
        setStatus({
          message: "Failed to import meditation. Please try again.",
          type: "error",
        })
        setAnalysisProgress(null)
      }
    },
    [
      setFile,
      setOriginalUrl,
      setOriginalBuffer,
      setProcessingStep,
      setActualDuration,
      setTimelineEvents,
      setEncoderTotalDuration,
      setEncoderTimelineOriginalDuration,
      setStatus,
      silenceAnalysisAbortRef,
      setAnalysisProgress,
    ],
  )

  const importFromLibrary = useCallback(
    async (importData: any, sourceTab: "adjuster" | "encoder") => {
      console.log("[v0] Importing from library:", importData, "to tab:", sourceTab)

      const persistSessionForMode = (mode: "adjuster" | "encoder", data: any) => {
        if (typeof window === "undefined") return
        try {
          if (mode === "adjuster") {
            window.sessionStorage.setItem(ADJUSTER_SESSION_KEY, JSON.stringify(data))
            window.sessionStorage.removeItem(ENCODER_SESSION_KEY)
          } else {
            window.sessionStorage.setItem(ENCODER_SESSION_KEY, JSON.stringify(data))
            window.sessionStorage.removeItem(ADJUSTER_SESSION_KEY)
          }
        } catch (error) {
          console.error(`[v0] Error persisting session for ${mode}:`, error)
        }
      }

      const scrollToAdjusterSection = () => {
        if (typeof window === "undefined" || !adjusterSectionRef.current) return
        adjusterSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
      }

      // Define importIntoAdjuster here or ensure it's accessible in scope
      const importIntoAdjuster = async (data: any) => {
        console.log("[v0] Importing into adjuster:", data)
        try {
          const response = await fetch(data.processedAudioUrl)
          const audioBlob = await response.blob()
          const importedFileName = deriveMeditationFileName(data)
          const audioFile = new File([audioBlob], importedFileName, { type: "audio/wav" })

          setFile(audioFile)
          setDisplayedFileName(importedFileName)
          setOriginalUrl(URL.createObjectURL(audioFile))
          setMeditationTitle(deriveMeditationTitle(data))

          const context = audioContextRef.current || new AudioContext()
          audioContextRef.current = context

          if (context.state === "suspended") {
            await context.resume()
          }

          const arrayBuffer = await audioFile.arrayBuffer()
          const buffer = await context.decodeAudioData(arrayBuffer)
          if (silenceAnalysisAbortRef.current) {
            silenceAnalysisAbortRef.current.abort()
          }
          setOriginalBuffer(buffer)

          setProcessingStep("Analyzing imported audio...")
          setAnalysisProgress(0)
          setStatus({ message: "Analyzing audio...", type: "info" })

          const url = URL.createObjectURL(audioFile)
          const tempAudio = new Audio(url)
          tempAudio.preload = "metadata"
          tempAudio.onloadedmetadata = () => {
            setActualDuration(tempAudio.duration)
            URL.revokeObjectURL(url)
          }
          tempAudio.onerror = () => {
            console.error("Error loading audio metadata for duration.")
            URL.revokeObjectURL(url)
          }
          setLoadedLibraryContext({
            id: data.id,
            title: data.title,
            duration: data.duration,
          })
        } catch (error) {
          console.error("[v0] Error importing into adjuster:", error)
          setStatus({
            message: `Error importing: ${error instanceof Error ? error.message : "Unknown"}`,
            type: "error",
          })
          setFile(null)
          setDisplayedFileName(null)
          setOriginalBuffer(null)
          setOriginalUrl("")
          setAudioAnalysis(null)
          setDurationLimits(null)
          setAnalysisProgress(null)
        }
      }

      if (sourceTab === "adjuster") {
        await importIntoAdjuster(importData)
        persistSessionForMode("adjuster", importData)
        if (importData.crossToolOpening && !isMobileDevice) {
          setShouldScrollToAdjuster(true)
        }
      } else if (sourceTab === "encoder") {
        const hasTimelineMetadata = Array.isArray(importData.metadata?.timeline)
          ? importData.metadata.timeline.length > 0
          : false

        if (hasTimelineMetadata || importData.crossToolOpening) {
          await reconstructEncoderMeditation(importData)
          persistSessionForMode("encoder", importData)
          if (typeof window !== "undefined") {
            requestAnimationFrame(() => {
              timelineEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            })
          }
        } else {
          await importAsRecordedBlock(importData)
          persistSessionForMode("encoder", importData)
          if (typeof window !== "undefined") {
            requestAnimationFrame(() => {
              timelineEditorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
            })
          }
        }
      }
    },
    [
      reconstructEncoderMeditation,
      importAsRecordedBlock,
      isMobileDevice,
      setActiveMode,
      setActiveTab,
      setStatus,
      setLoadedLibraryContext,
      silenceAnalysisAbortRef,
      setAnalysisProgress,
    ],
  )

  useEffect(() => {
    if (shouldScrollToAdjuster || activeMode !== "adjuster") {
      return
    }

    const scrollToAdjusterSection = () => {
      if (typeof window === "undefined" || !adjusterSectionRef.current) return
      adjusterSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" })
    }

    scrollToAdjusterSection()
    setShouldScrollToAdjuster(false)
  }, [shouldScrollToAdjuster, activeMode, adjusterSectionRef])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      window.sessionStorage.setItem(ACTIVE_MODE_SESSION_KEY, activeMode)
    } catch (error) {
      console.error("[v0] Unable to persist active mode:", error)
    }
  }, [activeMode])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleHashChange = () => {
      const hash = window.location.hash.substring(1)
      if (hash === "adjuster" || hash === "encoder") {
        setActiveTab(hash as "adjuster" | "encoder")
        setActiveMode(hash as "adjuster" | "encoder")
      }
    }

    const checkForImports = () => {
      let handled = false

      const adjusterImport = window.localStorage.getItem("abhi_adjuster_import")
      if (adjusterImport) {
        try {
          const importData = JSON.parse(adjusterImport)
          console.log("[v0] Loading meditation from library into adjuster:", importData)
          setActiveTab("adjuster")
          setActiveMode("adjuster")
          void importFromLibrary(importData, "adjuster")
        } catch (error) {
          console.error("[v0] Error loading adjuster import:", error)
        } finally {
          window.localStorage.removeItem("abhi_adjuster_import")
        }
        handled = true
      }

      const encoderImport = window.localStorage.getItem("abhi_encoder_import")
      if (encoderImport) {
        try {
          const importData = JSON.parse(encoderImport)
          console.log("[v0] Loading meditation from library into encoder:", importData)
          setActiveTab("encoder")
          setActiveMode("encoder")
          void importFromLibrary(importData, "encoder")
        } catch (error) {
          console.error("[v0] Error loading encoder import:", error)
        } finally {
          window.localStorage.removeItem("abhi_encoder_import")
        }
        handled = true
      }

      if (handled) {
        return
      }

      try {
        const lastMode = window.sessionStorage.getItem(ACTIVE_MODE_SESSION_KEY) as "adjuster" | "encoder" | null

        if (lastMode === "adjuster") {
          const persistedAdjuster = window.sessionStorage.getItem(ADJUSTER_SESSION_KEY)
          if (persistedAdjuster) {
            const importData = JSON.parse(persistedAdjuster)
            console.log("[v0] Restoring persisted adjuster meditation:", importData)
            setActiveTab("adjuster")
            setActiveMode("adjuster")
            void importFromLibrary(importData, "adjuster")
          }
        } else if (lastMode === "encoder") {
          const persistedEncoder = window.sessionStorage.getItem(ENCODER_SESSION_KEY)
          if (persistedEncoder) {
            const importData = JSON.parse(persistedEncoder)
            console.log("[v0] Restoring persisted encoder meditation:", importData)
            setActiveTab("encoder")
            setActiveMode("encoder")
            void importFromLibrary(importData, "encoder")
          }
        }
      } catch (error) {
        console.error("[v0] Error restoring persisted meditation:", error)
      }
    }

    handleHashChange()
    checkForImports()

    window.addEventListener("hashchange", handleHashChange)
    return () => {
      window.removeEventListener("hashchange", handleHashChange)
    }
  }, [importFromLibrary])

  const processAudioAdjusterAction = async () => {
    console.log("[v0] Processing button clicked")
    setIsProcessingComplete(false)
    const currentAudioContext = audioContextRef.current
    if (!originalBuffer || !currentAudioContext) {
      setStatus({ message: "Original audio or audio system not ready.", type: "error" })
      return
    }
    setIsProcessing(true)
    setProcessingProgress(0)
    setProcessingStep("Starting processing...")
    setProcessedAudioMetadata(null)
    setQuickAdjustRange(null)
    setProcessedDistributionBlob(null)
    setProcessedFileSize(0)

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

      const result = await runAdjusterWorkflow({
        audioContext: currentAudioContext,
        buffer: originalBuffer,
        settings: {
          targetDurationSeconds,
          silenceThreshold,
          minSilenceDuration,
          minSpacingDuration,
          preserveNaturalPacing,
          compatibilityMode,
        },
        isMobileDevice,
        callbacks: {
          onProgress: (progress) => setProcessingProgress(Math.max(0, Math.min(100, Math.round(progress)))),
          onStep: (step) => setProcessingStep(step),
          onMemoryWarning: () => setMemoryWarning(true),
        },
      })

      const url = URL.createObjectURL(result.wavBlob)

      setProcessedUrl(url)
      setProcessedDistributionBlob(result.wavBlob)
      setActualDuration(result.processedBuffer.duration)
      setProcessedBufferState(result.processedBuffer)
      setProcessedFileSize(result.wavBlob.size)
      setProcessedAudioMetadata(result.wavMetadata)
      setPausesAdjusted(result.pausesAdjusted)
      const minimumDurationSeconds = Math.max(
        1,
        Math.round(result.audioContentDuration + result.silenceRegions.length * minSpacingDuration),
      )
      setQuickAdjustRange({ minSeconds: minimumDurationSeconds })
      setProcessingProgress(100)
      setStatus({ message: "Audio processing completed successfully!", type: "success" })
      setIsProcessingComplete(true)

      if (
        typeof window !== "undefined" &&
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ) {
        const compressionToken = ++adjusterCompressionTokenRef.current
        void (async () => {
          try {
            await ensureTone()
            const { blob } = await bufferToWebM(result.processedBuffer, {})
            if (adjusterCompressionTokenRef.current === compressionToken) {
              setProcessedDistributionBlob(blob)
              setProcessedFileSize(blob.size)
            }
          } catch (compressionError) {
            if (adjusterCompressionTokenRef.current === compressionToken) {
              console.warn("[v0] Failed to prepare compressed distribution:", compressionError)
            }
          }
        })()
      }
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

  const handleFileSelectAction = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) void handleFile(selectedFile)
    if (e.target) e.target.value = ""
  }

  const handleDragOverAction = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (uploadAreaRef.current) uploadAreaRef.current.classList.add("border-primary")
  }

  const handleDragLeaveAction = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (uploadAreaRef.current) uploadAreaRef.current.classList.remove("border-primary")
  }

  const handleDropAction = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (uploadAreaRef.current) uploadAreaRef.current.classList.remove("border-primary")
    const files = e.dataTransfer.files
    if (files.length > 0) void handleFile(files[0])
  }

  useEffect(() => {
    if (!originalBuffer) {
      if (silenceAnalysisAbortRef.current) {
        silenceAnalysisAbortRef.current.abort()
        silenceAnalysisAbortRef.current = null
      }
      setAnalysisProgress(null)
      return
    }

    const controller = new AbortController()
    if (silenceAnalysisAbortRef.current) {
      silenceAnalysisAbortRef.current.abort()
    }
    silenceAnalysisAbortRef.current = controller

    setAnalysisProgress((prev) => (prev === null ? 0 : prev))
    setProcessingStep("Analyzing audio...")

    const recomputeAnalysis = async () => {
      try {
        const silenceRegions = await detectSilenceRegions(originalBuffer, silenceThreshold, minSilenceDuration, {
          signal: controller.signal,
          onProgress: (progress) => {
            if (controller.signal.aborted) {
              return
            }
            setAnalysisProgress((prev) => (prev === progress ? prev : progress))
            setStatus((prev) => {
              if (prev?.type === "error") {
                return prev
              }
              return { message: `Analyzing audio (${progress}%)...`, type: "info" }
            })
          },
        })

        if (controller.signal.aborted) {
          return
        }

        const totalSilenceDuration = silenceRegions.reduce((sum, region) => sum + (region.end - region.start), 0)
        const contentDuration = originalBuffer.duration - totalSilenceDuration
        const maxPossibleDuration = isMobileDevice ? 60 * 60 : 120 * 60
        const nextLimits = {
          min: Math.ceil(contentDuration / 60),
          max: maxPossibleDuration / 60,
        }

        setDurationLimits((prev) => {
          if (prev && prev.min === nextLimits.min && prev.max === nextLimits.max) {
            return prev
          }
          return nextLimits
        })

        setAudioAnalysis((prev) => {
          if (
            prev &&
            prev.totalSilence === totalSilenceDuration &&
            prev.contentDuration === contentDuration &&
            prev.silenceRegions === silenceRegions.length
          ) {
            return prev
          }
          return {
            totalSilence: totalSilenceDuration,
            contentDuration,
            silenceRegions: silenceRegions.length,
          }
        })

        setTargetDuration((current) => {
          const safeMin = Number.isFinite(nextLimits.min) ? nextLimits.min : current
          const safeMax = Number.isFinite(nextLimits.max) ? nextLimits.max : safeMin

          if (safeMin > safeMax) {
            return safeMin
          }
          if (current < safeMin) {
            return safeMin
          }
          if (current > safeMax) {
            return safeMax
          }
          return current
        })

        setAnalysisProgress(null)
        setProcessingStep("Ready to process.")
        setStatus((prev) => {
          if (prev?.type === "error") {
            return prev
          }
          return { message: "Audio loaded and analyzed. Ready to adjust.", type: "success" }
        })
      } catch (error) {
        if (isAbortError(error)) {
          return
        }
        console.error("[v0] Error updating audio analysis:", error)
        setAnalysisProgress(null)
        setStatus({
          message: `Audio analysis failed: ${error instanceof Error ? error.message : "Unknown"}`,
          type: "error",
        })
      } finally {
        if (silenceAnalysisAbortRef.current === controller) {
          silenceAnalysisAbortRef.current = null
        }
      }
    }

    void recomputeAnalysis()

    return () => {
      controller.abort()
    }
  }, [originalBuffer, detectSilenceRegions, silenceThreshold, minSilenceDuration, isMobileDevice])

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

  useEffect(() => {
    if (actualDuration === null || timelineEvents.length === 0 || encoderTimelineOriginalDuration === null) {
      return
    }

    const normalizedActualDuration = Number(actualDuration)
    const normalizedOriginalDuration = Number(encoderTimelineOriginalDuration)

    if (!Number.isFinite(normalizedActualDuration) || !Number.isFinite(normalizedOriginalDuration)) {
      return
    }

    const previousDuration = lastEncoderDurationAdjustmentRef.current ?? normalizedOriginalDuration

    if (!Number.isFinite(previousDuration) || previousDuration <= 0) {
      return
    }

    if (Math.abs(normalizedActualDuration - previousDuration) < 0.01) {
      return
    }

    const ratio = normalizedActualDuration / previousDuration

    if (!Number.isFinite(ratio) || ratio <= 0) {
      return
    }

    const rescaledEvents = timelineEvents.map((event) => {
      const updatedEvent: TimelineEvent = {
        ...event,
        startTime: event.startTime * ratio,
      }

      if (typeof event.duration === "number" && Number.isFinite(event.duration)) {
        updatedEvent.duration = event.duration * ratio
      }

      return updatedEvent
    })

    lastEncoderDurationAdjustmentRef.current = normalizedActualDuration
    setTimelineEvents(rescaledEvents)
    setEncoderTotalDuration(normalizedActualDuration)
  }, [actualDuration, encoderTimelineOriginalDuration, timelineEvents, setTimelineEvents, setEncoderTotalDuration])

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

  const handleTimelineRecordingUpload = useCallback(
    async (file: File) => {
      let objectUrl: string | null = null
      let eventAdded = false

      try {
        const arrayBuffer = await file.arrayBuffer()

        let duration = 0

        try {
          const audioContext = getAudioContext()
          if (audioContext.state === "suspended") {
            try {
              await audioContext.resume()
            } catch (resumeError) {
              console.warn("[v0] Unable to resume audio context for upload:", resumeError)
            }
          }

          const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0))
          duration = decodedBuffer.duration
        } catch (decodeError) {
          console.warn("[v0] Failed to decode uploaded meditation for duration:", decodeError)

          objectUrl = objectUrl ?? URL.createObjectURL(file)
          duration = await new Promise<number>((resolve, reject) => {
            const probe = new Audio()
            probe.preload = "metadata"
            probe.src = objectUrl as string

            const cleanup = () => {
              probe.onloadedmetadata = null
              probe.onerror = null
            }

            probe.onloadedmetadata = () => {
              cleanup()
              const metadataDuration = Number.isFinite(probe.duration) ? probe.duration : 0
              resolve(metadataDuration)
            }

            probe.onerror = () => {
              cleanup()
              reject(new Error("Unable to load audio metadata from uploaded file."))
            }
          })
        }

        if (!Number.isFinite(duration) || duration <= 0) {
          if (objectUrl) {
            URL.revokeObjectURL(objectUrl)
            objectUrl = null
          }
          throw new Error("Unable to determine the audio duration from the uploaded meditation.")
        }

        const safeDuration = duration
        const existingEventCount = timelineEvents.length
        const maxExistingTime = existingEventCount > 0 ? Math.max(...timelineEvents.map((event) => event.startTime)) : 0
        const newStartTime = existingEventCount > 0 ? maxExistingTime + 10 : 0
        const labelBase = file.name.replace(/\.[^/.]+$/, "").trim()
        objectUrl = objectUrl ?? URL.createObjectURL(file)
        const newEvent: TimelineEvent = {
          id: `uploaded_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          type: "recorded_voice",
          startTime: newStartTime,
          recordedAudioUrl: objectUrl,
          recordedInstructionLabel: labelBase || "Uploaded Meditation",
          duration: safeDuration,
          color: EVENT_COLORS[existingEventCount % EVENT_COLORS.length],
        }

        addEventToTimeline(newEvent)
        eventAdded = true

        const eventEndTime = newStartTime + safeDuration

        setEncoderTotalDuration((previousTotal) => {
          if (existingEventCount === 0) {
            return Math.max(1, eventEndTime)
          }
          return Math.max(previousTotal, eventEndTime)
        })

        setEncoderTimelineOriginalDuration((previousOriginal) => {
          if (existingEventCount === 0) {
            return Math.max(1, eventEndTime)
          }
          if (previousOriginal === null) {
            return previousOriginal
          }
          return Math.max(previousOriginal, eventEndTime)
        })

        if (existingEventCount === 0) {
          lastEncoderDurationAdjustmentRef.current = Math.max(1, eventEndTime)
        }

        toast({
          title: "Recording block added",
          description: `"${labelBase || file.name}" was added to the timeline.`,
        })
      } catch (error) {
        console.error("[v0] Error uploading meditation to timeline:", error)
        if (objectUrl && !eventAdded) {
          URL.revokeObjectURL(objectUrl)
          objectUrl = null
        }
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "We couldn't add that meditation to the timeline.",
          variant: "destructive",
        })
      }
    },
    [addEventToTimeline, timelineEvents, setEncoderTotalDuration, setEncoderTimelineOriginalDuration, toast],
  )

  const handleTimelineUploadChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) {
        return
      }

      await handleTimelineRecordingUpload(file)
      event.target.value = ""
    },
    [handleTimelineRecordingUpload],
  )

  const handleTimelineUploadClick = useCallback(() => {
    timelineUploadInputRef.current?.click()
  }, [])

  const handleAddInstructionSoundEvent = useCallback(() => {
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
        duration: 5, // Default duration for a chord
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
        duration: selectedSoundCue.duration || 5, // Use sound cue duration or default
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
  }, [
    customInstructionText,
    selectedSoundCue,
    selectedNotes,
    multiNoteMode,
    noteType,
    timelineEvents.length,
    addEventToTimeline,
    toast,
  ]) // Added all relevant dependencies

  const startRecording = useCallback(async () => {
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
  }, [
    recordingLabel,
    isRecording,
    readyToAddToTimelineRecording,
    setReadyToAddToTimelineRecording,
    setRecordedBlobs,
    toast,
  ]) // Added all relevant dependencies

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }, [])

  const removeTimelineEvent = useCallback(
    (eventId: string) => {
      setTimelineEvents((prev) => prev.filter((event) => event.id !== eventId))
      toast({ title: "Event Removed" })
    },
    [toast],
  )

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
        description: `"${newEvent.instructionText || newEvent.recordedInstructionLabel || newEvent.content?.label}" duplicated.`,
      })
    },
    [addEventToTimeline, toast],
  )

  const handleDragOverLocal = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const handleDragLeaveLocal = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const handleDropLocal = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const droppedFile = event.dataTransfer.files[0]
        setFile(droppedFile)
      }
    },
    [setFile],
  )

  // Helper function to update event start times in the timeline
  const updateEventStartTime = useCallback((eventId: string, newStartTime: number) => {
    setTimelineEvents((prevEvents) =>
      prevEvents.map((event) => (event.id === eventId ? { ...event, startTime: Math.max(0, newStartTime) } : event)),
    )
  }, [])

  // Function to handle the Process Audio button click
  const handleProcessAudio = processAudioAdjusterAction

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8 md:pt-[3px]">
      <div
        className={cn(
          "relative",
          isTimerMode && "pointer-events-none select-none blur-sm transition duration-300 ease-in-out",
        )}
      >
        <Navigation />

        {typeof window !== "undefined" && window.location.hostname === "localhost" && (
          <div className="fixed top-4 right-4 z-50">
            <Button
              onClick={clearLibraryData}
              variant="outline"
              size="sm"
              className="bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
            >
              Clear Library (Debug)
            </Button>
          </div>
        )}

        {memoryWarning && activeMode === "adjuster" && (
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
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden transition-colors duration-300 ease-in-out"
          role="application"
        >
          <div className="relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20 "></div>
              <div className="absolute top-2 left-8 w-16 h-12 bg-gradient-to-br from-emerald-300/30 to-teal-400/25 rounded-full transform rotate-12 "></div>
              <div className="absolute top-6 right-12 w-20 h-8 bg-gradient-to-bl from-rose-300/25 to-purple-400/20 rounded-full transform -rotate-6 "></div>
              <div className="absolute top-1 left-1/3 w-12 h-16 bg-gradient-to-tr from-amber-300/20 to-orange-400/15 rounded-full transform rotate-45 "></div>
              <div className="absolute top-8 right-1/4 w-14 h-10 bg-gradient-to-tl from-blue-300/25 to-indigo-400/20 rounded-full transform -rotate-12 "></div>
            </div>
            <div className="relative text-center px-[69px]">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <h1
                  className="text-5xl text-transparent bg-clip-text bg-gradient-to-bl from-logo-rose-300 to-logo-rose-500 transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 text-center mt-16 tracking-tighter"
                  style={{
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    textShadow: "0 0 25px rgba(139, 69, 69, 0.25)",
                  }}
                >
                  abhī
                </h1>
                <div className="font-black font-serif mb-[7px] text-xs text-logo-rose-600">Meditation Tool</div>
                <div className="flex justify-center items-center mb-4 space-x-[3px]">
                  <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[13px] h-[13px] shadow-md"></div>
                  <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[9px] w-[9px] shadow"></div>
                  <div className="w-4 bg-gradient-to-br from-logo-amber to-orange-300 rounded-[3px] transform h-[9px] shadow-sm"></div>
                  <div className="w-4 bg-gradient-to-r from-gray-600 to-gray-500 border-2 border-stone-200 h-[34px] shadow-md rounded w-[9px]"></div>
                  <div className="w-4 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-[3px] transform h-[9px] pl-0 ml-2 shadow-sm"></div>
                  <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[9px] w-[9px] shadow"></div>
                  <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[13px] h-[13px] shadow-md"></div>
                </div>

                {/* Mode Switch */}
                <div className="flex justify-center items-center mb-4 space-y-4 flex-row my-[33px]">
                  <div className="flex mx-auto items-center p-1 font-serif text-gray-600 shadow-inner rounded-sm gap-1 w-fit bg-muted">
                    <button
                      onClick={() => {
                        setActiveMode("adjuster")
                        setActiveTab("adjuster")
                      }}
                      className={cn(
                        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-4 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 font-black py-3 tracking-tight text-sm",
                        activeMode === "adjuster" ? "bg-white text-gray-600 shadow-sm " : "text-gray-600 ",
                      )}
                    >
                      Adjuster
                    </button>
                    <button
                      onClick={() => {
                        setActiveMode("encoder")
                        setActiveTab("encoder")
                      }}
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
            </div>

            <div className="px-6 md:px-10 font-serif font-black pb-10">
              {/* Mode Description Notes */}
              <AnimatePresence mode="wait">
                {activeMode === "adjuster" && (
                  <motion.div
                    key="adjuster-note"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="p-4 rounded-md font-serif font-black max-w-2xl mx-auto border-logo-rose-500 border-0 shadow-none mb-4 py-0 px-0"
                  >
                    <p className="text-center px-4 pt-1.5 text-xs text-stone-500">
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
                    className="p-4 rounded-md font-serif font-black max-w-2xl mx-auto border-logo-rose-500 border-0 shadow-none mb-4 py-0 px-0"
                  >
                    <p className="text-center px-4 pt-1.5 text-xs pb-1.5 text-stone-500">
                      Design custom guided meditations by pairing instructions with sound cues and/or using the
                      recorder, then arranging events on the timeline.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Conditional Rendering based on activeMode */}
              {activeMode === "adjuster" ? (
                // == Length Adjuster UI ==
                <div ref={adjusterSectionRef} className="space-y-4">
                  {/* Note and Resources sections - moved to proper position */}
                  <div className="space-y-4 mb-[27px]">
                    <div className="p-4 max-w-2xl text-center mx-auto rounded-md border-logo-rose-500 border-0 shadow-none pt-0 pb-1">
                      <p className="leading-relaxed font-serif font-black text-xs text-gray-600">
                        <strong className="pr-1.5 font-black font-serif text-center text-sm text-logo-amber-400">
                          Note:
                        </strong>
                        Depending on the audio, users may need to tweak the advanced settings for optimal results. Only
                        pauses are adjusted, spoken instruction is preserved. Any guided meditation under{" "}
                        {isMobileDevice ? "50MB" : "500MB"} should be compatible. Teachers, please feel free to reach
                        out if you'd like to opt out. Enjoy:)
                      </p>
                    </div>
                    <div className="p-4 rounded-lg border-logo-rose-300 max-w-2xl mx-auto backdrop-blur-sm border-0 py-4 px-0 bg-transparent pt-0 pb-0">
                      <h3 className="mb-2 text-center font-black px-0 rounded text-base pb-0.5 text-gray-600">
                        Resources
                      </h3>
                      <div className="text-sm text-gray-600 leading-relaxed flex flex-wrap justify-center text-center gap-[5px] px-2">
                        <a
                          href="https://dharmaseed.org/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-black text-gray-600 px-5 py-1 transition-all duration-200 ease-out hover:shadow-none shadow-md border-gray-500 text-xs border-[3px] rounded-[8px]"
                        >
                          Dharma Seed
                        </a>
                        <a
                          href="https://dharmaseed.org/teacher/210/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-serif font-black hover:shadow-none shadow-md border-gray-500 text-xs border-[3px] rounded-[8px]"
                        >
                          Rob Burbea's talks &amp; retreats
                        </a>
                        <a
                          href="https://tasshin.com/guided-meditations/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-serif font-black hover:shadow-none shadow-md rounded-xlder-2 border-gray-500 text-xs border-[3px] rounded-[8px]"
                        >
                          Tasshin &amp; friend's meditations
                        </a>
                        <a
                          href="https://www.tarabrach.com/guided-meditations/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-serif font-black hover:shadow-none shadow-md rounded-xlder-2 border-gray-500 text-xs border-[3px] rounded-[8px]"
                        >
                          Tara Brach's meditations
                        </a>
                        <a
                          href="https://drive.google.com/drive/folders/1k4plsQfxTF_1BXffShz7w3P6q4IDDo3?usp=drive_link"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-serif font-black hover:shadow-none shadow-md rounded-xlder-2 border-gray-500 text-xs border-[3px] rounded-[8px]"
                        >
                          Toby Sola's meditations
                        </a>
                        <a
                          href="https://meditofoundation.org/meditations"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-gray-600 no-underline py-1 transition-colors transition-shadow duration-200 ease-out px-5 font-serif font-black hover:shadow-none shadow-md rounded-xlder-2 border-gray-500 text-xs border-[3px] rounded-[8px]"
                        >
                          Medito Foundation
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
                    className="overflow-hidden border-none bg-white rounded-2xl mb-5 cursor-pointer transition-all duration-300 shadow-none hover:shadow-lg "
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOverAction}
                    onDragLeave={handleDragLeaveAction}
                    onDrop={handleDropAction}
                  >
                    <div className="p-0.5 bg-gradient-to-br from-logo-purple-300 to-stone-300 py-1 shadow-lg rounded-sm px-[5px]">
                      <div className="p-10 md:p-16 text-center bg-white rounded-sm border-stone-200 border-0 shadow-none">
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <div className="font-serif font-black text-gray-600 mb-[3px] text-sm">
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
                        className="p-0.5 overflow-hidden bg-gradient-to-tl from-gray-500 to-stone-300 py-1 rounded-sm px-[5px] mb-3.5 shadow-none"
                      >
                        <div className="bg-white p-5 py-4 rounded-sm border-stone-200 border-0 shadow-none">
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
                                {displayedFileName ?? file.name}
                              </motion.div>
                              <motion.div
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mb-1 font-black text-gray-500 text-xs"
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

                  <div className="mt-4 space-y-5">
                    {originalUrl && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <div className="rounded-sm p-3 px-0 shadow-none border-gray-500 bg-transparent border-0 mb-0">
                          <audio controls className="w-full" src={originalUrl}></audio>
                        </div>
                        <div className="px-3.5 text-center">
                          <SaveMeditationDialog
                            audioUrl={originalUrl}
                            mp3Blob={file ?? undefined}
                            originalFileName={file?.name || "original-audio"}
                            duration={originalBuffer?.duration || 0}
                            source="adjuster"
                            metadata={
                              analysisLowerBoundSeconds
                                ? { quickAdjust: { range: { minSeconds: analysisLowerBoundSeconds } } }
                                : {}
                            }
                            existingMeditationId={loadedLibraryContext?.id}
                            existingMeditationTitle={loadedLibraryContext?.title}
                            existingMeditationDuration={loadedLibraryContext?.duration}
                          >
                            <Button
                              className="w-44 py-3 rounded-[9px] shadow-md bg-white hover:shadow-sm hover:bg-white text-gray-600 text-xs font-serif font-black border-[3px] border-gray-500"
                              disabled={!originalBuffer}
                            >
                              <BookmarkPlus className="w-4 h-4 mr-2" />
                              Save to Library
                            </Button>
                          </SaveMeditationDialog>
                        </div>
                      </motion.div>
                    )}

                    <AnimatePresence>
                      {analysisProgress !== null && (
                        <motion.div
                          key="analysis-progress"
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          className="flex items-center justify-center text-xs text-gray-600 gap-2"
                        >
                          <CircleDotDashed className="h-4 w-4 animate-spin" />
                          <span>
                            Analyzing audio{analysisProgress >= 0 ? ` (${Math.round(analysisProgress)}%)` : ""}...
                          </span>
                        </motion.div>
                      )}
                      {audioAnalysis && durationLimits && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ delay: 0.1 }}
                        >
                          <Alert className="bg-white p-0 border-0 shadow-none">
                            <div className="p-3 text-center min-h-[76px] rounded-sm shadow-none bg-transparent pb-0.5 pt-0">
                              <div className="flex items-center mb-2 justify-center">
                                {/* Removed the Info icon div */}
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="p-[3px] bg-gradient-to-r from-gray-500 to-gray-500 shadow-md py-1 rounded-sm px-[5px]">
                                  <div className="bg-white p-3 text-center min-h-[76px] rounded-sm border-stone-200 border-[3px]">
                                    <div className="uppercase tracking-wide mb-1 text-gray-600 text-xs">Content:</div>
                                    <div className="font-black text-gray-600">
                                      {formatTime(audioAnalysis.contentDuration)}
                                    </div>
                                  </div>
                                </div>
                                <div className="p-[3px] bg-gradient-to-r from-gray-500 to-gray-500 shadow-md py-1 rounded-sm px-[5px]">
                                  <div className="bg-white p-3 text-center min-h-[76px] rounded-sm border-[3px] border-stone-200">
                                    <div className="text-xs uppercase tracking-wide mb-1 text-gray-600">Silence:</div>
                                    <div className="font-black text-gray-600">
                                      {formatTime(audioAnalysis.totalSilence)}
                                    </div>
                                  </div>
                                </div>
                                <div className="p-[3px] bg-gradient-to-r from-gray-500 to-gray-500 py-1 rounded-sm shadow-md px-[5px]">
                                  <div className="bg-white p-3 text-center min-h-[76px] rounded-sm border-stone-200 border-[3px]">
                                    <div className="font-black text-gray-600 text-xs tracking-wide">PAUSES:</div>
                                    <div className="font-black text-gray-600">{audioAnalysis.silenceRegions}</div>
                                  </div>
                                </div>
                                <div className="p-[3px] bg-gradient-to-r from-gray-500 to-gray-500 py-1 rounded-sm shadow-md px-[5px]">
                                  <div className="bg-white p-3 text-center min-h-[76px] rounded-sm border-stone-200 border-[3px]">
                                    <div className="text-xs uppercase tracking-wide text-gray-600 mb-1">Range:</div>
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
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6"
                  >
                    <Tabs defaultValue={activeTab} className="w-full font-serif font-black">
                      <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted p-1 rounded-sm ">
                        <TabsTrigger
                          value="adjuster"
                          onClick={() => {
                            setActiveMode("adjuster")
                            setActiveTab("adjuster")
                          }}
                          className="data-[state=active]:bg-white data-[state=active]: data-[state=active]:shadow-sm rounded-[10px] "
                        >
                          Settings
                        </TabsTrigger>
                        <TabsTrigger
                          value="encoder"
                          onClick={() => {
                            setActiveTab("adjuster") // Only change the tab, not the mode
                          }}
                          className="data-[state=active]:bg-white data-[state=active]: data-[state=active]:shadow-sm rounded-[10px] "
                        >
                          Advanced
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="adjuster" className="mt-0 space-y-6">
                        <div className="grid md:grid-cols-2 gap-4">
                          <Card className="overflow-hidden border-none shadow-lg bg-white ">
                            <div className="bg-gradient-to-br from-logo-blue-400 to-logo-amber-300 py-3 px-6 text-cyan-500">
                              <h3 className="text-white font-black text-base">Target Duration</h3>
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
                                  rangeClassName="bg-gradient-to-br from-logo-blue-400 to-logo-amber-300 "
                                />
                              </div>
                              <div className="text-center font-serif font-black">
                                <span className="font-black text-gray-600 text-lg">{targetDuration}</span>
                                <span className="ml-1 text-gray-600 text-sm">minutes</span>
                              </div>
                              {durationLimits && (
                                <div className="text-center text-sm mt-0 text-gray-500">
                                  Range: {durationLimits.min} min to {isMobileDevice ? "1 hour" : "2 hours"}
                                </div>
                              )}
                            </div>
                          </Card>
                          <Card className="overflow-hidden border-none shadow-lg bg-white ">
                            <div className="bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 py-3 px-6 ">
                              <h3 className="text-white font-black">Silence Threshold</h3>
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
                                  rangeClassName="bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 "
                                />
                              </div>
                              <div className="text-center">
                                <span className="font-serif font-black text-gray-600 text-lg">
                                  {silenceThreshold.toFixed(3)}
                                </span>
                              </div>
                              <div className="text-center mt-0 text-gray-500 text-xs">Lower = more sensitive</div>
                            </div>
                          </Card>
                        </div>
                      </TabsContent>
                      <TabsContent value="encoder" className="mt-0 space-y-6">
                        <div className="grid md:grid-cols-2 font-serif font-black gap-4">
                          <Card className="overflow-hidden border-none shadow-lg bg-white ">
                            <div className="bg-gradient-to-br from-logo-purple-300 to-logo-emerald-500 py-3 px-6 ">
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
                                  rangeClassName="bg-gradient-to-br from-logo-purple-300 to-logo-emerald-500 "
                                />
                              </div>
                              <div className="text-center">
                                <span className="font-black text-gray-600 text-lg">{minSilenceDuration}</span>
                                <span className="ml-1 text-gray-600 text-sm">seconds</span>
                              </div>
                              <div className="text-center mt-0 text-gray-500 text-xs">Shorter = detect more pauses</div>
                            </div>
                          </Card>
                          <Card className="overflow-hidden border-none shadow-lg bg-white ">
                            <div className="bg-gradient-to-br from-orange-300 to-logo-rose-300 py-3 px-6 ">
                              <h3 className="text-white font-black">Min Spacing Btwn Content</h3>
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
                                <span className="font-black text-gray-600 text-lg">
                                  {minSpacingDuration.toFixed(1)}
                                </span>
                                <span className="ml-1 text-gray-600 text-sm">seconds</span>
                              </div>
                              <div className="text-center mt-0 text-gray-500 text-xs">
                                Minimum pause between speaking parts
                              </div>
                            </div>
                          </Card>
                          <Card className="overflow-hidden border-none shadow-lg bg-white ">
                            <div className="bg-gradient-to-br from-pink-400 to-cyan-400 py-3 px-6 ">
                              <h3 className="text-white font-black">Preserve Natural Pacing</h3>
                            </div>
                            <div className="p-6 px-11 py-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="mb-1 text-gray-600 mr-2 text-xs">
                                    Maintain the relative length of pauses
                                  </p>
                                </div>
                                <Switch
                                  checked={preserveNaturalPacing}
                                  onCheckedChange={setPreserveNaturalPacing}
                                  className="data-[state=checked]:bg-gray-500 "
                                />
                              </div>
                            </div>
                          </Card>
                          <Card className="overflow-hidden border-none shadow-lg bg-white ">
                            <div className="bg-gradient-to-br from-logo-teal-500 to-logo-amber-300 py-3 px-6 ">
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
                                High Compatibility for better playback on mobile/AirPods. May reduce sample rate for
                                long audio on mobile.
                              </div>
                            </div>
                          </Card>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </motion.div>

                  {/* Process Audio Button */}
                  <motion.div
                    className="mt-0"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Button
                      onClick={handleProcessAudio}
                      disabled={isProcessing || !originalBuffer}
                      className={cn(
                        "w-full py-7 text-lg font-semibold tracking-wider rounded-sm transition-all duration-500",
                        "shadow-lg hover:shadow-xl active:shadow-none",
                        "text-white ",
                        "disabled:cursor-not-allowed hover:opacity-100 disabled:opacity-100",
                        "relative overflow-hidden",
                      )}
                      style={
                        {
                          backgroundImage: `
                        radial-gradient(circle at 7% 12%, rgba(255, 255, 255, 0.9) 1.2px, transparent 1.5px),
                        radial-gradient(circle at 23% 8%, rgba(255, 255, 255, 0.7) 0.4px, transparent 1px),
                        radial-gradient(circle at 15% 67%, rgba(255, 255, 255, 0.85) 0.8px, transparent 1px),
                        radial-gradient(circle at 89% 23%, rgba(255, 255, 255, 0.8) 1px, transparent 1.2px),
                        radial-gradient(circle at 34% 91%, rgba(255, 255, 255, 0.75) 0.5px, transparent 1px),
                        radial-gradient(circle at 67% 15%, rgba(255, 255, 255, 0.9) 1.3px, transparent 1.5px),
                        radial-gradient(circle at 12% 88%, rgba(255, 255, 255, 0.7) 0.6px, transparent 1px),
                        radial-gradient(circle at 78% 72%, rgba(255, 255, 255, 0.85) 1.1px, transparent 1.3px),
                        radial-gradient(circle at 45% 34%, rgba(255, 255, 255, 0.8) 0.4px, transparent 1px),
                        radial-gradient(circle at 91% 56%, rgba(255, 255, 255, 0.9) 0.9px, transparent 1px),
                        radial-gradient(circle at 29% 19%, rgba(255, 255, 255, 0.75) 1.2px, transparent 1.4px),
                        radial-gradient(circle at 56% 83%, rgba(255, 255, 255, 0.7) 0.5px, transparent 1px),
                        radial-gradient(circle at 3% 45%, rgba(255, 255, 255, 0.85) 0.8px, transparent 1px),
                        radial-gradient(circle at 72% 9%, rgba(255, 255, 255, 0.8) 1px, transparent 1.2px),
                        radial-gradient(circle at 38% 62%, rgba(255, 255, 255, 0.9) 0.6px, transparent 1px),
                        radial-gradient(circle at 83% 41%, rgba(255, 255, 255, 0.75) 1.4px, transparent 1.6px),
                        radial-gradient(circle at 19% 76%, rgba(255, 255, 255, 0.7) 0.4px, transparent 1px),
                        radial-gradient(circle at 61% 28%, rgba(255, 255, 255, 0.85) 1.1px, transparent 1.3px),
                        radial-gradient(circle at 94% 87%, rgba(255, 255, 255, 0.8) 0.5px, transparent 1px),
                        radial-gradient(circle at 41% 5%, rgba(255, 255, 255, 0.9) 0.9px, transparent 1px),
                        linear-gradient(135deg, #4b5563 0%, #6b7280 100%)
                      `,
                          
                        } as React.CSSProperties
                      }
                    >
                      <span className="font-black text-base tracking-tight text-white">
                        {isProcessing ? "Processing..." : "Process Audio"}
                      </span>
                    </Button>
                  </motion.div>

                  {isProcessingComplete && processedUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-gray-50 to-muted ">
                        <div className="bg-gradient-to-br from-logo-teal-500 via-logo-blue-300 to-logo-amber-300 px-6 py-[9px] ">
                          <div className="flex items-center justify-between">
                            <h3 className="text-white font-black text-base">Processed Audio</h3>
                            <AudioInfoMenu
                              items={[
                                {
                                  label: "Actual Duration",
                                  value: actualDuration ? formatTime(actualDuration) : "--",
                                },
                                {
                                  label: "Target Duration",
                                  value: formatTime(targetDuration * 60),
                                },
                                {
                                  label: "Pauses Adjusted",
                                  value: pausesAdjusted,
                                },
                                {
                                  label: "File Size",
                                  value: formatFileSize(processedFileSize),
                                },
                                ...(processedAudioMetadata
                                  ? [
                                      {
                                        label: "Output Format",
                                        value: `Mono • ${processedAudioMetadata.sampleRate.toLocaleString()} Hz • ${processedAudioMetadata.bitDepth.toLocaleString()}-bit`,
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          </div>
                        </div>
                        <div className="p-6 px-3.5 py-4 space-y-4 text-center">
                          <div className="p-3 rounded-sm px-0 mb-0 bg-transparent shadow-none pb-0">
                            <audio controls className="w-full" src={processedUrl}></audio>
                          </div>
                          <SaveMeditationDialog
                            audioUrl={processedUrl}
                            mp3Blob={processedDistributionBlob ?? undefined}
                            originalFileName={file?.name || "meditation"}
                            duration={actualDuration || targetDuration * 60}
                            source="adjuster"
                            metadata={{
                              targetDuration,
                              pausesAdjusted,
                              wav: processedAudioMetadata ? { ...processedAudioMetadata } : undefined,
                              timeline: exportableTimelineMetadata.length > 0 ? exportableTimelineMetadata : undefined,
                              ...(quickAdjustRange
                                ? { quickAdjust: { range: { minSeconds: quickAdjustRange.minSeconds } } }
                                : {}),
                            }}
                            existingMeditationId={loadedLibraryContext?.id}
                            existingMeditationTitle={loadedLibraryContext?.title}
                            existingMeditationDuration={loadedLibraryContext?.duration}
                          >
                            <Button className="w-44 py-3  rounded-[11px] shadow-md bg-white hover:shadow-sm hover:bg-white text-xs text-gray-600 font-serif font-black">
                              <BookmarkPlus className="h-4 w-4 mr-2" />
                              Save to Library
                            </Button>
                          </SaveMeditationDialog>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </div>
              ) : (
                // == Encoder UI ==
                <motion.div
                  key="encoder-content"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  <motion.div
                    className="text-gray-600"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="overflow-visible bg-white max-w-2xl mx-auto rounded-2xl shadow-none">
                      <div className="p-6 text-sm font-black py-0 bg-transparent shadow-none">
                        <div className="grid grid-cols-1 md:grid-cols-[auto_auto] text-gray-600 pb-2 gap-4 justify-center">
                          <div className="text-center">
                            <Label htmlFor="meditation-title" className="text-gray-600 text-sm font-black">
                              Title
                            </Label>
                            <input
                              id="meditation-title"
                              type="text"
                              value={meditationTitle}
                              onChange={handleMeditationTitleChange}
                              placeholder="My Custom Meditation"
                              className="flex file:border-0 file:bg-white file:text-xs file:font-medium file:text-foreground placeholder:text-gray-500 disabled:cursor-not-allowed md:text-xs rounded-[10px] bg-white py-4 px-4 border-gray-500 mt-1 text-xs font-black text-gray-600 text-center border-[3px] shadow-md h-9 w-60"
                            />
                          </div>
                          <div className="text-center">
                            <Label htmlFor="encoder-duration" className="text-gray-600 text-sm font-black">
                              Duration (h:m:s)
                            </Label>
                            <div id="encoder-duration" className="mt-3 flex flex-col items-center gap-4">
                              <TimerWheel
                                value={encoderTotalDuration}
                                onChange={handleEncoderDurationChange}
                                className="bg-white px-6 py-4 rounded-2xl border-[3px] border-gray-500 shadow-md"
                              />
                              <Button
                                type="button"
                                onClick={handleActivateTimer}
                                className="rounded-full bg-gradient-to-r from-logo-emerald-500 to-logo-teal-500 px-6 py-2 text-white font-black shadow-md hover:shadow-lg"
                              >
                                Use as timer
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-4"
                  >
                    <div className="flex flex-col gap-4">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="p-6 bg-transparent px-0 py-3 pb-0 pt-0"
                      >
                        <div className="p-0.5 bg-gradient-to-br from-gray-500 to-stone-300  py-1 shadow-lg rounded-sm px-[5px]">
                          <div className="bg-white p-4 rounded-[10px] shadow-nonee border-stone-200 pb-3 pt-1.5 border-0 shadow-inner">
                            <div className="text-center">
                              <Textarea
                                id="custom-instruction"
                                value={customInstructionText}
                                onChange={handleCustomInstructionChange}
                                placeholder="Enter an instruction..."
                                className="mt-2 text-xs font-serif font-black text-indigo-400 placeholder-indigo-400 resize-none bg-transparent border-none focus:border-none focus:ring-0 focus:ring-offset-0 focus:outline-none"
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
                        <div className="bg-gradient-to-br from-logo-blue-400 to-logo-amber-300 py-3 px-6 text-center">
                          <h3 className="text-white flex items-center font-serif font-black">
                            <Music2Icon className="h-4 w-4 mr-2" />
                            Sound Cues
                          </h3>
                        </div>
                        <div className="p-6 flex flex-col space-y-4 pt-[3px]">
                          <div className="flex-1 h-auto">
                            <Accordion type="single" collapsible className="w-full">
                              <AccordionItem value="musical-notes">
                                <AccordionTrigger className="text-gray-600 hover:no-underline py-3 font-serif font-black">
                                  <div className="flex items-center justify-between w-full">
                                    <span>Notes</span>
                                  </div>
                                </AccordionTrigger>
                                <div className="px-4 pb-2 border-b-0">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
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
                                            className="bg-gradient-to-br from-gray-600 to-gray-500 text-white font-serif font-black text-xs rounded-sm shadow-md"
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
                                              const isSingleSelected =
                                                !multiNoteMode && selectedSoundCue?.id === note.id

                                              return (
                                                <div
                                                  key={note.id}
                                                  className="flex items-center gap-2 font-black font-serif"
                                                >
                                                  <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={`flex-1 justify-start rounded-[10px] font-black font-serif text-gray-600 ${
                                                      isSelected
                                                        ? "bg-white shadow-md border-[3px] border-gray-500 "
                                                        : isSingleSelected
                                                          ? "bg-white shadow-md text-gray-600 border-gray-500 border-[3px]"
                                                          : "hover:bg-white "
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
                                    <div className="text-xs">
                                      Additional sound cues are being developed and will be available in a future
                                      update.
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          </div>
                          <Button
                            className="bg-gradient-to-br from-logo-blue-400 to-logo-amber-300 shadow-md text-white rounded-[11px] hover:shadow-none font-serif font-black mt-4"
                            onClick={handleAddInstructionSoundEvent}
                            disabled={
                              !customInstructionText.trim() || (!selectedSoundCue && selectedNotes.length === 0)
                            }
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

                  {/* Timeline Editor for encoder */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Card ref={timelineEditorRef} className="overflow-hidden border-none shadow-lg bg-white ">
                      <div className="bg-gradient-to-br from-gray-600 to-gray-500 px-6 py-3 flex items-center justify-between gap-3 pr-3">
                        <h3 className="text-white font-black text-base">Timeline Editor</h3>
                        <div className="flex items-center gap-2">
                          <input
                            ref={timelineUploadInputRef}
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={handleTimelineUploadChange}
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={handleTimelineUploadClick}
                            className="bg-white/10 rounded-[8px] text-white font-serif font-black text-xs hover:bg-white/20 "
                          >
                            <Upload className="h-4 w-4 mr-0" />
                          </Button>
                        </div>
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
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Button
                      onClick={handleExportAudio}
                      disabled={isGeneratingAudio || timelineEvents.length === 0}
                      className={cn(
                        "w-full py-7 text-base font-semibold tracking-wider rounded-sm transition-all duration-500",
                        "shadow-lg hover:shadow-xl active:shadow-none",
                        "text-white ",
                        "disabled:cursor-not-allowed hover:opacity-100 disabled:opacity-100",
                        "relative overflow-hidden",
                      )}
                      style={
                        {
                          backgroundImage: `
                        radial-gradient(circle at 11% 18%, rgba(255, 255, 255, 0.85) 1.1px, transparent 1.3px),
                        radial-gradient(circle at 27% 6%, rgba(255, 255, 255, 0.75) 0.5px, transparent 1px),
                        radial-gradient(circle at 8% 71%, rgba(255, 255, 255, 0.9) 0.7px, transparent 1px),
                        radial-gradient(circle at 82% 29%, rgba(255, 255, 255, 0.8) 1.2px, transparent 1.4px),
                        radial-gradient(circle at 39% 85%, rgba(255, 255, 255, 0.7) 0.4px, transparent 1px),
                        radial-gradient(circle at 71% 11%, rgba(255, 255, 255, 0.85) 1.4px, transparent 1.6px),
                        radial-gradient(circle at 16% 93%, rgba(255, 255, 255, 0.8) 0.6px, transparent 1px),
                        radial-gradient(circle at 74% 68%, rgba(255, 255, 255, 0.9) 1px, transparent 1.2px),
                        radial-gradient(circle at 49% 38%, rgba(255, 255, 255, 0.75) 0.5px, transparent 1px),
                        radial-gradient(circle at 87% 52%, rgba(255, 255, 255, 0.85) 0.8px, transparent 1px),
                        radial-gradient(circle at 33% 23%, rgba(255, 255, 255, 0.7) 1.3px, transparent 1.5px),
                        radial-gradient(circle at 52% 79%, rgba(255, 255, 255, 0.8) 0.6px, transparent 1px),
                        radial-gradient(circle at 6% 41%, rgba(255, 255, 255, 0.9) 0.9px, transparent 1px),
                        radial-gradient(circle at 68% 14%, rgba(255, 255, 255, 0.75) 1.1px, transparent 1.3px),
                        radial-gradient(circle at 42% 58%, rgba(255, 255, 255, 0.85) 0.4px, transparent 1px),
                        radial-gradient(circle at 79% 46%, rgba(255, 255, 255, 0.8) 1.5px, transparent 1.7px),
                        radial-gradient(circle at 24% 72%, rgba(255, 255, 255, 0.7) 0.5px, transparent 1px),
                        radial-gradient(circle at 58% 32%, rgba(255, 255, 255, 0.9) 1.2px, transparent 1.4px),
                        radial-gradient(circle at 91% 81%, rgba(255, 255, 255, 0.75) 0.6px, transparent 1px),
                        radial-gradient(circle at 37% 9%, rgba(255, 255, 255, 0.85) 0.8px, transparent 1px),
                        linear-gradient(135deg, #4b5563 0%, #6b7280 100%)
                      `,
                          
                        } as React.CSSProperties
                      }
                    >
                      <span className="font-black text-base tracking-tight text-white">
                        {isGeneratingAudio ? "Generating..." : "Generate Audio"}
                      </span>
                    </Button>
                  </motion.div>

                  {generatedAudioUrl && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                    >
                      <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-gray-50 to-muted ">
                        <div className="bg-gradient-to-r from-logo-teal-500 via-logo-blue-300 to-logo-amber-300 px-6 py-[9px] ">
                          <div className="flex items-center justify-between">
                            <h3 className="text-white font-black">Generated Audio</h3>
                            <AudioInfoMenu
                              items={[
                                {
                                  label: "Duration",
                                  value: formatTime(encoderTotalDuration),
                                },
                                {
                                  label: "Instructions",
                                  value: timelineEvents.length,
                                },
                                {
                                  label: "File Size",
                                  value: formatFileSize(generatedAudioFileSize || 0),
                                },
                                ...(generatedAudioMetadata
                                  ? [
                                      {
                                        label: "Output Format",
                                        value: `Mono • ${generatedAudioMetadata.sampleRate.toLocaleString()} Hz • ${generatedAudioMetadata.bitDepth.toLocaleString()}-bit`,
                                      },
                                    ]
                                  : []),
                              ]}
                            />
                          </div>
                        </div>
                        <div className="p-6 px-3.5 py-4 space-y-4">
                          <div className="bg-white p-3 rounded-sm shadow-md mb-3.5 px-0">
                            <audio ref={encoderAudioRef} controls className="w-full" src={generatedAudioUrl}></audio>
                          </div>
                          <SaveMeditationDialog
                            audioUrl={generatedAudioUrl}
                            mp3Blob={generatedDistributionBlob ?? undefined}
                            originalFileName={meditationTitle || "meditation"}
                            duration={encoderTotalDuration}
                            source="encoder"
                            metadata={{
                              instructionCount: timelineEvents.length,
                              meditationTitle,
                              wav: generatedAudioMetadata ? { ...generatedAudioMetadata } : undefined,
                              timeline: exportableTimelineMetadata.length > 0 ? exportableTimelineMetadata : undefined,
                            }}
                          >
                            <Button className="w-full py-4 rounded-sm shadow-md bg-white hover:bg-white focus-visible:bg-white active:bg-white hover:shadow-none text-gray-600 font-serif font-black mt-3">
                              <BookmarkPlus className="h-4 w-4 mr-2" />
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
        </motion.div>
      </div>

      {isTimerMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <Card className="w-full max-w-md space-y-6 rounded-3xl p-8 text-center shadow-2xl">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-gray-700">Timer</h2>
              <p className="text-sm font-medium text-gray-500">
                Countdown without leaving the encoder. Return when you&apos;re ready to keep building.
              </p>
            </div>
            <div className="mx-auto w-full max-w-xs rounded-2xl bg-gray-900 px-6 py-5 font-mono text-4xl font-semibold tracking-widest text-white shadow-inner">
              {formatTime(timerRemaining)}
            </div>
            {timerRemaining === 0 && (
              <p className="text-sm font-semibold uppercase tracking-wide text-rose-500">Time&apos;s up!</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {isTimerRunning ? (
                <Button
                  type="button"
                  onClick={handleStopTimer}
                  variant="destructive"
                  className="flex items-center gap-2 rounded-full px-6 py-2 font-semibold"
                >
                  <StopCircle className="h-4 w-4" />
                  Stop
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleStartTimer}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-logo-emerald-500 to-logo-teal-500 px-6 py-2 font-semibold text-white shadow-md hover:shadow-lg"
                >
                  <Play className="h-4 w-4" />
                  {timerRemaining === 0 ? "Restart" : "Start"}
                </Button>
              )}
              <Button
                type="button"
                onClick={handleResetTimer}
                variant="outline"
                className="flex items-center gap-2 rounded-full px-6 py-2 font-semibold bg-transparent"
              >
                <CircleDotDashed className="h-4 w-4" />
                Reset
              </Button>
            </div>
            <Button
              type="button"
              onClick={handleReturnToEncoder}
              variant="secondary"
              className="w-full rounded-full px-6 py-3 font-black"
            >
              Return to encoder
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}
