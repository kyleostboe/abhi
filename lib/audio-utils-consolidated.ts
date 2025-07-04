// Consolidated audio utilities
export const NOTE_FREQUENCIES = {
  C3: 130.81,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  B3: 246.94,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  B5: 987.77,
}

export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${["Bytes", "KB", "MB", "GB"][i]}`
}

export const isMobile = (): boolean => {
  if (typeof window === "undefined") return false
  return /Android|webOS|iPhone|iPad|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768
}

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

export const forceGarbageCollection = (): void => {
  if (typeof window !== "undefined" && (window as any).gc) {
    console.log("Attempting to force garbage collection.")
    ;(window as any).gc()
  }
}

export const monitorMemory = (): boolean => {
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const memory = (performance as any).memory
    const usedMB = memory.usedJSHeapSize / 1048576
    const limitMB = memory.jsHeapSizeLimit / 1048576
    console.log(`Memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`)
    if (usedMB > limitMB * 0.75) {
      console.warn("High memory usage detected, forcing GC.")
      forceGarbageCollection()
      return true
    }
  }
  return false
}

export const bufferToWav = async (buffer: AudioBuffer): Promise<Blob> => {
  const numberOfChannels = buffer.numberOfChannels
  const numSamples = buffer.length
  const sampleRate = buffer.sampleRate
  const bytesPerSample = 2
  const blockAlign = numberOfChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = numSamples * blockAlign
  const fileSize = 44 + dataSize

  const arrayBuffer = new ArrayBuffer(fileSize)
  const dataView = new DataView(arrayBuffer)

  // WAV header
  dataView.setUint32(0, 0x52494646, false) // "RIFF"
  dataView.setUint32(4, fileSize - 8, true)
  dataView.setUint32(8, 0x57415645, false) // "WAVE"
  dataView.setUint32(12, 0x666d7420, false) // "fmt "
  dataView.setUint32(16, 16, true)
  dataView.setUint16(20, 1, true)
  dataView.setUint16(22, numberOfChannels, true)
  dataView.setUint32(24, sampleRate, true)
  dataView.setUint32(28, byteRate, true)
  dataView.setUint16(32, blockAlign, true)
  dataView.setUint16(34, bytesPerSample * 8, true)
  dataView.setUint32(36, 0x64617461, false) // "data"
  dataView.setUint32(40, dataSize, true)

  // Write samples
  let offset = 44
  for (let i = 0; i < numSamples; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i]
      const amplitude = Math.max(-1, Math.min(1, sample))
      dataView.setInt16(offset, amplitude * 0x7fff, true)
      offset += bytesPerSample
    }
  }

  return new Blob([arrayBuffer], { type: "audio/wav" })
}

export const playNote = async (note: string, octave: number): Promise<void> => {
  const noteKey = `${note}${octave}` as keyof typeof NOTE_FREQUENCIES
  const frequency = NOTE_FREQUENCIES[noteKey]

  if (!frequency) {
    console.warn(`Unknown note: ${noteKey}`)
    return
  }

  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  if (audioContext.state === "suspended") {
    await audioContext.resume()
  }

  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.type = "sine"
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  const noteDurationSeconds = 0.8
  const now = audioContext.currentTime

  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.exponentialRampToValueAtTime(0.2, now + 0.05)
  gainNode.gain.exponentialRampToValueAtTime(0.001, now + noteDurationSeconds)

  oscillator.start(now)
  oscillator.stop(now + noteDurationSeconds)

  setTimeout(
    () => {
      try {
        audioContext.close()
      } catch (e) {
        console.warn("Error closing audio context:", e)
      }
    },
    noteDurationSeconds * 1000 + 100,
  )
}
