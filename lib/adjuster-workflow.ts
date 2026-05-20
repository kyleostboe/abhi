import { bufferToWav, type BufferToWavMetadata } from "@/lib/audio-utils"
import { forceGarbageCollection, formatTime, sleep } from "@/lib/utils"

export type SilenceRegion = { start: number; end: number }

export interface DetectSilenceOptions {
  onProgress?: (progress: number) => void
  signal?: AbortSignal
  /**
   * Number of analysis windows to process before yielding to the event loop.
   * Lower numbers keep the UI responsive on mobile devices with slower CPUs.
   */
  yieldEvery?: number
}

export async function detectSilenceRegions(
  buffer: AudioBuffer,
  threshold: number,
  minDuration: number,
  options: DetectSilenceOptions = {},
): Promise<SilenceRegion[]> {
  const BUFFER_SECONDS = 0.3
  const sampleRate = buffer.sampleRate
  const channelData = buffer.getChannelData(0)
  const windowSize = Math.floor(sampleRate * 0.01)
  const minSamples = Math.floor(minDuration * sampleRate)
  const totalSamples = channelData.length

  const { onProgress, signal, yieldEvery = 200 } = options

  let processedSamples = 0
  let lastReportedProgress = -1

  const reportProgress = (progress: number) => {
    const rounded = Math.max(0, Math.min(100, Math.round(progress)))
    if (rounded !== lastReportedProgress) {
      lastReportedProgress = rounded
      onProgress?.(rounded)
    }
  }

  if (signal?.aborted) {
    throw typeof DOMException !== "undefined" ? new DOMException("Aborted", "AbortError") : new Error("Aborted")
  }

  if (totalSamples === 0) {
    reportProgress(100)
    return []
  }

  const regions: SilenceRegion[] = []
  let silenceStart = -1
  let consecutiveSilentSamples = 0

  reportProgress(0)

  for (let i = 0; i < channelData.length; i += windowSize) {
    if (signal?.aborted) {
      throw typeof DOMException !== "undefined" ? new DOMException("Aborted", "AbortError") : new Error("Aborted")
    }

    const windowEnd = Math.min(i + windowSize, channelData.length)
    let rms = 0

    for (let j = i; j < windowEnd; j++) {
      rms += channelData[j] * channelData[j]
    }
    rms = Math.sqrt(rms / (windowEnd - i))

    const isSilent = rms < threshold
    const timeSeconds = i / sampleRate

    if (isSilent) {
      if (silenceStart === -1) {
        silenceStart = timeSeconds
      }
      consecutiveSilentSamples += windowEnd - i
    } else if (silenceStart !== -1) {
      if (consecutiveSilentSamples >= minSamples) {
        const silenceEnd = windowEnd / sampleRate
        regions.push({ start: silenceStart, end: silenceEnd })
      }
      silenceStart = -1
      consecutiveSilentSamples = 0
    }

    processedSamples += windowEnd - i
    if (processedSamples > 0) {
      reportProgress((processedSamples / totalSamples) * 100)
    }

    if (yieldEvery > 0) {
      const windowIndex = Math.floor(i / Math.max(1, windowSize))
      if (windowIndex % yieldEvery === 0) {
        await sleep(0)
      }
    }
  }

  if (silenceStart !== -1 && consecutiveSilentSamples >= minSamples) {
    regions.push({ start: silenceStart, end: buffer.duration })
  }

  const bufferedRegions: SilenceRegion[] = []

  for (let i = 0; i < regions.length; i++) {
    const region = regions[i]
    let bufferedStart = region.start + BUFFER_SECONDS
    const bufferedEnd = region.end - BUFFER_SECONDS

    if (bufferedRegions.length > 0) {
      const prevRegion = bufferedRegions[bufferedRegions.length - 1]
      bufferedStart = Math.max(bufferedStart, prevRegion.end + BUFFER_SECONDS)
    }

    if (bufferedEnd > bufferedStart && bufferedEnd - bufferedStart >= minDuration) {
      bufferedRegions.push({ start: bufferedStart, end: bufferedEnd })
    }
  }

  reportProgress(100)
  return bufferedRegions
}

