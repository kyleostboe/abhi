"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { Info, Upload, Volume2, Clock, Wand2, Download, Settings2, AlertTriangle, RefreshCcw } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence } from "framer-motion"
import { Navigation } from "@/components/navigation"

// Mobile detection
const isMobile = () => {
  if (typeof window === "undefined") return false
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  )
}

// Memory management utilities
const forceGarbageCollection = () => {
  if (typeof window !== "undefined" && (window as any).gc) {
    ;(window as any).gc()
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const monitorMemory = () => {
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const memory = (performance as any).memory
    const usedMB = memory.usedJSHeapSize / 1048576
    const limitMB = memory.jsHeapSizeLimit / 1048576

    if (usedMB > limitMB * 0.7) {
      forceGarbageCollection()
    }
  }
}

export default function MeditationAdjuster() {
  const [file, setFile] = useState<File | null>(null)
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null)
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)

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
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
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

  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [memoryWarning, setMemoryWarning] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setIsMobileDevice(isMobile())
    if (typeof navigator !== "undefined" && (navigator as any).deviceMemory) {
      const deviceMemory = (navigator as any).deviceMemory
      if (deviceMemory < 4) setMemoryWarning(true)
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (AudioContext) {
      const ctx = new AudioContext({ sampleRate: isMobileDevice ? 22050 : 44100 })
      setAudioContext(ctx)
    }
    return () => {
      cleanupMemory()
      if (audioContext) audioContext.close()
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current)
    }
  }, [isMobileDevice]) // audioContext dependency removed as it's set here

  const cleanupMemory = useCallback(() => {
    setOriginalBuffer(null)
    setProcessedBuffer(null)
    if (originalUrl) URL.revokeObjectURL(originalUrl)
    setOriginalUrl("")
    if (processedUrl) URL.revokeObjectURL(processedUrl)
    setProcessedUrl("")
    if (audioContext && audioContext.state !== "closed") {
      // No need to await suspend, and check if context exists
      audioContext.suspend().catch((err) => console.warn("Error suspending audio context:", err))
    }
    forceGarbageCollection()
    if (isMobileDevice) setTimeout(() => forceGarbageCollection(), 100)
  }, [audioContext, originalUrl, processedUrl, isMobileDevice])

  const validateFileSize = (file: File): boolean => {
    const maxSize = isMobileDevice ? 50 * 1024 * 1024 : 500 * 1024 * 1024
    if (file.size > maxSize) {
      setStatus({
        message: `File too large. Maximum size is ${isMobileDevice ? "50MB" : "500MB"}.`,
        type: "error",
      })
      return false
    }
    if ((isMobileDevice && file.size > 20 * 1024 * 1024) || (!isMobileDevice && file.size > 150 * 1024 * 1024)) {
      setMemoryWarning(true)
    } else {
      setMemoryWarning(false)
    }
    return true
  }

  const handleFile = async (selectedFile: File) => {
    if (!selectedFile.type.startsWith("audio/")) {
      setStatus({ message: "Please select a valid audio file.", type: "error" })
      return
    }
    if (!validateFileSize(selectedFile)) return

    cleanupMemory()
    await sleep(100) // Give cleanup a moment

    setFile(selectedFile)
    setProcessingProgress(0)
    setProcessingStep("Initializing...")
    setDurationLimits(null)
    setAudioAnalysis(null)
    setProcessedUrl("")
    setProcessedBuffer(null)
    setActualDuration(null)
    setIsProcessingComplete(false)
    setStatus(null) // Clear previous status

    try {
      setStatus({ message: "Loading audio file...", type: "info" })
      await loadAudioFile(selectedFile)
    } catch (error) {
      setStatus({
        message: `Error loading audio file: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
      // Ensure buffer is cleared on error
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
    const minSilenceSamples = minSilenceDur * sampleRate
    const silenceRegions: { start: number; end: number }[] = []
    let silenceStart: number | null = null
    let consecutiveSilentSamples = 0
    const skipSamples = isMobileDevice ? 10 : 5

    for (let i = 0; i < channelData.length; i += skipSamples) {
      if (i % (isMobileDevice ? 22050 * 5 : 44100 * 10) === 0) await sleep(0)
      const amplitude = Math.abs(channelData[i])
      if (amplitude < threshold) {
        if (silenceStart === null) silenceStart = i
        consecutiveSilentSamples++
      } else {
        if (silenceStart !== null && consecutiveSilentSamples >= minSilenceSamples) {
          silenceRegions.push({ start: silenceStart / sampleRate, end: i / sampleRate })
        }
        silenceStart = null
        consecutiveSilentSamples = 0
      }
    }
    if (silenceStart !== null && consecutiveSilentSamples >= minSilenceSamples) {
      silenceRegions.push({ start: silenceStart / sampleRate, end: channelData.length / sampleRate })
    }
    return silenceRegions
  }

  const analyzeAudioForLimits = async (buffer: AudioBuffer) => {
    const silenceRegions = await detectSilenceRegions(buffer, silenceThreshold, minSilenceDuration)
    const totalSilenceDuration = silenceRegions.reduce((sum, region) => sum + (region.end - region.start), 0)
    const audioContentDuration = buffer.duration - totalSilenceDuration
    const minPossibleDuration = Math.max(1, Math.ceil(audioContentDuration / 60))
    const maxPossibleDuration = isMobileDevice ? 60 : 120
    setDurationLimits({ min: minPossibleDuration, max: maxPossibleDuration })
    setAudioAnalysis({
      totalSilence: totalSilenceDuration,
      contentDuration: audioContentDuration,
      silenceRegions: silenceRegions.length,
    })
    if (targetDuration < minPossibleDuration) setTargetDuration(minPossibleDuration)
    else if (targetDuration > maxPossibleDuration) setTargetDuration(maxPossibleDuration)
  }

  const loadAudioFile = useCallback(
    async (fileToLoad: File) => {
      if (!audioContext) {
        setStatus({ message: "Audio context not ready.", type: "error" })
        return
      }

      setProcessingStep("Reading file data...")
      setProcessingProgress(10)
      if (audioContext.state === "suspended") await audioContext.resume()

      const arrayBuffer = await fileToLoad.arrayBuffer()
      setProcessingStep("Decoding audio data...")
      setProcessingProgress(50)

      const decodePromise = audioContext.decodeAudioData(arrayBuffer)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Audio decoding timeout")), 30000),
      )
      const buffer = await Promise.race([decodePromise, timeoutPromise])

      setProcessingStep("Analyzing audio...")
      setProcessingProgress(80)
      await sleep(50) // Brief pause before heavy analysis

      setOriginalBuffer(buffer) // Set buffer BEFORE calling analyze
      // analyzeAudioForLimits will be called by the useEffect watching originalBuffer

      setProcessingStep("Creating audio player...")
      setProcessingProgress(95)
      if (originalUrl) URL.revokeObjectURL(originalUrl)
      const blob = new Blob([fileToLoad], { type: fileToLoad.type })
      const url = URL.createObjectURL(blob)
      setOriginalUrl(url)

      setProcessingProgress(100)
      setProcessingStep("Complete!")
      setStatus({
        message: `Audio loaded. Adjust from ${Math.ceil(buffer.duration / 60)} min to ${isMobileDevice ? "1 hour" : "2 hours"}.`,
        type: "success",
      })
    },
    [audioContext, originalUrl, isMobileDevice],
  ) // analyzeAudioForLimits removed, will be triggered by useEffect

  // Effect for re-analyzing when settings or buffer change
  useEffect(() => {
    if (originalBuffer) analyzeAudioForLimits(originalBuffer)
  }, [silenceThreshold, minSilenceDuration, originalBuffer])

  const processAudio = async () => {
    if (!originalBuffer || !audioContext) return
    setIsProcessing(true)
    setProcessingProgress(0)
    setProcessingStep("Starting processing...")

    if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current)
    processingTimeoutRef.current = setTimeout(
      () => {
        setIsProcessing(false)
        setStatus({ message: "Processing timed out. Please try a smaller file or refresh.", type: "error" })
      },
      isMobileDevice ? 90000 : 600000,
    )

    try {
      setStatus({ message: "Processing audio...", type: "info" })
      if (audioContext.state === "suspended") await audioContext.resume()
      const targetDurationSeconds = targetDuration * 60
      setProcessingStep("Detecting silence regions...")
      setProcessingProgress(20)
      const silenceRegions = await detectSilenceRegions(originalBuffer, silenceThreshold, minSilenceDuration)
      await sleep(50)
      setProcessingStep("Calculating adjustments...")
      setProcessingProgress(40)
      const totalSilenceDuration = silenceRegions.reduce((sum, region) => sum + (region.end - region.start), 0)
      const audioContentDuration = originalBuffer.duration - totalSilenceDuration
      const availableSilenceDuration = Math.max(
        targetDurationSeconds - audioContentDuration,
        silenceRegions.length * minSpacingDuration,
      )
      const scaleFactor = totalSilenceDuration > 0 ? availableSilenceDuration / totalSilenceDuration : 1
      setProcessingStep("Rebuilding audio...")
      setProcessingProgress(60)
      const processed = await rebuildAudioWithScaledPauses(
        originalBuffer,
        silenceRegions,
        scaleFactor,
        minSpacingDuration,
        preserveNaturalPacing,
        availableSilenceDuration,
      )
      setPausesAdjusted(silenceRegions.length)
      if (processedBuffer) setProcessedBuffer(null)
      forceGarbageCollection()
      await sleep(100)
      if (processedUrl) URL.revokeObjectURL(processedUrl)
      setProcessedUrl("")
      setProcessedBuffer(processed)
      setActualDuration(processed.duration)
      setProcessingStep("Creating download file...")
      setProcessingProgress(90)
      const wavBlob = await bufferToWav(processed, compatibilityMode === "high")
      const url = URL.createObjectURL(wavBlob)
      setProcessedUrl(url)
      setProcessingProgress(100)
      setProcessingStep("Complete!")
      setStatus({ message: "Audio processing completed successfully!", type: "success" })
      setIsProcessingComplete(true)
      if (audioContext && audioContext.state !== "closed")
        audioContext.suspend().catch((err) => console.warn("Error suspending audio context post-process:", err))
    } catch (error) {
      setStatus({
        message: `Error processing audio: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
    } finally {
      setIsProcessing(false)
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current)
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
    ): Promise<AudioBuffer> => {
      if (!audioContext) throw new Error("Audio context not available for rebuild")
      const sampleRate = buffer.sampleRate
      const numberOfChannels = buffer.numberOfChannels

      let dynamicScale = scaleFactorVal
      if (!preservePacing && regions.length > 0) {
        const currentTotalSilence = regions.reduce((sum, r) => sum + (r.end - r.start), 0)
        dynamicScale = currentTotalSilence > 0 ? targetTotalSilence / currentTotalSilence : 1
        if (!isFinite(dynamicScale) || dynamicScale <= 0) dynamicScale = 1
      }

      const processedRegions = regions.map((region) => {
        const duration = region.end - region.start
        let newDuration
        if (preservePacing) {
          newDuration = Math.max(duration * dynamicScale, minSpacingVal)
        } else if (regions.length > 0) {
          newDuration = Math.max(minSpacingVal, targetTotalSilence / regions.length)
        } else {
          newDuration = minSpacingVal
        }
        return { ...region, newDuration }
      })

      const audioContentDur = buffer.duration - regions.reduce((sum, r) => sum + (r.end - r.start), 0)
      const newSilenceDur = processedRegions.reduce((sum, r) => sum + r.newDuration, 0)
      const newTotalDur = audioContentDur + newSilenceDur
      const newBuffer = audioContext.createBuffer(numberOfChannels, Math.floor(newTotalDur * sampleRate), sampleRate)

      for (let channel = 0; channel < numberOfChannels; channel++) {
        const originalData = buffer.getChannelData(channel)
        const newData = newBuffer.getChannelData(channel)
        let writeIndex = 0
        let readIndex = 0

        if (regions.length > 0 && regions[0].start > 0) {
          const samplesToCopy = Math.floor(regions[0].start * sampleRate)
          for (let i = 0; i < samplesToCopy; i++) newData[writeIndex++] = originalData[readIndex++]
        }

        for (let i = 0; i < regions.length; i++) {
          if (i % (isMobileDevice ? 20 : 40) === 0) await sleep(0)
          const region = regions[i]
          const processedReg = processedRegions[i]
          readIndex = Math.floor(region.end * sampleRate)
          const newSilenceLength = Math.floor(processedReg.newDuration * sampleRate)
          for (let j = 0; j < newSilenceLength; j++) {
            if (writeIndex < newData.length) newData[writeIndex++] = 0
          }

          const nextRegionStart =
            i < regions.length - 1 ? Math.floor(regions[i + 1].start * sampleRate) : originalData.length
          const segmentLength = nextRegionStart - readIndex

          for (let j = 0; j < segmentLength; j++) {
            if (writeIndex < newData.length && readIndex + j < originalData.length) {
              newData[writeIndex++] = originalData[readIndex + j]
            }
          }
          readIndex = nextRegionStart
        }
      }
      return newBuffer
    },
    [audioContext, isMobileDevice],
  )

  const bufferToWav = useCallback(
    async (buffer: AudioBuffer, highCompatibility = true): Promise<Blob> => {
      if (!audioContext) throw new Error("Audio context not available for WAV conversion")
      const targetSampleRate = highCompatibility ? 44100 : buffer.sampleRate
      let resampledBuffer = buffer

      if (buffer.sampleRate !== targetSampleRate) {
        const ratio = targetSampleRate / buffer.sampleRate
        const newLength = Math.floor(buffer.length * ratio)
        resampledBuffer = audioContext.createBuffer(buffer.numberOfChannels, newLength, targetSampleRate)
        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const oldData = buffer.getChannelData(channel)
          const newData = resampledBuffer.getChannelData(channel)
          for (let i = 0; i < newLength; i++) {
            if (i % (isMobileDevice ? 22050 * 2 : 44100 * 4) === 0) await sleep(0)
            const oldIndex = i / ratio
            const index = Math.floor(oldIndex)
            newData[i] = oldData[Math.min(index, oldData.length - 1)]
          }
        }
      }

      const length = resampledBuffer.length
      const numberOfChannels = resampledBuffer.numberOfChannels
      const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
      const view = new DataView(arrayBuffer)
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i))
      }
      writeString(0, "RIFF")
      view.setUint32(4, 36 + length * numberOfChannels * 2, true)
      writeString(8, "WAVE")
      writeString(12, "fmt ")
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, numberOfChannels, true)
      view.setUint32(24, targetSampleRate, true)
      view.setUint32(28, targetSampleRate * numberOfChannels * 2, true)
      view.setUint16(32, numberOfChannels * 2, true)
      view.setUint16(34, 16, true)
      writeString(36, "data")
      view.setUint32(40, length * numberOfChannels * 2, true)
      let offset = 44
      for (let i = 0; i < length; i++) {
        if (i % (isMobileDevice ? 22050 * 2 : 44100 * 4) === 0) await sleep(0)
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, resampledBuffer.getChannelData(channel)[i]))
          view.setInt16(offset, sample * 0x7fff, true)
          offset += 2
        }
      }
      return new Blob([arrayBuffer], { type: "audio/wav" })
    },
    [audioContext, isMobileDevice],
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) handleFile(selectedFile)
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
    if (!processedBuffer || !file) return
    const wavBlob = await bufferToWav(processedBuffer, compatibilityMode === "high")
    const url = URL.createObjectURL(wavBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${file.name.split(".")[0]}_adjusted.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  useEffect(() => {
    if (isProcessingComplete) {
      setIsProcessingComplete(false)
    }
  }, [targetDuration, silenceThreshold, minSilenceDuration, minSpacingDuration, preserveNaturalPacing]) // isProcessingComplete removed from deps as per original intent

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined
    if (isProcessing) interval = setInterval(() => monitorMemory(), 5000)
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isProcessing])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#e9f5f3,#f0f8ff_30%,#f8f0ff_70%)] p-4 md:p-8">
      <Navigation />

      {isMobileDevice && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-orange-100 to-amber-50 border border-orange-300 shadow-sm">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-700 mb-1">Mobile Optimization Tips</h3>
              <p className="text-sm text-orange-600 mb-1">For best performance on mobile:</p>
              <ul className="list-disc pl-5 text-sm text-orange-600 space-y-1">
                <li>Use files under 50MB</li>
                <li>Close other apps/tabs</li>
                <li>Use shorter meditations (under 45 min)</li>
                <li>Stay on this page during processing</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {memoryWarning && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-100 to-amber-50 border border-yellow-300 shadow-sm">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-700 mb-1">High Memory Usage Expected</h3>
              <p className="text-sm text-yellow-600">
                The selected file is large or your device has limited memory. Processing may be slow.
              </p>
            </div>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-teal-500/20 via-purple-500/10 to-blue-500/20 blur-3xl transform -translate-y-1/2"></div>
          <div className="relative pt-16 pb-12 px-8 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1 className="text-5xl md:text-6xl font-extralight text-transparent bg-clip-text bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-400 mb-3">
                abhī
              </h1>
              <div className="h-1 w-16 bg-gradient-to-r from-teal-500 to-emerald-400 mx-auto rounded-full mb-4"></div>
              <p className="text-lg text-gray-600 mb-4 font-light">Meditation Length Adjuster</p>
              <p className="text-gray-500 max-w-2xl mx-auto text-sm leading-relaxed">
                Upload your audio and change the length of pauses to match your desired meditation duration. The app
                intelligently detects silence periods, scales them proportionally, and preserves spoken content.
              </p>
              <div className="mt-4 p-4 rounded-lg border border-pink-300 max-w-2xl mx-auto">
                <p className="text-sm text-pink-600 leading-relaxed">
                  <strong>Intro: </strong> I orginally put this together for{" "}
                  <a
                    href="https://dharmaseed.org/teacher/210/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-500 hover:text-pink-600 underline font-medium hover:bg-pink-100 px-1 rounded transition-colors"
                  >
                    Rob Burbea's guided meditations
                  </a>
                  , though any guided meditation (under {isMobileDevice ? "50MB" : "500MB"}) should be compatible.
                  Depending on the audio, you may need to adjust the advanced settings for optimal results. Enjoy :)
                  [Default settings currently appear to work best with{" "}
                  <a
                    href="https://tasshin.com/guided-meditations/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-500 hover:text-pink-600 underline font-medium hover:bg-pink-100 px-1 rounded transition-colors"
                  >
                    Tasshin's collection]
                  </a>
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="px-6 md:px-10 pb-10">
          <motion.div
            whileHover={{ scale: 1.005, boxShadow: "0 8px 20px rgba(0,0,0,0.08)" }}
            whileTap={{ scale: 0.995 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            ref={uploadAreaRef}
            className="border-2 border-dashed border-teal-300 bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-10 md:p-16 text-center mb-8 cursor-pointer transition-all hover:border-teal-400"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-4 bg-gradient-to-br from-teal-400 to-emerald-300 text-white p-4 rounded-full inline-block">
              <Upload size={32} />
            </div>
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="text-lg font-medium text-teal-800 mb-2">Drop your audio file here or click to browse</div>
              <div className="text-sm text-teal-600/70">
                Supports MP3, WAV, and OGG files (Max: {isMobileDevice ? "50MB" : "500MB"})
              </div>
            </motion.div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".mp3,.wav,.ogg,audio/*"
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
                className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-5 mb-6 border border-teal-100 shadow-sm overflow-hidden"
              >
                <div className="flex items-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 }}
                    className="bg-teal-100 p-2 rounded-lg mr-4"
                  >
                    <Volume2 className="h-5 w-5 text-teal-600" />
                  </motion.div>
                  <div>
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="font-medium text-teal-800 mb-1"
                    >
                      {file.name}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-sm text-teal-600/70"
                    >
                      Size: {formatFileSize(file.size)} • Type: {file.type}
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
                <Card className="p-6 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-medium text-pink-700 mb-2">Processing Audio</h3>
                    <p className="text-sm text-pink-600">{processingStep}</p>
                  </div>
                  <div className="w-full bg-pink-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${processingProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-center text-sm text-pink-600">{processingProgress}% complete</div>
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
                <Alert className="border-none bg-gradient-to-r from-blue-50 to-purple-50 shadow-sm p-1">
                  <div className="p-4">
                    <div className="flex items-center mb-4">
                      <div className="bg-blue-100 p-2 rounded-lg mr-3">
                        <Info className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="font-medium text-blue-800 text-lg">Audio Analysis</div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/60 p-3 rounded-lg text-center">
                        <div className="text-xs text-blue-500 uppercase tracking-wide mb-1">Content</div>
                        <div className="font-medium text-blue-800">{formatDuration(audioAnalysis.contentDuration)}</div>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg text-center">
                        <div className="text-xs text-blue-500 uppercase tracking-wide mb-1">Silence</div>
                        <div className="font-medium text-blue-800">{formatDuration(audioAnalysis.totalSilence)}</div>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg text-center">
                        <div className="text-xs text-blue-500 uppercase tracking-wide mb-1">Pauses</div>
                        <div className="font-medium text-blue-800">{audioAnalysis.silenceRegions}</div>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg text-center">
                        <div className="text-xs text-blue-500 uppercase tracking-wide mb-1">Range</div>
                        <div className="font-medium text-blue-800">
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
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100/70 p-1 rounded-lg">
                <TabsTrigger
                  value="basic"
                  className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm rounded-md"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Basic Settings
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm rounded-md"
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Advanced Settings
                </TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="mt-0 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-teal-50 to-emerald-50">
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 py-3 px-6">
                      <h3 className="text-white font-medium flex items-center">
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
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-3xl font-light text-teal-700">{targetDuration}</span>
                        <span className="text-lg text-teal-600 ml-1">minutes</span>
                      </div>
                      {durationLimits && (
                        <div className="text-center text-xs text-teal-500/70 mt-2">
                          Range: {durationLimits.min} min to {isMobileDevice ? "1 hour" : "2 hours"}
                        </div>
                      )}
                    </div>
                  </Card>
                  <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-blue-50 to-purple-50">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 py-3 px-6">
                      <h3 className="text-white font-medium flex items-center">
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
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-3xl font-light text-blue-700">{silenceThreshold.toFixed(3)}</span>
                      </div>
                      <div className="text-center text-xs text-blue-500/70 mt-2">Lower = more sensitive</div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="advanced" className="mt-0 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-emerald-50 to-teal-50">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 py-3 px-6">
                      <h3 className="text-white font-medium">Min Silence Duration</h3>
                    </div>
                    <div className="p-6">
                      <div className="mb-4">
                        <Slider
                          value={[minSilenceDuration]}
                          min={1}
                          max={15}
                          step={0.5}
                          onValueChange={(value) => setMinSilenceDuration(value[0])}
                          className="py-4"
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-3xl font-light text-emerald-700">{minSilenceDuration}</span>
                        <span className="text-lg text-emerald-600 ml-1">seconds</span>
                      </div>
                      <div className="text-center text-xs text-emerald-500/70 mt-2">Shorter = detect more pauses</div>
                    </div>
                  </Card>
                  <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-purple-50 to-blue-50">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 py-3 px-6">
                      <h3 className="text-white font-medium">Min Spacing Between Content</h3>
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
                        />
                      </div>
                      <div className="text-center">
                        <span className="text-3xl font-light text-purple-700">{minSpacingDuration.toFixed(1)}</span>
                        <span className="text-lg text-purple-600 ml-1">seconds</span>
                      </div>
                      <div className="text-center text-xs text-purple-500/70 mt-2">
                        Minimum pause between speaking parts
                      </div>
                    </div>
                  </Card>
                  <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-blue-50 to-indigo-50">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 py-3 px-6">
                      <h3 className="text-white font-medium">Preserve Natural Pacing</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-700 mb-1">Maintain the relative length of pauses</p>
                        </div>
                        <Switch
                          checked={preserveNaturalPacing}
                          onCheckedChange={setPreserveNaturalPacing}
                          className="data-[state=checked]:bg-blue-500"
                        />
                      </div>
                    </div>
                  </Card>
                  <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-indigo-50 to-purple-50">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 py-3 px-6">
                      <h3 className="text-white font-medium">Compatibility Mode</h3>
                    </div>
                    <div className="p-6">
                      <Select value={compatibilityMode} onValueChange={(value) => setCompatibilityMode(value)}>
                        <SelectTrigger className="w-full mb-2 border-indigo-200 focus:ring-indigo-500">
                          <SelectValue placeholder="Select compatibility mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Standard Quality</SelectItem>
                          <SelectItem value="high">High Compatibility (Mobile/AirPods)</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-indigo-500/70 mt-2">
                        High Compatibility for better playback on mobile/AirPods.
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
            className="mb-8 text-center"
          >
            <Button
              className={`w-full py-7 text-lg font-medium tracking-wider rounded-xl shadow-lg transition-all border-none ${isProcessing ? "bg-gradient-to-r from-pink-400 to-pink-500" : isProcessingComplete ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"}`}
              disabled={!originalBuffer || isProcessing || !durationLimits}
              onClick={processAudio}
            >
              {isProcessing && (
                <div className="flex items-center justify-center">
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
                  <span>Processing Audio...</span>
                </div>
              )}
              {!isProcessing && isProcessingComplete && <span>Complete 🎉</span>}
              {!isProcessing && !isProcessingComplete && (
                <div className="flex items-center justify-center">
                  <Wand2 className="mr-2 h-5 w-5" />
                  <span>Process Audio</span>
                </div>
              )}
            </Button>
            {isProcessing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.location.reload()}
                className="mt-4 text-gray-500 hover:text-gray-700"
                aria-label="Cancel processing and reload page"
              >
                <RefreshCcw size={18} className="mr-1" />
                Cancel
              </Button>
            )}
          </motion.div>

          <AnimatePresence>
            {status && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`p-4 rounded-xl mb-8 text-center shadow-sm overflow-hidden ${status.type === "info" ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200" : status.type === "success" ? "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200" : "bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200"}`}
              >
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  {status.message}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-6">
            {originalUrl && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-gray-50 to-gray-100">
                  <div className="bg-gradient-to-r from-gray-700 to-gray-800 py-3 px-6">
                    <h3 className="text-white font-medium">Original Audio</h3>
                  </div>
                  <div className="p-6">
                    <div className="bg-white rounded-lg p-3 shadow-sm mb-4">
                      <audio controls className="w-full" src={originalUrl}></audio>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/60 p-3 rounded-lg text-center">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Duration</div>
                        <div className="font-medium text-gray-800">
                          {originalBuffer ? formatDuration(originalBuffer.duration) : "--"}
                        </div>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg text-center">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">File Size</div>
                        <div className="font-medium text-gray-800">{formatFileSize(file?.size || 0)}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
            {processedUrl && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-teal-50 to-emerald-50">
                  <div className="bg-gradient-to-r from-teal-600 to-emerald-600 py-3 px-6">
                    <h3 className="text-white font-medium">Processed Audio</h3>
                  </div>
                  <div className="p-6">
                    <div className="bg-white rounded-lg p-3 shadow-sm mb-4">
                      <audio controls className="w-full" src={processedUrl}></audio>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-white/60 p-3 rounded-lg text-center">
                        <div className="text-xs text-teal-500 uppercase tracking-wide mb-1">Duration</div>
                        <div className="font-medium text-teal-800">
                          {processedBuffer ? formatDuration(processedBuffer.duration) : "--"}
                          {actualDuration && targetDuration && (
                            <div className="text-xs text-teal-600 mt-1">
                              {((actualDuration / (targetDuration * 60)) * 100).toFixed(1)}% of target
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg text-center">
                        <div className="text-xs text-teal-500 uppercase tracking-wide mb-1">Pauses Adjusted</div>
                        <div className="font-medium text-teal-800">{pausesAdjusted}</div>
                      </div>
                    </div>
                    <Button
                      className="w-full py-4 rounded-xl shadow-md bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 transition-all border-none"
                      onClick={downloadProcessedAudio}
                    >
                      <div className="flex items-center justify-center">
                        <Download className="mr-2 h-5 w-5" />
                        Download Processed Audio
                      </div>
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
        <div className="mt-8 text-center text-xs text-gray-400 pb-6">
          <p>abhī • Meditation Length Adjuster • {new Date().getFullYear()}</p>
        </div>
      </motion.div>
    </div>
  )
}
