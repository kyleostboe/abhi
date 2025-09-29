import * as Tone from "tone"
import { sleep, formatFileSize } from "./utils"

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