interface RebuildOptions {
  audioContext: AudioContext
  buffer: AudioBuffer
  regions: SilenceRegion[]
  scaleFactor: number
  targetTotalSilence: number
  pauseFloor: number
  contentSpeedMultiplier: number
  isMobileDevice: boolean
  onProgress?: (progress: number) => void
  onMemoryWarning?: () => void
}

/**
 * Uniform pause scaling with perceptual failsafes
 * 
 * Philosophy: Treat audio like fabric - scale ALL pauses uniformly to preserve
 * the original proportionality. Then apply physical/perceptual limits:
 * 
 * FLOOR: No pause below 0.3s (would stitch content together unnaturally)
 * CEILING: Short pauses (originally < 2s) shouldn't exceed ~2.5s (would tear content apart)
 * 
 * Any time borrowed/excess from clamped pauses is redistributed proportionally
 * to all unclamped pauses, preserving their ratios to each other.
 */
function calculateUniformScaledPauseDurations(
  regions: SilenceRegion[],
  scaleFactor: number,
  targetTotalSilence: number,
  pauseFloor: number, // user-set minimum pause duration (minSilenceDuration), 0.3s failsafe if 0
): { region: SilenceRegion; newDuration: number }[] {
  if (regions.length === 0) return []
  
  const currentTotalSilence = regions.reduce((sum, r) => sum + (r.end - r.start), 0)
  if (currentTotalSilence === 0) return regions.map(r => ({ region: r, newDuration: 0 }))

  // Perceptual limits
  const FLOOR = Math.max(0.3, pauseFloor) // User-set minimum, 0.3s absolute failsafe prevents stitching
  const SHORT_PAUSE_THRESHOLD = 2.0 // Pauses under this are considered "short"
  const SHORT_PAUSE_CEILING = 2.5 // Short pauses shouldn't grow beyond this
  
  // Step 1: Apply uniform scaling to all pauses
  const pauseData = regions.map(region => {
    const originalDuration = region.end - region.start
    const scaledDuration = originalDuration * scaleFactor
    return { 
      region, 
      originalDuration, 
      scaledDuration,
      finalDuration: scaledDuration,
      isClamped: false
    }
  })
  
  // Step 2: Apply perceptual clamps
  let totalBorrowedOrExcess = 0
  
  pauseData.forEach(pause => {
    const { originalDuration, scaledDuration } = pause
    let clampedDuration = scaledDuration
    
    // Floor: prevent stitching (applies to all pauses)
    if (scaledDuration < FLOOR) {
      clampedDuration = FLOOR
      pause.isClamped = true
    }
    
    // Ceiling: prevent short pauses from tearing content apart
    if (originalDuration < SHORT_PAUSE_THRESHOLD && scaledDuration > SHORT_PAUSE_CEILING) {
      clampedDuration = SHORT_PAUSE_CEILING
      pause.isClamped = true
    }
    
    if (pause.isClamped) {
      totalBorrowedOrExcess += scaledDuration - clampedDuration
      pause.finalDuration = clampedDuration
    }
  })
  
  // Step 3: Redistribute borrowed/excess time proportionally to unclamped pauses
  if (Math.abs(totalBorrowedOrExcess) > 0.01) {
    const unclampedPauses = pauseData.filter(p => !p.isClamped)
    
    if (unclampedPauses.length > 0) {
      // Calculate total scaled duration of unclamped pauses for proportional distribution
      const totalUnclampedScaled = unclampedPauses.reduce((sum, p) => sum + p.scaledDuration, 0)
      
      unclampedPauses.forEach(pause => {
        // Each unclamped pause gets a share proportional to its scaled size
        const share = pause.scaledDuration / totalUnclampedScaled
        const adjustment = totalBorrowedOrExcess * share
        pause.finalDuration = Math.max(FLOOR, pause.scaledDuration + adjustment)
      })
    } else {
      // Edge case: all pauses are clamped - distribute evenly to longest pauses
      const sortedByDuration = [...pauseData].sort((a, b) => b.originalDuration - a.originalDuration)
      const topHalf = sortedByDuration.slice(0, Math.max(1, Math.ceil(sortedByDuration.length / 2)))
      const adjustmentPerPause = totalBorrowedOrExcess / topHalf.length
      topHalf.forEach(pause => {
        pause.finalDuration = Math.max(FLOOR, pause.finalDuration + adjustmentPerPause)
      })
    }
  }
  
  return pauseData.map(p => ({ region: p.region, newDuration: p.finalDuration }))
}

