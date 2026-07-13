/**
 * VAD Worker – runs Silero VAD via @ricky0123/vad-web (NonRealTimeVAD)
 * on mono 16 kHz PCM, processed in chunks to avoid OOM on long files.
 *
 * Also supports Otsu threshold calculation for the "manual mode" auto-suggest.
 *
 * Messages FROM main thread:
 *   { type: 'RUN_VAD',  pcm: Float32Array, sampleRate: 16000, positiveSpeechThreshold: 0.5,
 *                        negativeSpeechThreshold: 0.35, minSilenceMs: 500 }
 *   { type: 'COMPUTE_OTSU', pcm: Float32Array (any SR), sampleRate: number }
 *
 * Messages TO main thread:
 *   { type: 'PROGRESS', progress: 0-100 }
 *   { type: 'VAD_RESULT', regions: Array<{start,end}> }
 *   { type: 'OTSU_RESULT', threshold: number }
 *   { type: 'ERROR', message: string }
 */

// ---------------------------------------------------------------------------
// VAD via @ricky0123/vad-web (loaded from CDN / bundled bundle.min.js)
// We inline the NonRealTimeVAD processing so the worker stays self-contained.
// The ONNX runtime wasm lives in /vad/ which the worker can fetch via relative URL.
// ---------------------------------------------------------------------------

const FRAME_SAMPLES = 512   // Silero VAD legacy uses 512-sample frames at 16 kHz
const TARGET_SR    = 16000

// Silero VAD model location (served from Next.js public folder)
const MODEL_URL = '/vad/silero_vad_legacy.onnx'

// We load ort lazily once per worker lifetime
let ortModule = null

async function getOrt() {
  if (ortModule) return ortModule
  // onnxruntime-web ESM entry point
  const { InferenceSession, Tensor } = await import('/vad/ort-wasm-simd-threaded.mjs').catch(() => null) || {}
  if (!InferenceSession) {
    // Fallback: try the global scope if somehow pre-loaded
    throw new Error('onnxruntime-web ESM not available in worker')
  }
  ortModule = { InferenceSession, Tensor }
  return ortModule
}

// ---------------------------------------------------------------------------
// Simple linear resampler (Float32Array) – fast enough for a worker
// ---------------------------------------------------------------------------
function resampleMono(pcm, fromSR, toSR) {
  if (fromSR === toSR) return pcm
  const ratio      = toSR / fromSR
  const outLen     = Math.floor(pcm.length * ratio)
  const out        = new Float32Array(outLen)
  const invRatio   = 1 / ratio
  for (let i = 0; i < outLen; i++) {
    const srcIdx = i * invRatio
    const lo     = Math.floor(srcIdx)
    const frac   = srcIdx - lo
    const hi     = Math.min(lo + 1, pcm.length - 1)
    out[i]       = pcm[lo] * (1 - frac) + pcm[hi] * frac
  }
  return out
}

