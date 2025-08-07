import { NOTE_FREQUENCIES } from "./meditation-data"
import { sleep, formatFileSize } from "./utils"

let audioContext: AudioContext | null = null

// Initialize AudioContext on user interaction
export const getAudioContext = (): AudioContext => {
  if (!audioContext || audioContext.state === "closed") {
    // Attempt to create a new AudioContext if it's null or closed
    const AudioContextAPI = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContextAPI) {
      throw new Error("Your browser does not support the Web Audio API.")
    }
    audioContext = new AudioContextAPI({ sampleRate: 44100 }) // Default to 44.1kHz
    // Resume context if suspended on user interaction
    if (audioContext.state === "suspended") {
      const resumeContext = async () => {
        if (audioContext && audioContext.state === "suspended") {
          try {
            await audioContext.resume()
          } catch (e) {
            console.error("Error resuming AudioContext:", e)
          }
        }
        document.removeEventListener("click", resumeContext, true)
        document.removeEventListener("touchend", resumeContext, true)
        document.removeEventListener("keydown", resumeContext, true)
      }
      document.addEventListener("click", resumeContext, { once: true, capture: true })
      document.addEventListener("touchend", resumeContext, { once: true, capture: true })
      document.addEventListener("keydown", resumeContext, { once: true, capture: true })
    }
  }
  return audioContext
}

export const playNote = async (note: string, octave: number, duration = 0.8, volume = 0.7) => {
  const context = getAudioContext() // Get the shared AudioContext
  if (!context) {
    console.warn("AudioContext not available.")
    return
  }

  // Ensure context is running before playing
  if (context.state === "suspended") {
    try {
      await context.resume()
    } catch (e) {
      console.error("Failed to resume AudioContext before playing note:", e)
      return
    }
  }

  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  // Calculate frequency based on note and octave
  const noteKey = `${note}${octave}` as keyof typeof NOTE_FREQUENCIES
  const frequency = NOTE_FREQUENCIES[noteKey]

  if (!frequency) {
    console.warn(`Unknown note: ${noteKey}`)
    return
  }

  oscillator.type = "sine" // You can change this to 'square', 'sawtooth', 'triangle'
  oscillator.frequency.setValueAtTime(frequency, context.currentTime)

  // Gentle envelope for smooth, meditation-friendly tones
  const now = context.currentTime
  gainNode.gain.setValueAtTime(0, now)
  gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.05) // Gentle attack
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration) // Smooth release

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)

  oscillator.start(now)
  oscillator.stop(now + duration)
}

