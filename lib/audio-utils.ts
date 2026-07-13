import * as Tone from "tone"
import { sleep, formatFileSize } from "./utils"
import lamejs from "@breezystack/lamejs"
import { bufferToOpus, isOpusEncodingSupported } from "./opus-encoder"

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

export interface BufferToMp3Options {
  bitrate?: number
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

/**
 * Convert AudioBuffer to MP3 using lamejs encoder
 * Encodes directly on main thread. Used as the fallback distribution format
 * when Opus encoding (see bufferToOpus/encodeDistributionAudio) isn't supported.
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

export interface AudioFormatMetadata {
  container: "ogg" | "mp3" | "wav"
  codec: "opus" | "mp3" | "pcm"
  sampleRate: number
  channels: number
  bitrate?: number // kbps, compressed formats only
  bitDepth?: 8 | 16 // wav only
}

export const extensionForContainer = (container: AudioFormatMetadata["container"] | undefined | null): string => {
  switch (container) {
    case "ogg":
      return "ogg"
    case "mp3":
      return "mp3"
    default:
      return "wav"
  }
}

const MP3_BITRATE_LADDER = [96, 64, 48, 32]

const pickMp3Bitrate = (durationSeconds: number, maxBytes: number, preferred: number): number => {
  const candidates = Array.from(new Set([preferred, ...MP3_BITRATE_LADDER])).sort((a, b) => b - a)
  for (const bitrate of candidates) {
    if ((bitrate * 1000) / 8 * durationSeconds <= maxBytes) {
      return bitrate
    }
  }
  return candidates[candidates.length - 1]
}

export interface EncodeDistributionAudioOptions {
  maxBytes?: number
  bitrate?: number
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

export interface EncodeDistributionAudioResult {
  blob: Blob
  format: AudioFormatMetadata
}

/**
 * The single entry point for producing the audio actually saved/downloaded by the Adjuster
 * and Creator tools: Opus (via WebCodecs) when the browser can both encode and play it back,
 * MP3 otherwise. Never silently falls back to WAV — MP3 is the floor.
 */
export const encodeDistributionAudio = async (
  buffer: AudioBuffer,
  { maxBytes = Number.POSITIVE_INFINITY, bitrate = 96000, onProgress = () => {}, signal }: EncodeDistributionAudioOptions = {},
): Promise<EncodeDistributionAudioResult> => {
  if (await isOpusEncodingSupported(bitrate)) {
    try {
      const result = await bufferToOpus(buffer, { bitrate, maxBytes, onProgress, signal })
      return {
        blob: result.blob,
        format: {
          container: result.container,
          codec: result.codec,
          sampleRate: result.sampleRate,
          channels: result.channels,
          bitrate: result.bitrate,
        },
      }
    } catch (error) {
      if (error instanceof Error && error.message === "Encoding aborted") {
        throw error
      }
      console.warn("[v0] Opus encoding failed, falling back to MP3:", error)
    }
  }

  const mp3Bitrate = pickMp3Bitrate(buffer.duration, maxBytes, 96)
  const mp3Result = await bufferToMp3(buffer, { bitrate: mp3Bitrate, onProgress, signal })

  if (mp3Result.blob.size > maxBytes) {
    throw new Error(
      `Unable to fit audio under ${formatFileSize(maxBytes)} even at the lowest supported bitrate (${mp3Bitrate}kbps MP3).`,
    )
  }

  return {
    blob: mp3Result.blob,
    format: {
      container: "mp3",
      codec: "mp3",
      sampleRate: mp3Result.sampleRate,
      channels: mp3Result.channels,
      bitrate: mp3Result.bitrate,
    },
  }
}
