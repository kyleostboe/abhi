import type { OpusEncodeRequest, OpusEncodeResponse } from "@/workers/opus-encoder.worker"

export interface OpusEncodeOptions {
  bitrate?: number
  maxBytes?: number
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

export interface OpusEncodeResult {
  blob: Blob
  container: "ogg"
  codec: "opus"
  sampleRate: number
  channels: number
  bitrate: number
  duration: number
}

let opusSupportCache: Promise<boolean> | null = null

/**
 * Checks both that the browser can encode Opus via WebCodecs AND that its <audio>
 * element can actually play back an Ogg/Opus file. Without the playback check we could
 * "successfully" encode a file the app's own player can't play (this is what happened to
 * WebM on Safari historically), so the check is self-healing across browsers rather than
 * hardcoding which browsers are excluded.
 */
export function isOpusEncodingSupported(bitrate = 96000): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false)
  }

  if (!opusSupportCache) {
    opusSupportCache = (async () => {
      try {
        if (typeof AudioEncoder === "undefined") {
          return false
        }

        const probe = document.createElement("audio")
        if (probe.canPlayType('audio/ogg; codecs="opus"') === "") {
          return false
        }

        const { canEncodeAudio } = await import("mediabunny")
        return await canEncodeAudio("opus", { sampleRate: 48000, numberOfChannels: 1, bitrate })
      } catch {
        return false
      }
    })()
  }

  return opusSupportCache
}

const mixdownToMono = async (
  buffer: AudioBuffer,
  signal?: AbortSignal,
): Promise<{ samples: Float32Array; sampleRate: number }> => {
  if (buffer.numberOfChannels === 1) {
    return { samples: buffer.getChannelData(0).slice(), sampleRate: buffer.sampleRate }
  }

  if (signal?.aborted) {
    throw new Error("Encoding aborted")
  }

  // Native downmix via OfflineAudioContext instead of a manual per-sample JS loop —
  // much faster for long multi-channel buffers, since it runs in the browser's audio
  // engine rather than an interpreted loop.
  const offlineContext = new OfflineAudioContext(1, buffer.length, buffer.sampleRate)
  const source = offlineContext.createBufferSource()
  source.buffer = buffer
  source.connect(offlineContext.destination)
  source.start(0)
  const mono = await offlineContext.startRendering()

  return { samples: mono.getChannelData(0).slice(), sampleRate: mono.sampleRate }
}

let cachedWorker: Worker | null = null
const getWorker = (): Worker => {
  if (!cachedWorker) {
    cachedWorker = new Worker(new URL("../workers/opus-encoder.worker.ts", import.meta.url), { type: "module" })
  }
  return cachedWorker
}

export const bufferToOpus = async (
  buffer: AudioBuffer,
  { bitrate = 96000, maxBytes = Number.POSITIVE_INFINITY, onProgress = () => {}, signal }: OpusEncodeOptions = {},
): Promise<OpusEncodeResult> => {
  if (signal?.aborted) {
    throw new Error("Encoding aborted")
  }

  onProgress(0)

  const { samples, sampleRate } = await mixdownToMono(buffer, signal)

  if (signal?.aborted) {
    throw new Error("Encoding aborted")
  }

  onProgress(5)

  const worker = getWorker()
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

  return new Promise<OpusEncodeResult>((resolve, reject) => {
    const onAbort = () => {
      cleanup()
      reject(new Error("Encoding aborted"))
    }

    const cleanup = () => {
      worker.removeEventListener("message", onMessage)
      worker.removeEventListener("error", onError)
      signal?.removeEventListener("abort", onAbort)
    }

    const onMessage = (event: MessageEvent<OpusEncodeResponse>) => {
      const message = event.data
      if (message.id !== id) return

      if (message.type === "progress") {
        onProgress(5 + Math.round((message.progress / 100) * 95))
      } else if (message.type === "complete") {
        cleanup()
        onProgress(100)
        resolve({
          blob: new Blob([message.bytes], { type: "audio/ogg" }),
          container: "ogg",
          codec: "opus",
          sampleRate: message.sampleRate,
          channels: message.channels,
          bitrate: Math.round(message.bitrate / 1000),
          duration: message.duration,
        })
      } else if (message.type === "error") {
        cleanup()
        reject(new Error(message.message))
      }
    }

    const onError = (event: ErrorEvent) => {
      cleanup()
      reject(new Error(`Opus encoder worker error: ${event.message}`))
    }

    worker.addEventListener("message", onMessage)
    worker.addEventListener("error", onError)
    signal?.addEventListener("abort", onAbort)

    const pcmBuffer = samples.buffer as ArrayBuffer
    const request: OpusEncodeRequest = {
      id,
      pcm: pcmBuffer,
      sampleRate,
      duration: buffer.duration,
      bitrate,
      maxBytes,
    }
    worker.postMessage(request, [pcmBuffer])
  })
}
