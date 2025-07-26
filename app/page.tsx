"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  PlusIcon,
  TrashIcon,
  EditIcon,
  PlayIcon,
  PauseIcon,
  MonitorStopIcon as StopIcon,
  MicIcon,
  DownloadIcon,
} from "lucide-react"
import type { MeditationTimeline, TimelineEvent, SoundCue } from "@/lib/types"
import { generateEncodedAudio } from "@/lib/audio-utils"
import { ambientSounds as predefinedAmbientSounds } from "@/app/labs/lib/meditation-data"
import { motion, AnimatePresence } from "framer-motion"
import { Navigation } from "@/components/navigation"
import { Alert } from "@/components/ui/alert"
import { Info, Volume2, Clock, Wand2, Download, Save, AlertTriangle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { INSTRUCTIONS_LIBRARY, SOUND_CUES_LIBRARY, generateSyntheticSound } from "@/lib/meditation-data"
import { cn, formatTime, sleep, monitorMemory, forceGarbageCollection, formatFileSize } from "@/lib/utils"
import { getAudioContext, bufferToWav } from "@/lib/audio-utils" // Import from audio-utils
import type { Instruction, SoundCue as LegacySoundCue } from "@/lib/types" // Import types
import { useMobile } from "@/hooks/use-mobile" // Import useMobile hook

interface TimelineItem {
  id: string
  type: "instruction" | "sound"
  duration: number // in seconds
  content: Instruction | LegacySoundCue
}

export default function HomePage() {
  // State for mode toggle (Length Adjuster vs Labs)
  const [activeMode, setActiveMode] = useState<"adjuster" | "labs">("adjuster")
  const { session, user } = useAuth()
  const [meditationLength, setMeditationLength] = useState<number[]>([10])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [transcriptionMethod, setTranscriptionMethod] = useState<"browser" | "manual">("browser")
  const [manualInstructionText, setManualInstructionText] = useState("")
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editingInstructionText, setEditingInstructionText] = useState("")
  const [editingSoundCue, setEditingSoundCue] = useState<string>("")
  const [editingTime, setEditingTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null)
  const [currentAmbientSound, setCurrentAmbientSound] = useState<HTMLAudioElement | null>(null)
  const [selectedAmbientSound, setSelectedAmbientSound] = useState<string | null>(null)
  const [ambientVolume, setAmbientVolume] = useState<number[]>([50])

  const ambientSounds: SoundCue[] = predefinedAmbientSounds.map((sound) => ({
    name: sound.name,
    src: sound.src,
  }))

  useEffect(() => {
    if (currentAmbientSound) {
      currentAmbientSound.volume = ambientVolume[0] / 100
    }
  }, [ambientVolume, currentAmbientSound])

  const handlePlayAmbientSound = (src: string) => {
    if (currentAmbientSound) {
      currentAmbientSound.pause()
      currentAmbientSound.removeEventListener("ended", loopAmbientSound)
    }
    const audio = new Audio(src)
    audio.loop = true
    audio.volume = ambientVolume[0] / 100
    audio.play()
    setCurrentAmbientSound(audio)
    setSelectedAmbientSound(src)
    audio.addEventListener("ended", loopAmbientSound)
  }

  const loopAmbientSound = () => {
    if (currentAmbientSound) {
      currentAmbientSound.currentTime = 0
      currentAmbientSound.play()
    }
  }

  const handleStopAmbientSound = () => {
    if (currentAmbientSound) {
      currentAmbientSound.pause()
      currentAmbientSound.removeEventListener("ended", loopAmbientSound)
      setCurrentAmbientSound(null)
    }
    setSelectedAmbientSound(null)
  }

  const [timeline, setTimeline] = useState<MeditationTimeline>({ events: [] })

  const addInstructionToTimeline = (instruction: string, audioSrc: string | null = null) => {
    const newEvent: TimelineEvent = {
      id: Date.now().toString(),
      time: 0, // Will be set by user later
      instruction,
      audioSrc,
      soundCueName: null,
      soundCueSrc: null,
    }
    setTimeline((prev) => ({
      ...prev,
      events: [...prev.events, newEvent].sort((a, b) => a.time - b.time),
    }))
    toast({
      title: "Instruction Added",
      description: "Instruction added to timeline. Set its time and sound cue.",
    })
  }

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      setMediaRecorder(recorder)
      setAudioChunks([])

      recorder.ondataavailable = (event) => {
        setAudioChunks((prev) => [...prev, event.data])
      }

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" })
        const audioUrl = URL.createObjectURL(audioBlob)

        if (transcriptionMethod === "browser") {
          // Simulate browser transcription
          toast({
            title: "Transcribing...",
            description: "Browser transcription is a placeholder. Using dummy text.",
          })
          const dummyText = "This is a transcribed instruction from your recording."
          addInstructionToTimeline(dummyText, audioUrl)
        } else {
          // Manual transcription: user will provide text
          toast({
            title: "Recording Complete",
            description: "Audio recorded. Please provide the instruction text manually.",
          })
          addInstructionToTimeline("Recorded instruction (manual text needed)", audioUrl)
        }
        setIsRecording(false)
      }

      recorder.start()
      setIsRecording(true)
      toast({ title: "Recording Started", description: "Speak your instruction now." })
    } catch (error) {
      console.error("Error accessing microphone:", error)
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record instructions.",
        variant: "destructive",
      })
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      // Stream tracks need to be stopped to release microphone
      mediaRecorder.stream.getTracks().forEach((track) => track.stop())
      setIsRecording(false)
      toast({ title: "Recording Stopped", description: "Processing audio..." })
    }
  }

  const handleAddManualInstruction = () => {
    if (manualInstructionText.trim()) {
      addInstructionToTimeline(manualInstructionText.trim())
      setManualInstructionText("")
    } else {
      toast({
        title: "Input Required",
        description: "Please enter text for the manual instruction.",
        variant: "destructive",
      })
    }
  }

  const handleEditEvent = (event: TimelineEvent) => {
    setEditingEventId(event.id)
    setEditingInstructionText(event.instruction)
    setEditingSoundCue(event.soundCueName || "")
    setEditingTime(event.time)
  }

  const handleSaveEdit = () => {
    setTimeline((prev) => ({
      ...prev,
      events: prev.events
        .map((event) =>
          event.id === editingEventId
            ? {
                ...event,
                instruction: editingInstructionText,
                time: editingTime,
                soundCueName: editingSoundCue || null,
                soundCueSrc: editingSoundCue
                  ? ambientSounds.find((s) => s.name === editingSoundCue)?.src || null
                  : null,
              }
            : event,
        )
        .sort((a, b) => a.time - b.time),
    }))
    setEditingEventId(null)
    setEditingInstructionText("")
    setEditingSoundCue("")
    setEditingTime(0)
    toast({ title: "Event Updated", description: "Timeline event has been updated." })
  }

  const handleRemoveEvent = (id: string) => {
    setTimeline((prev) => ({
      ...prev,
      events: prev.events.filter((event) => event.id !== id),
    }))
    toast({ title: "Event Removed", description: "Timeline event has been removed." })
  }

  const handleSimulateEncoding = async () => {
    toast({ title: "Simulating Encoding", description: "Generating dummy encoded audio..." })
    try {
      const dummyAudioBlob = await generateEncodedAudio(timeline)
      const url = URL.createObjectURL(dummyAudioBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = "encoded_meditation.mp3"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast({ title: "Encoding Complete", description: "Dummy audio downloaded." })
    } catch (error) {
      console.error("Error simulating encoding:", error)
      toast({
        title: "Encoding Failed",
        description: "Could not simulate audio encoding.",
        variant: "destructive",
      })
    }
  }

  const handlePlayTimeline = async () => {
    if (timeline.events.length === 0) {
      toast({ title: "No Events", description: "Add events to the timeline to play." })
      return
    }

    setIsPlaying(true)
    if (currentAudio) {
      currentAudio.pause()
      setCurrentAudio(null)
    }

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    for (const event of timeline.events) {
      if (!isPlaying) break // Stop if playback is paused/stopped

      // Play instruction audio if available
      if (event.audioSrc) {
        const response = await fetch(event.audioSrc)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContext.destination)
        source.start(audioContext.currentTime + event.time / 1000) // Schedule based on event time
      }

      // Play sound cue if available
      if (event.soundCueSrc) {
        const response = await fetch(event.soundCueSrc)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        const source = audioContext.createBufferSource()
        source.buffer = audioBuffer
        source.connect(audioContext.destination)
        source.start(audioContext.currentTime + event.time / 1000) // Schedule based on event time
      }

      // Simulate instruction text display
      console.log(`At ${event.time}ms: ${event.instruction}`)
      toast({
        title: `Instruction at ${event.time}ms`,
        description: event.instruction,
      })

      // Wait for the event's duration or until the next event
      // This is a simplified wait; a real player would manage precise timing
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Dummy wait
    }

    setIsPlaying(false)
    toast({ title: "Timeline Finished", description: "Playback complete." })
  }

  const handlePauseTimeline = () => {
    setIsPlaying(false)
    if (currentAudio) {
      currentAudio.pause()
    }
    toast({ title: "Timeline Paused", description: "Playback paused." })
  }

  const handleStopTimeline = () => {
    setIsPlaying(false)
    if (currentAudio) {
      currentAudio.pause()
      setCurrentAudio(null)
    }
    toast({ title: "Timeline Stopped", description: "Playback stopped." })
  }

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

  // == States for Labs ==
  const [meditationTitle, setMeditationTitle] = useState<string>("My Custom Meditation")
  const [labsTotalDuration, setLabsTotalDuration] = useState<number>(600)
  const handleSaveMeditation = async () => {
    if (!session) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save meditations",
        variant: "destructive",
      })
      return
    }
    const { error } = await supabase.from("meditations").insert({
      user_id: session.user.id,
      title: meditationTitle,
      timeline: timelineEvents,
    })
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    } else {
      toast({ title: "Saved", description: "Meditation saved to your profile" })
    }
  }
  const [selectedLibraryInstruction, setSelectedLibraryInstruction] = useState<Instruction | null>(null)
  const [customInstructionText, setCustomInstructionText] = useState<string>("")
  const [selectedSoundCue, setSelectedSoundCue] = useState<LegacySoundCue | null>(null)
  const [recordingLabel, setRecordingLabel] = useState<string>("")
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false)
  const [generationProgress, setGenerationProgress] = useState<number>(0)
  const [generationStep, setGenerationStep] = useState<string>("")
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null)

  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null)
  const [playbackIntervalRef, setPlaybackIntervalRef] = useState<NodeJS.Timeout | null>(null)
  const [currentItemStartTimeRef, setCurrentItemStartTimeRef] = useState<number>(0)
  const [volume, setVolume] = useState<number>(70)

  const totalDuration = timeline.events.reduce((sum, item) => sum + item.time, 0)

  const addTimelineItem = useCallback((item: Instruction | LegacySoundCue, type: "instruction" | "sound") => {
    const newItem: TimelineItem = {
      id: `${type}-${Date.now()}`,
      type,
      duration: type === "instruction" ? 60 : 5, // Default duration: 60s for instruction, 5s for sound
      content: item,
    }
    setTimeline((prev) => ({ ...prev, events: [...prev.events, newItem] }))
  }, [])

  const updateTimelineItemDuration = useCallback((index: number, newDuration: number) => {
    setTimeline((prev) => ({
      ...prev,
      events: prev.events.map((item, i) => (i === index ? { ...item, duration: Math.max(1, newDuration) } : item)),
    }))
  }, [])

  const removeTimelineItem = useCallback((index: number) => {
    setTimeline((prev) => ({ ...prev, events: prev.events.filter((_, i) => i !== index) }))
  }, [])

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
          if (audioRef) {
            const labsAudioRef = new Audio(soundCue.src)
            labsAudioRef.volume = volume / 100
            await labsAudioRef.play().catch((e) => console.error("Error playing audio:", e))
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
    [volume, audioRef],
  )

  const startPlayback = useCallback(() => {
    if (timeline.events.length === 0) return

    setIsPlaying(true)
    setCurrentItemStartTimeRef(0) // Store start time of current item

    setPlaybackIntervalRef(setInterval(() => {}, 100)) // Update every 100ms
  }, [timeline, totalDuration])

  const pausePlayback = useCallback(() => {
    if (playbackIntervalRef) {
      clearInterval(playbackIntervalRef)
      setPlaybackIntervalRef(null)
    }
    setIsPlaying(false)
  }, [playbackIntervalRef])

  const resetPlayback = useCallback(() => {
    pausePlayback()
  }, [pausePlayback])

  useEffect(() => {
    // Cleanup interval on component unmount
    return () => {
      if (playbackIntervalRef) {
        clearInterval(playbackIntervalRef)
      }
    }
  }, [playbackIntervalRef])

  // Update audio volume if audioRef exists
  useEffect(() => {
    if (audioRef) {
      audioRef.volume = volume / 100
    }
  }, [volume, audioRef])

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
  const [readyToAddToTimelineRecording, setReadyToAddToTimelineRecording] = useState<{
    url: string
    duration: number
    label: string
  } | null>(null)
  const [recordedBlobs, setRecordedBlobs] = useState<Blob[]>([])
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const labsAudioRef = useRef<HTMLAudioElement | null>(null)
  const instructionCategories = Array.from(new Set(INSTRUCTIONS_LIBRARY.map((instr) => instr.category)))
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
      return updatedEvents.sort((a, b) => a.time - b.time)
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
    const maxExistingTime = timelineEvents.length > 0 ? Math.max(...timelineEvents.map((e) => e.time)) : 0
    const newStartTime = timelineEvents.length > 0 ? maxExistingTime + 33 : 0

    const newEvent: TimelineEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      time: newStartTime, // Now calculated
      instruction: instructionTextToAdd,
      soundCueName: selectedSoundCue.name, // Store the name directly
      soundCueSrc: selectedSoundCue.src, // Store the src directly
      audioSrc: null,
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

            setReadyToAddToTimelineRecording({
              url,
              duration,
              label: recordingLabel.trim(),
            })
            setRecordedBlobs([blob]) // Keep the blob for potential future use if needed
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
            setReadyToAddToTimelineRecording(null)
          }

          // Stop all tracks to release microphone
          if (mediaRecorderRef.current?.stream) {
            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop())
          }
        }

        mediaRecorderRef.current.start()
        setIsRecording(true)
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
      const updated = prev.map((event) =>
        event.id === eventId ? { ...event, time: Math.max(0, Math.min(newTime, labsTotalDuration)) } : event,
      )
      // Simple sort by startTime, with stable sorting for events at the same time
      return updated.sort((a, b) => {
        if (a.time === b.time) {
          // For events at the same time, maintain their relative order based on original array position
          const aIndex = prev.findIndex((e) => e.id === a.id)
          const bIndex = prev.findIndex((e) => e.id === b.id)
          return aIndex - bIndex
        }
        return a.time - b.time
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
                          <Button
                            className="w-full mt-2 py-4 rounded-xl shadow-md dark:shadow-white/20 bg-gradient-to-r from-logo-teal-600 to-logo-purple-600 hover:from-logo-teal-700 hover:to-logo-purple-700 transition-all border-none dark:from-logo-teal-700 dark:to-logo-purple-700 dark:hover:from-logo-teal-800 dark:hover:to-logo-purple-800"
                            onClick={handleSaveMeditation}
                          >
                            <div className="flex items-center justify-center font-black">
                              <Save className="mr-2 h-5 w-5" />
                              Save Meditation
                            </div>
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </div>
              </>
            ) : (
              <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 p-4">
                <div className="lg:col-span-1 space-y-6">
                  <Card className="bg-white/70 backdrop-blur-md dark:bg-gray-800/70 dark:shadow-white/10 shadow-2xl">
                    <CardHeader>
                      <CardTitle>Meditation Length</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Label htmlFor="meditation-length">Length: {meditationLength[0]} minutes</Label>
                      <Slider
                        id="meditation-length"
                        min={1}
                        max={60}
                        step={1}
                        value={meditationLength}
                        onValueChange={setMeditationLength}
                        className="w-full"
                      />
                      <Button className="w-full">Generate Timeline (Placeholder)</Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/70 backdrop-blur-md dark:bg-gray-800/70 dark:shadow-white/10 shadow-2xl">
                    <CardHeader>
                      <CardTitle>Ambient Sounds</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Label htmlFor="ambient-volume">Volume: {ambientVolume[0]}%</Label>
                      <Slider
                        id="ambient-volume"
                        min={0}
                        max={100}
                        step={1}
                        value={ambientVolume}
                        onValueChange={setAmbientVolume}
                        className="w-full"
                      />
                      <Select onValueChange={handlePlayAmbientSound} value={selectedAmbientSound || ""}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an ambient sound" />
                        </SelectTrigger>
                        <SelectContent>
                          {ambientSounds.map((sound) => (
                            <SelectItem key={sound.name} value={sound.src}>
                              {sound.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button onClick={handleStopAmbientSound} disabled={!selectedAmbientSound} className="w-full">
                        Stop Ambient Sound
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/70 backdrop-blur-md dark:bg-gray-800/70 dark:shadow-white/10 shadow-2xl">
                    <CardHeader>
                      <CardTitle>Record Voice Instructions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={startRecording}
                          disabled={isRecording}
                          className="flex-1"
                          variant={isRecording ? "destructive" : "default"}
                        >
                          <MicIcon className="mr-2 h-4 w-4" /> {isRecording ? "Recording..." : "Start Recording"}
                        </Button>
                        <Button onClick={stopRecording} disabled={!isRecording} className="flex-1">
                          <StopIcon className="mr-2 h-4 w-4" /> Stop Recording
                        </Button>
                      </div>
                      <Select
                        onValueChange={(value: "browser" | "manual") => setTranscriptionMethod(value)}
                        value={transcriptionMethod}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select transcription method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="browser">Browser Transcription (Placeholder)</SelectItem>
                          <SelectItem value="manual">Manual Transcription</SelectItem>
                        </SelectContent>
                      </Select>
                      {transcriptionMethod === "manual" && (
                        <div className="space-y-2">
                          <Label htmlFor="manual-instruction">Manual Instruction Text</Label>
                          <Textarea
                            id="manual-instruction"
                            placeholder="Enter instruction text here..."
                            value={manualInstructionText}
                            onChange={(e) => setManualInstructionText(e.target.value)}
                          />
                          <Button onClick={handleAddManualInstruction} className="w-full">
                            <PlusIcon className="mr-2 h-4 w-4" /> Add Manual Instruction
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <Card className="bg-white/70 backdrop-blur-md dark:bg-gray-800/70 dark:shadow-white/10 shadow-2xl">
                    <CardHeader>
                      <CardTitle>Meditation Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-center gap-2">
                        <Button onClick={handlePlayTimeline} disabled={isPlaying || timeline.events.length === 0}>
                          <PlayIcon className="mr-2 h-4 w-4" /> Play
                        </Button>
                        <Button onClick={handlePauseTimeline} disabled={!isPlaying}>
                          <PauseIcon className="mr-2 h-4 w-4" /> Pause
                        </Button>
                        <Button onClick={handleStopTimeline} disabled={!isPlaying && !currentAudio}>
                          <StopIcon className="mr-2 h-4 w-4" /> Stop
                        </Button>
                        <Button onClick={handleSimulateEncoding}>
                          <DownloadIcon className="mr-2 h-4 w-4" /> Simulate Encode & Download
                        </Button>
                      </div>
                      <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-gray-50 dark:bg-gray-900">
                        {timeline.events.length === 0 ? (
                          <p className="text-center text-gray-500 dark:text-gray-400">
                            No events in timeline. Add instructions!
                          </p>
                        ) : (
                          <div className="space-y-4">
                            {timeline.events.map((event) => (
                              <div
                                key={event.id}
                                className="flex items-center justify-between p-3 border rounded-md bg-white dark:bg-gray-800 shadow-sm"
                              >
                                {editingEventId === event.id ? (
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
                                    <Input
                                      type="number"
                                      value={editingTime}
                                      onChange={(e) => setEditingTime(Number(e.target.value))}
                                      placeholder="Time (ms)"
                                      className="col-span-1"
                                    />
                                    <Input
                                      value={editingInstructionText}
                                      onChange={(e) => setEditingInstructionText(e.target.value)}
                                      placeholder="Instruction text"
                                      className="col-span-2"
                                    />
                                    <Select onValueChange={setEditingSoundCue} value={editingSoundCue}>
                                      <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select sound cue (optional)" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {ambientSounds.map((sound) => (
                                          <SelectItem key={sound.name} value={sound.name}>
                                            {sound.name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Button onClick={handleSaveEdit} size="sm" className="col-span-3">
                                      Save
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex-1 space-y-1">
                                      <p className="font-medium text-gray-900 dark:text-gray-100">
                                        {event.time}ms: {event.instruction}
                                      </p>
                                      {event.soundCueName && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                          Sound: {event.soundCueName}
                                        </p>
                                      )}
                                      {event.audioSrc && (
                                        <audio controls src={event.audioSrc} className="w-full mt-2" />
                                      )}
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                      <Button variant="ghost" size="icon" onClick={() => handleEditEvent(event)}>
                                        <EditIcon className="h-4 w-4" />
                                        <span className="sr-only">Edit</span>
                                      </Button>
                                      <Button variant="ghost" size="icon" onClick={() => handleRemoveEvent(event.id)}>
                                        <TrashIcon className="h-4 w-4" />
                                        <span className="sr-only">Remove</span>
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
