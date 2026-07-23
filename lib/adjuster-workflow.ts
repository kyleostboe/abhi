import {
  encodeDistributionAudio,
  getDistributionMaxBytes,
  type AudioExportFormat,
  type AudioFormatMetadata,
} from "@/lib/audio-utils"
import { forceGarbageCollection, formatTime, sleep } from "@/lib/utils"

export type SilenceRegion = { start: number; end: number }

/**
 * WSOLA (Waveform Similarity Overlap-Add) time-stretch.
 * Speeds up `input` by `tempo` (e.g. 1.25) without changing pitch.
 * Returns a new Float32Array containing the time-stretched audio.
 *
 * Algorithm:
 *  - Divide input into overlapping frames spaced `step` samples apart (in INPUT time)
 *  - For each frame, find the best-matching position within a seek window
 *  - Overlap-add frames into output spaced `frameLen - overlapLen` apart (in OUTPUT time)
 *  - Net effect: output plays faster by `tempo` with same pitch
 */
function wsolaTimeStretch(input: Float32Array, tempo: number, sampleRate: number): Float32Array {
  if (Math.abs(tempo - 1.0) < 0.001) return input.slice()

  // Parameters tuned for speech clarity
  const overlapMs   = 12   // ms — crossfade length between consecutive frames
  const frameMs     = 40   // ms — total frame length (overlap + body)
  const seekMs      = 14   // ms — half-width of seek window for best-match

  const overlapLen  = Math.round(sampleRate * overlapMs  / 1000)
  const frameLen    = Math.round(sampleRate * frameMs    / 1000)
  const seekHalf    = Math.round(sampleRate * seekMs     / 1000)

  // In output time, each frame advances by (frameLen - overlapLen) samples
  const outputStep  = frameLen - overlapLen
  // In input time, each frame advances by outputStep * tempo
  const inputStep   = outputStep * tempo

  const outputLen   = Math.max(1, Math.floor(input.length / tempo))
  const output      = new Float32Array(outputLen)
  // Track how much each output sample has been accumulated (for proper OLA normalisation)
  const weight      = new Float32Array(outputLen)

  // Raised-cosine (Hann) window — guarantees unity gain across overlap-add
  const hannWin = new Float32Array(frameLen)
  for (let i = 0; i < frameLen; i++) {
    hannWin[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (frameLen - 1)))
  }

  // Cross-correlate a window of `overlapLen` samples from `refPos` in output
  // against candidates near `nominalPos` in input to find best splice point
  const findBestPos = (nominalPos: number, refPos: number): number => {
    let bestScore = -Infinity
    let bestPos   = nominalPos
    const lo = Math.max(0,                          nominalPos - seekHalf)
    const hi = Math.min(input.length - frameLen,    nominalPos + seekHalf)
    for (let p = lo; p <= hi; p++) {
      let score = 0
      for (let k = 0; k < overlapLen; k++) {
        // Compare the tail of what we've already written (output[refPos+k] / weight)
        // against the start of the candidate frame in input
        const outSample = weight[refPos + k] > 0 ? output[refPos + k] / weight[refPos + k] : 0
        score += outSample * input[p + k]
      }
      if (score > bestScore) { bestScore = score; bestPos = p }
    }
    return bestPos
  }

  let inputPos  = 0   // current nominal read position in input (float)
  let outputPos = 0   // current write position in output

  while (outputPos < outputLen) {
    const nom    = Math.round(inputPos)
    const refOut = Math.max(0, outputPos - overlapLen)

    // Find best-matching frame start near `nom`
    const srcPos = (nom + seekHalf < input.length - frameLen)
      ? findBestPos(nom, refOut)
      : Math.min(nom, input.length - frameLen)

    // Overlap-add this frame into output with Hann window
    for (let k = 0; k < frameLen && outputPos - overlapLen + k < outputLen; k++) {
      const outIdx = outputPos - overlapLen + k
      if (outIdx < 0) continue
      const w = hannWin[k]
      output[outIdx] += input[srcPos + k] * w
      weight[outIdx] += w
    }

    inputPos  += inputStep
    outputPos += outputStep
  }

  // Normalise: divide by accumulated Hann weights to get unity gain
  for (let i = 0; i < outputLen; i++) {
    if (weight[i] > 1e-6) output[i] /= weight[i]
  }

  return output
}

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
  // Pull each detected pause boundary inward by this much before returning it, so soft
  // speech onsets and trailing breaths sitting right at the edges are never scaled as if
  // they were silence. Kept modest — 0.3s (the previous value) audibly clipped breaths;
  // ~120ms protects the edges without eating into the real pause.
  const BUFFER_SECONDS = 0.12
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

  // Hysteresis: a pause STARTS when the level drops below `threshold`, and only ENDS when
  // the level rises clearly back above it (threshold * EXIT_RATIO). A brief blip that stays
  // under the exit level — a breath, a soft consonant tail, the quiet part of a word's decay
  // — won't chop one pause into two, which is what produced audible choppiness before. The
  // enter level is unchanged, so pause *starts* are detected exactly as before; only spurious
  // mid-pause splits are suppressed. Kept conservative so real speech still ends a pause
  // promptly (speech RMS is typically well above threshold * EXIT_RATIO).
  const EXIT_RATIO = 1.5

  const regions: SilenceRegion[] = []
  let silenceStart = -1
  let consecutiveSilentSamples = 0
  let inSilence = false

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

    const timeSeconds = i / sampleRate

    if (!inSilence) {
      if (rms < threshold) {
        inSilence = true
        silenceStart = timeSeconds
        consecutiveSilentSamples = windowEnd - i
      }
    } else if (rms > threshold * EXIT_RATIO) {
      // Level has clearly returned to speech — close the current pause.
      if (consecutiveSilentSamples >= minSamples) {
        regions.push({ start: silenceStart, end: timeSeconds })
      }
      inSilence = false
      silenceStart = -1
      consecutiveSilentSamples = 0
    } else {
      // Still within the pause (including the quiet decay between the enter/exit levels).
      consecutiveSilentSamples += windowEnd - i
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

  if (inSilence && consecutiveSilentSamples >= minSamples) {
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

export interface SuggestedSilenceThreshold {
  threshold: number
  /** Estimated average background-noise RMS level during pauses. */
  noiseFloor: number
  /** Estimated average RMS level of spoken audio. */
  speechLevel: number
}

/**
 * Estimates a good silenceThreshold by measuring the same per-window RMS values
 * detectSilenceRegions uses, then splitting them into a quiet cluster (background noise
 * during pauses) and a loud cluster (spoken audio) via Otsu's method — the standard
 * algorithm for finding the threshold that best separates a bimodal distribution into two
 * groups, applied here in log space since noise floor and speech level are usually
 * separated by an order of magnitude or more rather than a linear amount.
 *
 * Runs the RMS scan in chunks with a `sleep(0)` between them (mirroring
 * detectSilenceRegions' yielding) since a single pass over a 30-45+ minute file's samples is
 * enough synchronous work to visibly freeze the tab — previously this ran in one blocking
 * call, which is very likely why the button could feel like it "didn't work" on longer files.
 */
export async function suggestSilenceThreshold(buffer: AudioBuffer): Promise<SuggestedSilenceThreshold | null> {
  const sampleRate = buffer.sampleRate
  const channelData = buffer.getChannelData(0)
  const windowSize = Math.floor(sampleRate * 0.01) // match detectSilenceRegions' 10ms window
  if (channelData.length === 0 || windowSize <= 0) return null

  const rmsValues: number[] = []
  let windowIndex = 0
  for (let i = 0; i < channelData.length; i += windowSize) {
    const windowEnd = Math.min(i + windowSize, channelData.length)
    let sumSquares = 0
    for (let j = i; j < windowEnd; j++) {
      sumSquares += channelData[j] * channelData[j]
    }
    rmsValues.push(Math.sqrt(sumSquares / (windowEnd - i)))
    windowIndex++
    if (windowIndex % 20000 === 0) await sleep(0)
  }
  if (rmsValues.length < 4) return null

  // Exclude true digital-silence frames (dead zeros and near-zeros, below ~-80 dBFS) before
  // analysis. Many produced meditation tracks contain long stretches of literal silence, which
  // otherwise pile into a huge spike at the quiet end and drag the whole estimate down to the
  // clamp floor — the reason "Suggest" could return a uselessly tiny value on such files. Fall
  // back to the full set if almost everything is that quiet, so we never analyse too few frames.
  const DIGITAL_SILENCE_FLOOR = 1e-4 // -80 dBFS
  const audibleValues = rmsValues.filter((v) => v >= DIGITAL_SILENCE_FLOOR)
  const valuesForAnalysis = audibleValues.length >= 4 ? audibleValues : rmsValues

  const EPSILON = 1e-6
  const logValues = valuesForAnalysis.map((v) => Math.log10(Math.max(v, EPSILON))).sort((a, b) => a - b)

  // Use the 1st/99th percentile as the histogram's range instead of the literal min/max — a
  // single outlier window (a click/pop, or a moment of true digital silence far quieter than
  // the rest) would otherwise stretch the range enough to blur out the real noise/speech
  // split, which is a likely source of suggestions that vary unpredictably between files.
  const percentile = (p: number) => logValues[Math.min(logValues.length - 1, Math.floor(p * logValues.length))]
  const minLog = percentile(0.01)
  const maxLog = percentile(0.99)
  if (maxLog - minLog < 1e-6) return null // uniform signal (dead silence / constant tone) — no split to find

  const BIN_COUNT = 256
  const histogram = new Array(BIN_COUNT).fill(0)
  const binWidth = (maxLog - minLog) / BIN_COUNT
  for (const v of logValues) {
    const bin = Math.min(BIN_COUNT - 1, Math.max(0, Math.floor((v - minLog) / binWidth)))
    histogram[bin]++
  }

  const total = logValues.length
  let sum = 0
  for (let i = 0; i < BIN_COUNT; i++) sum += i * histogram[i]

  let sumBackground = 0
  let weightBackground = 0
  let maxBetweenVariance = 0
  // Cleanly-separated clusters (the common case here — background noise and speech are
  // usually an order of magnitude or more apart) leave a run of empty bins between them.
  // Every bin in that empty run scores an identical between-class variance, since the
  // histogram doesn't change while weightBackground/weightForeground hold steady — so
  // tracking only the *first* bin to hit the max (as a plain running-max search would) lands
  // the split right at the noise cluster's edge instead of the middle of the real gap. Track
  // the whole tied plateau and use its midpoint instead.
  let bestBinStart = 0
  let bestBinEnd = 0

  for (let i = 0; i < BIN_COUNT; i++) {
    weightBackground += histogram[i]
    if (weightBackground === 0) continue
    const weightForeground = total - weightBackground
    if (weightForeground === 0) break

    sumBackground += i * histogram[i]
    const meanBackground = sumBackground / weightBackground
    const meanForeground = (sum - sumBackground) / weightForeground

    const betweenVariance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2
    if (betweenVariance > maxBetweenVariance + 1e-9) {
      maxBetweenVariance = betweenVariance
      bestBinStart = i
      bestBinEnd = i
    } else if (Math.abs(betweenVariance - maxBetweenVariance) <= 1e-9 && betweenVariance > 0) {
      bestBinEnd = i
    }
  }

  const bestBin = Math.round((bestBinStart + bestBinEnd) / 2)
  const otsuLog = minLog + (bestBin + 0.5) * binWidth
  const belowLog = logValues.filter((v) => v <= otsuLog)
  const aboveLog = logValues.filter((v) => v > otsuLog)
  const average = (values: number[], fallback: number) =>
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : fallback

  const noiseLog = average(belowLog, minLog)
  const speechLog = average(aboveLog, maxLog)

  // Place the threshold at the midpoint between the noise and speech clusters (in log space),
  // squarely in the quiet gap that separates them: low enough below speech that words aren't
  // clipped (helped further by detection's edge padding), high enough above the noise floor to
  // actually flag pauses — rather than hugging the noise floor as a harder bias toward it did.
  const thresholdLog = (noiseLog + speechLog) / 2

  return {
    threshold: 10 ** thresholdLog,
    noiseFloor: 10 ** noiseLog,
    speechLevel: 10 ** speechLog,
  }
}

interface RebuildOptions {
  audioContext: AudioContext
  buffer: AudioBuffer
  regions: SilenceRegion[]
  uncappedSilenceDuration: number
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
export function calculateUniformScaledPauseDurations(
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

/**
 * Writes a single rebuilt pause of `targetLen` samples into `out` starting at `writeIndex`,
 * drawing real room tone from the original pause audio `src[pStart..pEnd)` instead of digital
 * silence. Returns the new write index.
 *
 *  - Shrinking (targetLen <= origLen): keep the phrase's decay tail from the front of the
 *    pause and the pre-phrase inhale from the back, joined by an equal-power crossfade of the
 *    quiet interior. The gap sounds like a real pause instead of a dropout.
 *  - Extending (targetLen > origLen): put the real decay at the front and the real inhale at
 *    the back with silence in the elongated middle (how a genuinely long pause actually
 *    sounds), with short linear edge fades so the silence seams are click-free.
 *
 * Pure array math — no AudioContext/DOM — and always writes exactly `targetLen` samples
 * (subject to the `out` bound), so downstream duration accounting is unchanged.
 */
function writePause(
  src: Float32Array,
  pStart: number,
  pEnd: number,
  targetLen: number,
  out: Float32Array,
  writeIndex: number,
  sampleRate: number,
): number {
  if (targetLen <= 0) return writeIndex
  const origLen = pEnd - pStart

  // No usable source room tone (shouldn't happen for a real detected pause) — fall back to
  // silence, matching the previous behaviour.
  if (origLen <= 0) {
    for (let j = 0; j < targetLen && writeIndex < out.length; j++) out[writeIndex++] = 0
    return writeIndex
  }

  if (targetLen <= origLen) {
    const cf = Math.min(Math.round(sampleRate * 0.12), Math.floor(targetLen / 2))
    const half = Math.floor((targetLen - cf) / 2)
    const cfLen = targetLen - 2 * half // exact remainder — total written == targetLen

    // Front: decay tail from the very start of the pause.
    for (let k = 0; k < half && writeIndex < out.length; k++) {
      out[writeIndex++] = src[pStart + k]
    }
    // Middle: equal-power crossfade from interior-after-decay into interior-before-inhale.
    for (let k = 0; k < cfLen && writeIndex < out.length; k++) {
      const a = src[pStart + half + k]
      const b = src[pEnd - half - cfLen + k]
      const t = cfLen > 1 ? k / (cfLen - 1) : 0
      out[writeIndex++] = a * Math.sqrt(1 - t) + b * Math.sqrt(t)
    }
    // Back: inhale from the very end of the pause.
    for (let k = 0; k < half && writeIndex < out.length; k++) {
      out[writeIndex++] = src[pEnd - half + k]
    }
  } else {
    const frontLen = Math.floor(origLen / 2)
    const backLen = origLen - frontLen
    const gap = targetLen - frontLen - backLen // > 0 — total written == targetLen
    const fade = Math.min(Math.round(sampleRate * 0.01), frontLen, backLen)

    for (let k = 0; k < frontLen && writeIndex < out.length; k++) {
      let s = src[pStart + k]
      if (fade > 0 && k >= frontLen - fade) s *= (frontLen - k) / fade
      out[writeIndex++] = s
    }
    for (let k = 0; k < gap && writeIndex < out.length; k++) out[writeIndex++] = 0
    for (let k = 0; k < backLen && writeIndex < out.length; k++) {
      let s = src[pEnd - backLen + k]
      if (fade > 0 && k < fade) s *= k / fade
      out[writeIndex++] = s
    }
  }

  return writeIndex
}

export async function rebuildAudioWithScaledPauses({
  audioContext,
  buffer,
  regions,
  uncappedSilenceDuration,
  scaleFactor,
  targetTotalSilence,
  pauseFloor,
  contentSpeedMultiplier,
  isMobileDevice,
  onProgress = () => {},
  onMemoryWarning,
}: RebuildOptions): Promise<AudioBuffer> {
  onProgress(0)

  // Use uniform scaling with perceptual failsafes for natural rhythm preservation
  const processedRegions = calculateUniformScaledPauseDurations(regions, scaleFactor, targetTotalSilence, pauseFloor)

  // Use uncapped silence duration so capped silence isn't mistakenly counted as content
  const audioContentDuration = buffer.duration - uncappedSilenceDuration
  const newSilenceDuration = processedRegions.reduce((sum, r) => sum + r.newDuration, 0)
  // Account for speed-up: content becomes shorter when sped up
  const effectiveContentDuration = audioContentDuration / contentSpeedMultiplier
  const newTotalDuration = effectiveContentDuration + newSilenceDuration

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

  // Mix down to mono once up front
  const channelData = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c))
  const totalSamples = Math.floor(buffer.duration * buffer.sampleRate)

  const monoSource = new Float32Array(totalSamples)
  for (let i = 0; i < totalSamples; i++) {
    let sum = 0
    for (let c = 0; c < channelData.length; c++) sum += channelData[c][i]
    monoSource[i] = sum / channelData.length
  }

  // If speed > 1x, WSOLA-stretch the entire buffer once so state is continuous
  // (no per-segment restarts that cause clicks/static at boundaries).
  // Speech segments will be read from stretchedSource; silences are written as zeros directly.
  const needsStretch = Math.abs(contentSpeedMultiplier - 1.0) > 0.001
  const stretchedSource = needsStretch
    ? wsolaTimeStretch(monoSource, contentSpeedMultiplier, buffer.sampleRate)
    : monoSource

  // Process single mono output channel
  const newData = newBuffer.getChannelData(0)
  let writeIndex = 0
  let readIndex = 0  // tracks position in ORIGINAL buffer (samples)

  // Copy speech segment from original buffer range [srcStart, srcEnd).
  // Maps to the corresponding range in stretchedSource via the speed multiplier.
  const copySpeechSegment = (srcStart: number, srcEnd: number) => {
    if (srcEnd <= srcStart) return
    if (writeIndex >= newData.length) return

    if (!needsStretch) {
      for (let j = srcStart; j < srcEnd && writeIndex < newData.length; j++) {
        newData[writeIndex++] = monoSource[j]
      }
    } else {
      // Map original sample positions to stretched buffer positions
      const stretchedStart = Math.floor(srcStart / contentSpeedMultiplier)
      const stretchedEnd = Math.floor(srcEnd / contentSpeedMultiplier)
      for (let j = stretchedStart; j < stretchedEnd && writeIndex < newData.length; j++) {
        newData[writeIndex++] = j < stretchedSource.length ? stretchedSource[j] : 0
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
    // Rebuild the pause from its own room tone (decay tail + inhale) rather than writing
    // digital silence, so shortened gaps sound like real pauses. Pauses are drawn from the
    // unstretched mono source and are never time-stretched themselves.
    writeIndex = writePause(
      monoSource,
      Math.max(0, Math.floor(region.start * buffer.sampleRate)),
      Math.min(totalSamples, Math.floor(region.end * buffer.sampleRate)),
      newSilenceLength,
      newData,
      writeIndex,
      buffer.sampleRate,
    )

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

/**
 * Appends silence to the end of a buffer. Used as a fallback when the target duration is
 * longer than pure pause-scaling can reach — e.g. audio with few or no natural pauses to
 * stretch (calculateUniformScaledPauseDurations has nothing to work with if there are no
 * silence regions at all). Unlike shrinking, which has a real floor set by how much pause
 * time exists to remove, extending has no such limit: there's always room to add more
 * silence, so this guarantees the target is reachable regardless of the source audio's shape.
 */
function appendTrailingSilence(audioContext: AudioContext, buffer: AudioBuffer, extraSeconds: number): AudioBuffer {
  if (extraSeconds <= 0) return buffer

  const extraSamples = Math.round(extraSeconds * buffer.sampleRate)
  let extended: AudioBuffer
  try {
    extended = audioContext.createBuffer(buffer.numberOfChannels, buffer.length + extraSamples, buffer.sampleRate)
  } catch (error) {
    throw new Error(
      `Failed to extend audio to the target duration. Memory limit likely exceeded. Try a shorter target duration.`,
    )
  }
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    extended.getChannelData(channel).set(buffer.getChannelData(channel))
    // Remaining samples are already zero-initialized (silence) by createBuffer.
  }
  return extended
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

export interface AdjusterFeasibility {
  /** Seconds of spoken content (everything that isn't a detected pause). */
  speechTotal: number
  /** Seconds of detected pause (uncapped). */
  pauseTotal: number
  /** Number of detected pauses. */
  pauseCount: number
  /** Shortest reachable output given the pause floor — targets below this can't be honored. */
  minAchievable: number
  /** Practical longest output (extending appends silence up to a soft memory ceiling). */
  maxAchievable: number
}

/** Practical upper bound on output length — matches the long-duration memory-warning point. */
const PRACTICAL_MAX_SECONDS = 90 * 60

/**
 * Pre-flight feasibility for a source + detection result, so a target duration can be
 * validated (and a length slider's range set) BEFORE any audio is rebuilt. Pure data in,
 * pure data out — no AudioContext/DOM — so it is safe to call from anywhere, including
 * straight after detection to bound the UI.
 */
export function computeFeasibility(params: {
  bufferDuration: number
  silenceRegions: SilenceRegion[]
  minSilenceDuration: number
  contentSpeedMultiplier?: number
}): AdjusterFeasibility {
  const { bufferDuration, silenceRegions, minSilenceDuration, contentSpeedMultiplier = 1 } = params
  const pauseTotal = silenceRegions.reduce((sum, r) => sum + (r.end - r.start), 0)
  const speechTotal = Math.max(0, bufferDuration - pauseTotal)
  const effectiveContent = speechTotal / (contentSpeedMultiplier || 1)
  const pauseFloor = Math.max(0.3, minSilenceDuration)
  const minAchievable = effectiveContent + silenceRegions.length * pauseFloor
  return {
    speechTotal,
    pauseTotal,
    pauseCount: silenceRegions.length,
    minAchievable,
    maxAchievable: Math.max(minAchievable, PRACTICAL_MAX_SECONDS),
  }
}

export interface AdjusterWorkflowResult {
  processedBuffer: AudioBuffer
  distributionBlob: Blob
  distributionMetadata: AudioFormatMetadata
  pausesAdjusted: number
  silenceRegions: SilenceRegion[]
  totalSilenceDuration: number
  audioContentDuration: number
  availableSilenceDuration: number
  scaleFactor: number
  /** Pre-flight feasibility for this source + detection settings (see computeFeasibility). */
  feasibility: AdjusterFeasibility
}

export async function runAdjusterWorkflow({
  audioContext,
  buffer,
  settings,
  isMobileDevice,
  exportFormat = "opus",
  callbacks = {},
  precomputedSilenceRegions,
}: {
  audioContext: AudioContext
  buffer: AudioBuffer
  settings: AdjusterWorkflowSettings
  isMobileDevice: boolean
  exportFormat?: AudioExportFormat
  callbacks?: AdjusterWorkflowCallbacks
  /**
   * Pause map from a previous detection on the SAME buffer at the SAME threshold/minDuration.
   * When supplied, detection is skipped and this map is reused — so changing only the target
   * length re-solves and re-assembles without re-scanning the audio. The caller owns
   * invalidation: pass this only when silenceThreshold and minSilenceDuration are unchanged.
   */
  precomputedSilenceRegions?: SilenceRegion[]
}): Promise<AdjusterWorkflowResult> {
  const {
    targetDurationSeconds,
    silenceThreshold,
    minSilenceDuration,
    maxSilenceDuration,
    contentSpeedMultiplier,
  } = settings
  const { onProgress = () => {}, onStep = () => {}, onMemoryWarning } = callbacks

  const reusingPauseMap = precomputedSilenceRegions !== undefined
  onStep(reusingPauseMap ? "Reusing pause map (step 1/4)..." : "Detecting silence regions (step 1/4)...")
  onProgress(10)

  const silenceRegions = reusingPauseMap
    ? precomputedSilenceRegions!
    : await detectSilenceRegions(buffer, silenceThreshold, minSilenceDuration)

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
  // Use original uncapped silence to get true content duration (capped time is still silence, not content)
  const uncappedSilenceDuration = silenceRegions.reduce((sum, region) => sum + (region.end - region.start), 0)
  const audioContentDuration = buffer.duration - uncappedSilenceDuration
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

  let processedAudioBuffer = await rebuildAudioWithScaledPauses({
    audioContext,
    buffer,
    regions: cappedSilenceRegions,
    uncappedSilenceDuration,
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

  // If we're extending beyond the original length, pure pause-scaling may not fully reach
  // the target (e.g. little or no natural silence to stretch). Top up with trailing silence
  // so extending always works — this never applies when shrinking, which has a real floor.
  if (targetDurationSeconds > buffer.duration) {
    const shortfallSeconds = targetDurationSeconds - processedAudioBuffer.duration
    if (shortfallSeconds > 1) {
      processedAudioBuffer = appendTrailingSilence(audioContext, processedAudioBuffer, shortfallSeconds)
    }
  }

  onStep("Compressing audio (step 4/4)...")
  onProgress(80)

  const { blob: distributionBlob, format: distributionMetadata } = await encodeDistributionAudio(processedAudioBuffer, {
    format: exportFormat,
    maxBytes: getDistributionMaxBytes(exportFormat),
    bitrate: 96000,
    onProgress: (progress) => {
      const normalized = Math.max(0, Math.min(100, progress))
      onProgress(80 + Math.floor((normalized / 100) * 20))
    },
  })

  onProgress(100)
  onStep("Complete!")

  const feasibility = computeFeasibility({
    bufferDuration: buffer.duration,
    silenceRegions,
    minSilenceDuration,
    contentSpeedMultiplier,
  })

  return {
    processedBuffer: processedAudioBuffer,
    distributionBlob,
    distributionMetadata,
    pausesAdjusted: cappedSilenceRegions.length,
    silenceRegions: cappedSilenceRegions,
    totalSilenceDuration,
    audioContentDuration,
    availableSilenceDuration,
    scaleFactor,
    feasibility,
  }
}
