/**
 * Opus Encoder Worker
 * Encodes a mono Float32Array (any sample rate) to WebM/Opus at ~32 kbps
 * using the WebCodecs AudioEncoder API + webm-muxer (loaded via importScripts).
 *
 * Uses importScripts (not import()) so this works as a plain worker in all browsers.
 *
 * Falls back gracefully: if WebCodecs / Opus are unavailable the worker
 * posts UNSUPPORTED and the main thread keeps its existing WAV path.
 *
 * Messages FROM main thread:
 *   { type: 'ENCODE', pcm: Float32Array, sampleRate: number, numChannels: number,
 *                     targetBitrate?: number (default 32000) }
 *
 * Messages TO main thread:
 *   { type: 'PROGRESS', progress: 0-100 }
 *   { type: 'ENCODED',  blob: Blob }
 *   { type: 'UNSUPPORTED' }
 *   { type: 'ERROR', message: string }
 */

// Load webm-muxer UMD build.  After this, self.WebMMuxer is populated.
try {
  importScripts('/webm-muxer.js')
} catch (e) {
  // Will be caught below when we check self.WebMMuxer
  console.warn('[opus-worker] Failed to load webm-muxer:', e)
}

self.onmessage = async (event) => {
  const { type } = event.data
  if (type !== 'ENCODE') return

  const { pcm, sampleRate, targetBitrate = 32000 } = event.data

  // ── Feature detection ────────────────────────────────────────────────────

  if (typeof AudioEncoder === 'undefined') {
    console.log('[opus-worker] AudioEncoder not available → UNSUPPORTED')
    postMessage({ type: 'UNSUPPORTED' })
    return
  }

  if (!self.WebMMuxer) {
    console.warn('[opus-worker] webm-muxer not loaded → UNSUPPORTED')
    postMessage({ type: 'UNSUPPORTED' })
    return
  }

  let supported = false
  try {
    const result = await AudioEncoder.isConfigSupported({
      codec:            'opus',
      sampleRate:       48000,
      numberOfChannels: 1,
      bitrate:          targetBitrate,
    })
    supported = result.supported
  } catch (_) {
    supported = false
  }

  if (!supported) {
    console.log('[opus-worker] Opus config not supported → UNSUPPORTED')
    postMessage({ type: 'UNSUPPORTED' })
    return
  }

  console.log('[opus-worker] Opus supported, starting encode at', targetBitrate, 'bps')

  try {
    const { Muxer, ArrayBufferTarget } = self.WebMMuxer

    const ENCODER_SR        = 48000
    const CHANNELS          = 1
    const FRAME_DURATION_MS = 60  // 60 ms frames
    const FRAME_SIZE        = Math.floor(ENCODER_SR * FRAME_DURATION_MS / 1000)

    // Resample to 48 kHz (required by WebCodecs Opus)
    const pcm48k = resampleMono(pcm, sampleRate, ENCODER_SR)

    postMessage({ type: 'PROGRESS', progress: 3 })

    const target = new ArrayBufferTarget()
    const muxer  = new Muxer({
      target,
      audio: {
        codec:            'A_OPUS',
        sampleRate:       ENCODER_SR,
        numberOfChannels: CHANNELS,
      },
      firstTimestampBehavior: 'offset',
    })

    const chunks = []
    const encoder = new AudioEncoder({
      output: (chunk, meta) => { chunks.push({ chunk, meta }) },
      error:  (err) => { throw new Error('AudioEncoder error: ' + err.message) },
    })

    encoder.configure({
      codec:            'opus',
      sampleRate:       ENCODER_SR,
      numberOfChannels: CHANNELS,
      bitrate:          targetBitrate,
      bitrateMode:      'constant',
    })

    const totalFrames = Math.ceil(pcm48k.length / FRAME_SIZE)

    for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
      const start = frameIdx * FRAME_SIZE
      const end   = Math.min(start + FRAME_SIZE, pcm48k.length)
      const slice = pcm48k.subarray(start, end)

      // Pad last frame if needed
      let frameData = slice
      if (slice.length < FRAME_SIZE) {
        frameData = new Float32Array(FRAME_SIZE)
        frameData.set(slice)
      }

      const audioData = new AudioData({
        format:           'f32',
        sampleRate:       ENCODER_SR,
        numberOfFrames:   FRAME_SIZE,
        numberOfChannels: CHANNELS,
        timestamp:        Math.round(frameIdx * FRAME_DURATION_MS * 1000), // microseconds
        data:             frameData,
      })

      encoder.encode(audioData)
      audioData.close()

      // Periodically flush encoder → muxer to keep memory bounded
      if (frameIdx % 80 === 0 && frameIdx > 0) {
        await encoder.flush()
        for (const { chunk, meta } of chunks.splice(0)) {
          muxer.addAudioChunk(chunk, meta)
        }
        const pct = 3 + Math.floor((frameIdx / totalFrames) * 90)
        postMessage({ type: 'PROGRESS', progress: pct })
        // Yield to avoid watchdog timeouts on long files
        await new Promise(r => setTimeout(r, 0))
      }
    }

    // Final flush
    await encoder.flush()
    encoder.close()

    for (const { chunk, meta } of chunks) {
      muxer.addAudioChunk(chunk, meta)
    }

    muxer.finalize()

    postMessage({ type: 'PROGRESS', progress: 98 })

    const blob = new Blob([target.buffer], { type: 'audio/webm' })
    console.log('[opus-worker] Encode done, size:', blob.size, 'bytes')

    postMessage({ type: 'ENCODED', blob })
  } catch (err) {
    console.error('[opus-worker] Encode error:', err)
    postMessage({ type: 'ERROR', message: err instanceof Error ? err.message : String(err) })
  }
}

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
