import type { AudioEncodeRequest, AudioEncodeResponse, AudioTargetFormat } from "@/workers/audio-encoder.worker"

export type { AudioTargetFormat }

export interface AudioFormatEncodeOptions {
  bitrate?: number
  maxBytes?: number
  onProgress?: (progress: number) => void
  signal?: AbortSignal
}

export interface AudioFormatEncodeResult {
  blob: Blob
  container: "ogg" | "m4a" | "wav"
  codec: "opus" | "aac" | "pcm"
  sampleRate: number
  channels: number
  bitrate?: number
  duration: number
}

const MIME_TYPE: Record<AudioTargetFormat, string> = {
  opus: "audio/ogg",
  aac: "audio/mp4",
  wav: "audio/wav",
}

const CONTAINER: Record<AudioTargetFormat, AudioFormatEncodeResult["container"]> = {
  opus: "ogg",
  aac: "m4a",
  wav: "wav",
}

const CODEC: Record<AudioTargetFormat, AudioFormatEncodeResult["codec"]> = {
  opus: "opus",
  aac: "aac",
  wav: "pcm",
}

// Used to probe <audio> playback support for each container/codec combination.
const PLAYBACK_MIME_PROBE: Record<AudioTargetFormat, string> = {
  opus: 'audio/ogg; codecs="opus"',
  aac: 'audio/mp4; codecs="mp4a.40.2"',
  wav: "audio/wav",
}

// mediabunny/WebCodecs codec identifiers used for canEncodeAudio() feature detection.
const WEBCODECS_CODEC: Partial<Record<AudioTargetFormat, "opus" | "aac">> = {
  opus: "opus",
  aac: "aac",
}

const supportCache = new Map<AudioTargetFormat, Promise<boolean>>()

/**
 * Checks both that the browser can encode the given format via WebCodecs AND that its
 * <audio> element can actually play back the resulting container. Without the playback
 * check we could "successfully" encode a file the app's own player can't play (this is
 * what happened to WebM on Safari historically), so the check is self-healing across
 * browsers rather than hardcoding which browsers are excluded.
 *
 * WAV is uncompressed PCM and always supported — nothing to gate.
 */
export function isFormatEncodingSupported(format: AudioTargetFormat, bitrate = 96000): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false)
  }

  if (format === "wav") {
    return Promise.resolve(true)
  }

  if (!supportCache.has(format)) {
    supportCache.set(
      format,
      (async () => {
        try {
          if (typeof AudioEncoder === "undefined") {
            return false
          }

          const probe = document.createElement("audio")
          if (probe.canPlayType(PLAYBACK_MIME_PROBE[format]) === "") {
            return false
          }

          const { canEncodeAudio } = await import("mediabunny")
          return await canEncodeAudio(WEBCODECS_CODEC[format]!, { sampleRate: 48000, numberOfChannels: 1, bitrate })
        } catch {
          return false
        }
      })(),
    )
  }

  return supportCache.get(format)!
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
    cachedWorker = new Worker(new URL("../workers/audio-encoder.worker.ts", import.meta.url), { type: "module" })
  }
  return cachedWorker
}

export const encodeToFormat = async (
  buffer: AudioBuffer,
  format: AudioTargetFormat,
  { bitrate = 96000, maxBytes = Number.POSITIVE_INFINITY, onProgress = () => {}, signal }: AudioFormatEncodeOptions = {},
): Promise<AudioFormatEncodeResult> => {
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

  return new Promise<AudioFormatEncodeResult>((resolve, reject) => {
    const onAbort = () => {
      cleanup()
      reject(new Error("Encoding aborted"))
    }

    const cleanup = () => {
      worker.removeEventListener("message", onMessage)
      worker.removeEventListener("error", onError)
      signal?.removeEventListener("abort", onAbort)
    }

    const onMessage = (event: MessageEvent<AudioEncodeResponse>) => {
      const message = event.data
      if (message.id !== id) return

      if (message.type === "progress") {
        onProgress(5 + Math.round((message.progress / 100) * 95))
      } else if (message.type === "complete") {
        cleanup()
        onProgress(100)
        resolve({
          blob: new Blob([message.bytes], { type: MIME_TYPE[format] }),
          container: CONTAINER[format],
          codec: CODEC[format],
          sampleRate: message.sampleRate,
          channels: message.channels,
          bitrate: format === "wav" ? undefined : Math.round(message.bitrate / 1000),
          duration: message.duration,
        })
      } else if (message.type === "error") {
        cleanup()
        reject(new Error(message.message))
      }
    }

    const onError = (event: ErrorEvent) => {
      cleanup()
      reject(new Error(`Audio encoder worker error: ${event.message}`))
    }

    worker.addEventListener("message", onMessage)
    worker.addEventListener("error", onError)
    signal?.addEventListener("abort", onAbort)

    const pcmBuffer = samples.buffer as ArrayBuffer
    const request: AudioEncodeRequest = {
      id,
      pcm: pcmBuffer,
      sampleRate,
      duration: buffer.duration,
      bitrate,
      maxBytes,
      format,
    }
    worker.postMessage(request, [pcmBuffer])
  })
}
