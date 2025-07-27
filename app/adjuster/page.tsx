"use client"

import { Input } from "@/components/ui/input"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Navigation } from "@/components/navigation"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { PlayIcon, PauseIcon, DownloadIcon, SaveIcon } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { formatTime } from "@/lib/utils"

interface AudioSegment {
  start: number
  end: number
  duration: number
}

export default function AdjusterPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const [file, setFile] = useState<File | null>(null)
  const [audioUrl, setAudioUrl] = useState<string>("")
  const [originalDuration, setOriginalDuration] = useState<number>(0)
  const [adjustedDuration, setAdjustedDuration] = useState<number>(0)
  const [speed, setSpeed] = useState<number>(1) // 1.0 is original speed
  const [pitch, setPitch] = useState<number>(1) // 1.0 is original pitch
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [processingProgress, setProcessingProgress] = useState<number>(0)
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string>("")
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [status, setStatus] = useState<{ message: string; type: "info" | "success" | "error" } | null>(null)
  const [meditationTitle, setMeditationTitle] = useState<string>("")
  const [isSaving, setIsSaving] = useState<boolean>(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const audioBufferRef = useRef<AudioBuffer | null>(null)
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null)
  const playbackStartTimeRef = useRef<number>(0)
  const currentAudioTimeRef = useRef<number>(0)
  const animationFrameRef = useRef<number | null>(null)

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login")
    }
  }, [user, isAuthLoading, router])

  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return () => {
      audioContextRef.current?.close()
    }
  }, [])

  const updateCurrentTime = useCallback(() => {
    if (sourceNodeRef.current && audioContextRef.current && isPlaying) {
      const elapsed = audioContextRef.current.currentTime - playbackStartTimeRef.current
      const newTime = currentAudioTimeRef.current + elapsed * speed
      setCurrentTime(newTime)

      if (newTime < adjustedDuration) {
        animationFrameRef.current = requestAnimationFrame(updateCurrentTime)
      } else {
        stopPlayback()
      }
    }
  }, [isPlaying, speed, adjustedDuration])

  const startPlayback = useCallback(() => {
    if (!processedAudioUrl || !audioBufferRef.current || !audioContextRef.current) return

    stopPlayback() // Stop any existing playback

    const audioCtx = audioContextRef.current
    if (audioCtx.state === "suspended") audioCtx.resume()

    const source = audioCtx.createBufferSource()
    source.buffer = audioBufferRef.current
    source.playbackRate.value = speed // Apply speed directly to playbackRate
    source.connect(audioCtx.destination)

    source.onended = () => {
      stopPlayback()
    }

    const startOffset = currentTime % audioBufferRef.current.duration
    source.start(0, startOffset)

    sourceNodeRef.current = source
    playbackStartTimeRef.current = audioCtx.currentTime
    setIsPlaying(true)
    animationFrameRef.current = requestAnimationFrame(updateCurrentTime)
  }, [processedAudioUrl, speed, currentTime, updateCurrentTime])

  const stopPlayback = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop()
      sourceNodeRef.current.disconnect()
      sourceNodeRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    if (audioContextRef.current) {
      currentAudioTimeRef.current = audioContextRef.current.currentTime - playbackStartTimeRef.current
    }
    setIsPlaying(false)
  }, [])

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.type.startsWith("audio/")) {
        setStatus({ message: "Please select a valid audio file.", type: "error" })
        return
      }

      setFile(selectedFile)
      setAudioUrl(URL.createObjectURL(selectedFile))
      setProcessedAudioUrl("")
      setOriginalDuration(0)
      setAdjustedDuration(0)
      setSpeed(1)
      setPitch(1)
      setCurrentTime(0)
      setStatus(null)
      stopPlayback()

      try {
        const arrayBuffer = await selectedFile.arrayBuffer()
        const audioBuffer = await audioContextRef.current!.decodeAudioData(arrayBuffer)
        audioBufferRef.current = audioBuffer
        setOriginalDuration(audioBuffer.duration)
        setAdjustedDuration(audioBuffer.duration) // Initially adjusted duration is same as original
      } catch (error) {
        console.error("Error loading audio buffer:", error)
        setStatus({ message: "Failed to load audio file.", type: "error" })
      }
    }
  }

  const handleProcessAudio = async () => {
    if (!audioBufferRef.current || !audioContextRef.current) {
      setStatus({ message: "Please upload an audio file first.", type: "error" })
      return
    }

    setIsProcessing(true)
    setProcessingProgress(0)
    setStatus({ message: "Processing audio...", type: "info" })
    stopPlayback()

    try {
      const originalBuffer = audioBufferRef.current
      const audioCtx = audioContextRef.current

      // Create an offline audio context for rendering
      const newDuration = originalBuffer.duration / speed
      const offlineCtx = new OfflineAudioContext(
        originalBuffer.numberOfChannels,
        Math.ceil(newDuration * audioCtx.sampleRate),
        audioCtx.sampleRate,
      )

      const source = offlineCtx.createBufferSource()
      source.buffer = originalBuffer
      source.playbackRate.value = speed // Apply speed
      source.connect(offlineCtx.destination)
      source.start(0)

      // Simulate pitch adjustment (more complex, often requires external libraries or more advanced Web Audio API)
      // For simplicity, we'll just apply speed for now.
      // A real pitch shift would involve resampling or phase vocoder algorithms.

      const progressInterval = setInterval(() => {
        setProcessingProgress((prev) => Math.min(prev + 10, 90))
      }, 300)

      const renderedBuffer = await offlineCtx.startRendering()
      clearInterval(progressInterval)
      setProcessingProgress(100)

      // Convert AudioBuffer to WAV Blob
      const wavBlob = await bufferToWav(renderedBuffer)
      setProcessedAudioUrl(URL.createObjectURL(wavBlob))
      setAdjustedDuration(renderedBuffer.duration)
      setCurrentTime(0) // Reset playback time after processing
      setStatus({ message: "Audio processed successfully!", type: "success" })
    } catch (error) {
      console.error("Audio processing error:", error)
      setStatus({
        message: `Processing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
    } finally {
      setIsProcessing(false)
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
    view.setUint32(12, 16, true)
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

  const downloadProcessedAudio = () => {
    if (!processedAudioUrl || !file) return

    const a = document.createElement("a")
    a.href = processedAudioUrl
    a.download = `${file.name.split(".")[0]}_adjusted.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleSaveMeditation = async () => {
    if (!processedAudioUrl || !user) {
      toast({
        title: "Save Error",
        description: "Please process an audio file and be logged in to save.",
        variant: "destructive",
      })
      return
    }

    if (!meditationTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a title for your meditation.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      // Convert blob URL to actual blob
      const response = await fetch(processedAudioUrl)
      const blob = await response.blob()

      // Upload audio file to Supabase storage
      const fileName = `${user.id}/${Date.now()}_${meditationTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.wav`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("meditation-audio")
        .upload(fileName, blob)

      if (uploadError) throw uploadError

      // Save meditation metadata to database
      const { error: dbError } = await supabase.from("meditations").insert({
        user_id: user.id,
        title: meditationTitle.trim(),
        audio_url: uploadData.path,
        duration_seconds: Math.round(adjustedDuration),
        is_public: false, // Default to private
        // description and other fields can be added here if needed
      })

      if (dbError) throw dbError

      toast({
        title: "Meditation Saved!",
        description: `"${meditationTitle}" has been saved to your library.`,
      })

      setMeditationTitle("") // Clear title input
    } catch (error) {
      console.error("Error saving meditation:", error)
      toast({
        title: "Save Failed",
        description: `Could not save meditation: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-logo-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    )
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
              Length Adjuster
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mt-4">
              Adjust the length of your guided meditations.
            </p>
          </div>
        </div>

        <div className="px-6 md:px-10 pb-10 font-serif font-black">
          <Card className="p-8 space-y-6 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="space-y-4">
              <Label htmlFor="audio-upload" className="text-lg font-semibold">
                Upload Audio File
              </Label>
              <Input id="audio-upload" type="file" accept="audio/*" onChange={handleFileChange} />
              {audioUrl && (
                <div className="space-y-2">
                  <audio src={audioUrl} controls className="w-full" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Original Duration: {formatTime(originalDuration)}
                  </p>
                </div>
              )}
            </div>

            {file && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="speed-slider" className="text-lg font-semibold">
                      Speed: {speed.toFixed(2)}x
                    </Label>
                    <Slider
                      id="speed-slider"
                      min={0.5}
                      max={2}
                      step={0.01}
                      value={[speed]}
                      onValueChange={(val) => setSpeed(val[0])}
                      className="w-full"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Adjusted Duration: {formatTime(adjustedDuration)}
                    </p>
                  </div>
                  {/* Pitch slider is a placeholder for future implementation */}
                  <div>
                    <Label htmlFor="pitch-slider" className="text-lg font-semibold">
                      Pitch: {pitch.toFixed(2)}x (Coming Soon)
                    </Label>
                    <Slider
                      id="pitch-slider"
                      min={0.5}
                      max={2}
                      step={0.01}
                      value={[pitch]}
                      onValueChange={(val) => setPitch(val[0])}
                      className="w-full"
                      disabled // Disable pitch slider for now
                    />
                  </div>
                </div>

                <Button onClick={handleProcessAudio} className="w-full" disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Process Audio"}
                </Button>

                {isProcessing && (
                  <Progress value={processingProgress} className="w-full" aria-label="Audio processing progress" />
                )}

                {processedAudioUrl && (
                  <div className="space-y-4">
                    <Label className="text-lg font-semibold">Processed Audio</Label>
                    <div className="flex items-center space-x-2">
                      <Button onClick={isPlaying ? stopPlayback : startPlayback} variant="outline">
                        {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                        <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
                      </Button>
                      <Progress value={(currentTime / adjustedDuration) * 100} className="flex-grow" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {formatTime(currentTime)} / {formatTime(adjustedDuration)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="meditation-title" className="text-sm font-medium">
                        Meditation Title
                      </Label>
                      <Input
                        id="meditation-title"
                        placeholder="Enter title to save"
                        value={meditationTitle}
                        onChange={(e) => setMeditationTitle(e.target.value)}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={downloadProcessedAudio} className="flex-1">
                        <DownloadIcon className="h-5 w-5 mr-2" /> Download
                      </Button>
                      <Button
                        onClick={handleSaveMeditation}
                        className="flex-1"
                        disabled={isSaving || !meditationTitle.trim()}
                      >
                        {isSaving ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <SaveIcon className="h-5 w-5 mr-2" />
                        )}
                        Save Meditation
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {status && (
              <div
                className={`p-4 rounded-md ${
                  status.type === "error"
                    ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                    : status.type === "success"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300"
                }`}
              >
                {status.message}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
