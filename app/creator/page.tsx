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
  encodeDistributionAudio,
  getDistributionMaxBytes,
  extensionForContainer,
  AUDIO_EXPORT_FORMAT_LABELS,
  type AudioExportFormat,
  type AudioFormatMetadata,
} from "@/lib/audio-utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { log } from "@/lib/log"
import {
  availableSounds,
  musicalNotes,
  type Instruction,
  type MappedInstruction,
} from "@/lib/creator-sounds"

export default function CreatorPage() {
  const [file, setFile] = useState<File | null>(null)
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string>("")
  const [instructions, setInstructions] = useState<Instruction[]>([])
  const [mappedInstructions, setMappedInstructions] = useState<MappedInstruction[]>([])
  const [isEncoding, setIsEncoding] = useState<boolean>(false)
  const [encodingProgress, setEncodingProgress] = useState(0)
  const [encodedAudioUrl, setEncodedAudioUrl] = useState<string>("")
  const [encodedDistributionBlob, setEncodedDistributionBlob] = useState<Blob | null>(null)
  const [encodedDistributionMetadata, setEncodedDistributionMetadata] = useState<AudioFormatMetadata | null>(null)
  const [exportFormat, setExportFormat] = useState<AudioExportFormat>("opus")
  const [status, setStatus] = useState<{ message: string; type: "info" | "success" | "error" } | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)

  const [multiNoteMode, setMultiNoteMode] = useState(false)
  const [selectedNotes, setSelectedNotes] = useState<string[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const originalAudioBufferRef = useRef<AudioBuffer | null>(null)

  const encodedQualityWarning =
    encodedDistributionMetadata?.bitrate !== undefined && encodedDistributionMetadata.bitrate < 96

  const ensureAudioContext = async (): Promise<AudioContext | null> => {
    if (typeof window === "undefined") return null

    let context = audioContextRef.current

    if (!context) {
      const AudioContextClass = window.AudioContext ?? (window as any).webkitAudioContext

      if (!AudioContextClass) {
        log.error("AudioContext is not supported in this browser")
        return null
      }

      context = new AudioContextClass()
      audioContextRef.current = context
    }

    if (context.state === "suspended") {
      try {
        await context.resume()
      } catch (error) {
        log.error("Failed to resume AudioContext:", error)
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
          log.debug("Loading meditation from library into creator:", importData)

          handleImportedMeditation(importData)

          // Clear the import data
          localStorage.removeItem("abhi_creator_import")

          setStatus({
            message: `Loaded "${importData.title}" from library.`,
            type: "success",
          })
        } catch (error) {
          log.error("Error loading creator import:", error)
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
      log.error("Error playing sound preview:", error)
    }
  }

  const playNotePreview = async (noteId: string) => {
    try {
      if (Tone.context.state !== "running") {
        await Tone.start()
      }

      // Tone.Synth is an oscillator + amplitude envelope only; it has no filter stage, so the
      // filter/filterEnvelope options this used to pass were silently discarded. Dropped rather
      // than moved to MonoSynth so the voice keeps sounding exactly as it always has.
      const synth = new Tone.Synth({
        oscillator: { type: "fatsawtooth" },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.2 },
      }).toDestination()

      const reverb = new Tone.Reverb(1.5).toDestination()
      synth.connect(reverb)

      synth.triggerAttackRelease(noteId, "2n")

      setTimeout(() => {
        synth.dispose()
        reverb.dispose()
      }, 3000)
    } catch (error) {
      log.error("Error playing note preview:", error)
    }
  }

  const playChordPreview = async () => {
    if (selectedNotes.length === 0) return

    log.debug("Playing chord with notes:", selectedNotes)

    try {
      if (Tone.context.state !== "running") {
        await Tone.start()
        log.debug("Tone.js context started for chord")
      }

      // Same as above: the voice is Tone.Synth, which has no filter stage.
      const polySynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fatsawtooth" },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 1.2 },
      }).toDestination()

      const reverb = new Tone.Reverb(1.5).toDestination()
      polySynth.connect(reverb)

      log.debug("Triggering chord with notes:", selectedNotes)
      polySynth.triggerAttackRelease(selectedNotes, "2n")
      log.debug("Chord triggered successfully")

      setTimeout(() => {
        polySynth.dispose()
        reverb.dispose()
        log.debug("Chord synth disposed")
      }, 3000)
    } catch (error) {
      log.error("Error playing chord preview:", error)
    }
  }

  const handleNoteSelection = (noteId: string) => {
    if (multiNoteMode) {
      log.debug("Multi-note mode: toggling note", noteId)
      setSelectedNotes((prev) => {
        const newSelection = prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
        log.debug("New selected notes:", newSelection)
        return newSelection
      })
    } else {
      log.debug("Single note mode: playing", noteId)
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
        // No `frequency` here: MetalSynth takes no such option, and the pitch is set by the
        // triggerAttackRelease("C6", ...) call below regardless.
        const chime = new Tone.MetalSynth({
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
        log.error("Error loading audio buffer:", error)
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

  const renderTimelineAudio = async (): Promise<AudioBuffer> => {
    log.debug("Rendering audio with instructions:", mappedInstructions)

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

    // Render the audio. OfflineContext hands back a ToneAudioBuffer wrapper; unwrap it to the
    // plain AudioBuffer the rest of the encode path expects.
    const renderedBuffer = await offlineContext.render()

    // Reset Tone.js to use the main context
    Tone.setContext(audioCtx)

    const audioBuffer = renderedBuffer.get()
    if (!audioBuffer) {
      throw new Error("Offline render finished without producing an audio buffer.")
    }

    return audioBuffer
  }

  const handleEncoding = async () => {
    if (mappedInstructions.length === 0) {
      setStatus({ message: "No instructions to encode. Please add some instructions first.", type: "error" })
      return
    }

    setIsEncoding(true)
    setEncodingProgress(0)
    setStatus({ message: "Rendering audio...", type: "info" })
    setEncodedDistributionBlob(null)
    setEncodedDistributionMetadata(null)

    try {
      const renderedBuffer = await renderTimelineAudio()

      setEncodingProgress(20)
      setStatus({ message: "Compressing audio...", type: "info" })

      const { blob: distributionBlob, format: distributionMetadata } = await encodeDistributionAudio(
        renderedBuffer,
        {
          format: exportFormat,
          maxBytes: getDistributionMaxBytes(exportFormat),
          bitrate: 96000,
          onProgress: (p) => setEncodingProgress(20 + Math.floor((p / 100) * 80)),
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
    } catch (error) {
      log.error("Encoding error:", error)
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
      log.debug("Handling imported meditation in creator:", importData)

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
      log.error("Error handling imported meditation in creator:", error)
      setStatus({
        message: "Failed to load meditation from library. Please try again.",
        type: "error",
      })
    }
  }

  const reconstructOriginalStructure = async (importData: any) => {
    log.debug("Reconstructing original creator structure:", importData)

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
      log.error("Error reconstructing original structure:", error)
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
            <p className="mt-4 font-serif text-xs font-black tracking-tight text-stone-500">
              Create custom meditations by associating instructions with sound cues.
            </p>
          </div>
        </div>

        <div className="px-6 md:px-10 pb-10 font-serif font-black">
          {/* File Upload Section */}
          <Card className="mb-6 rounded-xl border-none bg-white p-6 shadow-lg">
            <h3 className="mb-4 font-serif text-base font-black tracking-tight text-gray-700">Upload Audio File</h3>
            <div
              ref={uploadAreaRef}
              className="cursor-pointer rounded-xl border-[3px] border-gray-500 bg-white p-8 text-center shadow-md transition-all hover:shadow-none"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileChange} className="hidden" />
              <div className="space-y-2">
                <div className="text-4xl">🎵</div>
                <p className="font-serif text-sm font-black tracking-tight text-gray-700">
                  {file ? file.name : "Drop your audio file here or click to browse"}
                </p>
                <p className="text-xs tracking-tight text-gray-500">Supports MP3, WAV, M4A, and other audio formats</p>
              </div>
            </div>
          </Card>

          {/* Audio Player */}
          {originalAudioUrl && (
            <Card className="mb-6 rounded-xl border-none bg-white p-6 shadow-lg">
              <h3 className="mb-4 font-serif text-base font-black tracking-tight text-gray-700">Original Audio</h3>
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
          <Card className="mb-6 rounded-xl border-none bg-white p-6 shadow-lg">
            <h3 className="mb-4 font-serif text-base font-black tracking-tight text-gray-700">Sound Cues Preview</h3>
            <p className="mb-4 text-xs tracking-tight text-gray-500">
              Click on any sound to preview it with the new Tone.js implementation:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {availableSounds.map((sound) => (
                <button
                  key={sound.id}
                  onClick={() => playSoundPreview(sound.id)}
                  className="rounded-[11px] bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 p-4 font-serif text-white shadow-md transition-all duration-200 ease-out hover:shadow-none"
                >
                  <div className="font-black tracking-tight">{sound.name}</div>
                  <div className="text-xs opacity-90 mt-1">{sound.description}</div>
                </button>
              ))}
            </div>
          </Card>

          {/* Musical Notes Section */}
          <Card className="mb-6 rounded-xl border-none bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-base font-black tracking-tight text-gray-700">Musical Notes</h3>
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multiNoteMode}
                    onChange={(e) => {
                      setMultiNoteMode(e.target.checked)
                      setSelectedNotes([])
                    }}
                    className="h-4 w-4 rounded-[4px] border-[2px] border-gray-500 accent-logo-emerald-500 focus:ring-0"
                  />
                  <span className="font-serif text-xs font-black tracking-tight text-gray-600">Multi-Note</span>
                </label>
                {multiNoteMode && selectedNotes.length > 0 && (
                  <button
                    onClick={playChordPreview}
                    className="rounded-[11px] bg-gradient-to-b from-gray-600 to-[#9b8da3] px-4 py-2 font-serif text-sm font-black tracking-tight text-white shadow-md transition-all duration-200 ease-out hover:shadow-none"
                  >
                    Play Chord ({selectedNotes.length})
                  </button>
                )}
              </div>
            </div>
            <p className="mb-4 text-xs tracking-tight text-gray-500">
              {multiNoteMode
                ? "Select multiple notes to create chords. Click 'Play Chord' to preview them together."
                : "Click on any note to preview it individually."}
            </p>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {musicalNotes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => handleNoteSelection(note.id)}
                  className={`rounded-[8px] p-3 font-serif text-xs font-black tracking-tight shadow-md transition-all duration-200 ease-out hover:shadow-none ${
                    multiNoteMode && selectedNotes.includes(note.id)
                      ? "bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 text-white"
                      : "border-[3px] border-gray-500 bg-white text-gray-600"
                  }`}
                >
                  {note.name}
                </button>
              ))}
            </div>
            {multiNoteMode && selectedNotes.length > 0 && (
              <div className="mt-4 rounded-[10px] bg-muted/60 p-3 shadow-inner">
                <p className="text-xs tracking-tight text-gray-500">
                  Selected notes: <span className="font-black text-gray-700">{selectedNotes.join(", ")}</span>
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
                    audioFormat: encodedDistributionMetadata ?? undefined,
                  }}
                >
                  <Button variant="ghost"
                    disabled={!encodedDistributionBlob}
                    className="w-44 py-3 rounded-[9px] shadow-md bg-white hover:shadow-sm hover:bg-white text-gray-600 text-xs font-serif font-black border-[3px] border-gray-500"
                  >
                    <BookmarkPlus className="w-4 h-4 mr-2" />
                    Save to Library
                  </Button>
                </SaveMeditationDialog>
              </div>
              {encodedQualityWarning && (
                <Alert className="bg-amber-50 border-amber-200 text-amber-700 text-sm mt-4">
                  <AlertTitle className="font-serif text-sm font-black tracking-tight">Reduced quality export</AlertTitle>
                  <AlertDescription className="text-xs">
                    This session&apos;s audio was compressed to {encodedDistributionMetadata?.bitrate}kbps (down from our
                    standard 96kbps) to fit the 48MB size limit. Shorter sessions keep higher fidelity.
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
