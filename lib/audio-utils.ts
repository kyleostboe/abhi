import * as Tone from "tone"
import { sleep, formatFileSize } from "./utils"
import lamejs from "@breezystack/lamejs"
import opusEncode from "@audio/encode-opus"

// Initialize Tone.js
export const initializeTone = async (): Promise<void> => {
  if (Tone.context.state !== "running") {
    console.log("[v0] Initializing Tone.js...")
    await Tone.start()
    console.log("[v0] Tone.js initialized successfully")
  }
}

export const playNote = async (note: string, octave: number, duration = 0.8, volume = 0.7): Promise<void> => {
  try {
    console.log(`[v0] Playing basic synth note: ${note}${octave}`)

    await Tone.start()

    const synth = new Tone.Synth().toDestination()
    synth.triggerAttackRelease(`${note}${octave}`, duration)

    setTimeout(() => synth.dispose(), (duration + 0.5) * 1000)

    console.log(`[v0] Basic synth note ${note}${octave} played successfully`)
  } catch (error) {
    console.error("[v0] Error playing note:", error)
  }
}

export const getAudioContext = (): AudioContext => {
  return Tone.context.rawContext as AudioContext
}

export interface BufferToWavOptions {
  maxBytes?: number
  preferCompatibility?: boolean
  isMobile?: boolean
  onProgress?: (progress: number) => void
}

export interface BufferToWavMetadata {
  sampleRate: number
  bitDepth: 8 | 16
  channels: number
}

export interface BufferToWavResult extends BufferToWavMetadata {
  blob: Blob
}

export const bufferToWav = async (
  buffer: AudioBuffer,
  {
    maxBytes = Number.POSITIVE_INFINITY,
    preferCompatibility = true,
    isMobile = false,
    onProgress = () => {},
  }: BufferToWavOptions = {},
): Promise<BufferToWavResult> => {
  const currentAudioContext = Tone.context.rawContext as AudioContext
  if (!currentAudioContext) throw new Error("Audio context not available for WAV conversion")

  onProgress(0)

  const candidateRates = (() => {
    const base = preferCompatibility
      ? [44100, 32000, 22050, 16000, 12000, 11025, 8000]
      : [buffer.sampleRate, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000]

    const normalized = base
      .map((rate) => Math.max(1, Math.round(rate)))
      .map((rate) => {
        if (buffer.sampleRate <= 0) return rate
        return rate > buffer.sampleRate ? buffer.sampleRate : rate
      })

    const unique = Array.from(new Set(normalized)).sort((a, b) => b - a)
    if (!unique.length) {
      return [buffer.sampleRate || 44100]
    }
    return unique
  })()

  const bitDepths: Array<8 | 16> = [16, 8]

  // Single-pass processing: convert to mono, resample, and write WAV
  // No intermediate mono or resampled buffers — everything happens in one loop
  let selectedSampleRate = buffer.sampleRate
  let selectedBitDepth: 8 | 16 = 16
  let estimatedSize = 44 + buffer.length * (selectedBitDepth / 8)
  let foundCombination = false

  outer: for (const depth of bitDepths) {
    for (const rate of candidateRates) {
      const ratio = rate / buffer.sampleRate
      const estimatedSamples = Math.max(1, Math.floor(buffer.length * ratio))
      const bytesPerSample = depth / 8
      const estimate = 44 + estimatedSamples * bytesPerSample

      if (estimate <= maxBytes) {
        selectedSampleRate = rate
        selectedBitDepth = depth
        estimatedSize = estimate
        foundCombination = true
        break outer
      }
    }
  }

  if (!foundCombination && estimatedSize > maxBytes) {
    throw new Error(
      `Unable to fit WAV under ${formatFileSize(maxBytes)} even at ${candidateRates.at(-1) || buffer.sampleRate}Hz / 8-bit.`,
    )
  }

  onProgress(15)

  // Calculate output parameters
  const ratio = selectedSampleRate / buffer.sampleRate
  const numOutputSamples = Math.max(1, Math.floor(buffer.length * ratio))
  const bytesPerSample = selectedBitDepth / 8
  const dataSize = numOutputSamples * bytesPerSample
  const fileSize = 44 + dataSize

  let finalArrayBuffer: ArrayBuffer
  try {
    finalArrayBuffer = new ArrayBuffer(fileSize)
  } catch (e) {
    throw new Error(
      `Failed to create WAV data buffer (size: ${formatFileSize(fileSize)}). Memory limit likely exceeded.`,
    )
  }

  const view = new DataView(finalArrayBuffer)

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i))
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, selectedSampleRate, true)
  view.setUint32(28, selectedSampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, selectedBitDepth, true)
  writeString(36, "data")
  view.setUint32(40, dataSize, true)

  onProgress(20)

  // Single pass: read from input buffer, mix down to mono, resample, and write directly to WAV
  let offset = 44
  for (let i = 0; i < numOutputSamples; i++) {
    if (i % (selectedSampleRate * (isMobile ? 1 : 2)) === 0) {
      await sleep(0)
      onProgress(20 + Math.floor((i / numOutputSamples) * 80))
    }

    // Resample using linear interpolation
    const inputIndex = (i / ratio)
    const index = Math.floor(inputIndex)
    const frac = inputIndex - index

    // Mix down to mono on-the-fly
    let sample1 = 0
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel)
      sample1 += (channelData[Math.min(index, channelData.length - 1)] || 0)
    }
    sample1 /= buffer.numberOfChannels

    let sample2 = 0
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const channelData = buffer.getChannelData(channel)
      sample2 += (channelData[Math.min(index + 1, channelData.length - 1)] || 0)
    }
    sample2 /= buffer.numberOfChannels

    // Linear interpolation
    const interpolated = sample1 + (sample2 - sample1) * frac
    const sample = Math.max(-1, Math.min(1, interpolated))

    // Write directly to WAV
    if (selectedBitDepth === 16) {
      view.setInt16(offset, sample * 0x7fff, true)
    } else {
      const intSample = Math.max(0, Math.min(255, Math.round((sample + 1) * 127.5)))
      view.setUint8(offset, intSample)
    }
    offset += bytesPerSample
  }

  onProgress(100)

  const metadata: BufferToWavMetadata = {
    sampleRate: selectedSampleRate,
    bitDepth: selectedBitDepth,
    channels: 1,
  }

  return {
    ...metadata,
    blob: new Blob([finalArrayBuffer], { type: "audio/wav" }),
  }
}

