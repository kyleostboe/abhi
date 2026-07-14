import { AudioSample, AudioSampleSource, BufferTarget, OggOutputFormat, Output } from "mediabunny"

export interface OpusEncodeRequest {
  id: string
  pcm: ArrayBuffer // mono Float32 samples, transferred
  sampleRate: number
  duration: number
  bitrate: number
  maxBytes: number
}

export type OpusEncodeResponse =
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

const post = (message: OpusEncodeResponse, transfer: Transferable[] = []) => {
  ;(self as unknown as Worker).postMessage(message, transfer)
}

self.onmessage = async (event: MessageEvent<OpusEncodeRequest>) => {
  const { id, pcm, sampleRate, duration, bitrate: preferredBitrate, maxBytes } = event.data

  try {
    const samples = new Float32Array(pcm)
    if (samples.length === 0) {
      throw new Error("No audio samples to encode")
    }

    const bitrate = pickBitrate(duration, maxBytes, preferredBitrate)

    const target = new BufferTarget()
    const output = new Output({ format: new OggOutputFormat(), target })
    const audioSource = new AudioSampleSource({ codec: "opus", bitrate })
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
      throw new Error("Opus encoding produced an empty file")
    }

    post({ id, type: "complete", bytes, bitrate, sampleRate, channels: 1, duration }, [bytes])
  } catch (error) {
    post({ id, type: "error", message: error instanceof Error ? error.message : String(error) })
  }
}
