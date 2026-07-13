/**
 * VAD Worker – runs Silero VAD (legacy V1) via onnxruntime-web on mono 16 kHz PCM.
 * Uses importScripts so it works as a plain (non-module) Worker.
 * Also handles Otsu threshold calculation for manual-mode auto-suggest.
 *
 * Messages FROM main thread:
 *   { type: 'RUN_VAD',  pcm: Float32Array, sampleRate: number,
 *                        positiveSpeechThreshold: 0.5, negativeSpeechThreshold: 0.35,
 *                        minSilenceMs: 1000 }   ← in MILLISECONDS
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
  const ort = self.ort
  if (!ort) throw new Error('onnxruntime-web not loaded')

  postMessage({ type: 'PROGRESS', progress: 2 })

  const modelResponse = await fetch(MODEL_URL)
  if (!modelResponse.ok) throw new Error(`Failed to fetch VAD model (${modelResponse.status})`)
  const modelBuffer = await modelResponse.arrayBuffer()

  postMessage({ type: 'PROGRESS', progress: 8 })

  // Enable SIMD + single thread (threads require SharedArrayBuffer / COOP headers)
  const session = await ort.InferenceSession.create(modelBuffer, {
    executionProviders: ['wasm'],
    executionMode:      'sequential',
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
      input: new ort.Tensor('float32', new Float32Array(frame), [1, FRAME_SAMPLES]),
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
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }

  postMessage({ type: 'PROGRESS', progress: 90 })

  // -------------------------------------------------------------------------
  // Probability sequence → pause regions using Silero's proper state machine
  //
  // Rules:
  //   - Enter SPEECH when prob >= positiveSpeechThreshold
  //   - Stay in SPEECH even if prob < negativeSpeechThreshold (hysteresis buffer)
  //   - Leave SPEECH only after gap of >= minSilenceFrames frames all below
  //     negativeSpeechThreshold
  // -------------------------------------------------------------------------
  const frameDurationSec = FRAME_SAMPLES / TARGET_SR  // ≈ 0.032 s per frame
  const minSilenceFrames = Math.max(1, Math.round((minSilenceMs / 1000) / frameDurationSec))

  console.log(
    '[vad-worker] posThresh:', positiveSpeechThreshold,
    'negThresh:', negativeSpeechThreshold,
    'minSilenceMs:', minSilenceMs,
    'minSilenceFrames:', minSilenceFrames,
    'totalFrames:', TOTAL_FRAMES,
    'frameDurSec:', frameDurationSec.toFixed(4),
  )

  // Collect speech segments
  const speechSegments = []
  let inSpeech      = false
  let segStart      = 0
  let silenceCount  = 0  // consecutive sub-negative frames while still in speech

  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const prob = probs[i]

    if (!inSpeech) {
      if (prob >= positiveSpeechThreshold) {
        inSpeech     = true
        segStart     = i
        silenceCount = 0
      }
    } else {
      // In speech: count consecutive low-probability frames
      if (prob < negativeSpeechThreshold) {
        silenceCount++
        if (silenceCount >= minSilenceFrames) {
          // End the speech segment at the point where silence started
          const segEnd = i - silenceCount + 1
          speechSegments.push({
            start: segStart * frameDurationSec,
            end:   segEnd   * frameDurationSec,
          })
          inSpeech     = false
          silenceCount = 0
        }
      } else {
        silenceCount = 0  // reset on any frame above negativeSpeechThreshold
      }
    }
  }

  // Close any open segment at end of file
  if (inSpeech) {
    speechSegments.push({
      start: segStart     * frameDurationSec,
      end:   TOTAL_FRAMES * frameDurationSec,
    })
  }

  console.log('[vad-worker] speech segments:', speechSegments.length)

  // -------------------------------------------------------------------------
  // Pause regions = complement of speech segments
  // Only include pauses >= minSilenceMs / 1000 seconds
  // Apply a small inward buffer (matching detectSilenceRegions contract)
  // -------------------------------------------------------------------------
  const minPauseSec  = minSilenceMs / 1000
  const totalDur     = pcm16k.length / TARGET_SR
  const BUFFER_SEC   = 0.15  // inward edge buffer

  const rawPauses = []

  if (speechSegments.length === 0) {
    // Entire file is silence
    rawPauses.push({ start: 0, end: totalDur })
  } else {
    // Gap before first speech
    if (speechSegments[0].start > minPauseSec) {
      rawPauses.push({ start: 0, end: speechSegments[0].start })
    }
    // Gaps between speech segments
    for (let i = 0; i < speechSegments.length - 1; i++) {
      const gapStart = speechSegments[i].end
      const gapEnd   = speechSegments[i + 1].start
      if (gapEnd - gapStart >= minPauseSec) {
        rawPauses.push({ start: gapStart, end: gapEnd })
      }
    }
    // Gap after last speech
    const lastEnd = speechSegments[speechSegments.length - 1].end
    if (totalDur - lastEnd >= minPauseSec) {
      rawPauses.push({ start: lastEnd, end: totalDur })
    }
  }

  // Apply inward buffer and filter too-short results
  const buffered = []
  for (const r of rawPauses) {
    const bs = r.start + BUFFER_SEC
    const be = r.end   - BUFFER_SEC
    if (be - bs < minPauseSec * 0.5) continue  // after buffering, still too short
    buffered.push({ start: parseFloat(bs.toFixed(4)), end: parseFloat(be.toFixed(4)) })
  }

  console.log('[vad-worker] pause regions after buffer:', buffered.length)
  postMessage({ type: 'PROGRESS', progress: 100 })
  return buffered
}

// ---------------------------------------------------------------------------
// Otsu on RMS histogram – lightweight auto-suggest for manual threshold mode
// ---------------------------------------------------------------------------
function computeOtsu(pcm, sampleRate) {
  const WINDOW = Math.max(1, Math.floor(sampleRate * 0.01)) // 10 ms windows
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
// Bootstrap – load ORT via importScripts and configure SIMD wasm paths
// ---------------------------------------------------------------------------
try {
  importScripts('/vad/ort.wasm.min.js')
  if (self.ort && self.ort.env) {
    // Point wasm loader at /vad/ where we copied the .wasm files
    self.ort.env.wasm.wasmPaths = '/vad/'
    // Single-threaded: threads require SharedArrayBuffer + COOP/COEP headers
    self.ort.env.wasm.numThreads = 1
    // Enable SIMD if the runtime can (it auto-detects at run time)
    // Setting simd=true tells ORT to prefer the simd wasm variant
    self.ort.env.wasm.simd = true
  }
} catch (e) {
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
        minSilenceMs = 1000,         // milliseconds
      } = event.data

      postMessage({ type: 'PROGRESS', progress: 0 })

      // Resample to 16 kHz if needed (Silero requires 16 kHz)
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
