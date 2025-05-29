"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Alert } from "@/components/ui/alert"
import { Info, Upload, Volume2, Clock, Wand2, Download, Settings2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion, AnimatePresence, useAnimation } from "framer-motion"

export default function MeditationAdjuster() {
  // State variables
  const [file, setFile] = useState<File | null>(null)
  const [originalBuffer, setOriginalBuffer] = useState<AudioBuffer | null>(null)
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [targetDuration, setTargetDuration] = useState<number>(20)
  const [silenceThreshold, setSilenceThreshold] = useState<number>(0.01)

  const [status, setStatus] = useState<{ message: string; type: string } | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string>("")
  const [processedUrl, setProcessedUrl] = useState<string>("")
  const [pausesAdjusted, setPausesAdjusted] = useState<number>(0)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [minSilenceDuration, setMinSilenceDuration] = useState<number>(3) // Default to 3 seconds
  const [minSpacingDuration, setMinSpacingDuration] = useState<number>(1.5) // Default to 1.5 seconds
  const [durationLimits, setDurationLimits] = useState<{ min: number; max: number } | null>(null)
  const [audioAnalysis, setAudioAnalysis] = useState<{
    totalSilence: number
    contentDuration: number
    silenceRegions: number
  } | null>(null)
  const [preserveNaturalPacing, setPreserveNaturalPacing] = useState<boolean>(true)
  const [compatibilityMode, setCompatibilityMode] = useState<string>("standard")
  const [actualDuration, setActualDuration] = useState<number | null>(null)
  const [isProcessingComplete, setIsProcessingComplete] = useState<boolean>(false)
  const [buttonText, setButtonText] = useState<string>("Process Audio")

  // Mobile optimization states
  const [isScrollLocked, setIsScrollLocked] = useState<boolean>(false)
  const [isMobileProcessing, setIsMobileProcessing] = useState<boolean>(false)
  const [processingProgress, setProcessingProgress] = useState<number>(0)
  const [processingStep, setProcessingStep] = useState<string>("")

  // Add these new state variables after the existing ones:
  const [processingState, setProcessingState] = useState<{
    step: string
    progress: number
    canResume: boolean
    savedData?: any
  } | null>(null)
  const [mobileMode, setMobileMode] = useState<boolean>(false)
  const [processingChunkSize, setProcessingChunkSize] = useState<number>(0)

  // Detect mobile device
  const isMobile =
    typeof window !== "undefined" &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

  // Keep-alive mechanism
  const keepAliveRef = useRef<NodeJS.Timeout | null>(null)
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 5 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  }

  const pulse = {
    initial: { scale: 1 },
    pulse: {
      scale: [1, 1.02, 1],
      transition: { duration: 0.4 },
    },
  }

  const buttonTap = {
    tap: { scale: 0.98, transition: { duration: 0.1 } },
  }

  const sliderControls = useAnimation()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadAreaRef = useRef<HTMLDivElement>(null)

  // Initialize audio context
  useEffect(() => {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    setAudioContext(new AudioContext())

    return () => {
      cleanupMemory()
      if (audioContext) {
        audioContext.close()
      }
      if (keepAliveRef.current) {
        clearInterval(keepAliveRef.current)
      }
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current)
      }
    }
  }, [])

  // Keep-alive mechanism to prevent browser timeout
  const startKeepAlive = () => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
    }

    keepAliveRef.current = setInterval(() => {
      // Send a small heartbeat to keep the browser alive
      console.log("Keep-alive heartbeat")

      // Force a small DOM update to keep the browser engaged
      const timestamp = Date.now()
      document.documentElement.setAttribute("data-timestamp", timestamp.toString())

      // Force garbage collection if available
      if (window.gc) {
        window.gc()
      }
    }, 2000) // Every 2 seconds
  }

  const stopKeepAlive = () => {
    if (keepAliveRef.current) {
      clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
  }

  // Emergency timeout handler
  const startProcessingTimeout = () => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current)
    }

    // Change the processing timeout from 60 seconds to 180 seconds
    processingTimeoutRef.current = setTimeout(() => {
      console.warn("Processing timeout - emergency cleanup")
      emergencyCleanup()
    }, 180000) // 180 second timeout for processing
  }

  const stopProcessingTimeout = () => {
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current)
      processingTimeoutRef.current = null
    }
  }

  const emergencyCleanup = () => {
    setIsProcessing(false)
    setIsMobileProcessing(false)
    unlockScroll()
    stopKeepAlive()
    stopProcessingTimeout()

    // Save current state for potential resume
    setProcessingState({
      step: processingStep,
      progress: processingProgress,
      canResume: false,
      savedData: null,
    })

    setStatus({
      message: "Processing timed out. Try using smaller files or enable mobile optimization mode.",
      type: "error",
    })

    // More aggressive cleanup
    cleanupMemory()

    // Force multiple garbage collections
    if (window.gc) {
      window.gc()
      setTimeout(() => window.gc && window.gc(), 100)
      setTimeout(() => window.gc && window.gc(), 500)
    }

    // Offer refresh as last resort
    setTimeout(() => {
      if (
        confirm(
          "The processing failed. Would you like to refresh the page to free up memory? (You'll need to re-upload your file)",
        )
      ) {
        window.location.reload()
      }
    }, 3000)
  }

  // Trigger animations when settings change
  useEffect(() => {
    if (originalBuffer) {
      sliderControls.start({
        scale: [1, 1.02, 1],
        transition: { duration: 0.5 },
      })
    }
  }, [targetDuration, silenceThreshold, minSilenceDuration, minSpacingDuration])

  // Reset processing complete state when settings change
  useEffect(() => {
    if (isProcessingComplete) {
      setIsProcessingComplete(false)
    }
  }, [
    targetDuration,
    silenceThreshold,
    minSilenceDuration,
    minSpacingDuration,
    preserveNaturalPacing,
    compatibilityMode,
  ])

  // Lock scroll during processing on mobile
  const lockScroll = () => {
    if (isMobile) {
      setIsScrollLocked(true)
      document.body.style.overflow = "hidden"
      document.body.style.position = "fixed"
      document.body.style.width = "100%"
      document.body.style.height = "100%"
      document.body.style.top = "0"
      document.body.style.left = "0"
    }
  }

  const unlockScroll = () => {
    if (isMobile) {
      setIsScrollLocked(false)
      document.body.style.overflow = ""
      document.body.style.position = ""
      document.body.style.width = ""
      document.body.style.height = ""
      document.body.style.top = ""
      document.body.style.left = ""
    }
  }

  // Prevent touch events during processing
  useEffect(() => {
    if (isMobileProcessing) {
      const preventTouch = (e: TouchEvent) => {
        if (e.touches.length > 1) {
          e.preventDefault()
        }
      }

      const preventScroll = (e: TouchEvent) => {
        e.preventDefault()
      }

      document.addEventListener("touchstart", preventTouch, { passive: false })
      document.addEventListener("touchmove", preventScroll, { passive: false })
      document.addEventListener("touchend", preventTouch, { passive: false })

      return () => {
        document.removeEventListener("touchstart", preventTouch)
        document.removeEventListener("touchmove", preventScroll)
        document.removeEventListener("touchend", preventTouch)
      }
    }
  }, [isMobileProcessing])

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) handleFile(selectedFile)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadAreaRef.current) {
      uploadAreaRef.current.classList.add("border-primary")
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadAreaRef.current) {
      uploadAreaRef.current.classList.remove("border-primary")
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (uploadAreaRef.current) {
      uploadAreaRef.current.classList.remove("border-primary")
    }
    const files = e.dataTransfer.files
    if (files.length > 0) handleFile(files[0])
  }

  const analyzeAudioForLimits = (buffer: AudioBuffer) => {
    // Detect silence regions with current settings
    const silenceRegions = detectSilenceRegions(buffer, silenceThreshold)
    const totalSilenceDuration = silenceRegions.reduce((sum, region) => sum + (region.end - region.start), 0)
    const audioContentDuration = buffer.duration - totalSilenceDuration

    // Calculate min and max possible durations
    const minPossibleDuration = Math.max(1, Math.ceil(audioContentDuration / 60)) // Allow extending from 1 minute minimum

    // Allow extending to up to 2 hours (120 minutes) regardless of original duration
    const maxPossibleDuration = 120 // 2 hours

    // Set duration limits
    setDurationLimits({
      min: minPossibleDuration,
      max: maxPossibleDuration,
    })

    // Set audio analysis info
    setAudioAnalysis({
      totalSilence: totalSilenceDuration,
      contentDuration: audioContentDuration,
      silenceRegions: silenceRegions.length,
    })

    // Adjust target duration if it's outside the new limits
    if (targetDuration < minPossibleDuration) {
      setTargetDuration(minPossibleDuration)
    } else if (targetDuration > maxPossibleDuration) {
      setTargetDuration(maxPossibleDuration)
    }

    return { minPossibleDuration, maxPossibleDuration, silenceRegions }
  }

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      setStatus({ message: "Please select a valid audio file.", type: "error" })
      return
    }

    // Mobile optimization: Lock scroll and disable interactions
    if (isMobile) {
      lockScroll()
      setIsMobileProcessing(true)
      startKeepAlive()
      startProcessingTimeout()
    }

    // Clean up previous session more aggressively
    cleanupMemory()

    // Force garbage collection on mobile
    if (isMobile && window.gc) {
      window.gc()
    }

    setFile(file)
    setProcessingProgress(0)
    setProcessingStep("Initializing...")

    // Reset states
    setDurationLimits(null)
    setAudioAnalysis(null)
    setProcessedUrl("")
    setProcessedBuffer(null)
    setActualDuration(null)

    try {
      setStatus({ message: "Loading audio file...", type: "info" })
      setProcessingStep("Loading audio file...")

      // Resume audio context if suspended
      if (audioContext && audioContext.state === "suspended") {
        await audioContext.resume()
      }

      await loadAudioFile(file)
    } catch (error) {
      setStatus({
        message: `Error loading audio file: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
    } finally {
      // Always unlock scroll and re-enable interactions
      if (isMobile) {
        unlockScroll()
        setIsMobileProcessing(false)
        stopKeepAlive()
        stopProcessingTimeout()
      }
    }
  }

  const loadAudioFile = async (file: File) => {
    if (!audioContext) return

    try {
      setProcessingStep("Reading file data...")
      setProcessingProgress(10)

      // For mobile, process file in much smaller chunks
      const chunkSize = isMobile ? 512 * 1024 : file.size // 512KB chunks on mobile
      let arrayBuffer: ArrayBuffer

      if (isMobile && file.size > chunkSize) {
        // Process in very small chunks for mobile
        const chunks: ArrayBuffer[] = []
        let offset = 0

        while (offset < file.size) {
          const chunk = file.slice(offset, offset + chunkSize)
          const chunkBuffer = await chunk.arrayBuffer()
          chunks.push(chunkBuffer)
          offset += chunkSize

          // Update progress and yield control more frequently
          const progress = Math.round((offset / file.size) * 50) + 10 // 10-60%
          setProcessingProgress(progress)
          setProcessingStep(`Reading file... ${Math.round((offset / file.size) * 100)}%`)

          // Longer yield time for mobile
          await new Promise((resolve) => setTimeout(resolve, 50))

          // Keep browser alive
          if (window.gc && offset % (chunkSize * 4) === 0) {
            window.gc()
          }
        }

        setProcessingStep("Combining file chunks...")
        setProcessingProgress(60)

        // Combine chunks with yielding
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
        arrayBuffer = new ArrayBuffer(totalLength)
        const uint8Array = new Uint8Array(arrayBuffer)
        let position = 0

        for (let i = 0; i < chunks.length; i++) {
          uint8Array.set(new Uint8Array(chunks[i]), position)
          position += chunks[i].byteLength

          // Yield every few chunks
          if (i % 4 === 0) {
            await new Promise((resolve) => setTimeout(resolve, 10))
          }
        }
      } else {
        arrayBuffer = await file.arrayBuffer()
      }

      setProcessingStep("Decoding audio data...")
      setProcessingProgress(70)

      // Add timeout for audio decoding
      const decodePromise = audioContext.decodeAudioData(arrayBuffer)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Audio decoding timeout")), 30000)
      })

      const buffer = (await Promise.race([decodePromise, timeoutPromise])) as AudioBuffer

      setProcessingStep("Analyzing audio structure...")
      setProcessingProgress(85)

      // Yield before analysis
      await new Promise((resolve) => setTimeout(resolve, 100))

      setOriginalBuffer(buffer)

      // Analyze audio and set duration limits
      const { minPossibleDuration, maxPossibleDuration } = analyzeAudioForLimits(buffer)

      setProcessingStep("Creating audio player...")
      setProcessingProgress(95)

      // Create URL for audio player
      if (originalUrl) URL.revokeObjectURL(originalUrl)
      const blob = new Blob([file], { type: file.type })
      const url = URL.createObjectURL(blob)
      setOriginalUrl(url)

      setProcessingProgress(100)
      setProcessingStep("Complete!")

      setStatus({
        message: `Audio loaded! You can adjust duration from ${minPossibleDuration} minutes up to 2 hours.`,
        type: "success",
      })
    } catch (error) {
      throw error
    }
  }

  // Re-analyze when silence detection settings change
  useEffect(() => {
    if (originalBuffer) {
      analyzeAudioForLimits(originalBuffer)
    }
  }, [silenceThreshold, minSilenceDuration])

  // Modify the processAudio function to explicitly set button text
  const processAudio = async () => {
    if (!originalBuffer || !audioContext) return

    // Mobile: Skip complex analysis and use simple approach
    if (isMobile) {
      setIsMobileProcessing(true)
      lockScroll()

      setProcessingProgress(0)
      setProcessingStep("Mobile: Starting simple processing...")

      try {
        setStatus({ message: "Using simplified mobile processing...", type: "info" })

        if (audioContext.state === "suspended") {
          await audioContext.resume()
        }

        setProcessingProgress(20)
        const targetDurationSeconds = targetDuration * 60

        setProcessingProgress(40)
        const processed = await rebuildAudioWithScaledPauses(
          originalBuffer,
          [], // Empty silence regions for mobile
          1,
          minSpacingDuration,
          false, // Simplified mobile mode
          targetDurationSeconds,
        )

        setProcessingProgress(80)
        setProcessedBuffer(processed)
        setActualDuration(processed.duration)

        const wavBlob = bufferToWav(processed, compatibilityMode === "high")
        const url = URL.createObjectURL(wavBlob)
        setProcessedUrl(url)

        setProcessingProgress(100)
        setProcessingStep("Mobile: Complete!")

        setStatus({
          message: `Mobile processing complete! Duration: ${formatDuration(processed.duration)}`,
          type: "success",
        })
        setIsProcessingComplete(true)
      } catch (error) {
        setStatus({
          message: `Mobile processing error: ${error instanceof Error ? error.message : "Unknown error"}`,
          type: "error",
        })
      } finally {
        setIsProcessing(false)
        setIsMobileProcessing(false)
        unlockScroll()
      }
      return
    }

    // Desktop processing (existing complex logic)
    // Mobile optimization: Lock scroll and disable interactions
    if (isMobile) {
      lockScroll()
      setIsMobileProcessing(true)
      startKeepAlive()
      startProcessingTimeout()
    }

    setProcessingProgress(0)
    setProcessingStep("Initializing processing...")

    try {
      setStatus({ message: "Processing audio...", type: "info" })

      // Resume audio context if suspended
      if (audioContext.state === "suspended") {
        await audioContext.resume()
      }

      setProcessingStep("Calculating target duration...")
      setProcessingProgress(10)
      await new Promise((resolve) => setTimeout(resolve, 100))

      const targetDurationSeconds = targetDuration * 60

      setProcessingStep("Detecting silence regions...")
      setProcessingProgress(20)
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Detect silence regions
      const silenceRegions = detectSilenceRegions(originalBuffer, silenceThreshold)

      setProcessingStep("Analyzing audio content...")
      setProcessingProgress(30)
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Calculate total content duration (non-silence)
      const totalSilenceDuration = silenceRegions.reduce((sum, region) => sum + (region.end - region.start), 0)
      const audioContentDuration = originalBuffer.duration - totalSilenceDuration

      // Calculate minimum required duration with minimum spacing
      const minSpacingTotal = silenceRegions.length * minSpacingDuration
      const minRequiredDuration = audioContentDuration + minSpacingTotal

      // Check if target duration is feasible with minimum spacing
      if (targetDurationSeconds < minRequiredDuration) {
        setStatus({
          message: `Using ${Math.ceil(minRequiredDuration / 60)} minutes (minimum required).`,
          type: "info",
        })
      }

      setProcessingStep("Calculating pause adjustments...")
      setProcessingProgress(40)
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Calculate available silence duration (target - content)
      const availableSilenceDuration = Math.max(targetDurationSeconds - audioContentDuration, minSpacingTotal)

      // Calculate scaling factor based on available silence
      const scaleFactor = availableSilenceDuration / totalSilenceDuration

      // Validate buffer
      if (!originalBuffer || !audioContext) {
        throw new Error("Audio buffer or context not available")
      }

      if (typeof originalBuffer.duration !== "number" || originalBuffer.duration <= 0) {
        throw new Error("Invalid audio buffer duration")
      }

      if (originalBuffer.numberOfChannels <= 0 || originalBuffer.sampleRate <= 0) {
        throw new Error("Invalid audio buffer properties")
      }

      setProcessingStep("Rebuilding audio with new pauses...")
      setProcessingProgress(50)

      // Create processed audio with mobile-optimized processing
      const processed = await rebuildAudioWithScaledPauses(
        originalBuffer,
        silenceRegions,
        scaleFactor,
        minSpacingDuration,
        preserveNaturalPacing,
        targetDurationSeconds,
      )

      setPausesAdjusted(silenceRegions.length)

      setProcessingStep("Cleaning up previous audio...")
      setProcessingProgress(85)
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Clean up previous processed buffer and URL
      if (processedBuffer) {
        setProcessedBuffer(null)
      }
      if (processedUrl) {
        URL.revokeObjectURL(processedUrl)
        setProcessedUrl("")
      }

      setProcessedBuffer(processed)
      setActualDuration(processed.duration)

      setProcessingStep("Creating download file...")
      setProcessingProgress(90)
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Create URL for processed audio
      const wavBlob = bufferToWav(processed, compatibilityMode === "high")
      const url = URL.createObjectURL(wavBlob)
      setProcessedUrl(url)

      setProcessingProgress(100)
      setProcessingStep("Complete!")

      const durationDiff = Math.abs(processed.duration - targetDurationSeconds)
      const durationPercent = (durationDiff / targetDurationSeconds) * 100

      if (durationPercent > 5) {
        setStatus({
          message: `Processing complete! Final duration: ${formatDuration(processed.duration)}`,
          type: "success",
        })
      } else {
        setStatus({ message: "Audio processing completed successfully!", type: "success" })
      }

      setIsProcessingComplete(true)

      // Suspend audio context to save memory
      setTimeout(() => {
        if (audioContext && audioContext.state !== "closed") {
          audioContext.suspend()
        }
      }, 1000)
    } catch (error) {
      setStatus({
        message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        type: "error",
      })
    } finally {
      setIsProcessing(false)
      // Always unlock scroll and re-enable interactions
      if (isMobile) {
        unlockScroll()
        setIsMobileProcessing(false)
        stopKeepAlive()
        stopProcessingTimeout()
      }
    }
  }

  const detectSilenceRegions = (buffer: AudioBuffer, threshold: number) => {
    const sampleRate = buffer.sampleRate
    const channelData = buffer.getChannelData(0) // Use first channel
    const minSilenceSamples = minSilenceDuration * sampleRate

    const silenceRegions: { start: number; end: number }[] = []
    let silenceStart: number | null = null
    let consecutiveSilentSamples = 0

    for (let i = 0; i < channelData.length; i++) {
      const amplitude = Math.abs(channelData[i])

      if (amplitude < threshold) {
        if (silenceStart === null) {
          silenceStart = i
        }
        consecutiveSilentSamples++
      } else {
        if (silenceStart !== null && consecutiveSilentSamples >= minSilenceSamples) {
          silenceRegions.push({
            start: silenceStart / sampleRate,
            end: i / sampleRate,
          })
        }
        silenceStart = null
        consecutiveSilentSamples = 0
      }
    }

    // Handle silence at the end
    if (silenceStart !== null && consecutiveSilentSamples >= minSilenceSamples) {
      silenceRegions.push({
        start: silenceStart / sampleRate,
        end: channelData.length / sampleRate,
      })
    }

    return silenceRegions
  }

  const rebuildAudioWithScaledPauses = async (
    originalBuffer: AudioBuffer,
    silenceRegions: { start: number; end: number }[],
    scaleFactor: number,
    minSpacing: number,
    preserveNaturalPacing: boolean,
    targetDuration: number,
  ) => {
    // Safety checks
    if (!originalBuffer || !audioContext) {
      throw new Error("Audio buffer or context not available")
    }

    const sampleRate = originalBuffer.sampleRate
    const numberOfChannels = originalBuffer.numberOfChannels

    // MOBILE SIMPLIFICATION: If on mobile, use a completely different, simple approach
    if (isMobile) {
      return await simpleMobileProcessing(originalBuffer, targetDuration)
    }

    // Keep the existing complex logic for desktop...
    // [rest of the original function unchanged for desktop]
    const originalSilenceDuration = silenceRegions.reduce((sum, region) => sum + (region.end - region.start), 0)
    const audioContentDuration = originalBuffer.duration - originalSilenceDuration

    const processedRegions = [...silenceRegions].map((region) => {
      const duration = region.end - region.start
      let newDuration = duration * scaleFactor
      if (newDuration < minSpacing) {
        newDuration = minSpacing
      }
      return {
        start: region.start,
        end: region.end,
        originalDuration: duration,
        newDuration: newDuration,
      }
    })

    if (preserveNaturalPacing && processedRegions.length > 1) {
      const shortestOriginal = Math.min(...processedRegions.map((r) => r.originalDuration))
      const longestOriginal = Math.max(...processedRegions.map((r) => r.originalDuration))

      if (longestOriginal > shortestOriginal * 1.5) {
        const totalNewSilence = processedRegions.reduce((sum, region) => sum + region.newDuration, 0)
        const targetTotalSilence = targetDuration - audioContentDuration

        if (totalNewSilence > 0 && targetTotalSilence > 0) {
          const adjustmentFactor = targetTotalSilence / totalNewSilence
          processedRegions.forEach((region) => {
            region.newDuration = Math.max(minSpacing, region.newDuration * adjustmentFactor)
          })
        }
      }
    }

    const targetTotalSilence = targetDuration - audioContentDuration
    let currentTotalSilence = processedRegions.reduce((sum, region) => sum + region.newDuration, 0)

    if (Math.abs(currentTotalSilence - targetTotalSilence) / targetTotalSilence > 0.02) {
      const adjustmentFactor = targetTotalSilence / currentTotalSilence
      const wouldViolateMinSpacing = processedRegions.some(
        (region) => region.newDuration * adjustmentFactor < minSpacing,
      )

      if (!wouldViolateMinSpacing) {
        processedRegions.forEach((region) => {
          region.newDuration *= adjustmentFactor
        })
        currentTotalSilence = processedRegions.reduce((sum, region) => sum + region.newDuration, 0)
      }
    }

    const newDuration = audioContentDuration + currentTotalSilence
    const newBuffer = audioContext!.createBuffer(numberOfChannels, Math.floor(newDuration * sampleRate), sampleRate)

    // Desktop processing with larger chunks
    for (let channel = 0; channel < numberOfChannels; channel++) {
      setProcessingStep(`Processing channel ${channel + 1}/${numberOfChannels}...`)

      const originalData = originalBuffer.getChannelData(channel)
      const newData = newBuffer.getChannelData(channel)
      const fadeLength = Math.floor(0.005 * sampleRate)

      let writeIndex = 0
      let readIndex = 0

      if (silenceRegions.length === 0) {
        newData.set(originalData)
        continue
      }

      if (silenceRegions[0].start > 0) {
        const samplesToCopy = Math.floor(silenceRegions[0].start * sampleRate)
        for (let i = 0; i < samplesToCopy; i++) {
          newData[writeIndex++] = originalData[readIndex++]
        }

        for (let i = Math.max(0, writeIndex - fadeLength); i < writeIndex; i++) {
          const fadePosition = (writeIndex - i) / fadeLength
          newData[i] *= fadePosition
        }
      }

      for (let i = 0; i < silenceRegions.length; i++) {
        const region = silenceRegions[i]
        const processedRegion = processedRegions[i]
        const regionEndSample = Math.floor(region.end * sampleRate)

        readIndex = regionEndSample
        const newSilenceLength = Math.floor(processedRegion.newDuration * sampleRate)

        for (let j = 0; j < newSilenceLength; j++) {
          newData[writeIndex++] = 0
        }

        const nextRegionStart =
          i < silenceRegions.length - 1 ? Math.floor(silenceRegions[i + 1].start * sampleRate) : originalData.length

        const segmentStart = writeIndex
        const segmentLength = nextRegionStart - readIndex

        for (let j = 0; j < segmentLength; j++) {
          if (writeIndex < newData.length && readIndex + j < originalData.length) {
            newData[writeIndex++] = originalData[readIndex + j]
          }
        }

        readIndex = nextRegionStart

        for (let j = 0; j < Math.min(fadeLength, writeIndex - segmentStart); j++) {
          const fadePosition = j / fadeLength
          newData[segmentStart + j] *= fadePosition
        }

        if (i < silenceRegions.length - 1) {
          for (let j = Math.max(0, writeIndex - fadeLength); j < writeIndex; j++) {
            const fadePosition = (writeIndex - j) / fadeLength
            newData[j] *= fadePosition
          }
        }
      }

      // Yield only occasionally on desktop
      if (channel % 1 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    }

    return newBuffer
  }

  // NEW: Ultra-simple mobile processing function
  const simpleMobileProcessing = async (originalBuffer: AudioBuffer, targetDurationSeconds: number) => {
    setProcessingStep("Mobile: Simple duration adjustment...")

    const sampleRate = originalBuffer.sampleRate
    const numberOfChannels = originalBuffer.numberOfChannels
    const originalDuration = originalBuffer.duration

    // Calculate how much silence to add/remove
    const durationDiff = targetDurationSeconds - originalDuration
    const numberOfPauses = Math.max(3, Math.min(10, Math.floor(originalDuration / 60))) // 3-10 pauses based on length
    const pauseAdjustment = durationDiff / numberOfPauses

    // If we need to shorten significantly, just speed up slightly instead
    if (durationDiff < -60) {
      setProcessingStep("Mobile: Slight speed adjustment...")
      return await simpleSpeedAdjust(originalBuffer, targetDurationSeconds / originalDuration)
    }

    // For extending or small adjustments, insert simple pauses
    const newDuration = Math.max(targetDurationSeconds, originalDuration + numberOfPauses * 0.5) // At least 0.5s per pause
    const newBuffer = audioContext!.createBuffer(numberOfChannels, Math.floor(newDuration * sampleRate), sampleRate)

    for (let channel = 0; channel < numberOfChannels; channel++) {
      setProcessingStep(`Mobile: Processing channel ${channel + 1}/${numberOfChannels}...`)

      const originalData = originalBuffer.getChannelData(channel)
      const newData = newBuffer.getChannelData(channel)

      const segmentSize = Math.floor(originalData.length / numberOfPauses)
      let writeIndex = 0

      for (let segment = 0; segment < numberOfPauses; segment++) {
        const segmentStart = segment * segmentSize
        const segmentEnd = segment === numberOfPauses - 1 ? originalData.length : (segment + 1) * segmentSize

        // Copy original segment
        for (let i = segmentStart; i < segmentEnd; i++) {
          if (writeIndex < newData.length) {
            newData[writeIndex++] = originalData[i]
          }
        }

        // Add pause (except after last segment)
        if (segment < numberOfPauses - 1) {
          const pauseSamples = Math.floor(Math.max(0.5, pauseAdjustment) * sampleRate)
          for (let i = 0; i < pauseSamples && writeIndex < newData.length; i++) {
            newData[writeIndex++] = 0
          }
        }

        // Yield every segment
        await new Promise((resolve) => setTimeout(resolve, 50))
      }
    }

    setProcessingStep("Mobile: Complete!")
    return newBuffer
  }

  // NEW: Simple speed adjustment for when we need to shorten significantly
  const simpleSpeedAdjust = async (originalBuffer: AudioBuffer, speedFactor: number) => {
    const sampleRate = originalBuffer.sampleRate
    const numberOfChannels = originalBuffer.numberOfChannels
    const newLength = Math.floor(originalBuffer.length / speedFactor)

    const newBuffer = audioContext!.createBuffer(numberOfChannels, newLength, sampleRate)

    for (let channel = 0; channel < numberOfChannels; channel++) {
      const originalData = originalBuffer.getChannelData(channel)
      const newData = newBuffer.getChannelData(channel)

      for (let i = 0; i < newLength; i++) {
        const sourceIndex = Math.floor(i * speedFactor)
        if (sourceIndex < originalData.length) {
          newData[i] = originalData[sourceIndex]
        }

        // Yield every 10000 samples
        if (i % 10000 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 10))
        }
      }
    }

    return newBuffer
  }

  const bufferToWav = (buffer: AudioBuffer, highCompatibility = false) => {
    // For high compatibility mode, use a standard sample rate
    const targetSampleRate = highCompatibility ? 44100 : buffer.sampleRate

    // Resample if needed for compatibility
    let resampledBuffer = buffer
    if (highCompatibility && buffer.sampleRate !== targetSampleRate) {
      resampledBuffer = resampleBuffer(buffer, targetSampleRate)
    }

    const length = resampledBuffer.length
    const numberOfChannels = resampledBuffer.numberOfChannels
    const sampleRate = resampledBuffer.sampleRate
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * 2)
    const view = new DataView(arrayBuffer)

    // WAV header
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
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numberOfChannels * 2, true)
    view.setUint16(32, numberOfChannels * 2, true)
    view.setUint16(34, 16, true) // 16-bit
    writeString(36, "data")
    view.setUint32(40, length * numberOfChannels * 2, true)

    // Convert float samples to 16-bit PCM
    let offset = 44
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, resampledBuffer.getChannelData(channel)[i]))
        view.setInt16(offset, sample * 0x7fff, true)
        offset += 2
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" })
  }

  // Function to resample audio buffer to a different sample rate
  const resampleBuffer = (buffer: AudioBuffer, targetSampleRate: number): AudioBuffer => {
    if (buffer.sampleRate === targetSampleRate) {
      return buffer
    }

    const sourceSampleRate = buffer.sampleRate
    const sourceLength = buffer.length
    const targetLength = Math.round((sourceLength * targetSampleRate) / sourceSampleRate)
    const numberOfChannels = buffer.numberOfChannels

    // Create a new buffer with the target sample rate
    const newBuffer = audioContext!.createBuffer(numberOfChannels, targetLength, targetSampleRate)

    // Process each channel
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sourceData = buffer.getChannelData(channel)
      const targetData = newBuffer.getChannelData(channel)

      // Simple linear interpolation for resampling
      for (let i = 0; i < targetLength; i++) {
        const sourceIndex = (i * sourceSampleRate) / targetSampleRate
        const sourceIndexFloor = Math.floor(sourceIndex)
        const sourceIndexCeil = Math.min(sourceLength - 1, Math.ceil(sourceIndex))
        const fraction = sourceIndex - sourceIndexFloor

        // Linear interpolation
        targetData[i] = (1 - fraction) * sourceData[sourceIndexFloor] + fraction * sourceData[sourceIndexCeil]
      }
    }

    return newBuffer
  }

  const postProcessAudio = (buffer: AudioBuffer): AudioBuffer => {
    // Simply return the buffer without any modifications
    // This preserves the original audio quality
    return buffer
  }

  const downloadProcessedAudio = () => {
    if (!processedBuffer || !file) return

    const wavBlob = bufferToWav(processedBuffer, compatibilityMode === "high")
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

  const cleanupMemory = () => {
    // Clean up audio buffers more aggressively
    setOriginalBuffer(null)
    setProcessedBuffer(null)

    // Revoke URLs immediately
    if (originalUrl) {
      URL.revokeObjectURL(originalUrl)
      setOriginalUrl("")
    }
    if (processedUrl) {
      URL.revokeObjectURL(processedUrl)
      setProcessedUrl("")
    }

    // Suspend audio context to free resources
    if (audioContext && audioContext.state !== "closed") {
      audioContext.suspend()
    }

    // Force garbage collection on mobile
    if (isMobile && window.gc) {
      window.gc()
    }

    // Clear any remaining references
    setTimeout(() => {
      if (window.gc) {
        window.gc()
      }
    }, 100)
  }

  // Add this new useEffect after the existing ones
  useEffect(() => {
    // Cleanup when switching between files or major setting changes
    return () => {
      if (processedUrl) {
        URL.revokeObjectURL(processedUrl)
      }
    }
  }, [file])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,#e9f5f3,#f0f8ff_30%,#f8f0ff_70%)] p-4 md:p-8">
      {/* Mobile Processing Overlay */}
      {isMobileProcessing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 m-4 text-center max-w-sm w-full">
            <div className="animate-spin h-8 w-8 border-4 border-teal-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-700 font-medium mb-2">{processingStep}</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              ></div>
            </div>
            <p className="text-gray-600 text-sm mb-2">{processingProgress}% complete</p>
            <p className="text-red-600 text-sm font-medium">⚠️ Please don't scroll or switch apps</p>
            <p className="text-gray-500 text-xs mt-2">This prevents crashes on mobile devices</p>
          </div>
        </div>
      )}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl mx-auto bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header with decorative elements */}
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
                Upload your audio and change the length of pauses to match your desired meditation duration! The app
                intelligently detects silence periods, scales them proportionally, and preserves spoken content.
              </p>
              <div className="mt-4 p-4 rounded-lg border border-pink-300 max-w-2xl mx-auto">
                <p className="text-sm text-pink-600 leading-relaxed">
                  <strong>Intro: </strong> This tool was originally designed for{" "}
                  <a
                    href="https://dharmaseed.org/teacher/210/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pink-500 hover:text-pink-600 underline font-medium hover:bg-pink-100 px-1 rounded transition-colors"
                  >
                    Rob Burbea's guided meditations
                  </a>
                  , though you may need to adjust the advanced settings for optimal results. Most guided meditations
                  should be compatible. Enjoy :) [Default settings currently work best with{" "}
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
          {/* Upload Area */}
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
              <div className="text-sm text-teal-600/70">Supports MP3, WAV, and OGG files</div>
            </motion.div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".mp3,.wav,.ogg,audio/*"
              onChange={handleFileSelect}
            />
          </motion.div>

          {/* File Info */}
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

          {/* Audio Analysis Info */}
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
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-2 md:grid-cols-4 gap-4"
                    >
                      <motion.div
                        variants={fadeIn}
                        whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        className="bg-white/60 p-3 rounded-lg text-center"
                      >
                        <div className="text-xs text-blue-500 uppercase tracking-wide mb-1">Content</div>
                        <div className="font-medium text-blue-800">{formatDuration(audioAnalysis.contentDuration)}</div>
                      </motion.div>
                      <motion.div
                        variants={fadeIn}
                        whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        className="bg-white/60 p-3 rounded-lg text-center"
                      >
                        <div className="text-xs text-blue-500 uppercase tracking-wide mb-1">Silence</div>
                        <div className="font-medium text-blue-800">{formatDuration(audioAnalysis.totalSilence)}</div>
                      </motion.div>
                      <motion.div
                        variants={fadeIn}
                        whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        className="bg-white/60 p-3 rounded-lg text-center"
                      >
                        <div className="text-xs text-blue-500 uppercase tracking-wide mb-1">Pauses</div>
                        <div className="font-medium text-blue-800">{audioAnalysis.silenceRegions}</div>
                      </motion.div>
                      <motion.div
                        variants={fadeIn}
                        whileHover={{ y: -2, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                        className="bg-white/60 p-3 rounded-lg text-center"
                      >
                        <div className="text-xs text-blue-500 uppercase tracking-wide mb-1">Range</div>
                        <div className="font-medium text-blue-800">{durationLimits.min} min to 2 hours</div>
                      </motion.div>
                    </motion.div>
                  </div>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
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
                  <motion.div
                    animate={sliderControls}
                    whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
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
                            max={durationLimits?.max || 120}
                            step={1}
                            onValueChange={(value) => {
                              setTargetDuration(value[0])
                              sliderControls.start("pulse")
                            }}
                            disabled={!durationLimits}
                            className="py-4"
                          />
                        </div>
                        <motion.div
                          variants={pulse}
                          animate={targetDuration ? "pulse" : "initial"}
                          className="text-center"
                        >
                          <span className="text-3xl font-light text-teal-700">{targetDuration}</span>
                          <span className="text-lg text-teal-600 ml-1">minutes</span>
                        </motion.div>
                        {durationLimits && (
                          <div className="text-center text-xs text-teal-500/70 mt-2">
                            Range: {durationLimits.min} min to 2 hours
                          </div>
                        )}
                        <div className="text-center text-xs text-teal-500/70 mt-2">
                          {targetDuration > originalBuffer?.duration / 60
                            ? "Extending meditation by scaling pauses"
                            : "Shortening meditation by adjusting pauses"}
                        </div>
                      </div>
                    </Card>
                  </motion.div>

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
                          min={0.5}
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
                          <p className="text-sm text-blue-700 mb-1">
                            Maintain the relative length of pauses (longer pauses stay longer)
                          </p>
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
                          <SelectItem value="high">High Compatibility</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-indigo-500/70 mt-2">
                        High Compatibility mode ensures better playback on devices like AirPods
                      </div>
                    </div>
                  </Card>
                  <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-orange-50 to-red-50">
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 py-3 px-6">
                      <h3 className="text-white font-medium">Mobile Optimization</h3>
                    </div>
                    <div className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-orange-700 mb-1">
                            Enable ultra-aggressive mobile optimization (slower but more stable)
                          </p>
                        </div>
                        <Switch
                          checked={mobileMode || isMobile}
                          onCheckedChange={setMobileMode}
                          disabled={isMobile}
                          className="data-[state=checked]:bg-orange-500"
                        />
                      </div>
                      {isMobile && (
                        <div className="text-xs text-orange-600 mt-2">Automatically enabled on mobile devices</div>
                      )}
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Process Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <motion.div
              whileTap={buttonTap.tap}
              whileHover={{ y: -2, boxShadow: "0 8px 20px rgba(0,0,0,0.1)", transition: { duration: 0.2 } }}
            >
              <Button
                className={`w-full py-7 text-lg font-medium tracking-wider rounded-xl shadow-lg transition-all border-none ${
                  isProcessing
                    ? "bg-gradient-to-r from-pink-400 to-pink-500"
                    : isProcessingComplete
                      ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                      : "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600"
                }`}
                disabled={!originalBuffer || isProcessing || !durationLimits}
                onClick={() => {
                  if (!isProcessing && originalBuffer) {
                    // Force immediate UI update before async processing
                    setIsProcessing(true)
                    // Use setTimeout to ensure the UI updates before processing starts
                    setTimeout(() => {
                      processAudio()
                    }, 50)
                  }
                }}
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
                    <span>Audio Processing...</span>
                  </div>
                )}
                {!isProcessing && isProcessingComplete && <span>Complete :)</span>}
                {!isProcessing && !isProcessingComplete && (
                  <div className="flex items-center justify-center">
                    <Wand2 className="mr-2 h-5 w-5" />
                    <span>Process Audio</span>
                  </div>
                )}
              </Button>
            </motion.div>
          </motion.div>

          {/* Status Message */}
          <AnimatePresence>
            {status && (
              <motion.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className={`p-4 rounded-xl mb-8 text-center shadow-sm overflow-hidden ${
                  status.type === "info"
                    ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border border-blue-200"
                    : status.type === "success"
                      ? "bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-gradient-to-r from-red-50 to-red-100 text-red-700 border border-red-200"
                }`}
              >
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  {status.message}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Audio Players */}
          <div className="space-y-6">
            {/* Original Audio */}
            {originalUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
              >
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

            {/* Processed Audio */}
            {processedUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileHover={{ y: -2, transition: { duration: 0.2 } }}
              >
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
                    <motion.div
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Button
                        className="w-full py-4 rounded-xl shadow-md bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 transition-all border-none"
                        onClick={downloadProcessedAudio}
                      >
                        <motion.div
                          className="flex items-center justify-center"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <Download className="mr-2 h-5 w-5" />
                          Download Processed Audio
                        </motion.div>
                      </Button>
                    </motion.div>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-400 pb-6">
          <p>abhī • Meditation Length Adjuster • {new Date().getFullYear()}</p>
        </div>
      </motion.div>
    </div>
  )
}
