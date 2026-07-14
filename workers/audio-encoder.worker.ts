import { AudioSample, AudioSampleSource, BufferTarget, Mp4OutputFormat, OggOutputFormat, Output, WavOutputFormat } from "mediabunny"

export type AudioTargetFormat = "opus" | "aac" | "wav"

export interface AudioEncodeRequest {
  id: string
  pcm: ArrayBuffer // mono Float32 samples, transferred
  sampleRate: number
  duration: number
  bitrate: number
  maxBytes: number
  format: AudioTargetFormat
}

export type AudioEncodeResponse =
  | { id: string; type: "progress"; progress: number }
  | {
      id: string
      type: "complete"
      bytes: ArrayBuffer
      bitrate: number
      sampleRate: number
      channels: number
      duration: number
    }
  | { id: string; type: "error"; message: string }

const CHUNK_SECONDS = 5
const BITRATE_LADDER = [96000, 64000, 48000, 32000, 24000, 16000]
const WAV_BYTES_PER_SAMPLE = 2 // 16-bit PCM
const WAV_HEADER_BYTES = 44

function pickBitrate(duration: number, maxBytes: number, preferred: number): number {
  const containerOverhead = 1.05
  const candidates = Array.from(new Set([preferred, ...BITRATE_LADDER])).sort((a, b) => b - a)
  for (const bitrate of candidates) {
    if ((bitrate / 8) * duration * containerOverhead <= maxBytes) {
      return bitrate
    }
  }
  return candidates[candidates.length - 1]
}

const post = (message: AudioEncodeResponse, transfer: Transferable[] = []) => {
  ;(self as unknown as Worker).postMessage(message, transfer)
}

self.onmessage = async (event: MessageEvent<AudioEncodeRequest>) => {
  const { id, pcm, sampleRate, duration, bitrate: preferredBitrate, maxBytes, format } = event.data

  try {
    const samples = new Float32Array(pcm)
    if (samples.length === 0) {
      throw new Error("No audio samples to encode")
    }

    const isPcm = format === "wav"
    let bitrate = 0

    if (isPcm) {
      // WAV is uncompressed — size is fixed by duration/sample rate/bit depth, not adjustable
      // via bitrate, so check the cap up front instead of using a bitrate ladder.
      const estimatedBytes = duration * sampleRate * WAV_BYTES_PER_SAMPLE + WAV_HEADER_BYTES
      if (estimatedBytes > maxBytes) {
        throw new Error(
          `WAV output would be about ${(estimatedBytes / 1024 / 1024).toFixed(1)}MB, over the ${(maxBytes / 1024 / 1024).toFixed(0)}MB limit. Choose a compressed format (Opus, AAC, or MP3) or a shorter session.`,
        )
      }
    } else {
      bitrate = pickBitrate(duration, maxBytes, preferredBitrate)
    }

    const target = new BufferTarget()
    const output = new Output({
      format: format === "opus" ? new OggOutputFormat() : format === "aac" ? new Mp4OutputFormat() : new WavOutputFormat(),
      target,
    })
    const audioSource = isPcm
      ? new AudioSampleSource({ codec: "pcm-s16" })
      : new AudioSampleSource({ codec: format === "opus" ? "opus" : "aac", bitrate })
    output.addAudioTrack(audioSource)
    await output.start()

    const chunkFrames = Math.max(1, Math.round(CHUNK_SECONDS * sampleRate))
    const totalFrames = samples.length
    let offset = 0

    while (offset < totalFrames) {
      const end = Math.min(offset + chunkFrames, totalFrames)
      // Must be an independent buffer (byteOffset 0), not a view into the shared `samples`
      // buffer — passing a subarray() view here caused every chunk after the first to encode
      // the same underlying bytes from offset 0, i.e. the whole file repeating chunk 1's audio.
      const chunk = samples.slice(offset, end)
      const sample = new AudioSample({
        data: chunk,
        format: "f32",
        numberOfChannels: 1,
        sampleRate,
        timestamp: offset / sampleRate,
      })
      await audioSource.add(sample)
      sample.close()

      offset = end
      post({ id, type: "progress", progress: Math.min(99, Math.round((offset / totalFrames) * 100)) })
    }

    await output.finalize()

    const bytes = target.buffer
    if (!bytes || bytes.byteLength === 0) {
      throw new Error(`${format} encoding produced an empty file`)
    }

    post({ id, type: "complete", bytes, bitrate, sampleRate, channels: 1, duration }, [bytes])
  } catch (error) {
    post({ id, type: "error", message: error instanceof Error ? error.message : String(error) })
  }
}
