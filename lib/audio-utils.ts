import * as Tone from "tone"

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${["Bytes", "KB", "MB", "GB"][i]}`
}

export const formatTime = (seconds: number): string => {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface AudioAnalysis {
  totalSilence: number
  contentDuration: number
  silenceRegions: number
}

export interface SilenceRegion {
  start: number
  end: number
}

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

export const analyzeAudio = async (
  buffer: AudioBuffer,
  silenceThreshold: number,
  minSilenceDuration: number,
): Promise<AudioAnalysis> => {
  const silenceRegions = await detectSilenceRegions(buffer, silenceThreshold, minSilenceDuration)
  const totalSilenceDuration = silenceRegions.reduce((sum, region) => sum + (region.end - region.start), 0)
  const audioContentDuration = buffer.duration - totalSilenceDuration

  return {
    totalSilence: totalSilenceDuration,
    contentDuration: audioContentDuration,
    silenceRegions: silenceRegions.length,
  }
}

export const detectSilenceRegions = async (
  buffer: AudioBuffer,
  threshold: number,
  minDuration: number,
): Promise<SilenceRegion[]> => {
  const channelData = buffer.getChannelData(0)
  const sampleRate = buffer.sampleRate
  const regions: SilenceRegion[] = []

  let silenceStart = -1
  const windowSize = Math.floor(sampleRate * 0.01) // 10ms windows

  for (let i = 0; i < channelData.length; i += windowSize) {
    const windowEnd = Math.min(i + windowSize, channelData.length)
    let rms = 0

    // Calculate RMS for this window
    for (let j = i; j < windowEnd; j++) {
      rms += channelData[j] * channelData[j]
    }
    rms = Math.sqrt(rms / (windowEnd - i))

    const currentTime = i / sampleRate

    if (rms < threshold) {
      if (silenceStart === -1) {
        silenceStart = currentTime
      }
    } else {
      if (silenceStart !== -1) {
        const silenceDuration = currentTime - silenceStart
        if (silenceDuration >= minDuration) {
          regions.push({ start: silenceStart, end: currentTime })
        }
        silenceStart = -1
      }
    }
  }

  // Handle silence at the end
  if (silenceStart !== -1) {
    const silenceDuration = buffer.duration - silenceStart
    if (silenceDuration >= minDuration) {
      regions.push({ start: silenceStart, end: buffer.duration })
    }
  }

  return regions
}

export const processAudioBuffer = async (
  buffer: AudioBuffer,
  targetDuration: number,
  onProgress: (progress: number) => void,
): Promise<AudioBuffer> => {
  const audioContext = getAudioContext()
  const targetSamples = Math.floor(targetDuration * 60 * buffer.sampleRate)
  const processedBuffer = audioContext.createBuffer(buffer.numberOfChannels, targetSamples, buffer.sampleRate)

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const inputData = buffer.getChannelData(channel)
    const outputData = processedBuffer.getChannelData(channel)

    // Simple time-stretching by repeating/truncating
    for (let i = 0; i < targetSamples; i++) {
      const sourceIndex = Math.floor((i / targetSamples) * inputData.length)
      outputData[i] = inputData[Math.min(sourceIndex, inputData.length - 1)]

      if (i % 44100 === 0) {
        onProgress((i / targetSamples) * 100)
        await sleep(0)
      }
    }
  }

  onProgress(100)
  return processedBuffer
}

export const generateSineWave = async (frequency: number, duration: number, volume = 0.5): Promise<AudioBuffer> => {
  const audioContext = getAudioContext()
  const sampleRate = audioContext.sampleRate
  const samples = Math.floor(duration * sampleRate)
  const buffer = audioContext.createBuffer(1, samples, sampleRate)
  const channelData = buffer.getChannelData(0)

  for (let i = 0; i < samples; i++) {
    channelData[i] = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * volume
  }

  return buffer
}

export const generateHarpNote = async (frequency: number, duration: number, volume = 0.5): Promise<AudioBuffer> => {
  const audioContext = getAudioContext()
  const sampleRate = audioContext.sampleRate
  const samples = Math.floor(duration * sampleRate)
  const buffer = audioContext.createBuffer(1, samples, sampleRate)
  const channelData = buffer.getChannelData(0)

  // Harp-like sound with harmonics and decay
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    const decay = Math.exp(-t * 2)
    const fundamental = Math.sin(2 * Math.PI * frequency * t)
    const harmonic2 = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.5
    const harmonic3 = Math.sin(2 * Math.PI * frequency * 3 * t) * 0.25

    channelData[i] = (fundamental + harmonic2 + harmonic3) * decay * volume
  }

  return buffer
}

export const generatePianoNote = async (frequency: number, duration: number, volume = 0.5): Promise<AudioBuffer> => {
  const audioContext = getAudioContext()
  const sampleRate = audioContext.sampleRate
  const samples = Math.floor(duration * sampleRate)
  const buffer = audioContext.createBuffer(1, samples, sampleRate)
  const channelData = buffer.getChannelData(0)

  // Piano-like sound with multiple harmonics and envelope
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate
    const attack = Math.min(1, t * 10) // Quick attack
    const decay = Math.exp(-t * 1.5) // Slower decay
    const envelope = attack * decay

    const fundamental = Math.sin(2 * Math.PI * frequency * t)
    const harmonic2 = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.3
    const harmonic3 = Math.sin(2 * Math.PI * frequency * 3 * t) * 0.2
    const harmonic4 = Math.sin(2 * Math.PI * frequency * 4 * t) * 0.1

    channelData[i] = (fundamental + harmonic2 + harmonic3 + harmonic4) * envelope * volume
  }

  return buffer
}

export const bufferToWav = async (
  buffer: AudioBuffer,
  highCompatibility = true,
  onProgress: (progress: number) => void,
  isMobileDevice: boolean,
): Promise<Blob> => {
  const currentAudioContext = Tone.context.rawContext as AudioContext
  if (!currentAudioContext) throw new Error("Audio context not available for WAV conversion")
  onProgress(0)

  let targetSampleRate = highCompatibility ? 44100 : buffer.sampleRate
  if (isMobileDevice && highCompatibility && buffer.duration > 15 * 60) {
    targetSampleRate = Math.min(targetSampleRate, 22050)
  }

  let resampledBuffer = buffer
  if (buffer.sampleRate !== targetSampleRate) {
    const ratio = targetSampleRate / buffer.sampleRate
    const newLength = Math.floor(buffer.length * ratio)
    try {
      resampledBuffer = currentAudioContext.createBuffer(buffer.numberOfChannels, newLength, targetSampleRate)
    } catch (e) {
      // forceGarbageCollection() // This should be handled by the caller if needed
      throw new Error(
        `Failed to create resample buffer (target SR: ${targetSampleRate}Hz). Memory limit likely exceeded.`,
      )
    }
    onProgress(10)
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const oldData = buffer.getChannelData(channel)
      const newData = resampledBuffer.getChannelData(channel)
      for (let i = 0; i < newLength; i++) {
        if (i % (targetSampleRate * (isMobileDevice ? 1 : 2)) === 0) {
          await sleep(0)
          onProgress(
            10 +
              Math.floor(
                ((channel * (newLength / buffer.numberOfChannels) + i) / (newLength * buffer.numberOfChannels)) * 40,
              ),
          )
        }
        const oldIndex = i / ratio
        const index = Math.floor(oldIndex)
        const frac = oldIndex - index
        const samp1 = oldData[Math.min(index, oldData.length - 1)]
        const samp2 = oldData[Math.min(index + 1, oldData.length - 1)]
        newData[i] = samp1 + (samp2 - samp1) * frac
      }
    }
  } else {
    onProgress(50)
  }

  const numSamples = resampledBuffer.length
  const numberOfChannels = resampledBuffer.numberOfChannels
  const bytesPerSample = 2
  const dataSize = numSamples * numberOfChannels * bytesPerSample
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
  view.setUint16(22, numberOfChannels, true)
  view.setUint32(24, targetSampleRate, true)
  view.setUint32(28, targetSampleRate * numberOfChannels * bytesPerSample, true)
  view.setUint16(32, numberOfChannels * bytesPerSample, true)
  view.setUint16(34, 16, true)
  writeString(36, "data")
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    if (i % (targetSampleRate * (isMobileDevice ? 1 : 2)) === 0) {
      await sleep(0)
      onProgress(50 + Math.floor((i / numSamples) * 50))
    }
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, resampledBuffer.getChannelData(channel)[i]))
      view.setInt16(offset, sample * 0x7fff, true)
      offset += bytesPerSample
    }
  }
  onProgress(100)
  return new Blob([finalArrayBuffer], { type: "audio/wav" })
}