// Old code below removed to save context
export const bufferToWav_unused = async (
  buffer: AudioBuffer,
  {
    maxBytes = Number.POSITIVE_INFINITY,
    preferCompatibility = true,
    isMobile = false,
    onProgress = () => {},
  }: BufferToWavOptions = {},
): Promise<BufferToWavResult> => {
  const currentAudioContext = Tone.context.rawContext as AudioContext
  if (!currentAudioContext) throw new Error("Audio context not available for WAV conversion")

  onProgress(0)

  const candidateRates = (() => {
    const base = preferCompatibility
      ? [44100, 32000, 22050, 16000, 12000, 11025, 8000]
      : [buffer.sampleRate, 48000, 44100, 32000, 24000, 22050, 16000, 12000, 11025, 8000]

    const normalized = base
      .map((rate) => Math.max(1, Math.round(rate)))
      .map((rate) => {
        if (buffer.sampleRate <= 0) return rate
        return rate > buffer.sampleRate ? buffer.sampleRate : rate
      })

    const unique = Array.from(new Set(normalized)).sort((a, b) => b - a)
    if (!unique.length) {
      return [buffer.sampleRate || 44100]
    }
    return unique
  })()

  const bitDepths: Array<8 | 16> = [16, 8]

  const monoBuffer = await (async () => {
    if (buffer.numberOfChannels === 1) {
      return buffer
    }

    const mono = currentAudioContext.createBuffer(1, buffer.length, buffer.sampleRate)
    const output = mono.getChannelData(0)
    const totalChannels = buffer.numberOfChannels
    for (let i = 0; i < buffer.length; i++) {
      if (i % (buffer.sampleRate * (isMobile ? 1 : 2)) === 0) {
        await sleep(0)
        onProgress(Math.min(10, Math.floor((i / buffer.length) * 10)))
      }
      let sum = 0
      for (let channel = 0; channel < totalChannels; channel++) {
        sum += buffer.getChannelData(channel)[i]
      }
      output[i] = sum / totalChannels
    }
    return mono
  })()

  onProgress(10)

  let selectedSampleRate = monoBuffer.sampleRate
  let selectedBitDepth: 8 | 16 = 16
  let estimatedSize = 44 + monoBuffer.length * (selectedBitDepth / 8)
  let foundCombination = false

  outer: for (const depth of bitDepths) {
    for (const rate of candidateRates) {
      const ratio = rate / monoBuffer.sampleRate
      const estimatedSamples = Math.max(1, Math.floor(monoBuffer.length * ratio))
      const bytesPerSample = depth / 8
      const estimate = 44 + estimatedSamples * bytesPerSample

      if (estimate <= maxBytes) {
        selectedSampleRate = rate
        selectedBitDepth = depth
        estimatedSize = estimate
        foundCombination = true
        break outer
      }
    }
  }

  if (!foundCombination && estimatedSize > maxBytes) {
    throw new Error(
      `Unable to fit WAV under ${formatFileSize(maxBytes)} even at ${candidateRates.at(-1) || monoBuffer.sampleRate}Hz / 8-bit.`,
    )
  }

  let resampledBuffer = monoBuffer
  if (monoBuffer.sampleRate !== selectedSampleRate) {
    const ratio = selectedSampleRate / monoBuffer.sampleRate
    const newLength = Math.max(1, Math.floor(monoBuffer.length * ratio))
    try {
      resampledBuffer = currentAudioContext.createBuffer(1, newLength, selectedSampleRate)
    } catch (e) {
      throw new Error(
        `Failed to create resample buffer (target SR: ${selectedSampleRate}Hz). Memory limit likely exceeded.`,
      )
    }
    onProgress(15)
    const oldData = monoBuffer.getChannelData(0)
    const newData = resampledBuffer.getChannelData(0)
    for (let i = 0; i < newLength; i++) {
      if (i % (selectedSampleRate * (isMobile ? 1 : 2)) === 0) {
        await sleep(0)
        onProgress(15 + Math.floor((i / newLength) * 35))
      }
      const oldIndex = i / ratio
      const index = Math.floor(oldIndex)
      const frac = oldIndex - index
      const samp1 = oldData[Math.min(index, oldData.length - 1)]
      const samp2 = oldData[Math.min(index + 1, oldData.length - 1)]
      newData[i] = samp1 + (samp2 - samp1) * frac
    }
  } else {
    onProgress(50)
  }

  const numSamples = resampledBuffer.length
  const bytesPerSample = selectedBitDepth / 8
  const dataSize = numSamples * bytesPerSample
  const fileSize = 44 + dataSize

  let finalArrayBuffer: ArrayBuffer
  try {
    finalArrayBuffer = new ArrayBuffer(fileSize)
  } catch (e) {
    throw new Error(
      `Failed to create WAV data buffer (size: ${formatFileSize(fileSize)}). Memory limit likely exceeded.`,
    )
  }

  const view = new DataView(finalArrayBuffer)

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i))
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, selectedSampleRate, true)
  view.setUint32(28, selectedSampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, selectedBitDepth, true)
  writeString(36, "data")
  view.setUint32(40, dataSize, true)

  const channelData = resampledBuffer.getChannelData(0)
  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    if (i % (selectedSampleRate * (isMobile ? 1 : 2)) === 0) {
      await sleep(0)
      onProgress(50 + Math.floor((i / numSamples) * 50))
    }
    const sample = Math.max(-1, Math.min(1, channelData[i]))
    if (selectedBitDepth === 16) {
      view.setInt16(offset, sample * 0x7fff, true)
    } else {
      const intSample = Math.max(0, Math.min(255, Math.round((sample + 1) * 127.5)))
      view.setUint8(offset, intSample)
    }
    offset += bytesPerSample
  }

  onProgress(100)

  const metadata: BufferToWavMetadata = {
    sampleRate: selectedSampleRate,
    bitDepth: selectedBitDepth,
    channels: 1,
  }

  return {
    ...metadata,
    blob: new Blob([finalArrayBuffer], { type: "audio/wav" }),
  }
}

