import * as Tone from "tone"
import { sleep, formatFileSize } from "./utils"
import lamejs from "@breezystack/lamejs"
import { encodeToFormat, isFormatEncodingSupported } from "./audio-encoder"

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

// Legacy metadata shape for records saved before the switch to Opus/MP3 distribution encoding.
export interface BufferToWavMetadata {
  sampleRate: number
  bitDepth: 8 | 16
  channels: number
}

export interface BufferToMp3Options {
  bitrate?: number
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

/**
 * Convert AudioBuffer to MP3 using lamejs encoder
 * Encodes directly on main thread. Used as the fallback distribution format
 * when Opus/AAC encoding (see encodeToFormat/encodeDistributionAudio) isn't supported.
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
  container: "ogg" | "m4a" | "mp3" | "wav"
  codec: "opus" | "aac" | "mp3" | "pcm"
  sampleRate: number
  channels: number
  bitrate?: number // kbps, compressed formats only
  bitDepth?: 8 | 16 // wav only
}

// The format a user can pick for processing/converting a meditation's audio.
export type AudioExportFormat = "opus" | "aac" | "wav" | "mp3"

export const AUDIO_EXPORT_FORMAT_LABELS: Record<AudioExportFormat, string> = {
  opus: "Ogg Opus",
  aac: "M4A (AAC)",
  wav: "WAV",
  mp3: "MP3",
}

// Compact extension-style labels for space-constrained selectors (e.g. inline with the
// Process/Generate Audio buttons), where the full descriptive label doesn't fit.
export const AUDIO_EXPORT_FORMAT_SHORT_LABELS: Record<AudioExportFormat, string> = {
  opus: ".ogg",
  aac: ".m4a",
  wav: ".wav",
  mp3: ".mp3",
}

// Hard size cap for distribution exports. Ogg/Opus compresses efficiently enough that it
// essentially never needs the bitrate ladder to kick in for realistic session lengths, so it's
// exempted rather than being knocked down to a lower-quality bitrate like the other formats.
export const DISTRIBUTION_MAX_BYTES = 48 * 1024 * 1024

export const getDistributionMaxBytes = (format: AudioExportFormat): number =>
  format === "opus" ? Number.POSITIVE_INFINITY : DISTRIBUTION_MAX_BYTES

// Decodes via mediabunny's own demuxer/WebCodecs pipeline instead of the browser's native
// decodeAudioData. Used as a fallback below — mediabunny reading back a file its own encoder
// produced is far more reliable than relying on the browser's independent container demuxer,
// which can be stricter (or just buggy) about non-standard muxing for some encoders/lengths.
const decodeAudioBlobWithMediabunny = async (blob: Blob, audioContext: AudioContext): Promise<AudioBuffer> => {
  const { ALL_FORMATS, BlobSource, Input, AudioBufferSink } = await import("mediabunny")
  const input = new Input({ source: new BlobSource(blob), formats: ALL_FORMATS })
  try {
    const track = await input.getPrimaryAudioTrack()
    if (!track) {
      throw new Error("No audio track found in file")
    }

    const sink = new AudioBufferSink(track)
    const chunks: AudioBuffer[] = []
    let numberOfChannels = 0
    let sampleRate = 0
    let totalFrames = 0

    for await (const wrapped of sink.buffers()) {
      chunks.push(wrapped.buffer)
      numberOfChannels = wrapped.buffer.numberOfChannels
      sampleRate = wrapped.buffer.sampleRate
      totalFrames += wrapped.buffer.length
    }

    if (chunks.length === 0 || totalFrames === 0) {
      throw new Error("No decodable audio data found in file")
    }

    const combined = audioContext.createBuffer(numberOfChannels, totalFrames, sampleRate)
    let offset = 0
    for (const chunk of chunks) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        combined.copyToChannel(chunk.getChannelData(channel), channel, offset)
      }
      offset += chunk.length
    }
    return combined
  } finally {
    input.dispose()
  }
}

/**
 * Decodes an audio Blob into an AudioBuffer, trying the browser's native decodeAudioData first
 * and falling back to mediabunny's decoder if that fails. Long recordings produced by this
 * app's own Opus/AAC/MP3 encoders have been seen to trip up native decodeAudioData in some
 * browsers ("Unable to decode audio data") despite being perfectly valid, playable files — the
 * mediabunny fallback reads them back with the same library that wrote them.
 */
export const decodeAudioBlob = async (blob: Blob, audioContext: AudioContext): Promise<AudioBuffer> => {
  const arrayBuffer = await blob.arrayBuffer()
  try {
    return await audioContext.decodeAudioData(arrayBuffer.slice(0))
  } catch (nativeError) {
    console.warn("[v0] Native decodeAudioData failed, falling back to mediabunny decode:", nativeError)
    try {
      return await decodeAudioBlobWithMediabunny(blob, audioContext)
    } catch (fallbackError) {
      console.warn("[v0] mediabunny fallback decode also failed:", fallbackError)
      throw nativeError instanceof Error ? nativeError : new Error("Unable to decode audio data")
    }
  }
}

export const extensionForContainer = (container: AudioFormatMetadata["container"] | undefined | null): string => {
  switch (container) {
    case "ogg":
      return "ogg"
    case "m4a":
      return "m4a"
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
  format?: AudioExportFormat
  maxBytes?: number
  bitrate?: number
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

export interface EncodeDistributionAudioResult {
  blob: Blob
  format: AudioFormatMetadata
}

const encodeMp3Fallback = async (
  buffer: AudioBuffer,
  maxBytes: number,
  onProgress: (progress: number) => void,
  signal?: AbortSignal,
): Promise<EncodeDistributionAudioResult> => {
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

/**
 * The single entry point for producing the audio actually saved/downloaded by the Adjuster
 * and Creator tools. Defaults to Opus (via WebCodecs) when the browser can both encode and
 * play it back; MP3 otherwise. A specific format can be requested instead — Opus and AAC
 * both fall back to MP3 if the browser can't encode/play them; WAV and MP3 have no fallback
 * since they're either always supported (WAV, uncompressed) or already the floor (MP3).
 * Never silently falls back to WAV.
 */
export const encodeDistributionAudio = async (
  buffer: AudioBuffer,
  {
    format = "opus",
    maxBytes = Number.POSITIVE_INFINITY,
    bitrate = 96000,
    onProgress = () => {},
    signal,
  }: EncodeDistributionAudioOptions = {},
): Promise<EncodeDistributionAudioResult> => {
  if (format === "mp3") {
    return encodeMp3Fallback(buffer, maxBytes, onProgress, signal)
  }

  if (format === "wav") {
    const result = await encodeToFormat(buffer, "wav", { bitrate, maxBytes, onProgress, signal })
    return {
      blob: result.blob,
      format: {
        container: result.container,
        codec: result.codec,
        sampleRate: result.sampleRate,
        channels: result.channels,
      },
    }
  }

  // opus or aac — both go through WebCodecs with an MP3 fallback
  if (await isFormatEncodingSupported(format, bitrate)) {
    try {
      const result = await encodeToFormat(buffer, format, { bitrate, maxBytes, onProgress, signal })
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
      console.warn(`[v0] ${format} encoding failed, falling back to MP3:`, error)
    }
  }

  return encodeMp3Fallback(buffer, maxBytes, onProgress, signal)
}