export async function rebuildAudioWithScaledPauses({
  audioContext,
  buffer,
  regions,
  scaleFactor,
  targetTotalSilence,
  pauseFloor,
  contentSpeedMultiplier,
  isMobileDevice,
  onProgress = () => {},
  onMemoryWarning,
}: RebuildOptions): Promise<AudioBuffer> {
  onProgress(0)

  console.log("[v0] rebuildAudioWithScaledPauses called with contentSpeedMultiplier:", contentSpeedMultiplier)

  // Use uniform scaling with perceptual failsafes for natural rhythm preservation
  const processedRegions = calculateUniformScaledPauseDurations(regions, scaleFactor, targetTotalSilence, pauseFloor)

  const audioContentDuration = buffer.duration - regions.reduce((sum, r) => sum + (r.end - r.start), 0)
  const newSilenceDuration = processedRegions.reduce((sum, r) => sum + r.newDuration, 0)
  // Account for speed-up: content becomes shorter when sped up
  const effectiveContentDuration = audioContentDuration / contentSpeedMultiplier
  const newTotalDuration = effectiveContentDuration + newSilenceDuration

  console.log("[v0] audioContentDuration:", audioContentDuration, "effectiveContentDuration:", effectiveContentDuration, "newSilenceDuration:", newSilenceDuration, "newTotalDuration:", newTotalDuration)

  if (newTotalDuration <= 0) {
    throw new Error("Calculated new total duration is zero or negative.")
  }

  // For very long durations, warn the user
  if (newTotalDuration > 90 * 60) {
    onMemoryWarning?.()
    console.warn(`Long duration: Output duration ${formatTime(newTotalDuration)} - processing may take a while.`)
  }

  // Force garbage collection before allocating large buffer
  forceGarbageCollection()
  await sleep(100) // Give GC time to run

  let newBuffer: AudioBuffer
  try {
    // Output as mono to halve memory footprint
    // Use the input buffer's sample rate (which may already be reduced on mobile)
    const outputSampleRate = buffer.sampleRate
    const outputSamples = Math.max(1, Math.floor(newTotalDuration * outputSampleRate))
    
    newBuffer = audioContext.createBuffer(1, outputSamples, outputSampleRate)
  } catch (error) {
    forceGarbageCollection()
    throw new Error(
      `Failed to create output buffer (duration: ${newTotalDuration.toFixed(2)}s). Memory limit likely exceeded. Try a shorter target duration.`,
    )
  }

  onProgress(10)

  // Process single mono output channel
  const newData = newBuffer.getChannelData(0)
  let writeIndex = 0
  let readIndex = 0

  // Get mixed-down mono from all input channels with linear interpolation for fractional positions
  const channelData = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c))
  const totalSamples = Math.floor(buffer.duration * buffer.sampleRate)

  const getMonoSample = (sampleIndex: number): number => {
    const idx = Math.min(Math.floor(sampleIndex), totalSamples - 1)
    let sum = 0
    for (let c = 0; c < channelData.length; c++) sum += channelData[c][idx]
    return sum / channelData.length
  }

  // Linear interpolation for speed-up: reads fractional sample positions
  const getMonoSampleInterp = (pos: number): number => {
    const idx = Math.floor(pos)
    const frac = pos - idx
    if (frac === 0 || idx >= totalSamples - 1) return getMonoSample(idx)
    let s0 = 0, s1 = 0
    for (let c = 0; c < channelData.length; c++) {
      s0 += channelData[c][Math.min(idx, totalSamples - 1)]
      s1 += channelData[c][Math.min(idx + 1, totalSamples - 1)]
    }
    return (s0 + (s1 - s0) * frac) / channelData.length
  }

  // Copy speech segment from srcStart to srcEnd into output, applying speed multiplier
  const copySpeechSegment = (srcStart: number, srcEnd: number) => {
    if (srcEnd <= srcStart) return
    if (writeIndex >= newData.length) return // Safety: don't write past buffer
    
    if (Math.abs(contentSpeedMultiplier - 1.0) < 0.001) {
      // No speed change - direct copy
      for (let j = srcStart; j < srcEnd && writeIndex < newData.length; j++) {
        newData[writeIndex++] = getMonoSample(j)
      }
    } else {
      // Speed up: output fewer samples by stepping through source faster
      const srcLength = srcEnd - srcStart
      const outLength = Math.floor(srcLength / contentSpeedMultiplier)
      console.log("[v0] copySpeechSegment: srcLength:", srcLength, "outLength:", outLength, "multiplier:", contentSpeedMultiplier)
      for (let j = 0; j < outLength && writeIndex < newData.length; j++) {
        const srcPos = srcStart + j * contentSpeedMultiplier
        newData[writeIndex++] = getMonoSampleInterp(srcPos)
      }
    }
  }

  if (regions.length > 0 && regions[0].start > 0) {
    const samplesToCopy = Math.floor(regions[0].start * buffer.sampleRate)
    copySpeechSegment(readIndex, readIndex + samplesToCopy)
    readIndex += samplesToCopy
  }

  for (let i = 0; i < processedRegions.length; i++) {
    if (i % (isMobileDevice ? 5 : 10) === 0) {
      await sleep(0)
      onProgress(10 + Math.floor((i / Math.max(1, processedRegions.length)) * 80))
    }

    const { region, newDuration } = processedRegions[i]

    readIndex = Math.floor(region.end * buffer.sampleRate)

    const newSilenceLength = Math.floor(newDuration * buffer.sampleRate)
    for (let j = 0; j < newSilenceLength && writeIndex < newData.length; j++) {
      newData[writeIndex++] = 0
    }

    const nextRegionStart =
      i < processedRegions.length - 1 ? Math.floor(processedRegions[i + 1].region.start * buffer.sampleRate) : totalSamples

    const segmentStart = Math.max(readIndex, 0)
    const segmentEnd = Math.min(nextRegionStart, totalSamples)

    copySpeechSegment(segmentStart, segmentEnd)
    readIndex = segmentEnd
  }

  if (regions.length === 0) {
    copySpeechSegment(0, totalSamples)
  }

  // Trim the buffer to the actual amount written (in case of rounding discrepancies)
  if (writeIndex < newData.length) {
    const trimmedBuffer = audioContext.createBuffer(1, writeIndex, newBuffer.sampleRate)
    trimmedBuffer.getChannelData(0).set(newData.subarray(0, writeIndex))
    onProgress(100)
    return trimmedBuffer
  }

  onProgress(100)
  return newBuffer
}