// ---------------------------------------------------------------------------
// Run Silero VAD via ONNX Runtime directly (no @ricky0123 framework in worker)
// ---------------------------------------------------------------------------
async function runVAD(pcm16k, positiveSpeechThreshold, negativeSpeechThreshold, minSilenceMs) {
  const { InferenceSession, Tensor } = await getOrt()

  // Fetch model
  postMessage({ type: 'PROGRESS', progress: 2 })
  const modelResponse = await fetch(MODEL_URL)
  if (!modelResponse.ok) throw new Error(`Failed to fetch VAD model: ${modelResponse.status}`)
  const modelBuffer = await modelResponse.arrayBuffer()
  postMessage({ type: 'PROGRESS', progress: 8 })

  const session = await InferenceSession.create(modelBuffer, {
    executionProviders: ['wasm'],
  })
  postMessage({ type: 'PROGRESS', progress: 12 })

  // Silero V1 legacy state: h (2,1,64) and c (2,1,64) both zeros
  let h = new Float32Array(2 * 1 * 64)
  let c = new Float32Array(2 * 1 * 64)

  const TOTAL_FRAMES = Math.floor(pcm16k.length / FRAME_SAMPLES)
  // Speech probability for each frame
  const probs = new Float32Array(TOTAL_FRAMES)

  for (let frameIdx = 0; frameIdx < TOTAL_FRAMES; frameIdx++) {
    const frame = pcm16k.subarray(frameIdx * FRAME_SAMPLES, (frameIdx + 1) * FRAME_SAMPLES)

    const inputTensor = new Tensor('float32', frame, [1, FRAME_SAMPLES])
    const srTensor    = new Tensor('int64',   BigInt64Array.from([BigInt(TARGET_SR)]), [])
    const hTensor     = new Tensor('float32', h, [2, 1, 64])
    const cTensor     = new Tensor('float32', c, [2, 1, 64])

    const results = await session.run({
      input:      inputTensor,
      sr:         srTensor,
      h:          hTensor,
      c:          cTensor,
    })

    probs[frameIdx] = results.output.data[0]
    // Update LSTM state
    h = results.hn.data
    c = results.cn.data

    if (frameIdx % 200 === 0) {
      const pct = 12 + Math.floor((frameIdx / TOTAL_FRAMES) * 78)
      postMessage({ type: 'PROGRESS', progress: pct })
      // Yield to event loop every ~200 frames
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  postMessage({ type: 'PROGRESS', progress: 90 })

  // ---------------------------------------------------------------------------
  // Convert per-frame probabilities → speech/pause regions
  // Merge frames into contiguous speech segments; pauses < minSilenceMs are ignored
  // ---------------------------------------------------------------------------
  const frameDurationMs = (FRAME_SAMPLES / TARGET_SR) * 1000
  const minSilenceFrames = Math.ceil(minSilenceMs / frameDurationMs)

  // Threshold each frame
  const isSpeech = new Uint8Array(TOTAL_FRAMES)
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    isSpeech[i] = probs[i] >= positiveSpeechThreshold ? 1 : 0
  }

  // Build raw speech segments
  const speechSegments = [] // [{start, end}] in seconds
  let inSpeech = false
  let segStart = 0

  for (let i = 0; i <= TOTAL_FRAMES; i++) {
    const speaking = i < TOTAL_FRAMES ? isSpeech[i] === 1 : false

    if (!inSpeech && speaking) {
      inSpeech  = true
      segStart  = i
    } else if (inSpeech && !speaking) {
      // Check if pause leading to here is >= minSilenceFrames before ending segment
      // We use a forward-look to decide: is the gap until next speech >= minSilenceFrames?
      let gapLen = 0
      let j = i
      while (j < TOTAL_FRAMES && isSpeech[j] === 0) {
        gapLen++
        j++
      }

      if (gapLen >= minSilenceFrames || j === TOTAL_FRAMES) {
        // Real end of speech segment
        speechSegments.push({
          start: segStart * FRAME_SAMPLES / TARGET_SR,
          end:   i       * FRAME_SAMPLES / TARGET_SR,
        })
        inSpeech = false
      }
      // else: gap is too short, don't break the segment
    }
  }

  // Derive PAUSE regions (the complement of speech segments)
  // We want the same shape as detectSilenceRegions output: regions where audio is quiet
  const totalDuration = pcm16k.length / TARGET_SR
  const pauseRegions = []

  // Before first speech segment
  if (speechSegments.length === 0) {
    // All silence
    pauseRegions.push({ start: 0, end: totalDuration })
  } else {
    if (speechSegments[0].start > 0.5) {
      pauseRegions.push({ start: 0, end: speechSegments[0].start })
    }
    for (let i = 0; i < speechSegments.length - 1; i++) {
      const gapStart = speechSegments[i].end
      const gapEnd   = speechSegments[i + 1].start
      if (gapEnd - gapStart >= minSilenceMs / 1000) {
        pauseRegions.push({ start: gapStart, end: gapEnd })
      }
    }
    const lastEnd = speechSegments[speechSegments.length - 1].end
    if (totalDuration - lastEnd > 0.5) {
      pauseRegions.push({ start: lastEnd, end: totalDuration })
    }
  }

  // Apply 0.3s buffer to each pause region (same as detectSilenceRegions)
  const BUFFER = 0.3
  const bufferedRegions = []
  for (const r of pauseRegions) {
    const bufferedStart = r.start + BUFFER
    const bufferedEnd   = r.end   - BUFFER
    if (bufferedEnd - bufferedStart >= minSilenceMs / 1000) {
      // Ensure no overlap with previous region
      if (bufferedRegions.length > 0) {
        const prev = bufferedRegions[bufferedRegions.length - 1]
        const adjustedStart = Math.max(bufferedStart, prev.end + BUFFER)
        if (bufferedEnd > adjustedStart) {
          bufferedRegions.push({ start: adjustedStart, end: bufferedEnd })
        }
      } else {
        bufferedRegions.push({ start: bufferedStart, end: bufferedEnd })
      }
    }
  }

  postMessage({ type: 'PROGRESS', progress: 100 })
  return bufferedRegions
}

// ---------------------------------------------------------------------------
// Otsu's method on RMS loudness histogram to auto-suggest silence threshold
// (for manual mode; runs on any-SR mono PCM, much lighter than VAD)
// ---------------------------------------------------------------------------
function computeOtsuThreshold(pcm, sampleRate) {
  const WINDOW_SIZE = Math.floor(sampleRate * 0.01) // 10ms windows
  const NUM_BINS    = 256

  // Collect RMS values
  const rmsValues = []
  for (let i = 0; i < pcm.length; i += WINDOW_SIZE) {
    const end = Math.min(i + WINDOW_SIZE, pcm.length)
    let sum = 0
    for (let j = i; j < end; j++) {
      sum += pcm[j] * pcm[j]
    }
    rmsValues.push(Math.sqrt(sum / (end - i)))
  }

  if (rmsValues.length === 0) return 0.025

  const maxRms    = Math.max(...rmsValues)
  if (maxRms === 0) return 0.025
  const normalized = rmsValues.map(v => v / maxRms)

  // Build histogram
  const hist = new Float64Array(NUM_BINS)
  for (const v of normalized) {
    const bin = Math.min(Math.floor(v * NUM_BINS), NUM_BINS - 1)
    hist[bin]++
  }
  const total = normalized.length
  for (let i = 0; i < NUM_BINS; i++) hist[i] /= total

  // Otsu's criterion
  let bestThresh = 0
  let bestVar    = -1
  let sumAll     = 0
  for (let i = 0; i < NUM_BINS; i++) sumAll += i * hist[i]

  let w0 = 0, sum0 = 0
  for (let t = 0; t < NUM_BINS - 1; t++) {
    w0   += hist[t]
    sum0 += t * hist[t]
    const w1 = 1 - w0
    if (w0 <= 0 || w1 <= 0) continue
    const mu0    = sum0 / w0
    const mu1    = (sumAll - sum0) / w1
    const varBet = w0 * w1 * (mu0 - mu1) * (mu0 - mu1)
    if (varBet > bestVar) {
      bestVar    = varBet
      bestThresh = t
    }
  }

  // Convert from normalized bin index back to RMS scale, then to absolute
  const normalizedThresh = bestThresh / NUM_BINS
  const absoluteThresh   = normalizedThresh * maxRms
  // Clamp to the existing slider range [0.001, 0.05]
  return Math.max(0.001, Math.min(0.05, absoluteThresh))
}

// ---------------------------------------------------------------------------
// Message handler
// ---------------------------------------------------------------------------
self.onmessage = async (event) => {
  const { type } = event.data

  try {
    if (type === 'RUN_VAD') {
      const { pcm, sampleRate, positiveSpeechThreshold = 0.5, negativeSpeechThreshold = 0.35, minSilenceMs = 500 } = event.data

      postMessage({ type: 'PROGRESS', progress: 0 })

      // Resample to 16 kHz if needed
      let pcm16k = pcm
      if (sampleRate !== TARGET_SR) {
        postMessage({ type: 'PROGRESS', progress: 1 })
        pcm16k = resampleMono(pcm, sampleRate, TARGET_SR)
      }

      const regions = await runVAD(pcm16k, positiveSpeechThreshold, negativeSpeechThreshold, minSilenceMs)
      postMessage({ type: 'VAD_RESULT', regions })
    }

    if (type === 'COMPUTE_OTSU') {
      const { pcm, sampleRate } = event.data
      const threshold = computeOtsuThreshold(pcm, sampleRate)
      postMessage({ type: 'OTSU_RESULT', threshold })
    }
  } catch (err) {
    postMessage({ type: 'ERROR', message: err instanceof Error ? err.message : String(err) })
  }
}
