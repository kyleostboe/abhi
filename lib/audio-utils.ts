// lib/audio-utils.ts
let audioContext: AudioContext | null = null

// Initialize AudioContext on user interaction
const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

// Map note names to frequencies (A4 = 440 Hz)
const noteFrequencies: { [key: string]: number } = {
  C: 261.63,
  "C#": 277.18,
  D: 293.66,
  "D#": 311.13,
  E: 329.63,
  F: 349.23,
  "F#": 369.99,
  G: 392.0,
  "G#": 415.3,
  A: 440.0,
  "A#": 466.16,
  B: 493.88,
}

export const playNote = (note: string, octave: number, duration = 0.5, volume = 0.7) => {
  const context = getAudioContext()
  if (!context) {
    console.warn("AudioContext not available.")
    return
  }

  const oscillator = context.createOscillator()
  const gainNode = context.createGain()

  // Calculate frequency based on note and octave
  let frequency = noteFrequencies[note.toUpperCase()]
  if (frequency) {
    // Adjust frequency for octave (e.g., C4 to C5 is double the frequency)
    frequency *= Math.pow(2, octave - 4) // Assuming 4 is the base octave for noteFrequencies
  } else {
    console.warn(`Unknown note: ${note}`)
    return
  }

  oscillator.type = "sine" // You can change this to 'square', 'sawtooth', 'triangle'
  oscillator.frequency.setValueAtTime(frequency, context.currentTime)

  gainNode.gain.setValueAtTime(volume, context.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration) // Fade out

  oscillator.connect(gainNode)
  gainNode.connect(context.destination)

  oscillator.start(context.currentTime)
  oscillator.stop(context.currentTime + duration)
}

// Ensure AudioContext is resumed on user interaction for browsers that require it
document.documentElement.addEventListener("mousedown", () => {
  if (audioContext && audioContext.state === "suspended") {
    audioContext.resume()
  }
})
