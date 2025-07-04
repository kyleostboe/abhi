"use client"

import type React from "react"
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
  Settings2,
  AlertTriangle,
  ListPlus,
  Music2,
  Mic,
  StopCircle,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
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
  type Instruction,
  type SoundCue,
} from "@/lib/meditation-data"
import { VisualTimeline } from "@/components/visual-timeline"
import { cn } from "@/lib/utils"

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
  \
  const [status, setStatus<{ message: string;
  type: string
}
| null>(null)
const [originalUrl, setOriginalUrl] = useState<string>("")
const [processedUrl, setProcessedUrl] = useState<string>("")
const [pausesAdjusted, setPausesAdjusted] = useState<number>(0)
const [isProcessing, setIsProcessing] = useState<boolean>(false)
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

// Utility functions
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

const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60)
  const seconds = Math.floor(timeInSeconds % 60)
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
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
        document.addEventListener("keydown", resumeContextOnInteraction, true)
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
      }\
      writeString(0, "RIFF")\
      view.setUint32(4, 36 + dataSize, true)\
      writeString(8, "WAVE")\
      writeString(12, "fmt ")\
      view.setUint32(16, 16, true)\
      view.setUint16(20, 1, true)\
      view.setUint16(22, numberOfChannels, true)\
      view.setUint32(24, targetSampleRate, true)\
      view.setUint32(28, targetSampleRate * numberOfChannels * bytesPerSample, true)\
      view.setUint16(32, numberOfChannels * bytesPerSample, true)\
      view.setUint16(34, 16, true)\
      writeString(36, "data")\
      view.setUint32(40, dataSize, true)\
      let offset = 44\
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
\
    },
    [isMobileDevice],
  )

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
  if (isProcessingComplete) setIsProcessingComplete(false)
}, [
  targetDuration,
  silenceThreshold,
  minSilenceDuration,
  minSpacingDuration,
  preserveNaturalPacing,
  isProcessingComplete,
])

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
const addEventToTimeline = useCallback((newEvent: TimelineEvent) => {
  setTimelineEvents((prevEvents) => {
    const updatedEvents = [...prevEvents, newEvent]
    // Sort by current startTime to maintain chronological order for display
    // Do NOT re-calculate or re-assign startTimes based on spacing.
    return updatedEvents.sort((a, b) => a.startTime - b.startTime)
  })
}, [])

const handleAddInstructionSoundEvent = () => {
  let instructionTextToAdd = ""
  if (selectedLibraryInstruction) instructionTextToAdd = selectedLibraryInstruction.text
  else if (customInstructionText.trim() !== "") instructionTextToAdd = customInstructionText.trim()
  else {
    toast({
      title: "Missing Instruction",
      description: "Please select or enter an instruction.",
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

  const newEvent: TimelineEvent = {
    id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type: "instruction_sound",
    startTime: newStartTime, // Now calculated
    instructionText: instructionTextToAdd,
    soundCueId: selectedSoundCue.id,
    soundCueName: selectedSoundCue.name, // Store the name directly
    soundCueSrc: selectedSoundCue.src, // Store the src directly
    // Duration for instruction_sound events will be calculated during audio generation
    // based on the actual sound cue duration or a default for synthetic sounds.
  }
  addEventToTimeline(newEvent) // Use the new helper function
  setSelectedLibraryInstruction(null)
  setCustomInstructionText("")
  toast({
    title: "Event Added",
    description: `"${instructionTextToAdd.substring(0, 30)}..." with ${selectedSoundCue.name} added.`,
  })
}

const startRecording = async () => {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaRecorderRef.current = new MediaRecorder(stream)
      const blobs: Blob[] = []

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          blobs.push(event.data)
        }
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(blobs, { type: "audio/webm" })
        const url = URL.createObjectURL(blob)
        setRecordedAudioUrl(url)
        setRecordedBlobs([blob])
      }

      mediaRecorderRef.current.start()
      setIsRecording(true)
      setRecordedAudioUrl(null)
      toast({ title: "Recording Started" })
    } catch (err) {
      toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" })
    }
  } else {
    toast({ title: "Unsupported", description: "Audio recording not supported.", variant: "destructive" })
  }
}