export const bufferToWav = async (
  buffer: AudioBuffer,
  highCompatibility = true,
  onProgress: (progress: number) => void,
  isMobileDevice: boolean,
): Promise<Blob> => {
  const currentAudioContext = getAudioContext() // Use the centralized AudioContext
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

import { AmbientSound, SoundCue } from "../types"

export async function generateSyntheticSound(
  soundCue: SoundCue,
  audioContext: AudioContext | OfflineAudioContext,
  destinationNode: AudioNode, // Add this parameter
): Promise<void> {
  try {
    // Create oscillator
    const oscillator = audioContext.createOscillator()
    oscillator.type = soundCue.waveform
    oscillator.frequency.setValueAtTime(soundCue.frequency, audioContext.currentTime)

    // Create gain node for volume control
    const gainNode = audioContext.createGain()
    gainNode.gain.setValueAtTime(soundCue.volume, audioContext.currentTime)

    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(destinationNode) // Connect to the passed destinationNode

    // Start and stop the oscillator
    oscillator.start(0)
    oscillator.stop(audioContext.currentTime + soundCue.duration)
  } catch (error) {
    console.error("Error generating synthetic sound:", error)
    throw error
  }
}

export async function generateAmbientSound(
  ambient: AmbientSound,
  audioContext: AudioContext | OfflineAudioContext,
  duration: number,
  volumeOverride?: number,
  destinationNode?: AudioNode, // Add this parameter
): Promise<void> {
  try {
    if (audioContext instanceof AudioContext && audioContext.state === "suspended") {
      await audioContext.resume()
    }

    const targetVolume = volumeOverride ?? ambient.volume ?? 0.2

    // Master gain node for overall volume control
    const masterGain = audioContext.createGain()
    masterGain.gain.setValueAtTime(targetVolume, audioContext.currentTime)

    const finalDestination = destinationNode || audioContext.destination; // Use passed node or default

    const panner = new StereoPannerNode(audioContext, { pan: 0 })
    masterGain.connect(panner)

    const panLfo = audioContext.createOscillator()
    const panLfoGain = audioContext.createGain()
    panLfo.type = "sine"
    panLfo.frequency.value = 0.03 + Math.random() * 0.02
    panLfoGain.gain.value = 0.5
    panLfo.connect(panLfoGain).connect(panner.pan)
    panLfo.start(0)
    panLfo.stop(duration)

    const dryGain = audioContext.createGain()
    dryGain.gain.value = 0.7

    const wetGain = audioContext.createGain()
    wetGain.gain.value = 0.3

    const reverb = audioContext.createConvolver()
    reverb.buffer = createSimpleReverbBuffer(audioContext, 2.5, 2)

    panner.connect(dryGain).connect(finalDestination) // Connect to finalDestination
    panner.connect(reverb).connect(wetGain).connect(finalDestination) // Connect to finalDestination

    switch (ambient.id) {
      case "rain":
        await generateHyperrealisticRain(audioContext, masterGain, duration) // Pass masterGain as destination
        break
      case "waves":
        await generateHyperrealisticWaves(audioContext, masterGain, duration) // Pass masterGain as destination
        break
      case "forest":
        await generateHyperrealisticForest(audioContext, masterGain, duration) // Pass masterGain as destination
        break
      case "wind":
        await generateHyperrealisticWind(audioContext, masterGain, duration) // Pass masterGain as destination
        break
      default:
        // Fallback to a simpler but improved noise generator
        await generateSimpleNoise(audioContext, masterGain, duration, ambient) // Pass masterGain as destination
        break
    }
  } catch (error) {
    console.error(`Error generating ambient sound for ${ambient.id}:`, error)
    throw error
  }
}

// Update the `generateHyperrealisticRain` function to connect to the passed `destination`
async function generateHyperrealisticRain(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode, // This is now the masterGain from generateAmbientSound
  duration: number,
): Promise<void> {
  // Hiss sound (high-frequency noise)
  const hissSource = audioContext.createBufferSource()
  hissSource.buffer = createNoiseBuffer(audioContext, duration)
  hissSource.loop = true

  const hissFilter = audioContext.createBiquadFilter()
  hissFilter.type = "highpass"
  hissFilter.frequency.value = 8000 // Focus on high frequencies

  const hissGain = audioContext.createGain()
  hissGain.gain.value = 0.01 // Subtle hiss

  // Rumble sound (low-frequency noise)
  const rumbleSource = audioContext.createBufferSource()
  rumbleSource.buffer = createNoiseBuffer(audioContext, duration)
  rumbleSource.loop = true

  const rumbleFilter = audioContext.createBiquadFilter()
  rumbleFilter.type = "lowpass"
  rumbleFilter.frequency.value = 200 // Focus on low frequencies

  const rumbleGain = audioContext.createGain()
  rumbleGain.gain.value = 0.005 // Very subtle rumble

  hissSource.connect(hissFilter).connect(hissGain).connect(destination)
  rumbleSource.connect(rumbleFilter).connect(rumbleGain).connect(destination)

  hissSource.start(0)
  rumbleSource.start(0)

  // Raindrops
  const numDrops = Math.floor(duration * 2) // Adjust density as needed
  for (let i = 0; i < numDrops; i++) {
    const time = Math.random() * duration
    createRaindrop(audioContext, destination, time)
  }

  hissSource.stop(duration)
  rumbleSource.stop(duration)
}

// Update the `createRaindrop` function to connect to the passed `destination`
function createRaindrop(audioContext: AudioContext | OfflineAudioContext, destination: AudioNode, time: number) {
  const osc = audioContext.createOscillator()
  osc.type = "sine"
  osc.frequency.value = 300 + Math.random() * 500 // Vary pitch

  const gain = audioContext.createGain()
  gain.gain.setValueAtTime(0, time)
  gain.gain.linearRampToValueAtTime(0.002, time + 0.02) // Quick attack
  gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.2) // Longer decay

  const panValue = -0.8 + Math.random() * 1.6
  const panner = new StereoPannerNode(audioContext, { pan: panValue })

  osc.connect(gain).connect(panner).connect(destination)

  osc.start(time)
  osc.stop(time + 0.2)
}

