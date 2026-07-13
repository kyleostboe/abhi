/**
 * VAD Worker – runs Silero VAD (legacy V1) via onnxruntime-web on mono 16 kHz PCM.
 * Uses importScripts so it works as a plain (non-module) Worker.
 * Also handles Otsu threshold calculation for manual-mode auto-suggest.
 *
 * Messages FROM main thread:
 *   { type: 'RUN_VAD',  pcm: Float32Array, sampleRate: number,
 *                        positiveSpeechThreshold: 0.5, negativeSpeechThreshold: 0.35,
 *                        minSilenceMs: 500 }
 *   { type: 'COMPUTE_OTSU', pcm: Float32Array, sampleRate: number }
 *
 * Messages TO main thread:
 *   { type: 'PROGRESS', progress: 0-100 }
 *   { type: 'VAD_RESULT', regions: Array<{start,end}> }
 *   { type: 'OTSU_RESULT', threshold: number }
 *   { type: 'ERROR', message: string }
 */

const FRAME_SAMPLES = 512    // Silero V1 legacy: 512 samples @ 16 kHz
const TARGET_SR     = 16000
const MODEL_URL     = '/vad/silero_vad_legacy.onnx'

// ---------------------------------------------------------------------------
// Linear resampler
// ---------------------------------------------------------------------------
function resampleMono(pcm, fromSR, toSR) {
  if (fromSR === toSR) return pcm
  const ratio    = toSR / fromSR
  const outLen   = Math.floor(pcm.length * ratio)
  const out      = new Float32Array(outLen)
  const invRatio = 1 / ratio
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
// Run Silero VAD via ORT InferenceSession
// ---------------------------------------------------------------------------
async function runVAD(pcm16k, positiveSpeechThreshold, negativeSpeechThreshold, minSilenceMs) {
  // ort is available on self after importScripts
  const ort = self.ort
  if (!ort) throw new Error('onnxruntime-web not loaded')

  postMessage({ type: 'PROGRESS', progress: 2 })

  const modelResponse = await fetch(MODEL_URL)
  if (!modelResponse.ok) throw new Error(`Failed to fetch VAD model (${modelResponse.status})`)
  const modelBuffer = await modelResponse.arrayBuffer()

  postMessage({ type: 'PROGRESS', progress: 8 })

  const session = await ort.InferenceSession.create(modelBuffer, {
    executionProviders: ['wasm'],
  })

  postMessage({ type: 'PROGRESS', progress: 12 })

  // Silero V1 LSTM state: h and c shaped [2, 1, 64]
  let h = new Float32Array(2 * 1 * 64)
  let c = new Float32Array(2 * 1 * 64)

  const TOTAL_FRAMES = Math.floor(pcm16k.length / FRAME_SAMPLES)
  const probs        = new Float32Array(TOTAL_FRAMES)

  for (let frameIdx = 0; frameIdx < TOTAL_FRAMES; frameIdx++) {
    const frame = pcm16k.subarray(frameIdx * FRAME_SAMPLES, (frameIdx + 1) * FRAME_SAMPLES)

    const feeds = {
      input: new ort.Tensor('float32', frame, [1, FRAME_SAMPLES]),
      sr:    new ort.Tensor('int64',   BigInt64Array.from([BigInt(TARGET_SR)]), []),
      h:     new ort.Tensor('float32', new Float32Array(h), [2, 1, 64]),
      c:     new ort.Tensor('float32', new Float32Array(c), [2, 1, 64]),
    }

    const results = await session.run(feeds)
    probs[frameIdx] = results.output.data[0]
    h = results.hn.data
    c = results.cn.data

    if (frameIdx % 200 === 0) {
      const pct = 12 + Math.floor((frameIdx / TOTAL_FRAMES) * 78)
      postMessage({ type: 'PROGRESS', progress: pct })
      // yield to the event loop to avoid watchdog timeouts
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  postMessage({ type: 'PROGRESS', progress: 90 })

  // -------------------------------------------------------------------------
  // Probability sequence → pause regions
  // -------------------------------------------------------------------------
  const frameDurationSec = FRAME_SAMPLES / TARGET_SR
  const frameDurationMs  = frameDurationSec * 1000
  const minSilenceFrames = Math.ceil(minSilenceMs / frameDurationMs)

  const isSpeech = new Uint8Array(TOTAL_FRAMES)
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    isSpeech[i] = probs[i] >= positiveSpeechThreshold ? 1 : 0
  }

  // Collect speech segments with hysteresis: only end a segment when the gap
  // is at least minSilenceFrames long
  const speechSegments = []
  let inSpeech = false
  let segStart = 0

  for (let i = 0; i <= TOTAL_FRAMES; i++) {
    const speaking = i < TOTAL_FRAMES && isSpeech[i] === 1

    if (!inSpeech && speaking) {
      inSpeech = true
      segStart = i
    } else if (inSpeech && !speaking) {
      // Measure gap length
      let gapLen = 0
      let j = i
      while (j < TOTAL_FRAMES && isSpeech[j] === 0) { gapLen++; j++ }

      if (gapLen >= minSilenceFrames || j === TOTAL_FRAMES) {
        speechSegments.push({
          start: segStart * frameDurationSec,
          end:   i       * frameDurationSec,
        })
        inSpeech = false
      }
    }
  }

  // Pause regions = complement of speech
  const totalDuration = pcm16k.length / TARGET_SR
  const pauseRegions  = []

  if (speechSegments.length === 0) {
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

  // Apply 0.3 s inward buffer (same contract as detectSilenceRegions)
  const BUFFER   = 0.3
  const minPause = minSilenceMs / 1000
  const buffered = []

  for (const r of pauseRegions) {
    const bs = r.start + BUFFER
    const be = r.end   - BUFFER
    if (be - bs < minPause) continue
    if (buffered.length > 0) {
      const prev     = buffered[buffered.length - 1]
      const adjStart = Math.max(bs, prev.end + BUFFER)
      if (be > adjStart) buffered.push({ start: adjStart, end: be })
    } else {
      buffered.push({ start: bs, end: be })
    }
  }

  postMessage({ type: 'PROGRESS', progress: 100 })
  return buffered
}

// ---------------------------------------------------------------------------
// Otsu on RMS histogram – lightweight auto-suggest for manual threshold mode
// ---------------------------------------------------------------------------
function computeOtsu(pcm, sampleRate) {
  const WINDOW = Math.max(1, Math.floor(sampleRate * 0.01)) // 10 ms
  const BINS   = 256

  const rmsValues = []
  for (let i = 0; i < pcm.length; i += WINDOW) {
    const end = Math.min(i + WINDOW, pcm.length)
    let sum = 0
    for (let j = i; j < end; j++) sum += pcm[j] * pcm[j]
    rmsValues.push(Math.sqrt(sum / (end - i)))
  }

  if (rmsValues.length === 0) return 0.025

  const maxRms = Math.max(...rmsValues)
  if (maxRms === 0) return 0.025

  const hist  = new Float64Array(BINS)
  const total = rmsValues.length
  for (const v of rmsValues) {
    const bin = Math.min(Math.floor((v / maxRms) * BINS), BINS - 1)
    hist[bin]++
  }
  for (let i = 0; i < BINS; i++) hist[i] /= total

  let sumAll = 0
  for (let i = 0; i < BINS; i++) sumAll += i * hist[i]

  let bestThresh = 0, bestVar = -1, w0 = 0, sum0 = 0
  for (let t = 0; t < BINS - 1; t++) {
    w0   += hist[t]
    sum0 += t * hist[t]
    const w1 = 1 - w0
    if (w0 <= 0 || w1 <= 0) continue
    const mu0 = sum0 / w0
    const mu1 = (sumAll - sum0) / w1
    const v   = w0 * w1 * (mu0 - mu1) ** 2
    if (v > bestVar) { bestVar = v; bestThresh = t }
  }

  const normalized = bestThresh / BINS
  const absolute   = normalized * maxRms
  return Math.max(0.001, Math.min(0.05, absolute))
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

// Load ORT via importScripts (UMD build)
try {
  importScripts('/vad/ort.wasm.min.js')
  // Point the wasm loader at our public/vad/ directory
  if (self.ort && self.ort.env) {
    self.ort.env.wasm.wasmPaths = '/vad/'
    self.ort.env.wasm.numThreads = 1 // single-threaded for simplicity
  }
} catch (e) {
  // Will be caught when RUN_VAD is called; ORT simply won't exist
  console.warn('[vad-worker] Failed to load ORT:', e)
}

self.onmessage = async (event) => {
  const { type } = event.data
  try {
    if (type === 'RUN_VAD') {
      const {
        pcm, sampleRate,
        positiveSpeechThreshold = 0.5,
        negativeSpeechThreshold = 0.35,
        minSilenceMs = 500,
      } = event.data

      postMessage({ type: 'PROGRESS', progress: 0 })

      // Resample to 16 kHz if needed
      const pcm16k = sampleRate !== TARGET_SR
        ? resampleMono(pcm, sampleRate, TARGET_SR)
        : pcm

      const regions = await runVAD(
        pcm16k,
        positiveSpeechThreshold,
        negativeSpeechThreshold,
        minSilenceMs,
      )
      postMessage({ type: 'VAD_RESULT', regions })
    }

    if (type === 'COMPUTE_OTSU') {
      const { pcm, sampleRate } = event.data
      const threshold = computeOtsu(pcm, sampleRate)
      postMessage({ type: 'OTSU_RESULT', threshold })
    }
  } catch (err) {
    postMessage({ type: 'ERROR', message: err instanceof Error ? err.message : String(err) })
  }
}
