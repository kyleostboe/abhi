/**
 * Opus Encoder Worker
 * Encodes a mono Float32Array (any sample rate) to WebM/Opus at ~32 kbps
 * using the WebCodecs AudioEncoder API + webm-muxer.
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

self.onmessage = async (event) => {
  const { type } = event.data
  if (type !== 'ENCODE') return

  const { pcm, sampleRate, numChannels = 1, targetBitrate = 32000 } = event.data

  // Feature-detect WebCodecs AudioEncoder
  if (typeof AudioEncoder === 'undefined') {
    postMessage({ type: 'UNSUPPORTED' })
    return
  }

  // Check Opus support
  const support = await AudioEncoder.isConfigSupported({
    codec:       'opus',
    sampleRate:  48000,
    numberOfChannels: 1,
    bitrate:     targetBitrate,
  }).catch(() => ({ supported: false }))

  if (!support.supported) {
    postMessage({ type: 'UNSUPPORTED' })
    return
  }

  try {
    // Dynamically import webm-muxer (bundled via Next.js public static ESM)
    // We use a CDN-style import-map fallback: load the ESM build from node_modules
    // In a public worker we can't use module imports directly, so we import via URL.
    // The webm-muxer package ships both CJS and ESM. We'll self-host the ESM build
    // under /webm-muxer.mjs which next.config copies there.
    // If that fails, fall back to UNSUPPORTED.
    let Muxer, ArrayBufferTarget
    try {
      const mod = await import('/webm-muxer.mjs')
      Muxer = mod.Muxer
      ArrayBufferTarget = mod.ArrayBufferTarget
    } catch (_importErr) {
      postMessage({ type: 'UNSUPPORTED' })
      return
    }

    postMessage({ type: 'PROGRESS', progress: 2 })

    const ENCODER_SR = 48000
    const CHANNELS   = 1  // force mono for voice
    const FRAME_DURATION_MS = 60 // 60 ms frames
    const FRAME_SIZE = Math.floor(ENCODER_SR * FRAME_DURATION_MS / 1000)

    // Resample PCM to 48000 Hz (required by WebCodecs Opus)
    const pcm48k = resampleMono(pcm, sampleRate, ENCODER_SR)

    const target = new ArrayBufferTarget()
    const muxer  = new Muxer({
      target,
      audio: {
        codec:        'A_OPUS',
        sampleRate:   ENCODER_SR,
        numberOfChannels: CHANNELS,
      },
      firstTimestampBehavior: 'offset',
    })

    postMessage({ type: 'PROGRESS', progress: 5 })

    const chunks = []
    const encoder = new AudioEncoder({
      output: (chunk, meta) => {
        chunks.push({ chunk, meta })
      },
      error: (err) => {
        throw new Error('AudioEncoder error: ' + err.message)
      },
    })

    encoder.configure({
      codec:             'opus',
      sampleRate:        ENCODER_SR,
      numberOfChannels:  CHANNELS,
      bitrate:           targetBitrate,
      bitrateMode:       'constant',
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
        format:          'f32',
        sampleRate:      ENCODER_SR,
        numberOfFrames:  FRAME_SIZE,
        numberOfChannels: CHANNELS,
        timestamp:       Math.round(frameIdx * FRAME_DURATION_MS * 1000), // microseconds
        data:            frameData,
      })

      encoder.encode(audioData)
      audioData.close()

      if (frameIdx % 100 === 0) {
        await encoder.flush()
        // Feed muxer
        for (const { chunk, meta } of chunks.splice(0)) {
          muxer.addAudioChunk(chunk, meta)
        }
        const pct = 5 + Math.floor((frameIdx / totalFrames) * 88)
        postMessage({ type: 'PROGRESS', progress: pct })
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    await encoder.flush()
    encoder.close()

    // Feed remaining chunks to muxer
    for (const { chunk, meta } of chunks) {
      muxer.addAudioChunk(chunk, meta)
    }

    muxer.finalize()

    postMessage({ type: 'PROGRESS', progress: 98 })

    const buffer = target.buffer
    const blob   = new Blob([buffer], { type: 'audio/webm' })

    postMessage({ type: 'ENCODED', blob })
    postMessage({ type: 'PROGRESS', progress: 100 })
  } catch (err) {
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
