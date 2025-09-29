import lamejs from "lamejs"

interface WorkerMessage {
  channelData: number[]
  sampleRate: number
  bitrate: number
}

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { channelData, sampleRate, bitrate } = e.data

  try {
    // Convert Float32Array to Int16Array for lamejs
    const samples = new Int16Array(channelData.length)
    for (let i = 0; i < channelData.length; i++) {
      const s = Math.max(-1, Math.min(1, channelData[i]))
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }

    // Initialize MP3 encoder (mono, sample rate, bitrate)
    const mp3encoder = new lamejs.Mp3Encoder(1, sampleRate, bitrate)
    const mp3Data: Int8Array[] = []

    // Encode in chunks (1152 is standard MP3 frame size)
    const sampleBlockSize = 1152

    for (let i = 0; i < samples.length; i += sampleBlockSize) {
      const sampleChunk = samples.subarray(i, i + sampleBlockSize)
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk)

      if (mp3buf.length > 0) {
        mp3Data.push(new Int8Array(mp3buf))
      }

      // Report progress every 10 blocks
      if (i % (sampleBlockSize * 10) === 0) {
        const progress = (i / samples.length) * 100
        self.postMessage({ type: "progress", progress })
      }
    }

    // Flush remaining data
    const mp3buf = mp3encoder.flush()
    if (mp3buf.length > 0) {
      mp3Data.push(new Int8Array(mp3buf))
    }

    self.postMessage({ type: "complete", mp3Data })
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : "MP3 encoding failed",
    })
  }
}