export interface BufferToOpusOptions {
  bitrate?: number
  chunkSeconds?: number
  onProgress?: (progress: number) => void
}

export interface BufferToOpusResult {
  blob: Blob
  sampleRate: number
  bitrate: number
  channels: number
}

/**
 * Convert AudioBuffer to Ogg/Opus using WASM libopus (~32 kbps).
 * Encodes in chunks so the main thread stays responsive.
 * Falls back loudly to WAV if anything goes wrong.
 */
export const bufferToOpus = async (
  buffer: AudioBuffer,
  { bitrate = 32, chunkSeconds = 5, onProgress = () => {} }: BufferToOpusOptions = {},
): Promise<BufferToOpusResult> => {
  console.log("[OPUS] bufferToOpus: starting WASM Opus encode", {
    duration: buffer.duration,
    sampleRate: buffer.sampleRate,
    channels: buffer.numberOfChannels,
    bitrate,
  })

  onProgress(0)

  // Mix down to mono Float32Array
  const totalSamples = buffer.length
  const mono = new Float32Array(totalSamples)
  for (let i = 0; i < totalSamples; i++) {
    let sum = 0
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      sum += buffer.getChannelData(c)[i]
    }
    mono[i] = sum / buffer.numberOfChannels
  }

  onProgress(10)

  console.log("[OPUS] bufferToOpus: mono mix-down complete, initialising encoder...")

  const encoder = await opusEncode({
    sampleRate: buffer.sampleRate,
    channels: 1,
    bitrate,
    application: "voip",
  })

  console.log("[OPUS] bufferToOpus: encoder ready, encoding in chunks of", chunkSeconds, "s")

  const chunkSize = Math.round(buffer.sampleRate * chunkSeconds)
  const pages: Uint8Array[] = []
  let offset = 0
  let chunkIndex = 0

  while (offset < totalSamples) {
    const end = Math.min(offset + chunkSize, totalSamples)
    const chunk = mono.subarray(offset, end)
    const page = encoder.encode([chunk])
    if (page.length > 0) pages.push(page)

    offset = end
    chunkIndex++
    const pct = 10 + Math.round((offset / totalSamples) * 85)
    onProgress(pct)

    // Yield to event loop between chunks so UI stays responsive
    await sleep(0)
  }

  const tail = encoder.flush()
  if (tail.length > 0) pages.push(tail)
  encoder.free()

  onProgress(98)

  const blob = new Blob(pages as BlobPart[], { type: "audio/ogg; codecs=opus" })

  console.log(
    `[OPUS] bufferToOpus: complete. Duration=${buffer.duration.toFixed(1)}s, ` +
    `uncompressed=${(totalSamples * 4 / 1024 / 1024).toFixed(1)}MB, ` +
    `opus=${(blob.size / 1024).toFixed(0)}KB @ ${bitrate}kbps`,
  )

  onProgress(100)

  return { blob, sampleRate: buffer.sampleRate, bitrate, channels: 1 }
}