// Update the `generateHyperrealisticWaves` function to connect to the passed `destination`
async function generateHyperrealisticWaves(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode, // This is now the masterGain from generateAmbientSound
  duration: number,
): Promise<void> {
  // Base wave sound (low-frequency noise)
  const baseSource = audioContext.createBufferSource()
  baseSource.buffer = createNoiseBuffer(audioContext, duration)
  baseSource.loop = true

  const waveGain = audioContext.createGain()
  waveGain.gain.value = 0.02 // Adjust for balance

  const waveFilter = audioContext.createBiquadFilter()
  waveFilter.type = "lowpass"
  waveFilter.frequency.value = 600 // Focus on low frequencies

  // Foam sound (high-frequency noise)
  const foamSource = audioContext.createBufferSource()
  foamSource.buffer = createNoiseBuffer(audioContext, duration)
  foamSource.loop = true

  const foamGain = audioContext.createGain()
  foamGain.gain.value = 0.005 // Adjust for balance

  const foamFilter = audioContext.createBiquadFilter()
  foamFilter.type = "highpass"
  foamFilter.frequency.value = 1000 // Focus on high frequencies

  baseSource.connect(waveGain).connect(waveFilter).connect(destination)
  foamSource.connect(foamFilter).connect(foamGain).connect(destination)

  baseSource.start(0)
  foamSource.start(0)

  baseSource.stop(duration)
  foamSource.stop(duration)
}

// Update the `generateHyperrealisticForest` function to connect to the passed `destination`
async function generateHyperrealisticForest(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode, // This is now the masterGain from generateAmbientSound
  duration: number,
): Promise<void> {
  // Rustling leaves (mid-frequency noise)
  const rustleSource = audioContext.createBufferSource()
  rustleSource.buffer = createNoiseBuffer(audioContext, duration)
  rustleSource.loop = true

  const rustleGain = audioContext.createGain()
  rustleGain.gain.value = 0.008 // Adjust for balance

  const rustleFilter = audioContext.createBiquadFilter()
  rustleFilter.type = "bandpass"
  rustleFilter.frequency.value = 1500 // Focus on mid frequencies
  rustleFilter.Q.value = 0.8

  // Insect ambience (high-frequency noise)
  const insectSource = audioContext.createBufferSource()
  insectSource.buffer = createNoiseBuffer(audioContext, duration)
  insectSource.loop = true

  const insectGain = audioContext.createGain()
  insectGain.gain.value = 0.003 // Adjust for balance

  const insectFilter = audioContext.createBiquadFilter()
  insectFilter.type = "highpass"
  insectFilter.frequency.value = 6000 // Focus on high frequencies

  rustleSource.connect(rustleFilter).connect(rustleGain).connect(destination)
  insectSource.connect(insectFilter).connect(insectGain).connect(destination)

  rustleSource.start(0)
  insectSource.start(0)

  // Bird chirps
  const numChirps = Math.floor(duration * 0.3) // Adjust density as needed
  for (let i = 0; i < numChirps; i++) {
    const time = Math.random() * duration
    const freq = 1500 + Math.random() * 2000
    const dur = 0.08 + Math.random() * 0.12
    const pan = -0.6 + Math.random() * 1.2
    createBirdChirp(audioContext, destination, time, freq, dur, pan)
  }

  // Bird warbles
  const numWarbles = Math.floor(duration * 0.1) // Adjust density as needed
  for (let i = 0; i < numWarbles; i++) {
    const time = Math.random() * duration
    const freq = 800 + Math.random() * 1200
    const dur = 0.2 + Math.random() * 0.3
    const pan = -0.7 + Math.random() * 1.4
    createBirdWarble(audioContext, destination, time, freq, dur, pan)
  }

  rustleSource.stop(duration)
  insectSource.stop(duration)
}

// Update the `createBirdChirp` function to connect to the passed `destination`
function createBirdChirp(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  time: number,
  freq: number,
  dur: number,
  pan: number,
) {
  const osc = audioContext.createOscillator()
  osc.type = "sine"
  osc.frequency.value = freq

  const gain = audioContext.createGain()
  gain.gain.setValueAtTime(0, time)
  gain.gain.exponentialRampToValueAtTime(0.008, time + dur / 2)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur)

  const panner = new StereoPannerNode(audioContext, { pan: pan })

  osc.connect(gain).connect(panner).connect(destination)

  osc.start(time)
  osc.stop(time + dur)
}

// Update the `createBirdWarble` function to connect to the passed `destination`
function createBirdWarble(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode,
  time: number,
  freq: number,
  dur: number,
  pan: number,
) {
  const osc = audioContext.createOscillator()
  osc.type = "sine"
  osc.frequency.value = freq

  const gain = audioContext.createGain()
  gain.gain.setValueAtTime(0, time)
  gain.gain.exponentialRampToValueAtTime(0.005, time + dur / 3)
  gain.gain.exponentialRampToValueAtTime(0.0001, time + dur)

  const panner = new StereoPannerNode(audioContext, { pan: pan })

  osc.connect(gain).connect(panner).connect(destination)

  osc.start(time)
  osc.stop(time + dur)
}

