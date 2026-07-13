/// <reference lib="webworker" />

import { Application, Signal, createEncoder } from "../vendor/libopus-wasm/index.js"
import { muxOggOpus } from "@/lib/ogg-opus-muxer"

type EncodeRequest = {
  id: string
  pcm: ArrayBuffer
  sampleRate: number
  sourceSampleRate: number
  bitrate: number
}

type WorkerResponse =
  | { id: string; type: "progress"; progress: number }
  | { id: string; type: "complete"; bytes: ArrayBuffer; preSkip: number }
  | { id: string; type: "error"; message: string }

const worker = self as DedicatedWorkerGlobalScope

worker.onmessage = async (event: MessageEvent<EncodeRequest>) => {
  const { id, pcm, sampleRate, sourceSampleRate, bitrate } = event.data
  let encoder: Awaited<ReturnType<typeof createEncoder>> | null = null

  try {
    if (sampleRate !== 48000) throw new Error(`Opus worker requires 48 kHz PCM; received ${sampleRate} Hz`)

    const samples = new Float32Array(pcm)
    encoder = await createEncoder({
      sampleRate,
      channels: 1,
      application: Application.Audio,
      signal: Signal.Music,
      bitrate,
      vbr: true,
      complexity: 10,
    })

    const frameSize = encoder.frameSize
    const packetCount = Math.ceil(samples.length / frameSize)
    const packets: Uint8Array[] = []

    for (let packetIndex = 0; packetIndex < packetCount; packetIndex++) {
      const start = packetIndex * frameSize
      const end = Math.min(start + frameSize, samples.length)
      const frame = new Float32Array(frameSize)
      frame.set(samples.subarray(start, end))
      packets.push(encoder.encodeFloat(frame))

      if (packetIndex % 25 === 0 || packetIndex === packetCount - 1) {
        const response: WorkerResponse = {
          id,
          type: "progress",
          progress: Math.round(((packetIndex + 1) / packetCount) * 100),
        }
        worker.postMessage(response)
      }
    }

    const preSkip = encoder.getLookahead()
    const ogg = muxOggOpus({
      packets,
      channels: 1,
      preSkip,
      sourceSampleRate,
      sourceSamples: samples.length,
      frameSize,
    })
    const bytes = ogg.buffer.slice(ogg.byteOffset, ogg.byteOffset + ogg.byteLength)
    const response: WorkerResponse = { id, type: "complete", bytes, preSkip }
    worker.postMessage(response, [bytes])
  } catch (error) {
    const response: WorkerResponse = {
      id,
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    }
    worker.postMessage(response)
  } finally {
    encoder?.free()
  }
}

export {}
