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
  minSpacingDuration: number
  preserveNaturalPacing: boolean
  targetTotalSilence: number
  isMobileDevice: boolean
  onProgress?: (progress: number) => void
  onMemoryWarning?: () => void
}

export async function rebuildAudioWithScaledPauses({
  audioContext,
  buffer,
  regions,
  scaleFactor,
  minSpacingDuration,
  preserveNaturalPacing,
  targetTotalSilence,
  isMobileDevice,
  onProgress = () => {},
  onMemoryWarning,
}: RebuildOptions): Promise<AudioBuffer> {
  onProgress(0)

  let dynamicScale = scaleFactor
  if (!preserveNaturalPacing && regions.length > 0) {
    const currentTotalSilence = regions.reduce((sum, r) => sum + (r.end - r.start), 0)
    dynamicScale = currentTotalSilence > 0 ? targetTotalSilence / currentTotalSilence : 1
    if (!Number.isFinite(dynamicScale) || dynamicScale <= 0) dynamicScale = 1
  }

  const processedRegions = regions.map((region) => {
    const duration = region.end - region.start
    const newDuration = preserveNaturalPacing
      ? Math.max(duration * dynamicScale, minSpacingDuration)
      : regions.length > 0
        ? Math.max(minSpacingDuration, targetTotalSilence / regions.length)
        : minSpacingDuration
    return { ...region, newDuration }
  })

  const audioContentDuration = buffer.duration - regions.reduce((sum, r) => sum + (r.end - r.start), 0)
  const newSilenceDuration = processedRegions.reduce((sum, r) => sum + r.newDuration, 0)
  const newTotalDuration = audioContentDuration + newSilenceDuration

  if (newTotalDuration <= 0) {
    throw new Error("Calculated new total duration is zero or negative.")
  }

  if (isMobileDevice && newTotalDuration > 45 * 60) {
    onMemoryWarning?.()
    console.warn(`Mobile device: Output duration ${formatTime(newTotalDuration)} may cause issues.`)
  }

  let newBuffer: AudioBuffer
  try {
    newBuffer = audioContext.createBuffer(
      buffer.numberOfChannels,
      Math.max(1, Math.floor(newTotalDuration * buffer.sampleRate)),
      buffer.sampleRate,
    )
  } catch (error) {
    forceGarbageCollection()
    throw new Error(
      `Failed to create output buffer (duration: ${newTotalDuration.toFixed(2)}s). Memory limit likely exceeded. Try a shorter target duration.`,
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
      for (let i = 0; i < samplesToCopy && writeIndex < newData.length; i++) {
        newData[writeIndex++] = originalData[readIndex++]
      }
    }

    for (let i = 0; i < regions.length; i++) {
      if (i % (isMobileDevice ? 5 : 10) === 0) {
        await sleep(0)
        onProgress(10 + Math.floor((i / Math.max(1, regions.length)) * 80))
      }

      const region = regions[i]
      const processedRegion = processedRegions[i]

      readIndex = Math.floor(region.end * buffer.sampleRate)

      const newSilenceLength = Math.floor(processedRegion.newDuration * buffer.sampleRate)
      for (let j = 0; j < newSilenceLength && writeIndex < newData.length; j++) {
        newData[writeIndex++] = 0
      }

      const nextRegionStart =
        i < regions.length - 1 ? Math.floor(regions[i + 1].start * buffer.sampleRate) : totalSamples

      const segmentStart = Math.max(readIndex, 0)
      const segmentEnd = Math.min(nextRegionStart, totalSamples)

      for (let j = segmentStart; j < segmentEnd && writeIndex < newData.length; j++) {
        newData[writeIndex++] = originalData[j]
      }

      readIndex = segmentEnd
    }

    if (regions.length === 0) {
      for (let i = 0; i < totalSamples && writeIndex < newData.length; i++) {
        newData[writeIndex++] = originalData[i]
      }
    }
  }

  onProgress(100)
  return newBuffer
}

interface AdjusterWorkflowSettings {
  targetDurationSeconds: number
  silenceThreshold: number
  minSilenceDuration: number
  minSpacingDuration: number
  preserveNaturalPacing: boolean
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
    minSpacingDuration,
    preserveNaturalPacing,
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
  const availableSilenceDuration = Math.max(
    targetDurationSeconds - audioContentDuration,
    cappedSilenceRegions.length * minSpacingDuration,
  )
  const scaleFactor = totalSilenceDuration > 0 ? availableSilenceDuration / totalSilenceDuration : 1

  onStep("Rebuilding audio (step 3/4)...")
  onProgress(50)

  const processedAudioBuffer = await rebuildAudioWithScaledPauses({
    audioContext,
    buffer,
    regions: cappedSilenceRegions,
    scaleFactor,
    minSpacingDuration,
    preserveNaturalPacing,
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