interface AdjusterWorkflowSettings {
  targetDurationSeconds: number
  silenceThreshold: number
  minSilenceDuration: number
  maxSilenceDuration: number
  contentSpeedMultiplier: number // 1.0 = no change, 1.05-1.15 = subtle speedup for shrink boost
}

interface AdjusterWorkflowCallbacks {
  onProgress?: (progress: number) => void
  onStep?: (step: string) => void
  onMemoryWarning?: () => void
}

export interface AdjusterWorkflowResult {
  processedBuffer: AudioBuffer
  wavBlob: Blob
  wavMetadata: BufferToWavMetadata
  pausesAdjusted: number
  silenceRegions: SilenceRegion[]
  totalSilenceDuration: number
  audioContentDuration: number
  availableSilenceDuration: number
  scaleFactor: number
}

export async function runAdjusterWorkflow({
  audioContext,
  buffer,
  settings,
  isMobileDevice,
  callbacks = {},
}: {
  audioContext: AudioContext
  buffer: AudioBuffer
  settings: AdjusterWorkflowSettings
  isMobileDevice: boolean
  callbacks?: AdjusterWorkflowCallbacks
}): Promise<AdjusterWorkflowResult> {
  const {
    targetDurationSeconds,
    silenceThreshold,
    minSilenceDuration,
    maxSilenceDuration,
    contentSpeedMultiplier,
  } = settings
  const { onProgress = () => {}, onStep = () => {}, onMemoryWarning } = callbacks

  onStep("Detecting silence regions (step 1/4)...")
  onProgress(10)

  const silenceRegions = await detectSilenceRegions(buffer, silenceThreshold, minSilenceDuration)

  const cappedSilenceRegions = silenceRegions.map((region) => {
    if (maxSilenceDuration === 0) {
      return region
    }
    const duration = region.end - region.start
    if (duration > maxSilenceDuration) {
      return { start: region.start, end: region.start + maxSilenceDuration }
    }
    return region
  })

  onStep("Calculating adjustments (step 2/4)...")
  onProgress(25)

  const totalSilenceDuration = cappedSilenceRegions.reduce((sum, region) => sum + (region.end - region.start), 0)
  const audioContentDuration = buffer.duration - totalSilenceDuration
  // Speed-up reduces effective content duration, creating more room for pauses
  const effectiveContentDuration = audioContentDuration / contentSpeedMultiplier
  const pauseFloor = Math.max(0.3, minSilenceDuration)
  const availableSilenceDuration = Math.max(
    targetDurationSeconds - effectiveContentDuration,
    cappedSilenceRegions.length * pauseFloor,
  )
  const scaleFactor = totalSilenceDuration > 0 ? availableSilenceDuration / totalSilenceDuration : 1

  onStep("Rebuilding audio (step 3/4)...")
  onProgress(50)

  const processedAudioBuffer = await rebuildAudioWithScaledPauses({
    audioContext,
    buffer,
    regions: cappedSilenceRegions,
    scaleFactor,
    targetTotalSilence: availableSilenceDuration,
    pauseFloor,
    contentSpeedMultiplier,
    isMobileDevice,
    onProgress: (progress) => {
      const normalized = Math.max(0, Math.min(100, progress))
      onProgress(50 + Math.floor((normalized / 100) * 30))
    },
    onMemoryWarning,
  })

  onStep("Creating audio file (step 4/4)...")
  onProgress(80)

  const wavResult = await bufferToWav(processedAudioBuffer, {
    preferCompatibility: false,
    maxBytes: 48 * 1024 * 1024,
    isMobile: isMobileDevice,
    onProgress: (progress) => {
      const normalized = Math.max(0, Math.min(100, progress))
      onProgress(80 + Math.floor((normalized / 100) * 20))
    },
  })

  if (wavResult.blob.size === 0) {
    throw new Error("Generated WAV blob is empty. WAV conversion failed or resulted in no data.")
  }

  onProgress(100)
  onStep("Complete!")

  const { blob: wavBlob, ...wavMetadata } = wavResult

  return {
    processedBuffer: processedAudioBuffer,
    wavBlob,
    wavMetadata,
    pausesAdjusted: cappedSilenceRegions.length,
    silenceRegions: cappedSilenceRegions,
    totalSilenceDuration,
    audioContentDuration,
    availableSilenceDuration,
    scaleFactor,
  }
}