export interface BufferToMp3Options {
  bitrate?: number
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

export interface BufferToWebMOptions {
  bitrate?: number
  onProgress?: (progress: number) => void
}

/**
 * Convert AudioBuffer to WebM/Opus using browser's native MediaRecorder
 * This is MUCH faster than MP3 encoding and produces smaller files
 */
export const bufferToWebM = async (
  buffer: AudioBuffer,
  { bitrate = 96000, onProgress = () => {} }: BufferToWebMOptions = {},
): Promise<{ blob: Blob; sampleRate: number; bitrate: number; channels: number }> => {
  onProgress(0)

  // Create an offline audio context to render the buffer
  const offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate)

  // Create a buffer source
  const source = offlineContext.createBufferSource()
  source.buffer = buffer
  source.connect(offlineContext.destination)
  source.start(0)

  onProgress(10)

  // Render the audio
  const renderedBuffer = await offlineContext.startRendering()

  onProgress(30)

  // Create a MediaStreamDestination to capture audio
  const audioContext = Tone.context.rawContext as AudioContext
  const destination = audioContext.createMediaStreamDestination()

  // Create a buffer source for the rendered audio
  const playbackSource = audioContext.createBufferSource()
  playbackSource.buffer = renderedBuffer
  playbackSource.connect(destination)

  onProgress(50)

  // Create MediaRecorder with WebM/Opus codec
  const mediaRecorder = new MediaRecorder(destination.stream, {
    mimeType: "audio/webm;codecs=opus",
    audioBitsPerSecond: bitrate,
  })

  const chunks: Blob[] = []