// Update the `generateHyperrealisticWind` function to connect to the passed `destination`
async function generateHyperrealisticWind(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode, // This is now the masterGain from generateAmbientSound
  duration: number,
): Promise<void> {
  // Howling wind (low-mid frequency noise)
  const howlSource = audioContext.createBufferSource()
  howlSource.buffer = createNoiseBuffer(audioContext, duration)
  howlSource.loop = true

  const howlGain = audioContext.createGain()
  howlGain.gain.value = 0.006 // Adjust for balance

  const howlFilter = audioContext.createBiquadFilter()
  howlFilter.type = "bandpass"
  howlFilter.frequency.value = 800 // Focus on low-mid frequencies
  howlFilter.Q.value = 0.6

  // Whooshing wind (mid-high frequency noise)
  const whooshSource = audioContext.createBufferSource()
  whooshSource.buffer = createNoiseBuffer(audioContext, duration)
  whooshSource.loop = true

  const whooshGain = audioContext.createGain()
  whooshGain.gain.value = 0.004 // Adjust for balance

  const whooshFilter = audioContext.createBiquadFilter()
  whooshFilter.type = "bandpass"
  whooshFilter.frequency.value = 3000 // Focus on mid-high frequencies
  whooshFilter.Q.value = 0.4

  // Whistling wind (high frequency noise)
  const whistleSource = audioContext.createBufferSource()
  whistleSource.buffer = createNoiseBuffer(audioContext, duration)
  whistleSource.loop = true

  const whistleGain = audioContext.createGain()
  whistleGain.gain.value = 0.002 // Adjust for balance

  const whistleFilter = audioContext.createBiquadFilter()
  whistleFilter.type = "highpass"
  whistleFilter.frequency.value = 7000 // Focus on high frequencies

  howlSource.connect(howlFilter).connect(howlGain).connect(destination)
  whooshSource.connect(whooshFilter).connect(whooshGain).connect(destination)
  whistleSource.connect(whistleFilter).connect(whistleGain).connect(destination)

  howlSource.start(0)
  whooshSource.start(0)
  whistleSource.start(0)

  howlSource.stop(duration)
  whooshSource.stop(duration)
  whistleSource.stop(duration)
}

// Update the `generateSimpleNoise` function to connect to the passed `destination`
async function generateSimpleNoise(
  audioContext: AudioContext | OfflineAudioContext,
  destination: AudioNode, // This is now the masterGain from generateAmbientSound
  duration: number,
  ambient: AmbientSound,
): Promise<void> {
  const bufferSize = audioContext instanceof OfflineAudioContext ? audioContext.length : 4096
  const noise = ((): ScriptProcessorNode => {
    const node = audioContext.createScriptProcessor(bufferSize, 1, 1)
    node.onaudioprocess = function (e) {
      const output = e.outputBuffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1
      }
    }
    return node
  })()

  const gainNode = audioContext.createGain()
  gainNode.gain.value = ambient.volume ?? 0.1

  noise.connect(gainNode)
  gainNode.connect(destination)

  noise.connect(gainNode)
  gainNode.connect(destination)

  noise.start = noise.connect
  noise.stop = (d: number) => {
    setTimeout(() => {
      noise.disconnect()
      gainNode.disconnect()
    }, d * 1000)
  }

  noise.start(audioContext.destination)
  noise.stop(duration)
}

function createNoiseBuffer(audioContext: BaseAudioContext, duration: number): AudioBuffer {
  const sampleRate = audioContext.sampleRate
  const length = sampleRate * duration
  const buffer = audioContext.createBuffer(1, length, sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1
  }
  return buffer
}

function createSimpleReverbBuffer(audioContext: BaseAudioContext, duration = 1, decay = 2): AudioBuffer {
  const sampleRate = audioContext.sampleRate
  const length = sampleRate * duration
  const buffer = audioContext.createBuffer(2, length, sampleRate)
  const left = buffer.getChannelData(0)
  const right = buffer.getChannelData(1)

  for (let i = 0; i < length; i++) {
    const time = i / sampleRate
    const amplitude = Math.exp(-time / decay)
    left[i] = (Math.random() * 2 - 1) * amplitude
    right[i] = (Math.random() * 2 - 1) * amplitude
  }
  return buffer
}
