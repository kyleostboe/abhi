"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SaveMeditationDialog } from "@/components/save-meditation-dialog"
import { BookmarkPlus } from "lucide-react"
import * as Tone from "tone"
import {
  bufferToWav,
  encodeDistributionAudio,
  extensionForContainer,
  type BufferToWavMetadata,
  type AudioFormatMetadata,
} from "@/lib/audio-utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

type SpeechRecognitionAlternative = {
  transcript: string
  confidence: number
}

type SpeechRecognitionResult = {
  readonly isFinal: boolean
  readonly length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

type SpeechRecognitionResultList = {
  readonly length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

type SpeechRecognitionEvent = Event & {
  resultIndex: number
  results: SpeechRecognitionResultList
}

type SpeechRecognitionErrorEvent = Event & {
  error: string
}

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

interface Instruction {
  id: string
  text: string
  startTime: number
  endTime: number
}

interface MappedInstruction extends Instruction {
  soundId: string
  keepOriginal: boolean
  originalVolume: number
  soundVolume: number
}

interface SoundDefinition {
  id: string
  name: string
  description: string
}

interface MusicalNote {
  id: string
  name: string
  note: string
  octave: number
}

const musicalNotes: MusicalNote[] = [
  { id: "C4", name: "C4", note: "C", octave: 4 },
  { id: "D4", name: "D4", note: "D", octave: 4 },
  { id: "E4", name: "E4", note: "E", octave: 4 },
  { id: "F4", name: "F4", note: "F", octave: 4 },
  { id: "G4", name: "G4", note: "G", octave: 4 },
  { id: "A4", name: "A4", note: "A", octave: 4 },
  { id: "B4", name: "B4", note: "B", octave: 4 },
  { id: "C5", name: "C5", note: "C", octave: 5 },
  { id: "D5", name: "D5", note: "D", octave: 5 },
  { id: "E5", name: "E5", note: "E", octave: 5 },
  { id: "F5", name: "F5", note: "F", octave: 5 },
  { id: "G5", name: "G5", note: "G", octave: 5 },
  { id: "A5", name: "A5", note: "A", octave: 5 },
  { id: "B5", name: "B5", note: "B", octave: 5 },
  { id: "C6", name: "C6", note: "C", octave: 6 },
]

const availableSounds: SoundDefinition[] = [
  { id: "bell_high", name: "High Bell", description: "A clear, high-pitched bell." },
  { id: "bell_mid", name: "Mid Bell", description: "A resonant, medium-pitched bell." },
  { id: "chime_soft", name: "Soft Chime", description: "A gentle, soothing chime." },
  { id: "tone_short_low", name: "Short Low Tone", description: "A brief, low frequency tone." },
  { id: "tone_short_high", name: "Short High Tone", description: "A brief, high frequency tone." },
  { id: "wood_block", name: "Wood Block", description: "A sharp, percussive wood block sound." },
]

export default function CreatorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string>("")
  const [transcriptionMethod, setTranscriptionMethod] = useState<"browser" | "manual">("browser")
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false)
  const [transcriptionProgress, setTranscriptionProgress] = useState(0)
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [mappedInstructions, setMappedInstructions] = useState<MappedInstruction[]>([])
  const [isEncoding, setIsEncoding] = useState<boolean>(false)
  const [encodingProgress, setEncodingProgress] = useState(0)
  const [encodedAudioUrl, setEncodedAudioUrl] = useState<string>("")
  const [encodedAudioMetadata, setEncodedAudioMetadata] = useState<BufferToWavMetadata | null>(null)
  const [encodedDistributionBlob, setEncodedDistributionBlob] = useState<Blob | null>(null)
  const [encodedDistributionMetadata, setEncodedDistributionMetadata] = useState<AudioFormatMetadata | null>(null)
  const [isCompressingEncodedAudio, setIsCompressingEncodedAudio] = useState<boolean>(false)
  const [status, setStatus] = useState<{ message: string; type: "info" | "success" | "error" } | null>(null)
  const [fullTranscript, setFullTranscript] = useState<string>("")
  const [isListening, setIsListening] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)

  const [multiNoteMode, setMultiNoteMode] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const originalAudioBufferRef = useRef<AudioBuffer | null>(null)

  const encodedQualityWarning =
    encodedAudioMetadata && (encodedAudioMetadata.bitDepth === 8 || encodedAudioMetadata.sampleRate <= 16000)

  const ensureAudioContext = async (): Promise<AudioContext | null> => {
    if (typeof window === "undefined") return null

    let context = audioContextRef.current

    if (!context) {
      const AudioContextClass = window.AudioContext ?? (window as any).webkitAudioContext

      if (!AudioContextClass) {
        console.error("[v0] AudioContext is not supported in this browser")
        return null
      }

      context = new AudioContextClass()
      audioContextRef.current = context
    }

    if (context.state === "suspended") {
      try {
        await context.resume()
      } catch (error) {
        console.error("[v0] Failed to resume AudioContext:", error)
        return null
      }
    }

    return context
  }

  useEffect(() => {
    if (typeof window === "undefined") return

    let isMounted = true

    const setupAudio = async () => {
      const context = await ensureAudioContext()
      if (!context || !isMounted) return

      // Initialize Speech Recognition if available
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const speechWindow = window as SpeechRecognitionWindow
        const SpeechRecognitionClass =
          speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition

        if (SpeechRecognitionClass) {
          recognitionRef.current = new SpeechRecognitionClass()
          recognitionRef.current.continuous = true
          recognitionRef.current.interimResults = true
          recognitionRef.current.lang = "en-US"
        }
      }
    }

    void setupAudio()

    return () => {
      isMounted = false
      audioContextRef.current?.close()
    }
  }, [])

  useEffect(() => {
    const handleImportFromLibrary = () => {
      const creatorImport = localStorage.getItem("abhi_creator_import")
      if (creatorImport) {
        try {
          const importData = JSON.parse(creatorImport)
          console.log("[v0] Loading meditation from library into creator:", importData)

          handleImportedMeditation(importData)

          // Clear the import data
          localStorage.removeItem("abhi_creator_import")

          setStatus({
            message: `Loaded "${importData.title}" from library.`,
            type: "success",
          })
        } catch (error) {
          console.error("[v0] Error loading creator import:", error)
          localStorage.removeItem("abhi_creator_import")
        }
      }
    }

    // Run on mount
    handleImportFromLibrary()
  }, [])

  const playSoundPreview = async (soundId: string) => {
    try {
      // Ensure Tone.js is started
      if (Tone.context.state !== "running") {
        await Tone.start()
      }

      // Create and play sound using Tone.js
      await createToneSound(soundId, 0, 1.0) // immediate playback with full volume
    } catch (error) {
      console.error("Error playing sound preview:", error)
    }
  }

  const playNotePreview = async (noteId: string) => {
    try {
      if (Tone.context.state !== "running") {
        await Tone.start()
      }

      const synth = new Tone.Synth({
        oscillator: { type: "fatsawtooth" },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.2 },
        filter: { frequency: 1200, rolloff: -12 },
        filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 2 },
      }).toDestination()

      const reverb = new Tone.Reverb(1.5).toDestination()
      synth.connect(reverb)

      synth.triggerAttackRelease(noteId, "2n")

      setTimeout(() => {
        synth.dispose()
        reverb.dispose()
      }, 3000)
    } catch (error) {
      console.error("Error playing note preview:", error)
    }
  }

  const playChordPreview = async () => {
    if (selectedNotes.length === 0) return

    console.log("[v0] Playing chord with notes:", selectedNotes)

    try {
      if (Tone.context.state !== "running") {
        await Tone.start()
        console.log("[v0] Tone.js context started for chord")
      }

      const polySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth" },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.2 },
        filter: { frequency: 1200, rolloff: -12 },
        filterEnvelope: { attack: 0.02, decay: 0.2, sustain: 0.5, release: 2 },
      }).toDestination()

      const reverb = new Tone.Reverb(1.5).toDestination()
      polySynth.connect(reverb)

      console.log("[v0] Triggering chord with notes:", selectedNotes)
      polySynth.triggerAttackRelease(selectedNotes, "2n")
      console.log("[v0] Chord triggered successfully")

      setTimeout(() => {
        polySynth.dispose()
        reverb.dispose()
        console.log("[v0] Chord synth disposed")
      }, 3000)
    } catch (error) {
      console.error("[v0] Error playing chord preview:", error)
    }
  }

  const handleNoteSelection = (noteId: string) => {
    if (multiNoteMode) {
      console.log("[v0] Multi-note mode: toggling note", noteId)
      setSelectedNotes((prev) => {
        const newSelection = prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
        console.log("[v0] New selected notes:", newSelection)
        return newSelection
      })
    } else {
      console.log("[v0] Single note mode: playing", noteId)
      playNotePreview(noteId)
    }
  }

  const createToneSound = async (soundId: string, startTime = 0, volumeMultiplier = 1.0) => {
    const baseVolume = 0.3 * volumeMultiplier

    switch (soundId) {
      case "bell_high": {
        const bell = new Tone.FMSynth({
          harmonicity: 8,
          modulationIndex: 25,
          oscillator: { type: "sine" },
          envelope: { attack: 0.001, decay: 1.0, sustain: 0.1, release: 1.2 },
          modulation: { type: "square" },
          modulationEnvelope: { attack: 0.5, decay: 0.0, sustain: 1, release: 0.5 },
        }).toDestination()

        const reverb = new Tone.Reverb(2.5).toDestination()
        bell.connect(reverb)

        bell.triggerAttackRelease("A5", "2n", `+${startTime}`)

        setTimeout(() => {
          bell.dispose()
          reverb.dispose()
        }, 3000)
        break
      }
      case "bell_mid": {
        const bell = new Tone.FMSynth({
          harmonicity: 6,
          modulationIndex: 20,
          oscillator: { type: "sine" },
          envelope: { attack: 0.001, decay: 1.2, sustain: 0.1, release: 1.5 },
          modulation: { type: "square" },
          modulationEnvelope: { attack: 0.6, decay: 0.0, sustain: 1, release: 0.6 },
        }).toDestination()

        const reverb = new Tone.Reverb(2.0).toDestination()
        bell.connect(reverb)

        bell.triggerAttackRelease("C5", "2n", `+${startTime}`)

        setTimeout(() => {
          bell.dispose()
          reverb.dispose()
        }, 3500)
        break
      }
      case "chime_soft": {
        const chime = new Tone.MetalSynth({
          frequency: 200,
          envelope: { attack: 0.001, decay: 1.4, release: 0.2 },
          harmonicity: 5.1,
          modulationIndex: 32,
          resonance: 4000,
          octaves: 1.5,
        }).toDestination()

        const reverb = new Tone.Reverb(1.5).toDestination()
        chime.connect(reverb)

        chime.triggerAttackRelease("C6", "1n", `+${startTime}`)

        setTimeout(() => {
          chime.dispose()
          reverb.dispose()
        }, 2500)
        break
      }
      case "tone_short_low": {
        const synth = new Tone.Synth({
          oscillator: { type: "sine" },
          envelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 0.8 },
        }).toDestination()

        synth.triggerAttackRelease("C4", "4n", `+${startTime}`)

        setTimeout(() => {
          synth.dispose()
        }, 1500)
        break
      }
      case "tone_short_high": {
        const synth = new Tone.Synth({
          oscillator: { type: "sine" },
          envelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 0.6 },
        }).toDestination()

        synth.triggerAttackRelease("C6", "8n", `+${startTime}`)

        setTimeout(() => {
          synth.dispose()
        }, 1200)
        break
      }
      case "wood_block": {
        const woodBlock = new Tone.NoiseSynth({
          noise: { type: "brown" },
          envelope: { attack: 0.001, decay: 0.13, sustain: 0 },
        }).toDestination()

        const filter = new Tone.Filter(800, "bandpass").toDestination()
        woodBlock.connect(filter)

        woodBlock.triggerAttackRelease("16n", `+${startTime}`)

        setTimeout(() => {
          woodBlock.dispose()
          filter.dispose()
        }, 500)
        break
      }
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.type.startsWith("audio/")) {
        setStatus({ message: "Please select a valid audio file.", type: "error" })
        return
      }

      // Reset states
      setFile(selectedFile)
      setOriginalAudioUrl(URL.createObjectURL(selectedFile))
      setInstructions([])
      setMappedInstructions([])
      setEncodedAudioUrl("")
      setFullTranscript("")
      setStatus(null)

      // Load audio buffer for encoding
      try {
        const context = await ensureAudioContext()
        if (!context) {
          setStatus({ message: "Audio playback is not supported in this browser.", type: "error" })
          return
        }

        const arrayBuffer = await selectedFile.arrayBuffer()
        const audioBuffer = await context.decodeAudioData(arrayBuffer)
        originalAudioBufferRef.current = audioBuffer
        setAudioDuration(audioBuffer.duration)
      } catch (error) {
        console.error("Error loading audio buffer:", error)
      }
    }
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
      handleFileChange(mockChangeEvent)
    }
  }

  const handleBrowserTranscription = async () => {
    if (!file || !recognitionRef.current) {
      setStatus({ message: "Speech recognition not supported in this browser.", type: "error" })
      return
    }

    setIsTranscribing(true)
    setTranscriptionProgress(0)
    setStatus({ message: "Transcribing audio using browser speech recognition...", type: "info" })

    const recognition = recognitionRef.current
    let transcript = ""
    const segments: Array<{ text: string; timestamp: number }> = []

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          const text = result[0].transcript
          transcript += text + " "
          segments.push({
            text: text.trim(),
            timestamp: Date.now() / 1000, // Simple timestamp
          })
        }
      }
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error)
      setStatus({ message: "Speech recognition failed. Try the manual method instead.", type: "error" })
      setIsTranscribing(false)
    }

    recognition.onend = () => {
      setIsTranscribing(false)
      setTranscriptionProgress(100)

      if (segments.length > 0) {
        const instructions = segments.map((segment, index) => ({
          id: `instr_${index + 1}`,
          text: segment.text,
          startTime: index * 5, // Estimate 5 seconds per segment
          endTime: (index + 1) * 5,
        }))

        setInstructions(instructions)
        setMappedInstructions(
          instructions.map((instr) => ({
            ...instr,
            soundId: availableSounds[0].id,
            keepOriginal: false,
            originalVolume: 50,
            soundVolume: 70,
          })),
        )
        setFullTranscript(transcript)
        setStatus({ message: `Found ${instructions.length} segments. Please review and adjust.`, type: "success" })
      } else {
        setStatus({ message: "No speech detected. Try the manual method instead.", type: "error" })
      }
    }

    // Play audio and start recognition
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play()
      recognition.start()

      // Stop recognition when audio ends
      audioRef.current.onended = () => {
        recognition.stop()
      }
    }
  }

  const handleTranscription = () => {
    switch (transcriptionMethod) {
      case "browser":
        handleBrowserTranscription()
        break
      case "manual":
        // Initialize manual mode
        setInstructions([])
        setMappedInstructions([])
        setStatus({
          message: "Manual mode: Use the controls below to mark instruction points while listening.",
          type: "info",
        })
        break
    }
  }

  const addManualInstruction = () => {
    const newInstruction: Instruction = {
      id: `manual_${Date.now()}`,
      text: "New instruction",
      startTime: currentTime,
      endTime: currentTime + 3,
    }

    const newMappedInstruction: MappedInstruction = {
      ...newInstruction,
      soundId: availableSounds[0].id,
      keepOriginal: false,
      originalVolume: 50,
      soundVolume: 70,
    }

    setInstructions((prev) => [...prev, newInstruction])
    setMappedInstructions((prev) => [...prev, newMappedInstruction])
  }

  const removeInstruction = (id: string) => {
    setInstructions((prev) => prev.filter((instr) => instr.id !== id))
    setMappedInstructions((prev) => prev.filter((instr) => instr.id !== id))
  }

  const updateInstruction = (id: string, updates: Partial<MappedInstruction>) => {
    setMappedInstructions((prev) => prev.map((instr) => (instr.id === id ? { ...instr, ...updates } : instr)))

    if (updates.text || updates.startTime !== undefined || updates.endTime !== undefined) {
      setInstructions((prev) => prev.map((instr) => (instr.id === id ? { ...instr, ...updates } : instr)))
    }
  }

  const handleSoundMappingChange = (instructionId: string, soundId: string) => {
    updateInstruction(instructionId, { soundId })
  }

  const simulateEncoding = async (): Promise<{ previewUrl: string; renderedBuffer: AudioBuffer }> => {
    console.log("Encoding audio with instructions:", mappedInstructions)

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const audioCtx = await ensureAudioContext()
    const originalBuffer = originalAudioBufferRef.current
    if (!audioCtx || !originalBuffer) throw new Error("AudioContext or original audio not available")

    // Calculate total duration needed
    const maxInstructionTime =
      mappedInstructions.length > 0 ? Math.max(...mappedInstructions.map((instr) => instr.endTime)) : 0
    const estimatedDuration = Math.max(originalBuffer.duration, maxInstructionTime + 2)

    // Create a new Tone.js offline context for rendering
    const offlineContext = new Tone.OfflineContext(2, estimatedDuration, audioCtx.sampleRate)

    // Set Tone.js to use the offline context
    Tone.setContext(offlineContext)

    // Sort instructions by start time
    const sortedInstructions = [...mappedInstructions].sort((a, b) => a.startTime - b.startTime)

    // Add original audio if needed
    if (sortedInstructions.some((instr) => instr.keepOriginal)) {
      const player = new Tone.Player(originalAudioUrl).toDestination()
      await Tone.loaded()

      for (const instr of sortedInstructions) {
        if (instr.keepOriginal) {
          const volume = (instr.originalVolume / 100) * 0.8
          player.volume.value = Tone.gainToDb(volume)
          player.start(instr.startTime)
        }
      }
    }

    // Add sound cues using Tone.js
    for (const instr of sortedInstructions) {
      await createToneSound(instr.soundId, instr.startTime, instr.soundVolume / 100)
    }

    // Render the audio
    const renderedBuffer = await offlineContext.render()

    // Reset Tone.js to use the main context
    Tone.setContext(audioCtx)

    // Convert to a fast WAV preview
    const wavResult = await bufferToWav(renderedBuffer, {
      preferCompatibility: true,
      maxBytes: 48 * 1024 * 1024,
    })
    const { blob, ...metadata } = wavResult
    setEncodedAudioMetadata(metadata)
    return { previewUrl: URL.createObjectURL(blob), renderedBuffer }
  }

  const handleEncoding = async () => {
    if (mappedInstructions.length === 0) {
      setStatus({ message: "No instructions to encode. Please add some instructions first.", type: "error" })
      return
    }

    setIsEncoding(true)
    setEncodingProgress(0)
    setStatus({ message: "Encoding audio with sound cues...", type: "info" })
    setEncodedAudioMetadata(null)
    setEncodedDistributionBlob(null)
    setEncodedDistributionMetadata(null)

    try {
      const progressInterval = setInterval(() => {
        setEncodingProgress((prev) => Math.min(prev + 10, 80))
      }, 300)

      const { previewUrl, renderedBuffer } = await simulateEncoding()

      clearInterval(progressInterval)
      setEncodingProgress(90)
      setEncodedAudioUrl(previewUrl)
      setStatus({ message: "Preview ready, compressing for export...", type: "info" })

      setIsCompressingEncodedAudio(true)
      try {
        const { blob: distributionBlob, format: distributionMetadata } = await encodeDistributionAudio(
          renderedBuffer,
          {
            maxBytes: 48 * 1024 * 1024,
            bitrate: 96000,
            onProgress: (p) => setEncodingProgress(90 + Math.floor((p / 100) * 10)),
          },
        )

        setEncodedDistributionBlob(distributionBlob)
        setEncodedDistributionMetadata(distributionMetadata)

        const distributionUrl = URL.createObjectURL(distributionBlob)
        setEncodedAudioUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl)
          return distributionUrl
        })

        setEncodingProgress(100)
        setStatus({ message: "Audio encoding completed successfully!", type: "success" })
      } catch (compressionError) {
        console.error("Compression error:", compressionError)
        setStatus({
          message: `Compression failed: ${compressionError instanceof Error ? compressionError.message : "Unknown error"}`,
          type: "error",
        })
      } finally {
        setIsCompressingEncodedAudio(false)
      }
    } catch (error) {
      console.error("Encoding error:", error)
      setStatus({
        message: `Encoding failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
    } finally {
      setIsEncoding(false)
    }
  }

  const downloadEncodedAudio = () => {
    if (!encodedDistributionBlob || !file) return

    const url = URL.createObjectURL(encodedDistributionBlob)
    const extension = extensionForContainer(encodedDistributionMetadata?.container)
    const a = document.createElement("a")
    a.href = url
    a.download = `${file.name.split(".")[0]}_encoded.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleImportedMeditation = async (importData: any) => {
    try {
      console.log("[v0] Handling imported meditation in creator:", importData)

      // Load the audio file
      const response = await fetch(importData.processedAudioUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`)
      }

      const audioBlob = await response.blob()
      const audioFile = new File([audioBlob], importData.originalFileName, { type: audioBlob.type || "audio/wav" })

      // Set file and audio URL
      setFile(audioFile)
      const audioUrl = URL.createObjectURL(audioFile)
      setOriginalAudioUrl(audioUrl)

      // Load audio buffer for encoding
      const arrayBuffer = await audioFile.arrayBuffer()
      const context = await ensureAudioContext()
      if (!context) {
        throw new Error("AudioContext not available")
      }

      const audioBuffer = await context.decodeAudioData(arrayBuffer)
      originalAudioBufferRef.current = audioBuffer
      setAudioDuration(audioBuffer.duration)
      setEncodedAudioMetadata(importData.metadata?.wav ?? null)

      if (importData.source === "creator" && !importData.crossToolOpening) {
        // Reconstruct original cues/recordings structure
        await reconstructOriginalStructure(importData)
      } else {
        // Import as single recorded event block with proper audio reference
        const importedInstruction: Instruction = {
          id: "imported_instruction",
          text: `Imported: ${importData.title}`,
          startTime: 0,
          endTime: importData.duration,
        }

        const importedMapped: MappedInstruction = {
          ...importedInstruction,
          soundId: availableSounds[0].id,
          keepOriginal: true,
          originalVolume: 80,
          soundVolume: 50,
        }

        setInstructions([importedInstruction])
        setMappedInstructions([importedMapped])

        setStatus({
          message: `Successfully loaded "${importData.title}" from library.`,
          type: "success",
        })
      }
    } catch (error) {
      console.error("[v0] Error handling imported meditation in creator:", error)
      setStatus({
        message: "Failed to load meditation from library. Please try again.",
        type: "error",
      })
    }
  }

  const reconstructOriginalStructure = async (importData: any) => {
    console.log("[v0] Reconstructing original creator structure:", importData)

    try {
      if (importData.metadata?.instructionCount && importData.metadata.instructionCount > 0) {
        const reconstructedInstructions: Instruction[] = []
        const reconstructedMapped: MappedInstruction[] = []

        const segmentDuration = importData.duration / importData.metadata.instructionCount

        for (let i = 0; i < importData.metadata.instructionCount; i++) {
          const instruction: Instruction = {
            id: `reconstructed_${i}`,
            text: `Reconstructed instruction ${i + 1}`,
            startTime: i * segmentDuration,
            endTime: Math.min((i + 1) * segmentDuration, importData.duration),
          }

          const mappedInstruction: MappedInstruction = {
            ...instruction,
            soundId:
              importData.metadata.soundCuesUsed?.[i % (importData.metadata.soundCuesUsed?.length || 1)] ||
              availableSounds[0].id,
            keepOriginal: true,
            originalVolume: 70,
            soundVolume: 60,
          }

          reconstructedInstructions.push(instruction)
          reconstructedMapped.push(mappedInstruction)
        }

        setInstructions(reconstructedInstructions)
        setMappedInstructions(reconstructedMapped)

        setStatus({
          message: `Successfully reconstructed ${reconstructedInstructions.length} instructions from original encoding.`,
          type: "success",
        })
      } else {
        // Fallback: create a single instruction covering the whole duration
        const fallbackInstruction: Instruction = {
          id: "fallback_instruction",
          text: `Reconstructed: ${importData.title}`,
          startTime: 0,
          endTime: importData.duration,
        }

        const fallbackMapped: MappedInstruction = {
          ...fallbackInstruction,
          soundId: availableSounds[0].id,
          keepOriginal: true,
          originalVolume: 80,
          soundVolume: 50,
        }

        setInstructions([fallbackInstruction])
        setMappedInstructions([fallbackMapped])

        setStatus({
          message: "Reconstructed as single instruction block (limited metadata available).",
          type: "info",
        })
      }
    } catch (error) {
      console.error("[v0] Error reconstructing original structure:", error)
      setStatus({
        message: "Failed to reconstruct original structure. Using basic import instead.",
        type: "error",
      })

      // Fallback to basic import
      const basicInstruction: Instruction = {
        id: "basic_import",
        text: `Imported: ${importData.title}`,
        startTime: 0,
        endTime: importData.duration,
      }

      const basicMapped: MappedInstruction = {
        ...basicInstruction,
        soundId: availableSounds[0].id,
        keepOriginal: true,
        originalVolume: 80,
        soundVolume: 50,
      }

      setInstructions([basicInstruction])
      setMappedInstructions([basicMapped])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8 md:pt-0">
      <Navigation />

      <div className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden transition-colors duration-300 ease-in-out">
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20 "></div>
          </div>
          <div className="relative text-center px-[69px] pt-16 pb-8">
            <h1
              className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 tracking-tighter text-center"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                textShadow: "0 0 25px rgba(139, 69, 69, 0.25)",
              }}
            >
              Creator
            </h1>
            <p className="text-lg text-gray-600 mt-4">
              Create custom meditations by associating instructions with sound cues.
            </p>
          </div>
        </div>

        <div className="px-6 md:px-10 pb-10 font-serif font-black">
          {/* File Upload Section */}
          <Card className="p-6 mb-6 bg-white shadow-lg border border-gray-200 ">
            <h3 className="text-xl font-bold mb-4 text-gray-800 ">Upload Audio File</h3>
            <div
              ref={uploadAreaRef}
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-logo-teal-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
              <div className="space-y-2">
                <div className="text-4xl">🎵</div>
                <p className="text-lg font-semibold text-gray-700 ">
                  {file ? file.name : "Drop your audio file here or click to browse"}
                </p>
                <p className="text-sm text-gray-500 ">Supports MP3, WAV, M4A, and other audio formats</p>
              </div>
            </div>
          </Card>

          {/* Audio Player */}
          {originalAudioUrl && (
            <Card className="p-6 mb-6 bg-white shadow-lg border border-gray-200 ">
              <h3 className="text-xl font-bold mb-4 text-gray-800 ">Original Audio</h3>
              <audio
                ref={audioRef}
                controls
                className="w-full"
                src={originalAudioUrl}
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
              />
            </Card>
          )}

          {/* Sound Preview Section */}
          <Card className="p-6 mb-6 bg-white shadow-lg border border-gray-200 ">
            <h3 className="text-xl font-bold mb-4 text-gray-800 ">Sound Cues Preview</h3>
            <p className="text-sm text-gray-600 mb-4">
              Click on any sound to preview it with the new Tone.js implementation:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {availableSounds.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => playSoundPreview(sound.id)}
                  className="p-4 bg-gradient-to-r from-logo-teal-500 to-logo-blue-400 text-white rounded-lg hover:from-logo-teal-600 hover:to-logo-blue-500 transition-all duration-200 transform hover:scale-105"
                >
                  <div className="font-semibold">{sound.name}</div>
                  <div className="text-xs opacity-90 mt-1">{sound.description}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Musical Notes Section */}
          <Card className="p-6 mb-6 bg-white shadow-lg border border-gray-200 ">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 ">Musical Notes</h3>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multiNoteMode}
                    onChange={(e) => {
                      setMultiNoteMode(e.target.checked)
                      setSelectedNotes([])
                    }}
                    className="w-4 h-4 text-logo-teal-600 bg-gray-100 border-gray-300 rounded focus:ring-logo-teal-500 focus:ring-2 "
                  />
                  <span className="text-sm font-medium text-gray-700 ">Multi-Note</span>
                </label>
                {multiNoteMode && selectedNotes.length > 0 && (
                  <button
                    onClick={playChordPreview}
                    className="px-4 py-2 bg-gradient-to-r from-logo-purple-500 to-logo-rose-400 text-white rounded-lg hover:from-logo-purple-600 hover:to-logo-rose-500 transition-all duration-200 text-sm font-semibold"
                  >
                    Play Chord ({selectedNotes.length})
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {multiNoteMode
                ? "Select multiple notes to create chords. Click 'Play Chord' to preview them together."
                : "Click on any note to preview it individually."}
            </p>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {musicalNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => handleNoteSelection(note.id)}
                  className={`p-3 rounded-lg transition-all duration-200 transform hover:scale-105 font-semibold ${
                    multiNoteMode && selectedNotes.includes(note.id)
                      ? "bg-gradient-to-r from-logo-amber-500 to-logo-rose-400 text-white shadow-lg"
                      : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300 "
                  }`}
                >
                  {note.name}
                </button>
              ))}
            </div>
            {multiNoteMode && selectedNotes.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 ">
                  Selected notes: <span className="font-semibold text-gray-800 ">{selectedNotes.join(", ")}</span>
                </p>
              </div>
            )}
          </Card>

          {/* Encoded Audio Section */}
          {encodedAudioUrl && (
            <div className="mb-6">
              <div className="rounded-sm p-3 px-0 shadow-none border-gray-500 bg-transparent border-0 mb-0">
                <audio controls className="w-full" src={encodedAudioUrl} />
              </div>
              <div className="px-3.5 text-center tracking-tight">
                <SaveMeditationDialog
                  audioUrl={encodedAudioUrl}
                  distributionBlob={encodedDistributionBlob ?? undefined}
                  distributionFormat={encodedDistributionMetadata ?? undefined}
                  originalFileName={file?.name || "meditation"}
                  duration={audioDuration}
                  source="creator"
                  metadata={{
                    instructionCount: mappedInstructions.length,
                    soundCuesUsed: [...new Set(mappedInstructions.map((instr) => instr.soundId))],
                    timeline: mappedInstructions.map((instr) => ({
                      id: instr.id,
                      text: instr.text,
                      startTime: instr.startTime,
                      endTime: instr.endTime,
                      soundId: instr.soundId,
                      keepOriginal: instr.keepOriginal,
                      originalVolume: instr.originalVolume,
                      soundVolume: instr.soundVolume,
                    })),
                    wav: encodedAudioMetadata ? { ...encodedAudioMetadata } : undefined,
                    audioFormat: encodedDistributionMetadata ?? undefined,
                  }}
                >
                  <Button
                    disabled={isCompressingEncodedAudio || !encodedDistributionBlob}
                    className="w-44 py-3 rounded-[9px] shadow-md bg-white hover:shadow-sm hover:bg-white text-gray-600 text-xs font-serif font-black border-[3px] border-gray-500"
                  >
                    <BookmarkPlus className="w-4 h-4 mr-2" />
                    {isCompressingEncodedAudio ? "Compressing…" : "Save to Library"}
                  </Button>
                </SaveMeditationDialog>
              </div>
              {encodedQualityWarning && (
                <Alert className="bg-amber-50 border-amber-200 text-amber-700 text-sm mt-4">
                  <AlertTitle className="font-semibold text-sm">Reduced quality export</AlertTitle>
                  <AlertDescription className="text-xs">
                    The encoded audio was compressed to {encodedAudioMetadata?.sampleRate.toLocaleString()} Hz and{" "}
                    {encodedAudioMetadata?.bitDepth}-bit mono to stay under the 48 MiB limit. Shorter sessions will
                    keep higher fidelity.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Status Messages */}
          {status && (
            <Card
              className={`p-4 mb-6 ${
                status.type === "error"
                  ? "bg-red-50 border-red-200 "
                  : status.type === "success"
                    ? "bg-green-50 border-green-200 "
                    : "bg-blue-50 border-blue-200 "
              }`}
            >
              <p
                className={`${
                  status.type === "error"
                    ? "text-red-800 "
                    : status.type === "success"
                      ? "text-green-800 "
                      : "text-blue-800 "
                }`}
              >
                {status.message}
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