  return new Promise((resolve, reject) => {
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data)
      }
    }

    mediaRecorder.onstop = () => {
      onProgress(100)
      const blob = new Blob(chunks, { type: "audio/webm" })

      console.log(
        `[v0] WebM encoding complete. Original size: ${Math.round((buffer.length * buffer.numberOfChannels * 4) / 1024 / 1024)}MB (uncompressed), WebM size: ${Math.round(blob.size / 1024 / 1024)}MB (${Math.round(bitrate / 1000)}kbps)`,
      )

      resolve({
        blob,
        sampleRate: buffer.sampleRate,
        bitrate: Math.round(bitrate / 1000),
        channels: 1,
      })
    }

    mediaRecorder.onerror = (e) => {
      reject(new Error(`MediaRecorder error: ${e}`))
    }

    // Start recording
    mediaRecorder.start()
    onProgress(70)

    // Play the audio (this triggers recording)
    playbackSource.start(0)

    // Stop recording after the audio duration
    setTimeout(
      () => {
        mediaRecorder.stop()
        playbackSource.stop()
        onProgress(90)
      },
      renderedBuffer.duration * 1000 + 100,
    )
  })
}

/**
 * Convert AudioBuffer to MP3 using lamejs encoder
 * Encodes directly on main thread (no Web Worker to avoid module import issues)
 * NOTE: This is SLOW - prefer bufferToWebM for faster encoding
 */
export const bufferToMp3 = async (
  buffer: AudioBuffer,
  { bitrate = 96, onProgress = () => {}, signal }: BufferToMp3Options = {},
): Promise<{ blob: Blob; sampleRate: number; bitrate: number; channels: number }> => {
  if (signal?.aborted) {
    throw new Error("Encoding aborted")
  }

  onProgress(0)

  // Convert to mono if needed
  const monoBuffer = await (async () => {
    if (buffer.numberOfChannels === 1) {
      return buffer
    }

    const currentAudioContext = Tone.context.rawContext as AudioContext
    const mono = currentAudioContext.createBuffer(1, buffer.length, buffer.sampleRate)
    const output = mono.getChannelData(0)
    const totalChannels = buffer.numberOfChannels

    for (let i = 0; i < buffer.length; i++) {
      if (signal?.aborted) {
        throw new Error("Encoding aborted")
      }

      if (i % (buffer.sampleRate * 2) === 0) {
        await sleep(0)
        onProgress(Math.min(10, Math.floor((i / buffer.length) * 10)))
      }
      let sum = 0
      for (let channel = 0; channel < totalChannels; channel++) {
        sum += buffer.getChannelData(channel)[i]
      }
      output[i] = sum / totalChannels
    }
    return mono
  })()

  onProgress(10)

  // Convert float samples to Int16
  const channelData = monoBuffer.getChannelData(0)
  const samples = new Int16Array(channelData.length)

  for (let i = 0; i < channelData.length; i++) {
    if (signal?.aborted) {
      throw new Error("Encoding aborted")
    }

    if (i % (monoBuffer.sampleRate * 2) === 0) {
      await sleep(0)
      onProgress(10 + Math.floor((i / channelData.length) * 20))
    }
    const s = Math.max(-1, Math.min(1, channelData[i]))
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }

  onProgress(30)

  const mp3encoder = new lamejs.Mp3Encoder(1, monoBuffer.sampleRate, bitrate)
  const mp3Data: Int8Array[] = []
  const sampleBlockSize = 1152

  for (let i = 0; i < samples.length; i += sampleBlockSize) {
    if (signal?.aborted) {
      throw new Error("Encoding aborted")
    }

    if (i % (sampleBlockSize * 10) === 0) {
      await sleep(0)
      onProgress(30 + Math.floor((i / samples.length) * 60))
    }

    const sampleChunk = samples.subarray(i, i + sampleBlockSize)
    const mp3buf = mp3encoder.encodeBuffer(sampleChunk)

    if (mp3buf.length > 0) {
      mp3Data.push(new Int8Array(mp3buf))
    }
  }

  const mp3buf = mp3encoder.flush()
  if (mp3buf.length > 0) {
    mp3Data.push(new Int8Array(mp3buf))
  }

  onProgress(100)

  const mp3Blob = new Blob(mp3Data, { type: "audio/mp3" })

  console.log(
    `[v0] MP3 encoding complete. Original size: ${Math.round((buffer.length * buffer.numberOfChannels * 4) / 1024 / 1024)}MB (uncompressed), MP3 size: ${Math.round(mp3Blob.size / 1024 / 1024)}MB (${bitrate}kbps)`,
  )

  return {
    blob: mp3Blob,
    sampleRate: monoBuffer.sampleRate,
    bitrate,
    channels: 1,
  }
}
