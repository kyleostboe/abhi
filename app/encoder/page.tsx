"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Wand2 } from "lucide-react"
import type { SpeechRecognition } from "web-speech-api"

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

const availableSounds: SoundDefinition[] = [
  { id: "bell_high", name: "High Bell", description: "A clear, high-pitched bell." },
  { id: "bell_mid", name: "Mid Bell", description: "A resonant, medium-pitched bell." },
  { id: "chime_soft", name: "Soft Chime", description: "A gentle, soothing chime." },
  { id: "tone_short_low", name: "Short Low Tone", description: "A brief, low frequency tone." },
  { id: "tone_short_high", name: "Short High Tone", description: "A brief, high frequency tone." },
  { id: "wood_block", name: "Wood Block", description: "A sharp, percussive wood block sound." },
]

export default function EncoderPage() {
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
  const [status, setStatus] = useState<{ message: string; type: "info" | "success" | "error" } | null>(null)
  const [fullTranscript, setFullTranscript] = useState<string>("")
  const [isListening, setIsListening] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const originalAudioBufferRef = useRef<AudioBuffer | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()

      // Initialize Speech Recognition if available
      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        recognitionRef.current = new SpeechRecognition()
        recognitionRef.current.continuous = true
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = "en-US"
      }
    }
    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  const playSoundPreview = (soundId: string) => {
    const audioCtx = audioContextRef.current
    if (!audioCtx) return
    if (audioCtx.state === "suspended") audioCtx.resume()

    const oscillator = audioCtx.createOscillator()
    const gainNode = audioCtx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)
    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime)

    switch (soundId) {
      case "bell_high":
        oscillator.type = "triangle"
        oscillator.frequency.setValueAtTime(1200, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.7)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.7)
        break
      case "bell_mid":
        oscillator.type = "triangle"
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.8)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.8)
        break
      case "chime_soft":
        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(1500, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.0)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 1.0)
        break
      case "tone_short_low":
        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(300, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.3)
        break
      case "tone_short_high":
        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(900, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.3)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.3)
        break
      case "wood_block":
        const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate)
        const data = noiseBuffer.getChannelData(0)
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1
        }
        const noiseSource = audioCtx.createBufferSource()
        noiseSource.buffer = noiseBuffer
        noiseSource.connect(gainNode)
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.1)
        noiseSource.start()
        noiseSource.stop(audioCtx.currentTime + 0.1)
        break
      default:
        oscillator.disconnect()
        gainNode.disconnect()
        return
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
        const arrayBuffer = await selectedFile.arrayBuffer()
        const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer)
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

  const simulateEncoding = async (): Promise<string> => {
    console.log("Encoding audio with instructions:", mappedInstructions)

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const audioCtx = audioContextRef.current
    const originalBuffer = originalAudioBufferRef.current
    if (!audioCtx || !originalBuffer) throw new Error("AudioContext or original audio not available")

    // Calculate total duration needed
    const maxInstructionTime =
      mappedInstructions.length > 0 ? Math.max(...mappedInstructions.map((instr) => instr.endTime)) : 0
    const estimatedDuration = Math.max(originalBuffer.duration, maxInstructionTime + 2)

    // Create offline context for rendering
    const offlineCtx = new OfflineAudioContext(
      2, // stereo
      Math.ceil(audioCtx.sampleRate * estimatedDuration),
      audioCtx.sampleRate,
    )

    // Sort instructions by start time to avoid conflicts
    const sortedInstructions = [...mappedInstructions].sort((a, b) => a.startTime - b.startTime)

    // Process each instruction separately
    for (const instr of sortedInstructions) {
      const startTime = Math.max(0, instr.startTime)

      // Add original speech if requested
      if (instr.keepOriginal && startTime < originalBuffer.duration) {
        try {
          const startSample = Math.floor(startTime * originalBuffer.sampleRate)
          const endSample = Math.min(Math.floor(instr.endTime * originalBuffer.sampleRate), originalBuffer.length)
          const segmentLength = Math.max(0, endSample - startSample)

          if (segmentLength > 0) {
            const segmentBuffer = offlineCtx.createBuffer(
              originalBuffer.numberOfChannels,
              segmentLength,
              originalBuffer.sampleRate,
            )

            // Copy audio data safely
            for (let channel = 0; channel < originalBuffer.numberOfChannels; channel++) {
              const originalData = originalBuffer.getChannelData(channel)
              const segmentData = segmentBuffer.getChannelData(channel)

              for (let i = 0; i < segmentLength; i++) {
                if (startSample + i < originalData.length) {
                  segmentData[i] = originalData[startSample + i]
                }
              }
            }

            const source = offlineCtx.createBufferSource()
            const gainNode = offlineCtx.createGain()
            source.buffer = segmentBuffer
            source.connect(gainNode)
            gainNode.connect(offlineCtx.destination)

            const volume = (instr.originalVolume / 100) * 0.8
            gainNode.gain.setValueAtTime(volume, startTime)

            source.start(startTime)
          }
        } catch (error) {
          console.warn("Error adding original audio segment:", error)
        }
      }

      // Add sound cue
      try {
        await addSoundCue(offlineCtx, instr.soundId, startTime, instr.soundVolume / 100)
      } catch (error) {
        console.warn("Error adding sound cue:", error)
      }
    }

    // Render the final audio
    const renderedBuffer = await offlineCtx.startRendering()
    const wavBlob = await bufferToWav(renderedBuffer)
    return URL.createObjectURL(wavBlob)
  }

  // Helper function to add individual sound cues
  const addSoundCue = async (
    offlineCtx: OfflineAudioContext,
    soundId: string,
    startTime: number,
    volumeMultiplier: number,
  ): Promise<void> => {
    const baseVolume = 0.3 * volumeMultiplier

    switch (soundId) {
      case "bell_high": {
        const oscillator = offlineCtx.createOscillator()
        const gainNode = offlineCtx.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(offlineCtx.destination)

        oscillator.type = "triangle"
        oscillator.frequency.setValueAtTime(1200, startTime)

        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(baseVolume, startTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7)

        oscillator.start(startTime)
        oscillator.stop(startTime + 0.7)
        break
      }

      case "bell_mid": {
        const oscillator = offlineCtx.createOscillator()
        const gainNode = offlineCtx.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(offlineCtx.destination)

        oscillator.type = "triangle"
        oscillator.frequency.setValueAtTime(800, startTime)

        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(baseVolume, startTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8)

        oscillator.start(startTime)
        oscillator.stop(startTime + 0.8)
        break
      }

      case "chime_soft": {
        const oscillator = offlineCtx.createOscillator()
        const gainNode = offlineCtx.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(offlineCtx.destination)

        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(1500, startTime)

        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(baseVolume, startTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 1.0)

        oscillator.start(startTime)
        oscillator.stop(startTime + 1.0)
        break
      }

      case "tone_short_low": {
        const oscillator = offlineCtx.createOscillator()
        const gainNode = offlineCtx.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(offlineCtx.destination)

        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(300, startTime)

        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(baseVolume, startTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3)

        oscillator.start(startTime)
        oscillator.stop(startTime + 0.3)
        break
      }

      case "tone_short_high": {
        const oscillator = offlineCtx.createOscillator()
        const gainNode = offlineCtx.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(offlineCtx.destination)

        oscillator.type = "sine"
        oscillator.frequency.setValueAtTime(900, startTime)

        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(baseVolume, startTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3)

        oscillator.start(startTime)
        oscillator.stop(startTime + 0.3)
        break
      }

      case "wood_block": {
        // Create a short burst of filtered noise
        const bufferSize = Math.floor(offlineCtx.sampleRate * 0.1)
        const noiseBuffer = offlineCtx.createBuffer(1, bufferSize, offlineCtx.sampleRate)
        const data = noiseBuffer.getChannelData(0)

        // Generate filtered noise for wood block sound
        for (let i = 0; i < bufferSize; i++) {
          const decay = Math.exp(-i / (bufferSize * 0.1))
          data[i] = (Math.random() * 2 - 1) * decay * 0.5
        }

        const noiseSource = offlineCtx.createBufferSource()
        const gainNode = offlineCtx.createGain()

        noiseSource.buffer = noiseBuffer
        noiseSource.connect(gainNode)
        gainNode.connect(offlineCtx.destination)

        gainNode.gain.setValueAtTime(baseVolume * 0.8, startTime)
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1)

        noiseSource.start(startTime)
        break
      }

      default:
        console.warn(`Unknown sound ID: ${soundId}`)
    }
  }

  const bufferToWav = async (buffer: AudioBuffer): Promise<Blob> => {
    const length = buffer.length
    const numberOfChannels = buffer.numberOfChannels
    const sampleRate = buffer.sampleRate
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
    const view = new DataView(arrayBuffer)

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, 36 + length * numberOfChannels * 2, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * 2, true)
    view.setUint16(32, numberOfChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, "data")
    view.setUint32(40, length * numberOfChannels * 2, true)

    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample * 0x7fff, true)
        offset += 2
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" })
  }

  const handleEncoding = async () => {
    if (mappedInstructions.length === 0) {
      setStatus({ message: "No instructions to encode. Please add some instructions first.", type: "error" })
      return
    }

    setIsEncoding(true)
    setEncodingProgress(0)
    setStatus({ message: "Encoding audio with sound cues...", type: "info" })

    try {
      const progressInterval = setInterval(() => {
        setEncodingProgress((prev) => Math.min(prev + 10, 90))
      }, 300)

      const encodedUrl = await simulateEncoding()

      clearInterval(progressInterval)
      setEncodingProgress(100)
      setEncodedAudioUrl(encodedUrl)
      setStatus({ message: "Audio encoding completed successfully!", type: "success" })
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
    if (!encodedAudioUrl || !file) return

    const a = document.createElement("a")
    a.href = encodedAudioUrl
    a.download = `${file.name.split(".")[0]}_encoded.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />

      <div className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-white/40 overflow-hidden dark:bg-gray-900/80 transition-colors duration-300 ease-in-out">
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20 dark:from-amber-600/20 dark:via-rose-500/15 dark:via-purple-600/10 dark:to-teal-500/20"></div>
          </div>
          <div className="relative text-center px-[69px] pt-16 pb-8">
            <h1
              className="text-5xl text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal dark:from-logo-amber dark:via-logo-rose dark:via-logo-purple dark:to-logo-teal transform hover:scale-105 transition-transform duration-700 ease-out font-black md:text-6xl mb-0 tracking-tighter text-center"
              style={{
                fontFamily: 'Georgia, "Times New Roman", serif',
                textShadow: "0 0 25px rgba(139, 69, 69, 0.25)",
              }}
            >
              Encoder (Labs)
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-4">
              Create custom meditations by associating instructions with sound cues.
            </p>
          </div>
        </div>

        <div className="px-6 md:px-10 pb-10 font-serif font-black">
          <Card className="p-8 space-y-6 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="text-center space-y-4">
              <Wand2 className="h-12 w-12 mx-auto text-logo-teal-600 dark:text-logo-teal-400" />
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Coming Soon!</h2>
              <p className="text-gray-600 dark:text-gray-400">
                The full Encoder functionality is under active development. Please check back later for updates!
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
