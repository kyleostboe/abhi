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
  isMobileDevice: boolean
  onProgress?: (progress: number) => void
  onMemoryWarning?: () => void
}

/**
 * Weighted pause scaling algorithm that preserves natural rhythm
 * 
 * Key insight: The maximum pause extension should be proportional to the duration change.
 * If extending 1.5x, longest pauses can be 1.5x longer. If extending 2x, they can be 2x longer.
 * Short pauses remain protected to maintain conversational rhythm.
 * 
 * This works for BOTH extending and shrinking:
 * - Extending: Long pauses grow by scaleFactor, short pauses stay natural
 * - Shrinking: Long pauses shrink by scaleFactor, short pauses protected from becoming too short
 */
function calculateWeightedPauseDurations(
  regions: SilenceRegion[],
  scaleFactor: number,
  targetTotalSilence: number,
): { region: SilenceRegion; newDuration: number }[] {
  if (regions.length === 0) return []
  
  const currentTotalSilence = regions.reduce((sum, r) => sum + (r.end - r.start), 0)
  if (currentTotalSilence === 0) return regions.map(r => ({ region: r, newDuration: 0 }))
  
  // Classify pauses and assign weights
  // Longer pauses get exponentially more weight
  const pauseData = regions.map(region => {
    const duration = region.end - region.start
    let weight: number
    
    if (duration < 1) {
      // Short pauses: minimal weight (protected from large changes)
      weight = 0.5
    } else if (duration < 3) {
      // Medium pauses: moderate weight
      weight = 1.0 + (duration - 1) * 0.5 // 1.0 to 2.0
    } else {
      // Long pauses: high weight (absorb most change)
      weight = 2.0 + (duration - 3) * 0.3 // 2.0+
    }
    
    return { region, duration, weight }
  })
  
  const totalWeight = pauseData.reduce((sum, p) => sum + p.duration * p.weight, 0)
  
  // Calculate new durations based on weighted distribution
  const isExtending = scaleFactor > 1
  const isShrinking = scaleFactor < 1
  
  const result = pauseData.map(({ region, duration, weight }) => {
    let newDuration: number
    
    if (Math.abs(scaleFactor - 1) < 0.01) {
      // No significant change requested
      newDuration = duration
    } else {
      // Calculate this pause's share of the total change
      const weightedShare = (duration * weight) / totalWeight
      const totalChange = targetTotalSilence - currentTotalSilence
      const thisChange = totalChange * weightedShare
      
      newDuration = duration + thisChange
      
      // Apply constraints based on direction
      if (isExtending) {
        // When extending, cap short pause growth proportionally
        if (duration < 1) {
          // Short pauses: max growth is limited, but scaled with overall change
          // If extending 1.5x overall, short pauses grow max 1.2x
          // If extending 2x overall, short pauses grow max 1.3x
          const maxMultiplier = 1 + (Math.min(scaleFactor, 2) - 1) * 0.2
          newDuration = Math.min(newDuration, duration * maxMultiplier)
        }
        // Minimum duration is the original
        newDuration = Math.max(newDuration, duration * 0.8)
      } else if (isShrinking) {
        // When shrinking, protect short pauses from becoming too short
        if (duration < 1) {
          newDuration = Math.max(newDuration, duration * 0.7) // Keep at least 70% for short pauses
        }
        // Absolute minimum of 0.3s for any pause
        newDuration = Math.max(newDuration, 0.3)
      }
      
      // Apply maximum multiplier cap based on scale factor for long pauses
      if (duration >= 3) {
        const maxMultiplier = scaleFactor
        newDuration = Math.min(newDuration, duration * maxMultiplier)
      }
    }
    
    return { region, newDuration: Math.max(0.1, newDuration) }
  })
  
  // Redistribute any excess/deficit from capped pauses to uncapped ones
  const actualTotal = result.reduce((sum, r) => sum + r.newDuration, 0)
  const difference = targetTotalSilence - actualTotal
  
  if (Math.abs(difference) > 0.1) {
    // Find pauses that can absorb the difference (long pauses)
    const adjustablePauses = result.filter(r => {
      const originalDuration = r.region.end - r.region.start
      return originalDuration >= 3 // Only adjust long pauses
    })
    
    if (adjustablePauses.length > 0) {
      const adjustmentPerPause = difference / adjustablePauses.length
      adjustablePauses.forEach(p => {
        p.newDuration = Math.max(0.5, p.newDuration + adjustmentPerPause)
      })
    }
  }
  
  return result
}
}

export async function rebuildAudioWithScaledPauses({
  audioContext,
  buffer,
  regions,
  scaleFactor,
  targetTotalSilence,
  isMobileDevice,
  onProgress = () => {},
  onMemoryWarning,
}: RebuildOptions): Promise<AudioBuffer> {
  onProgress(0)

  // Use weighted scaling algorithm for natural rhythm preservation
  const processedRegions = calculateWeightedPauseDurations(regions, scaleFactor, targetTotalSilence)

  const audioContentDuration = buffer.duration - regions.reduce((sum, r) => sum + (r.end - r.start), 0)
  const newSilenceDuration = processedRegions.reduce((sum, r) => sum + r.newDuration, 0)
  const newTotalDuration = audioContentDuration + newSilenceDuration

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
    const estimatedMB = (outputSamples * 4) / (1024 * 1024)
    
    console.log(`[v0] Creating output buffer: ${outputSamples} samples @ ${outputSampleRate}Hz (~${estimatedMB.toFixed(1)}MB) for ${(newTotalDuration / 60).toFixed(1)} minutes`)
    
    newBuffer = audioContext.createBuffer(1, outputSamples, outputSampleRate)
    console.log("[v0] Output buffer created successfully")
  } catch (error) {
    console.error("[v0] Failed to create output buffer:", error)
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

  // Get mixed-down mono from all input channels
  const getMonoSample = (sampleIndex: number): number => {
    let sum = 0
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      sum += buffer.getChannelData(channel)[sampleIndex]
    }
    return sum / buffer.numberOfChannels
  }

  const totalSamples = Math.floor(buffer.duration * buffer.sampleRate)

  if (regions.length > 0 && regions[0].start > 0) {
    const samplesToCopy = Math.floor(regions[0].start * buffer.sampleRate)
    for (let i = 0; i < samplesToCopy && writeIndex < newData.length; i++) {
      newData[writeIndex++] = getMonoSample(readIndex++)
    }
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

    for (let j = segmentStart; j < segmentEnd && writeIndex < newData.length; j++) {
      newData[writeIndex++] = getMonoSample(j)
    }

    readIndex = segmentEnd
  }

  if (regions.length === 0) {
    for (let i = 0; i < totalSamples && writeIndex < newData.length; i++) {
      newData[writeIndex++] = getMonoSample(i)
    }
  }

  onProgress(100)
  return newBuffer
}

interface AdjusterWorkflowSettings {
  targetDurationSeconds: number
  silenceThreshold: number
  minSilenceDuration: number
  maxSilenceDuration: number
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
  // Calculate the target total silence - minimum is 0.3s per pause (built into weighted algorithm)
  const availableSilenceDuration = Math.max(
    targetDurationSeconds - audioContentDuration,
    cappedSilenceRegions.length * 0.3, // Minimum 0.3s per pause
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
