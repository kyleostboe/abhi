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
      // Increased threshold slightly
      console.warn("High memory usage detected, forcing GC.")
      forceGarbageCollection()
      return true // Indicate high memory
    }
  }
  return false // Indicate normal memory
}

export default function MeditationAdjuster() {
  const [file, setFile] = useState<File | null>(null)
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null)
  const [processedBufferState, setProcessedBufferState] = useState<AudioBuffer | null>(null) // Renamed to avoid conflict
  const audioContextRef = useRef<AudioContext | null>(null)

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
            document.removeEventListener("touchend", resumeContextOnInteraction, true)
            document.removeEventListener("keydown", resumeContextOnInteraction, true)
          }
          document.addEventListener("click", resumeContextOnInteraction, { once: true, capture: true })
          document.addEventListener("touchend", resumeContextOnInteraction, { once: true, capture: true })
          document.addEventListener("keydown", resumeContextOnInteraction, { once: true, capture: true })
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
    if (!selectedFile.type.startsWith("audio/")) {
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
    setIsProcessingComplete(false)
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
    const skipSamples = isMobileDevice ? 20 : 10 // Slightly increased skip for mobile

    for (let i = 0; i < channelData.length; i += skipSamples) {
      if (i % (sampleRate * (isMobileDevice ? 2 : 5)) === 0) {
        // Sleep every few seconds of audio
        await sleep(0)
        setProcessingProgress(20 + Math.floor((i / channelData.length) * 10)) // Progress for silence detection
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

  const analyzeAudioForLimits = async (buffer: AudioBuffer) => {
    setProcessingStep("Analyzing audio for limits...")
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
        const decodePromise = currentAudioContext.decodeAudioData(arrayBuffer.slice(0)) // Use slice(0) to work with a copy
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Audio decoding timeout (30s)")), 30000),
        )
        const buffer = await Promise.race([decodePromise, timeoutPromise])
        setProcessingStep("Analyzing audio...")
        setProcessingProgress(80)
        await sleep(50)
        setOriginalBuffer(buffer) // Triggers analyzeAudioForLimits
        setProcessingStep("Creating audio player...")
        setProcessingProgress(95)
        if (originalUrl) URL.revokeObjectURL(originalUrl)
        const blob = new Blob([fileToLoad], { type: fileToLoad.type })
        const url = URL.createObjectURL(blob)
        setOriginalUrl(url)
        setProcessingProgress(100)
        setProcessingStep("Load complete!")
        setStatus({
          message: `Audio loaded. Duration: ${formatDuration(buffer.duration)}. Adjust from ${durationLimits?.min || 1} to ${durationLimits?.max || (isMobileDevice ? 60 : 120)} min.`,
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
    [originalUrl, isMobileDevice, durationLimits],
  ) // Added durationLimits

  useEffect(() => {
    if (originalBuffer) analyzeAudioForLimits(originalBuffer)
  }, [originalBuffer, silenceThreshold, minSilenceDuration])

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
    ) // Increased mobile timeout to 2 mins

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
        (p) => setProcessingProgress(50 + Math.floor(p * 0.4)), // Progress for rebuild (50% to 90%)
      )
      setPausesAdjusted(silenceRegions.length)

      // Explicitly release originalBuffer if no longer needed for other operations (e.g. re-analysis)
      // setOriginalBuffer(null); // Consider if originalBuffer is needed again. If not, this helps.
      // forceGarbageCollection(); // Try to free memory before WAV conversion

      setProcessingStep("Creating download file (step 4/4)...")
      setProcessingProgress(90)
      await sleep(10)
      const wavBlob = await bufferToWav(
        processedAudioBuffer,
        compatibilityMode === "high",
        (p) => setProcessingProgress(90 + Math.floor(p * 0.1)), // Progress for WAV (90% to 100%)
      )

      if (processedUrl) URL.revokeObjectURL(processedUrl)
      const url = URL.createObjectURL(wavBlob)
      setProcessedUrl(url)
      setActualDuration(processedAudioBuffer.duration) // Use duration from the buffer passed to WAV
      setProcessedBufferState(processedAudioBuffer) // Store the final buffer

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
      const sampleRate = buffer.sampleRate
      const numberOfChannels = buffer.numberOfChannels
      console.log(
        `Rebuilding: ${buffer.duration.toFixed(2)}s, SR: ${sampleRate}, Channels: ${numberOfChannels}, Target Silence: ${targetTotalSilence.toFixed(2)}s`,
      )

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
      console.log(
        `New total duration: ${newTotalDur.toFixed(2)}s. Content: ${audioContentDur.toFixed(2)}s, New Silence: ${newSilenceDur.toFixed(2)}s`,
      )
      if (isMobileDevice && newTotalDur > 45 * 60) {
        // Warn if output is very long on mobile
        console.warn(`Mobile device: Output duration ${formatDuration(newTotalDur)} may cause issues.`)
        setMemoryWarning(true)
      }

      let newBuffer: AudioBuffer
      try {
        newBuffer = currentAudioContext.createBuffer(
          numberOfChannels,
          Math.max(1, Math.floor(newTotalDur * sampleRate)),
          sampleRate,
        )
      } catch (e) {
        console.error(`Error creating new AudioBuffer of duration ${newTotalDur.toFixed(2)}s:`, e)
        forceGarbageCollection() // Attempt to free memory
        throw new Error(
          `Failed to create output buffer (duration: ${newTotalDur.toFixed(2)}s). Memory limit likely exceeded. Try a shorter target duration.`,
        )
      }

      onProgress(10) // Progress after buffer creation

      for (let channel = 0; channel < numberOfChannels; channel++) {
        const originalData = buffer.getChannelData(channel)
        const newData = newBuffer.getChannelData(channel)
        let writeIndex = 0
        let readIndex = 0
        const totalSamples = originalData.length

        if (regions.length > 0 && regions[0].start > 0) {
          const samplesToCopy = Math.floor(regions[0].start * sampleRate)
          for (let i = 0; i < samplesToCopy; i++) newData[writeIndex++] = originalData[readIndex++]
        }

        for (let i = 0; i < regions.length; i++) {
          if (i % (isMobileDevice ? 5 : 10) === 0) {
            // More frequent sleep/progress
            await sleep(0)
            onProgress(10 + Math.floor((i / regions.length) * 80)) // Progress within region loop (10% to 90%)
          }
          const region = regions[i]
          const processedReg = processedRegions[i]
          readIndex = Math.floor(region.end * sampleRate) // Move readIndex past the original silence
          const newSilenceLength = Math.floor(processedReg.newDuration * sampleRate)
          for (let j = 0; j < newSilenceLength; j++) {
            if (writeIndex < newData.length) newData[writeIndex++] = 0
          }
          const nextRegionStart = i < regions.length - 1 ? Math.floor(regions[i + 1].start * sampleRate) : totalSamples
          const segmentLength = nextRegionStart - readIndex
          for (let j = 0; j < segmentLength; j++) {
            if (writeIndex < newData.length && readIndex + j < totalSamples) {
              newData[writeIndex++] = originalData[readIndex + j]
            }
          }
          readIndex = nextRegionStart
        }
        // Copy any remaining audio after the last silence region
        if (readIndex < totalSamples && regions.length === 0) {
          // If no silence regions, copy all
          for (let i = readIndex; i < totalSamples; i++)
            if (writeIndex < newData.length) newData[writeIndex++] = originalData[i]
        } else if (
          readIndex < totalSamples &&
          regions.length > 0 &&
          regions[regions.length - 1].end * sampleRate < totalSamples
        ) {
          // This case should be covered by the loop logic if nextRegionStart is totalSamples
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
      // **Aggressive sample rate reduction for mobile on long audio**
      if (isMobileDevice && highCompatibility && buffer.duration > 15 * 60) {
        // 15 minutes
        targetSampleRate = Math.min(targetSampleRate, 22050) // Cap at 22050Hz
        console.log(`Mobile WAV Export: Duration > 15min, capping sample rate to ${targetSampleRate}Hz`)
      } else if (isMobileDevice && buffer.sampleRate > 22050) {
        // If not high compatibility, but mobile and original SR is high, also consider capping
        // targetSampleRate = Math.min(targetSampleRate, 22050);
        // console.log(`Mobile WAV Export: Original SR > 22050Hz, capping to ${targetSampleRate}Hz`);
      }

      let resampledBuffer = buffer
      if (buffer.sampleRate !== targetSampleRate) {
        console.log(`Resampling from ${buffer.sampleRate}Hz to ${targetSampleRate}Hz for WAV export.`)
        const ratio = targetSampleRate / buffer.sampleRate
        const newLength = Math.floor(buffer.length * ratio)
        try {
          resampledBuffer = currentAudioContext.createBuffer(buffer.numberOfChannels, newLength, targetSampleRate)
        } catch (e) {
          console.error(`Error creating resampled buffer of duration ${(newLength / targetSampleRate).toFixed(2)}s:`, e)
          forceGarbageCollection()
          throw new Error(
            `Failed to create resample buffer (target SR: ${targetSampleRate}Hz). Memory limit likely exceeded.`,
          )
        }

        onProgress(10) // Progress after resample buffer creation

        for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
          const oldData = buffer.getChannelData(channel)
          const newData = resampledBuffer.getChannelData(channel)
          for (let i = 0; i < newLength; i++) {
            if (i % (targetSampleRate * (isMobileDevice ? 1 : 2)) === 0) {
              // Sleep every 1-2s of resampled audio
              await sleep(0)
              onProgress(
                10 +
                  Math.floor(
                    ((channel * (newLength / buffer.numberOfChannels) + i) / (newLength * buffer.numberOfChannels)) *
                      40,
                  ),
              ) // Progress 10% to 50%
            }
            const oldIndex = i / ratio
            const index = Math.floor(oldIndex)
            const frac = oldIndex - index
            // Basic linear interpolation (can be improved, but good enough for now)
            const samp1 = oldData[Math.min(index, oldData.length - 1)]
            const samp2 = oldData[Math.min(index + 1, oldData.length - 1)]
            newData[i] = samp1 + (samp2 - samp1) * frac
          }
        }
        // buffer = null; // Attempt to release original buffer if it was large and resampled
        // forceGarbageCollection();
      } else {
        onProgress(50) // Skip resampling progress
      }

      const numSamples = resampledBuffer.length
      const numberOfChannels = resampledBuffer.numberOfChannels
      const bytesPerSample = 2 // 16-bit PCM
      const dataSize = numSamples * numberOfChannels * bytesPerSample
      const fileSize = 44 + dataSize // Header size + data size

      console.log(
        `WAV Export: Samples: ${numSamples}, Channels: ${numberOfChannels}, SR: ${targetSampleRate}, DataSize: ${formatFileSize(dataSize)}`,
      )
      if (isMobileDevice && fileSize > 40 * 1024 * 1024) {
        // Warn if WAV blob itself is large on mobile
        console.warn(`Mobile device: WAV file size ${formatFileSize(fileSize)} may cause issues.`)
        setMemoryWarning(true)
      }

      let finalArrayBuffer: ArrayBuffer
      try {
        finalArrayBuffer = new ArrayBuffer(fileSize)
      } catch (e) {
        console.error(`Error creating final ArrayBuffer for WAV (size ${formatFileSize(fileSize)}):`, e)
        // resampledBuffer = null; // Attempt to release
        // forceGarbageCollection();
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
      view.setUint32(16, 16, true)
      view.setUint16(20, 1, true)
      view.setUint16(22, numberOfChannels, true)
      view.setUint32(24, targetSampleRate, true)
      view.setUint32(28, targetSampleRate * numberOfChannels * bytesPerSample, true)
      view.setUint16(32, numberOfChannels * bytesPerSample, true)
      view.setUint16(34, 16, true)
      writeString(36, "data")
      view.setUint32(40, dataSize, true)

      let offset = 44
      for (let i = 0; i < numSamples; i++) {
        if (i % (targetSampleRate * (isMobileDevice ? 1 : 2)) === 0) {
          // Sleep every 1-2s
          await sleep(0)
          onProgress(50 + Math.floor((i / numSamples) * 50)) // Progress 50% to 100%
        }
        for (let channel = 0; channel < numberOfChannels; channel++) {
          const sample = Math.max(-1, Math.min(1, resampledBuffer.getChannelData(channel)[i]))
          view.setInt16(offset, sample * 0x7fff, true)
          offset += bytesPerSample
        }
      }
      onProgress(100)
      return new Blob([finalArrayBuffer], { type: "audio/wav" })
    },
    [isMobileDevice],
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) handleFile(selectedFile)
    e.target.value = ""
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
    if (!processedBufferState || !file) return
    // Re-use bufferToWav for download to ensure consistency, or assume processedUrl is from compatible WAV
    // For simplicity, let's assume processedUrl is already the correct WAV blob URL
    // If not, you'd call: const wavBlob = await bufferToWav(processedBufferState, compatibilityMode === "high", () => {});
    // const url = URL.createObjectURL(wavBlob);

    const a = document.createElement("a")
    a.href = processedUrl // Use the already created URL
    a.download = `${file.name.split(".")[0]}_adjusted.wav`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // URL.revokeObjectURL(url); // Only if you re-created it here
  }

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${["Bytes", "KB", "MB", "GB"][i]}`
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
    if (isProcessing) interval = setInterval(monitorMemory, 3000) // Check memory more often
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isProcessing])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#e9f5f3,#f0f8ff_30%,#f8f0ff_70%)] dark:bg-[radial-gradient(circle_at_top_right,#0F172A,#111827_30%,#1E1B34_70%)] p-4 md:p-8 transition-colors duration-300 ease-in-out">
      <Navigation />

      {isMobileDevice && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-orange-100 to-amber-50 border border-orange-300 shadow-sm dark:from-orange-950 dark:to-amber-900 dark:border-orange-700">
          <div className="flex items-start">
            <AlertTriangle className="h-6 w-6 text-orange-500 mr-3 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-700 dark:text-orange-300 mb-1">Mobile Optimization Tips</h3>
              <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">For best performance on mobile:</p>
              <ul className="list-disc pl-5 text-sm text-orange-600 dark:text-orange-400 space-y-1">
                <li>Use files under 50MB. Processing long audio (&gt;20-30 min output) can be slow or unstable.</li>
                <li>Close other apps/tabs. Stay on this page during processing.</li>
                <li>If issues occur, try a shorter target duration or refresh the page.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {memoryWarning && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-yellow-100 to-amber-50 border border-yellow-300 shadow-sm dark:from-yellow-950 dark:to-amber-900 dark:border-yellow-700">
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
        className="relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl dark:shadow-2xl dark:shadow-black/40 overflow-hidden dark:bg-gray-900/80 transition-colors duration-300 ease-in-out"
        style={{
          borderRadius: "3rem 2.5rem 3rem 2.5rem",
        }}
      >
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl transform -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20 dark:from-amber-600/20 dark:via-rose-500/15 dark:via-purple-600/10 dark:to-teal-500/20"></div>
            <div className="absolute top-2 left-8 w-16 h-12 bg-gradient-to-br from-emerald-300/30 to-teal-400/25 rounded-full transform rotate-12 dark:from-emerald-500/30 dark:to-teal-600/25"></div>
            <div className="absolute top-6 right-12 w-20 h-8 bg-gradient-to-bl from-rose-300/25 to-purple-400/20 rounded-full transform -rotate-6 dark:from-rose-500/25 dark:to-purple-600/20"></div>
            <div className="absolute top-1 left-1/3 w-12 h-16 bg-gradient-to-tr from-amber-300/20 to-orange-400/15 rounded-full transform rotate-45 dark:from-amber-500/20 dark:to-orange-600/15"></div>
            <div className="absolute top-8 right-1/4 w-14 h-10 bg-gradient-to-tl from-blue-300/25 to-indigo-400/20 rounded-full transform -rotate-12 dark:from-blue-500/25 dark:to-indigo-600/20"></div>
          </div>
          <div className="relative pt-16 pb-12 px-8 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <h1
                className="text-5xl md:text-6xl font-light text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-rose-400 via-purple-500 to-teal-400 mb-3 dark:from-amber-400 dark:via-rose-300 dark:via-purple-400 dark:to-teal-300 transform hover:scale-105 transition-transform duration-700 ease-out tracking-wide"
                style={{
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  textShadow: "0 0 25px rgba(139, 69, 19, 0.25)",
                }}
              >
                abhī
              </h1>
              <div className="flex justify-center items-center mb-4 space-x-1">
                <div className="w-3 h-3 bg-gradient-to-br from-teal-400 to-emerald-300 rounded-sm transform rotate-12 dark:from-teal-500 dark:to-emerald-400"></div>
                <div className="w-2 h-2 bg-gradient-to-br from-rose-400 to-pink-300 rounded-full dark:from-rose-500 dark:to-pink-400"></div>
                <div className="w-4 h-2 bg-gradient-to-br from-amber-400 to-orange-300 rounded-full transform -rotate-6 dark:from-amber-500 dark:to-orange-400"></div>
                <div className="w-16 h-1 bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full dark:from-teal-400 dark:to-emerald-300"></div>
                <div className="w-4 h-2 bg-gradient-to-br from-purple-400 to-indigo-300 rounded-full transform rotate-6 dark:from-purple-500 dark:to-indigo-400"></div>
                <div className="w-2 h-2 bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full dark:from-blue-500 dark:to-cyan-400"></div>
                <div className="w-3 h-3 bg-gradient-to-br from-emerald-400 to-teal-300 rounded-sm transform -rotate-12 dark:from-emerald-500 dark:to-teal-400"></div>
              </div>
              <p className="text-lg text-gray-600 mb-4 font-medium dark:text-gray-300">Meditation Length Adjuster</p>
              <p className="text-gray-500 max-w-2xl mx-auto text-sm leading-relaxed dark:text-gray-400">
                Upload your audio and change the length of pauses to match your desired meditation duration. The app
                intelligently detects silence periods, scales them proportionally, and preserves spoken content.
              </p>
              <div className="mt-4 p-4 rounded-lg border border-pink-300 max-w-2xl mx-auto dark:border-pink-700">
                <p className="text-sm text-pink-600 leading-relaxed dark:text-pink-300">
                  <strong>Note: </strong> Depending on the audio, you may need to adjust the advanced settings for optimal results. Any guided meditation (under {isMobileDevice ? "50MB" : "500MB"}) should be compatible. Enjoy:) <strong> Resources: </strong> {" "}
                  <a
                    href="https://dharmaseed.org/teacher/210/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-500 hover:text-pink-600 underline font-medium hover:bg-pink-100 px-1 rounded transition-colors dark:text-pink-400 dark:hover:text-pink-300 dark:hover:bg-pink-900"
                  >
                    Rob Burbea's meditations
                  </a> {" "}
                  <a
                    href="https://tasshin.com/guided-meditations/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-500 hover:text-pink-600 underline font-medium hover:bg-pink-100 px-1 rounded transition-colors dark:text-pink-400 dark:hover:text-pink-300 dark:hover:bg-pink-900"
                  >
                    Tasshin & friend's meditations
                  </a> {" "}
                  <a
                    href="https://www.tarabrach.com/guided-meditations-meditations-that-free-the-heart/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-500 hover:text-pink-600 underline font-medium hover:bg-pink-100 px-1 rounded transition-colors dark:text-pink-400 dark:hover:text-pink-300 dark:hover:bg-pink-900"
                    >
                      Tara Brach's meditations
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
            className="border-2 border-dashed border-teal-300 bg-gradient-to-br from-teal-50 to-blue-50 rounded-2xl p-10 md:p-16 text-center mb-8 cursor-pointer transition-all hover:border-teal-400 dark:border-teal-700 dark:from-teal-950 dark:to-blue-950 dark:hover:border-teal-600"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="mb-4 bg-gradient-to-br from-teal-400 to-emerald-300 text-white p-4 rounded-full inline-block dark:from-teal-600 dark:to-emerald-500">
              <Upload size={32} />
            </div>
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="text-lg font-medium text-teal-800 mb-2 dark:text-teal-200">
                Drop your audio file here or click to browse
              </div>
              <div className="text-sm text-teal-600/70 dark:text-teal-400/70">
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
                className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl p-5 mb-6 border border-teal-100 shadow-sm overflow-hidden dark:from-teal-950 dark:to-emerald-950 dark:border-teal-800"
              >
                <div className="flex items-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30, delay: 0.1 }}
                    className="bg-teal-100 p-2 rounded-lg mr-4 dark:bg-teal-800"
                  >
                    <Volume2 className="h-5 w-5 text-teal-600 dark:text-teal-300" />
                  </motion.div>
                  <div>
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="font-medium text-teal-800 mb-1 dark:text-teal-200"
                    >
                      {file.name}
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="text-sm text-teal-600/70 dark:text-teal-400/70"
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
                <Card className="p-6 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200 dark:from-pink-950 dark:to-purple-950 dark:border-pink-800">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-medium text-pink-700 dark:text-pink-300 mb-2">Processing Audio</h3>
                    <p className="text-sm text-pink-600 dark:text-pink-400">{processingStep}</p>
                  </div>
                  <div className="w-full bg-pink-200 rounded-full h-2 mb-2 dark:bg-pink-800">
                    <div
                      className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${processingProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-center text-sm text-pink-600 dark:text-pink-400">
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
                <Alert className="border-none bg-gradient-to-r from-blue-50 to-purple-50 shadow-sm p-1 dark:from-blue-950 dark:to-purple-950">
                  <div className="p-4">
                    <div className="flex items-center mb-4">
                      <div className="bg-blue-100 p-2 rounded-lg mr-3 dark:bg-blue-800">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                      </div>
                      <div className="font-medium text-blue-800 text-lg dark:text-blue-200">Audio Analysis</div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60">
                        <div className="text-xs text-blue-500 uppercase tracking-wide mb-1 dark:text-blue-400">
                          Content
                        </div>
                        <div className="font-medium text-blue-800 dark:text-blue-200">
                          {formatDuration(audioAnalysis.contentDuration)}
                        </div>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60">
                        <div className="text-xs text-blue-500 uppercase tracking-wide mb-1 dark:text-blue-400">
                          Silence
                        </div>
                        <div className="font-medium text-blue-800 dark:text-blue-200">
                          {formatDuration(audioAnalysis.totalSilence)}
                        </div>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60">
                        <div className="text-xs text-blue-500 uppercase tracking-wide mb-1 dark:text-blue-400">
                          Pauses
                        </div>
                        <div className="font-medium text-blue-800 dark:text-blue-200">
                          {audioAnalysis.silenceRegions}
                        </div>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60">
                        <div className="text-xs text-blue-500 uppercase tracking-wide mb-1 dark:text-blue-400">
                          Range
                        </div>
                        <div className="font-medium text-blue-800 dark:text-blue-200">
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
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100/70 p-1 rounded-lg dark:bg-gray-800/70">
                <TabsTrigger
                  value="basic"
                  className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm rounded-md dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-teal-300 dark:text-gray-300"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Basic Settings
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="data-[state=active]:bg-white data-[state=active]:text-teal-700 data-[state=active]:shadow-sm rounded-md dark:data-[state=active]:bg-gray-700 dark:data-[state=active]:text-teal-300 dark:text-gray-300"
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Advanced Settings
                </TabsTrigger>
              </TabsList>
              <TabsContent value="basic" className="mt-0 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950 dark:to-emerald-950">
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 py-3 px-6 dark:from-teal-700 dark:to-emerald-700">
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
                        <span className="text-3xl font-light text-teal-700 dark:text-teal-300">{targetDuration}</span>
                        <span className="text-lg text-teal-600 ml-1 dark:text-teal-400">minutes</span>
                      </div>
                      {durationLimits && (
                        <div className="text-center text-xs text-teal-500/70 mt-2 dark:text-teal-400/70">
                          Range: {durationLimits.min} min to {isMobileDevice ? "1 hour" : "2 hours"}
                        </div>
                      )}
                    </div>
                  </Card>
                  <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 py-3 px-6 dark:from-blue-700 dark:to-purple-700">
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
                        <span className="text-3xl font-light text-blue-700 dark:text-blue-300">
                          {silenceThreshold.toFixed(3)}
                        </span>
                      </div>
                      <div className="text-center text-xs text-blue-500/70 mt-2 dark:text-blue-400/70">
                        Lower = more sensitive
                      </div>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="advanced" className="mt-0 space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 py-3 px-6 dark:from-emerald-700 dark:to-teal-700">
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
                        <span className="text-3xl font-light text-emerald-700 dark:text-emerald-300">
                          {minSilenceDuration}
                        </span>
                        <span className="text-lg text-emerald-600 ml-1 dark:text-emerald-400">seconds</span>
                      </div>
                      <div className="text-center text-xs text-emerald-500/70 mt-2 dark:text-emerald-400/70">
                        Shorter = detect more pauses
                      </div>
                    </div>
                  </Card>
                  <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 py-3 px-6 dark:from-purple-700 dark:to-blue-700">
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
                        <span className="text-3xl font-light text-purple-700 dark:text-purple-300">
                          {minSpacingDuration.toFixed(1)}
                        </span>
                        <span className="text-lg text-purple-600 ml-1 dark:text-purple-400">seconds</span>
                      </div>
                      <div className="text-center text-xs text-purple-500/70 mt-2 dark:text-purple-400/70">
                        Minimum pause between speaking parts
                      </div>
                    </div>
                  </Card>
                  <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 py-3 px-6 dark:from-blue-700 dark:to-indigo-700">
                      <h3 className="text-white font-medium">Preserve Natural Pacing</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-700 mb-1 dark:text-blue-300">
                            Maintain the relative length of pauses
                          </p>
                        </div>
                        <Switch
                          checked={preserveNaturalPacing}
                          onCheckedChange={setPreserveNaturalPacing}
                          className="data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-blue-700"
                        />
                      </div>
                    </div>
                  </Card>
                  <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 py-3 px-6 dark:from-indigo-700 dark:to-purple-700">
                      <h3 className="text-white font-medium">Compatibility Mode</h3>
                    </div>
                    <div className="p-6">
                      <Select value={compatibilityMode} onValueChange={(value) => setCompatibilityMode(value)}>
                        <SelectTrigger className="w-full mb-2 border-indigo-200 focus:ring-indigo-500 dark:border-indigo-700 dark:bg-gray-800 dark:text-gray-200">
                          <SelectValue placeholder="Select compatibility mode" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-gray-800 dark:text-gray-200">
                          <SelectItem value="standard">Standard Quality (Original SR)</SelectItem>
                          <SelectItem value="high">
                            High Compatibility (44.1kHz or 22.05kHz for Mobile Long Audio)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-indigo-500/70 mt-2 dark:text-indigo-400/70">
                        High Compatibility for better playback on mobile/AirPods. May reduce sample rate for long audio
                        on mobile.
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
              className={`w-full py-7 text-lg font-medium tracking-wider rounded-xl shadow-lg transition-all border-none ${isProcessing ? "bg-gradient-to-r from-pink-400 to-pink-500 dark:from-pink-600 dark:to-pink-700" : isProcessingComplete ? "bg-gradient-to-r from-emerald-400 to-emerald-500 dark:from-emerald-600 dark:to-emerald-700" : "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 dark:from-teal-700 dark:to-emerald-700 dark:hover:from-teal-800 dark:hover:to-emerald-800"}`}
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
                className="mt-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                className={`p-4 rounded-xl mb-8 text-center shadow-sm overflow-hidden ${status.type === "info" ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200 dark:from-blue-950 dark:to-blue-900 dark:text-blue-300 dark:border-blue-700" : status.type === "success" ? "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200 dark:from-emerald-950 dark:to-emerald-900 dark:text-emerald-300 dark:border-emerald-700" : "bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200 dark:from-red-950 dark:to-red-900 dark:text-red-300 dark:border-red-700"}`}
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
                <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                  <div className="bg-gradient-to-r from-gray-700 to-gray-800 py-3 px-6 dark:from-gray-800 dark:to-gray-900">
                    <h3 className="text-white font-medium">Original Audio</h3>
                  </div>
                  <div className="p-6">
                    <div className="bg-white rounded-lg p-3 shadow-sm mb-4 dark:bg-gray-700">
                      <audio controls className="w-full" src={originalUrl}></audio>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 dark:text-gray-400">
                          Duration
                        </div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {originalBuffer ? formatDuration(originalBuffer.duration) : "--"}
                        </div>
                      </div>
                      <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60">
                        <div className="text-xs text-gray-500 uppercase tracking-wide mb-1 dark:text-gray-400">
                          File Size
                        </div>
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {formatFileSize(file?.size || 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}
            {processedUrl &&
              processedBufferState && ( // Ensure processedBufferState is also available
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                  <Card className="overflow-hidden border-none shadow-lg bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950 dark:to-emerald-950">
                    <div className="bg-gradient-to-r from-teal-600 to-emerald-600 py-3 px-6 dark:from-teal-700 dark:to-emerald-700">
                      <h3 className="text-white font-medium">Processed Audio</h3>
                    </div>
                    <div className="p-6">
                      <div className="bg-white rounded-lg p-3 shadow-sm mb-4 dark:bg-gray-700">
                        <audio controls className="w-full" src={processedUrl}></audio>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60">
                          <div className="text-xs text-teal-500 uppercase tracking-wide mb-1 dark:text-teal-400">
                            Duration
                          </div>
                          <div className="font-medium text-teal-800 dark:text-teal-200">
                            {formatDuration(actualDuration || 0)} {/* Use actualDuration state */}
                            {actualDuration && targetDuration && (
                              <div className="text-xs text-teal-600 mt-1 dark:text-teal-400">
                                {((actualDuration / (targetDuration * 60)) * 100).toFixed(1)}% of target
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="bg-white/60 p-3 rounded-lg text-center dark:bg-gray-800/60">
                          <div className="text-xs text-teal-500 uppercase tracking-wide mb-1 dark:text-teal-400">
                            Pauses Adjusted
                          </div>
                          <div className="font-medium text-teal-800 dark:text-teal-200">{pausesAdjusted}</div>
                        </div>
                      </div>
                      <Button
                        className="w-full py-4 rounded-xl shadow-md bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 transition-all border-none dark:from-teal-700 dark:to-emerald-700 dark:hover:from-teal-800 dark:hover:to-emerald-800"
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
        <div className="mt-8 text-center text-xs text-gray-400 pb-6 dark:text-gray-500">
          <p>abhī • Meditation Length Adjuster • {new Date().getFullYear()}</p>
        </div>
      </motion.div>
    </div>
  )
}