const stopRecording = () => {
  if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
    mediaRecorderRef.current.stop()
    setIsRecording(false)

    // Stop all tracks to release microphone
    if (mediaRecorderRef.current.stream) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
    }

    toast({ title: "Recording Stopped" })
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
    setLabsTotalDuration(Math.max(60, Number(value) * 60) || 60)
  }
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
          <div className="relative text-center px-6 pt-[69px]">
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
              <div className="flex justify-center items-center mb-4 space-y-4 flex-row my-[33px]">
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
            {/* Conditional Rendering based on activeMode */}
            {activeMode === "adjuster" ? (
              // == Length Adjuster UI ==
              <>
                {/* Note and Resources sections - moved to proper position */}
                <div className="space-y-4 mb-[27px]">
                  <div className="p-4 max-w-2xl dark:border-logo-rose-700 border-solid border text-center border-logo-rose-600 mx-auto rounded-md shadow-inner">
                    <p className="text-logo-rose-600 leading-relaxed dark:text-logo-rose-300 font-serif font-black text-xs">
                      <strong className="pr-1.5 font-black font-serif text-center text-sm text-logo-amber-600">
                        Note:{" "}
                      </strong>{" "}
                      The meditations below are sourced from publicly available, free content. The length adjuster only
                      alters silence periods to fit user schedules. Teachers, please feel free to{" "}
                      <a
                        href="/contact"
                        className="hover:text-logo-rose-600 underline px-1 rounded transition-colors transition-shadow dark:hover:text-logo-rose-300 font-black text-sm text-logo-purple-300"
                      >
                        contact me
                      </a>{" "}
                      to opt out. Depending on the audio, users may need to tweak the advanced settings for optimal
                      results. Any guided meditation, talk, podcast, or audiobook (under{" "}
                      {isMobileDevice ? "50MB" : "500MB"}) should be compatible. Enjoy:){" "}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border-logo-rose-300 max-w-2xl mx-auto dark:border-logo-rose-700 backdrop-blur-sm dark:bg-gray-900/60 border-0 py-4 px-0 bg-transparent pb-5 pt-0">
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
                  <div className="bg-gradient-to-r from-logo-teal via-logo-emerald to-logo-blue py-3 px-6 dark:from-logo-teal dark:via-logo-emerald dark:to-logo-blue border-dashed border-0">
                    <h3 className="text-white flex items-center font-black">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Audio
                    </h3>
                  </div>
                  <div className="p-10 md:p-16 text-center md:py-14 border-dashed border-stone-300 border-2 rounded-b-2xl border-t-0">
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
                      className="bg-white p-5 mb-6 border dark:shadow-white/20 overflow-hidden dark:bg-gray-900 dark:border-gray-800 rounded-xl border-logo-teal shadow-inner"
                    >
                      <div className="flex items-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 }}
                          className="p-2 rounded-lg mr-4 dark:bg-gray-800 bg-transparent"
                        >
                          <Volume2 className="h-5 w-5 dark:text-gray-300 text-logo-purple-300" />
                        </motion.div>
                        <div>
                          <motion.div
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="mb-1 dark:text-gray-200 font-black text-sm text-logo-purple-300"
                          >
                            {file.name}
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="dark:text-gray-400/70 font-black text-xs text-logo-purple-300"
                          >
                            Size: {formatFileSize(file.size)} • Type: {file.type || "Unknown"}
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
                          <Slider
                            value={[processingProgress]}
                            max={100}
                            disabled
                            className="mt-2"
                          />
                          <p className="text-xs text-logo-rose-500 dark:text-logo-rose-400 mt-1">
                            {processingProgress.toFixed(1)}% Complete
                          </p>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {status && (
                  <Alert variant={status.type === "error" ? "destructive" : status.type === "warning" ? "warning" : "default"}>
                    <Info className="h-4 w-4" />
                    <AlertTitle>{status.type.charAt(0).toUpperCase() + status.type.slice(1)}</AlertTitle>
                    <AlertDescription>{status.message}</AlertDescription>
                  </Alert>
                )}

                {originalBuffer && (
                  <Accordion type="single" collapsible className="mb-6">
                    <AccordionItem value="item-1">
                      <AccordionTrigger className="font-black text-logo-rose-600 dark:text-logo-rose-300">
                        <Settings2 className="h-4 w-4 mr-2" />
                        Adjust Settings
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="targetDuration" className="text-logo-rose-600 dark:text-logo-rose-300">
                              Target Duration (minutes):
                            </Label>
                            <Input
                              id="targetDuration"
                              type="number"
                              min={durationLimits?.min || 1}
                              max={durationLimits?.max || 120}
                              value={targetDuration}
                              onChange={(e) => setTargetDuration(Number(e.target.value))}
                              className="font-black text-logo-rose-600 dark:text-logo-rose-300"
                            />
                            {durationLimits && (
                              <p className="text-xs text-logo-rose-500 dark:text-logo-rose-400">
                                Min: {durationLimits.min} • Max: {durationLimits.max}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="silenceThreshold" className="text-logo-rose-600 dark:text-logo-rose-300">
                              Silence Threshold:
                            </Label>
                            <Slider
                              id="silenceThreshold"
                              defaultValue={[silenceThreshold * 100]}
                              onValueChange={(value) => setSilenceThreshold(value[0] / 100)}
                              className="font-black text-logo-rose-600 dark:text-logo-rose-300"
                            />
                            <p className="text-xs text-logo-rose-500 dark:text-logo-rose-400">
                              {silenceThreshold.toFixed(3)}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="minSilenceDuration" className="text-logo-rose-600 dark:text-logo-rose-300">
                              Min Silence Duration (seconds):
                            </Label>
                            <Slider
                              id="minSilenceDuration"
                              defaultValue={[minSilenceDuration]}
                              min={0.5}
                              max={10}
                              step={0.1}
                              onValueChange={(value) => setMinSilenceDuration(value[0])}
                              className="font-black text-logo-rose-600 dark:text-logo-rose-300"
                            />
                            <p className="text-xs text-logo-rose-500 dark:text-logo-rose-400">
                              {minSilenceDuration.toFixed(1)}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="minSpacingDuration" className="text-logo-rose-600 dark:text-logo-rose-300">
                              Min Spacing Duration (seconds):
                            </Label>
                            <Slider
                              id="minSpacingDuration"
                              defaultValue={[minSpacingDuration]}
                              min={0.1}
                              max={5}
                              step={0.1}
                              onValueChange={(value) => setMinSpacingDuration(value[0])}
                              className="font-black text-logo-rose-600 dark:text-logo-rose-300"
                            />
                            <p className="text-xs text-logo-rose-500 dark:text-logo-rose-400">
                              {minSpacingDuration.toFixed(1)}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="preserveNaturalPacing"
                              checked={preserveNaturalPacing}
                              onCheckedChange={(checked) => setPreserveNaturalPacing(checked)}
                            />
                            <Label htmlFor="preserveNaturalPacing" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-logo-rose-600 dark:text-logo-rose-300">
                              Preserve Natural Pacing
                            </Label>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="compatibilityMode" className="text-logo-rose-600 dark:text-logo-rose-300">
                              Compatibility Mode:
                            </Label>
                            <Select value={compatibilityMode} onValueChange={(value) => setCompatibilityMode(value)}>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="high">High (44.1kHz)</SelectItem>
                                <SelectItem value="low">Low (Original)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}

                {originalBuffer && (
                  <div className="flex justify-center space-x-4 mb-6">
                    <audio controls src={originalUrl} preload="metadata" className="w-full max-w-md"></audio>
                  </div>
                )}

                {audioAnalysis && (
                  <Card className="p-6 mb-6 bg-gradient-to-r from-logo-teal-50 to-logo-blue-50 border-logo-teal-200 shadow-sm dark:shadow-white/10 dark:from-logo-teal-950 dark:to-logo-blue-950">
                    <h3 className="text-lg font-medium text-logo-teal-700 dark:text-logo-teal-300 mb-4">
                      Audio Analysis
                    </h3>
                    <div className="space-y-2">
                      <p className="text-sm text-logo-teal-600 dark:text-logo-teal-400">
                        Total Silence: {formatDuration(audioAnalysis.totalSilence)}
                      </p>
                      <p className="text-sm text-logo-teal-600 dark:text-logo-teal-400">
                        Content Duration: {formatDuration(audioAnalysis.contentDuration)}
                      </p>
                      <p className="text-sm text-logo-teal-600 dark:text-logo-teal-400">
                        Silence Regions: {audioAnalysis.silenceRegions}
                      </p>
                    </div>
                  </Card>
                )}

                {originalBuffer && (
                  <Button
                    variant="secondary"
                    className="w-full mb-6 font-black text-logo-purple-300 dark:text-logo-purple-300"
                    onClick={processAudio}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        Processing...
                        <Clock className="h-4 w-4 ml-2 animate-spin" />
                      </>
                    ) : (
                      <>
                        <Wand2 className="h-4 w-4 mr-2" />
                        Process Audio
                      </>
                    )}
                  </Button>
                )}

                {processedBufferState && (
                  <div className="flex justify-center space-x-4 mb-6">
                    <audio controls src={processedUrl} preload="metadata" className="w-full max-w-md"></audio>
                  </div>
                )}

                {actualDuration && (
                  <Card className="p-6 mb-6 bg-gradient-to-r from-logo-purple-50 to-logo-rose-50 border-logo-purple-200 shadow-sm dark:shadow-white/10 dark:from-logo-purple-950 dark:to-logo-rose-950">
                    <h3 className="text-lg font-medium text-logo-purple-700 dark:text-logo-purple-300 mb-4">
                      Processed Audio Details
                    </h3>
                    <div className="space-y-2">
                      <p className="text-sm text-logo-purple-600 dark:text-logo-purple-400">
                        Target Duration: {targetDuration} minutes
                      </p>
                      <p className="text-sm text-logo-purple-600 dark:text-logo-purple-400">
                        Actual Duration: {formatDuration(actualDuration)}
                      </p>
                      <p className="text-sm text-logo-purple-600 dark:text-logo-purple-400">
                        Pauses Adjusted: {pausesAdjusted}
                      </p>
                    </div>
                  </Card>
                )}

                {processedUrl && (
                  <Button
                    variant="secondary"
                    className="w-full font-black text-logo-teal-300 dark:text-logo-teal-300"
                    onClick={downloadProcessedAudio}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Processed Audio
                  </Button>
                )}
              </>
            ) : (
              // == Labs UI ==
              <>
                <Tabs defaultValue="instructions" className="w-[400px] mx-auto">
                  <TabsList>
                    <TabsTrigger value="instructions" onClick={() => setCurrentTab("instructions")}>Instructions</TabsTrigger>
                    <TabsTrigger value="sounds" onClick={() => setCurrentTab("sounds")}>Sounds</TabsTrigger>
                    <TabsTrigger value="timeline" onClick={() => setCurrentTab("timeline")}>Timeline</TabsTrigger>
                  </TabsList>
                  <TabsContent value="instructions">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="meditationTitle">Meditation Title</Label>
                        <Input
                          type="text"
                          id="meditationTitle"
                          value={meditationTitle}
                          onChange={handleMeditationTitleChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="totalDuration">Total Duration (minutes)</Label>
                        <Input
                          type="number"
                          id="totalDuration"
                          value={labsTotalDuration / 60}
                          onChange={handleDurationChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Select Instruction Category</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {instructionCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Select Instruction</Label>
                        <Select onValueChange={(value) => setSelectedLibraryInstruction(INSTRUCTIONS_LIBRARY.find((instr) => instr.id === value) || null)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an instruction" />
                          </SelectTrigger>
                          <SelectContent>
                            {INSTRUCTIONS_LIBRARY.map((instruction) => (
                              <SelectItem key={instruction.id} value={instruction.id}>
                                {instruction.text.substring(0, 50)}...
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customInstruction">Or Enter Custom Instruction</Label>
                        <Textarea
                          id="customInstruction"
                          value={customInstructionText}
                          onChange={handleCustomInstructionChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Select Sound Cue</Label>
                        <Select onValueChange={(value) => setSelectedSoundCue(SOUND_CUES_LIBRARY.find((cue) => cue.id === value) || null)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a sound cue" />
                          </SelectTrigger>
                          <SelectContent>
                            {SOUND_CUES_LIBRARY.map((soundCue) => (
                              <SelectItem key={soundCue.id} value={soundCue.id}>
                                {soundCue.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddInstructionSoundEvent}>Add Instruction + Sound</Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="sounds">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label>Sound Library</Label>
                        {SOUND_CUES_LIBRARY.map((soundCue) => (
                          <div key={soundCue.id} className="flex items-center justify-between">
                            <span>{soundCue.name}</span>
                            <Button variant="outline" size="sm" onClick={() => playLabsSound(soundCue.src)}>
                              Play
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <Label>Volume</Label>
                        <Slider
                          defaultValue={[volume]}
                          max={100}
                          step={1}
                          onValueChange={(value) => setVolume(value[0])}
                        />
                      </div>
                      <audio ref={labsAudioRef} controls className="w-full"></audio>
                    </div>
                  </TabsContent>
                  <TabsContent value="timeline">
                    <div className="grid gap-4">
                      <div className="space-y-2">
                        <Label>Timeline Events</Label>
                        <div className="max-h-64 overflow-y-auto">
                          {timelineEvents.map((event) => (
                            <div key={event.id} className="flex items-center justify-between border rounded-md p-2 mb-1">
                              <div>
                                {event.type === "instruction_sound" && (
                                  <>
                                    <p className="text-sm">
                                      {event.instructionText?.substring(0, 30)}... with {event.soundCueName}
                                    </p>
                                  </>
                                )}
                                {event.type === "recorded_voice" && (
                                  <>
                                    <p className="text-sm">Recorded Voice: {event.recordedInstructionLabel || "Untitled"}</p>
                                  </>
                                )}
                                <p className="text-xs text-gray-500">Start Time: {event.startTime}s</p>
                              </div>
                              <div className="flex items-center">
                                <Input
                                  type="number"
                                  value={event.startTime}
                                  onChange={(e) => updateEventStartTime(event.id, Number(e.target.value))}
                                  className="w-20 text-xs mr-2"
                                />
                                <Button variant="destructive" size="icon" onClick={() => removeTimelineEvent(event.id)}>
                                  <ListPlus className="h-4 w-4 rotate-45" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Add Recorded Voice Event</Label>
                        <Input
                          type="text"
                          placeholder="Recording Label"
                          value={recordingLabel}
                          onChange={handleRecordingLabelChange}
                        />
                        {!isRecording && (
                          <Button variant="secondary" onClick={startRecording}>
                            <Mic className="h-4 w-4 mr-2" />
                            Start Recording
                          </Button>
                        )}
                        {isRecording && (
                          <Button variant="destructive" onClick={stopRecording}>
                            <StopCircle className="h-4 w-4 mr-2" />
                            Stop Recording
                          </Button>
                        )}
                        {recordedAudioUrl && (
                          <>
                            <audio src={recordedAudioUrl} controls className="w-full"></audio>
                            <Button
                              onClick={() => {
                                const maxExistingTime = timelineEvents.length > 0 ? Math.max(...timelineEvents.map((e) => e.startTime)) : 0
                                const newStartTime = timelineEvents.length > 0 ? maxExistingTime + 33 : 0

                                const newEvent: TimelineEvent = {
                                  id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                                  type: "recorded_voice",
                                  startTime: newStartTime,
                                  recordedAudioUrl: recordedAudioUrl,
                                  recordedInstructionLabel: recordingLabel,
                                }
                                addEventToTimeline(newEvent)
                                setRecordedAudioUrl(null)
                                setRecordingLabel("")
                                toast({ title: "Recorded Voice Added" })
                              }}
                            >
                              Add Recorded Voice to Timeline
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-between mt-4">
                  <Button onClick={handleSaveTimeline}>
                    <Upload className="h-4 w-4 mr-2" />
                    Save Timeline
                  </Button>
                  <Button onClick={handleLoadTimeline}>
                    <Download className="h-4 w-4 mr-2" />
                    Load Timeline
                  </Button>
                </div>

                <div className="mt-6">
                  <VisualTimeline
                    events={timelineEvents}
                    totalDuration={labsTotalDuration}
                    onEventTimeChange={updateEventStartTime}
                    onEventRemove={removeTimelineEvent}
                  />
                </div>

                <div className="mt-6">
                  <Button
                    variant="secondary"
                    className="w-full font-black text-logo-purple-300 dark:text-logo-purple-300"
                    onClick={handleExportAudio}
                    disabled={isGeneratingAudio}
                  >
                    {isGeneratingAudio ? (
                      <>
                        Generating Audio...
                        <Clock className="h-4 w-4 ml-2 animate-spin" />
                      </>
                    ) : (
                      <>
                        <Music2 className="h-4 w-4 mr-2" />
                        Export Audio
                      </>
                    )}
                  </Button>
                  {generatedAudioUrl && (
                    <div className="flex justify-center space-x-4 mt-4">
                      <audio controls src={generatedAudioUrl} preload="metadata" className="w-full max-w-md"></audio>
                    </div>
                  )}
                  {isGeneratingAudio && (
                    <Card className="p-6 mt-4 bg-gradient-to-r from-logo-rose-50 to-logo-purple-50 border-logo-rose-200 shadow-sm dark:shadow-white/10 dark:from-logo-rose-950 dark:to-logo-purple-950">
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-medium text-logo-rose-700 dark:text-logo-rose-300 mb-2">
                          Generating Audio
                        </h3>
                        <p className="text-sm text-logo-rose-600 dark:text-logo-rose-400">{generationStep}</p>
                        <Slider
                          value={[generationProgress]}
                          max={100}
                          disabled
                          className="mt-2"
                        />
                        <p className="text-xs text-logo-rose-500 dark:text-logo-rose-400 mt-1">
                          {generationProgress.toFixed(1)}% Complete
                        </p>
                      </div>
                    </Card>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
\
}
