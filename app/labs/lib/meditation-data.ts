import type { Instruction, SoundCue, AmbientSound } from "../../lib/types"

export const INSTRUCTIONS_LIBRARY: Instruction[] = [
  // Metta (Loving Kindness) Instructions
  {
    id: "metta-1",
    text: "May I/you/we be safe",
    category: "Metta",
  },
  {
    id: "metta-2",
    text: "May I/you/we be filled with happiness",
    category: "Metta",
  },
  {
    id: "metta-3",
    text: "May I/you/we be peaceful",
    category: "Metta",
  },
  {
    id: "metta-4",
    text: "May I/you/we live with ease and kindness",
    category: "Metta",
  },
  {
    id: "metta-5",
    text: "May I/you/we be healthy",
    category: "Metta",
  },
  {
    id: "metta-6",
    text: "May I/you/we be strong",
    category: "Metta",
  },
  {
    id: "metta-7",
    text: "May I/you/we be free from suffering",
    category: "Metta",
  },
  {
    id: "metta-8",
    text: "May I/you/we be filled with loving kindness",
    category: "Metta",
  },
  {
    id: "metta-9",
    text: "May I/you/we accept myself/yourself/ourselves as I am/you are/we are",
    category: "Metta",
  },
  {
    id: "metta-10",
    text: "May I/you/we forgive myself/yourself/ourselves",
    category: "Metta",
  },
  // Mindfulness Instructions
  {
    id: "mindfulness-1",
    text: "Breathing in, I know I am breathing in",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-2",
    text: "Breathing out, I know I am breathing out",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-3",
    text: "Long breath, I know it is long",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-4",
    text: "Short breath, I know it is short",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-5",
    text: "Breathing in, I calm my body",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-6",
    text: "I am aware of my whole body",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-7",
    text: "I release tension from my body",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-8",
    text: "Thinking, thinking",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-9",
    text: "Feeling this emotion",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-10",
    text: "Hearing sounds",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-11",
    text: "Seeing what appears",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-12",
    text: "Noticing bodily sensations",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-13",
    text: "This too shall pass",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-14",
    text: "Watching thoughts arise",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-15",
    text: "Watching thoughts pass away",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-16",
    text: "Resting in spacious awareness",
    category: "Mindfulness",
  },
  {
    id: "mindfulness-17",
    text: "Here, now, this moment",
    category: "Mindfulness",
  },
  // Nonduality Instructions
  {
    id: "nonduality-1",
    text: "Who is aware of this awareness?",
    category: "Nonduality",
  },
  {
    id: "nonduality-2",
    text: "Tat tvam asi - Thou art That",
    category: "Nonduality",
  },
  {
    id: "nonduality-3",
    text: "All is Consciousness appearing as the many",
    category: "Nonduality",
  },
  {
    id: "nonduality-4",
    text: "The seer, seeing, and seen are one",
    category: "Nonduality",
  },
  {
    id: "nonduality-5",
    text: "Pure being-consciousness-bliss (sat-chit-ananda)",
    category: "Nonduality",
  },
  {
    id: "nonduality-6",
    text: "I am Shiva - pure consciousness at rest",
    category: "Nonduality",
  },
  {
    id: "nonduality-7",
    text: "I am Shakti - consciousness in movement",
    category: "Nonduality",
  },
  {
    id: "nonduality-8",
    text: "Everything arises within me as me",
    category: "Nonduality",
  },
  {
    id: "nonduality-9",
    text: "No coming, no going - only being",
    category: "Nonduality",
  },
  {
    id: "nonduality-10",
    text: "The heart is the supreme abode",
    category: "Nonduality",
  },
  {
    id: "nonduality-11",
    text: "Pratyabhijna - recognizing what I already am",
    category: "Nonduality",
  },
  {
    id: "nonduality-12",
    text: 'Resting as the source of the "I" thought',
    category: "Nonduality",
  },
  // Body Scan Instructions
  {
    id: "body-scan-1",
    text: "Awareness at the crown of my head",
    category: "Body Scan",
  },
  {
    id: "body-scan-2",
    text: "Softening my forehead",
    category: "Body Scan",
  },
  {
    id: "body-scan-3",
    text: "Relaxing around my eyes",
    category: "Body Scan",
  },
  {
    id: "body-scan-4",
    text: "Unclenching my jaw",
    category: "Body Scan",
  },
  {
    id: "body-scan-5",
    text: "Releasing tension from my neck",
    category: "Body Scan",
  },
  {
    id: "body-scan-6",
    text: "Dropping my shoulders",
    category: "Body Scan",
  },
  {
    id: "body-scan-7",
    text: "Arms heavy and relaxed",
    category: "Body Scan",
  },
  {
    id: "body-scan-8",
    text: "Hands soft and open",
    category: "Body Scan",
  },
  {
    id: "body-scan-9",
    text: "Heart space open and free",
    category: "Body Scan",
  },
  {
    id: "body-scan-10",
    text: "Belly soft and natural",
    category: "Body Scan",
  },
  {
    id: "body-scan-11",
    text: "Spine long and supported",
    category: "Body Scan",
  },
  {
    id: "body-scan-12",
    text: "Hips heavy and grounded",
    category: "Body Scan",
  },
  {
    id: "body-scan-13",
    text: "Legs relaxed and still",
    category: "Body Scan",
  },
  {
    id: "body-scan-14",
    text: "Feet connected to earth",
    category: "Body Scan",
  },
  {
    id: "body-scan-15",
    text: "Whole body at peace",
    category: "Body Scan",
  },
  // Concentration Instructions
  {
    id: "concentration-1",
    text: "One breath, complete attention",
    category: "Concentration",
  },
  {
    id: "concentration-2",
    text: "In breath, counting one",
    category: "Concentration",
  },
  {
    id: "concentration-3",
    text: "Out breath, counting two",
    category: "Concentration",
  },
  {
    id: "concentration-4",
    text: "Air touching my nostrils",
    category: "Concentration",
  },
  {
    id: "concentration-5",
    text: "Belly rising and falling",
    category: "Concentration",
  },
  {
    id: "concentration-6",
    text: "Resting in the pause between breaths",
    category: "Concentration",
  },
  {
    id: "concentration-7",
    text: "Gently returning to my anchor",
    category: "Concentration",
  },
  // Gratitude Instructions
  {
    id: "gratitude-1",
    text: "Grateful for this breath",
    category: "Gratitude",
  },
  {
    id: "gratitude-2",
    text: "Thankful for my body",
    category: "Gratitude",
  },
  {
    id: "gratitude-3",
    text: "Grateful for this moment",
    category: "Gratitude",
  },
  {
    id: "gratitude-4",
    text: "Thankful to be alive",
    category: "Gratitude",
  },
  {
    id: "gratitude-5",
    text: "Grateful for all my teachers",
    category: "Gratitude",
  },
  // Forgiveness Instructions
  {
    id: "forgiveness-1",
    text: "I forgive myself completely",
    category: "Forgiveness",
  },
  {
    id: "forgiveness-2",
    text: "I forgive all who have hurt me",
    category: "Forgiveness",
  },
  {
    id: "forgiveness-3",
    text: "I release all past mistakes",
    category: "Forgiveness",
  },
  {
    id: "forgiveness-4",
    text: "I am free from resentment",
    category: "Forgiveness",
  },
  // Transition Instructions
  {
    id: "transitions-1",
    text: "I am ready to begin",
    category: "Transitions",
  },
  {
    id: "transitions-2",
    text: "Settling into stillness",
    category: "Transitions",
  },
  {
    id: "transitions-3",
    text: "Going deeper within",
    category: "Transitions",
  },
  {
    id: "transitions-4",
    text: "Preparing for the next phase",
    category: "Transitions",
  },
  {
    id: "transitions-5",
    text: "Gently returning to awareness",
    category: "Transitions",
  },
  {
    id: "transitions-6",
    text: "This meditation is complete",
    category: "Transitions",
  },
  {
    id: "transitions-7",
    text: "Carrying this peace forward",
    category: "Transitions",
  },
]

export const SOUND_CUES_LIBRARY: SoundCue[] = [
  {
    id: "sound1",
    name: "Singing Bowl (Short)",
    src: "/sounds/singing-bowl-short.mp3",
  },
  {
    id: "sound2",
    name: "Gentle Chime",
    src: "/sounds/chime-gentle.mp3",
  },
  {
    id: "sound3",
    name: "Soft Gong",
    src: "/sounds/soft-gong.mp3",
  },
  {
    id: "sound4",
    name: "Short Bell",
    src: "/sounds/short-bell.mp3",
  },
  {
    id: "sound5",
    name: "Clear Tone",
    src: "/sounds/clear-tone.mp3",
  },
  {
    id: "singing_bowl",
    name: "Singing Bowl",
    src: "synthetic:singing_bowl",
    note: "A4",
    duration: 4000,
    waveform: "sine",
    harmonics: [
      { ratio: 2, amplitude: 0.4, decay: 3.0 },
      { ratio: 3, amplitude: 0.25, decay: 2.7 },
      { ratio: 4.2, amplitude: 0.15, decay: 2.4 },
    ],
    attackDuration: 0.05,
    releaseDuration: 3.0,
  },
  {
    id: "gentle_chime",
    name: "Gentle Chime",
    src: "synthetic:chime_gentle",
    note: "E6",
    duration: 1000,
    waveform: "triangle",
    harmonics: [
      { ratio: 2, amplitude: 0.5, decay: 0.7 },
      { ratio: 3, amplitude: 0.3, decay: 0.6 },
      { ratio: 4.1, amplitude: 0.15, decay: 0.5 },
    ],
    attackDuration: 0.01,
    releaseDuration: 0.8,
  },
  {
    id: "soft_gong",
    name: "Soft Gong",
    src: "synthetic:soft_gong",
    note: "F3",
    duration: 4500,
    waveform: "sine",
    harmonics: [
      { ratio: 1.5, amplitude: 0.5, decay: 3.5 },
      { ratio: 2, amplitude: 0.3, decay: 3.0 },
      { ratio: 2.7, amplitude: 0.2, decay: 2.6 },
    ],
    attackDuration: 0.3,
    releaseDuration: 3.5,
  },
  {
    id: "short_bell",
    name: "Short Bell",
    src: "synthetic:short_bell",
    note: "G6",
    duration: 600,
    waveform: "square",
    harmonics: [
      { ratio: 2, amplitude: 0.6, decay: 0.25 },
      { ratio: 3, amplitude: 0.3, decay: 0.2 },
      { ratio: 4.5, amplitude: 0.1, decay: 0.15 },
    ],
    attackDuration: 0.005,
    releaseDuration: 0.3,
  },
  {
    id: "clear_tone",
    name: "Clear Tone",
    src: "synthetic:clear_tone",
    note: "C5",
    duration: 1500,
    waveform: "sine",
    harmonics: [{ ratio: 2, amplitude: 0.2, decay: 1.1 }],
    fm: { modRatio: 2, modIndex: 3 },
    attackDuration: 0.02,
    releaseDuration: 1.2,
  },
]

export const AMBIENT_SOUNDS_LIBRARY: AmbientSound[] = [
  {
    id: "synthetic_rain",
    name: "Synthetic Rain",
    src: "synthetic:rain",
    noiseType: "white",
    filterType: "highpass",
    filterFrequency: 1000,
    lfoFrequency: 20,
    volume: 0.2,
  },
  {
    id: "synthetic_waves",
    name: "Synthetic Ocean Waves",
    src: "synthetic:waves",
    noiseType: "white",
    filterType: "lowpass",
    filterFrequency: 500,
    lfoFrequency: 0.2,
    volume: 0.25,
  },
  {
    id: "synthetic_forest",
    name: "Synthetic Forest",
    src: "synthetic:forest",
    noiseType: "brown",
    filterType: "lowpass",
    filterFrequency: 800,
    lfoFrequency: 0.5,
    volume: 0.2,
  },
  {
    id: "synthetic_wind",
    name: "Synthetic Wind",
    src: "synthetic:wind",
    noiseType: "white",
    filterType: "lowpass",
    filterFrequency: 400,
    lfoFrequency: 0.1,
    volume: 0.2,
  },
  { id: "file_rain", name: "Rain (File)", src: "/sounds/rain.mp3" },
  { id: "file_forest", name: "Forest Birds (File)", src: "/sounds/forest.mp3" },
  { id: "file_ocean", name: "Ocean Waves (File)", src: "/sounds/ocean.mp3" },
  { id: "file_river", name: "Gentle River (File)", src: "/sounds/river.mp3" },
  { id: "synthetic_white_noise", name: "White Noise (Synthetic)", src: "synthetic:white-noise", noiseType: "white" },
  { id: "synthetic_pink_noise", name: "Pink Noise (Synthetic)", src: "synthetic:pink-noise", noiseType: "pink" },
  { id: "synthetic_brown_noise", name: "Brown Noise (Synthetic)", src: "synthetic:brown-noise", noiseType: "brown" },
]

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
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
  F6: 1396.91,
  G6: 1567.98,
  A6: 1760.0,
  B6: 1975.53,
}

// Musical meditation notes grouped into pleasant octaves
export const MUSICAL_NOTES = {
  Beautiful: [
    { id: "note-c3", name: "C3", note: "C", octave: 3 },
    { id: "note-d3", name: "D3", note: "D", octave: 3 },
    { id: "note-e3", name: "E3", note: "E", octave: 3 },
    { id: "note-g3", name: "G3", note: "G", octave: 3 },
    { id: "note-a3", name: "A3", note: "A", octave: 3 },
    { id: "note-c4", name: "C4", note: "C", octave: 4 },
    { id: "note-d4", name: "D4", note: "D", octave: 4 },
    { id: "note-e4", name: "E4", note: "E", octave: 4 },
    { id: "note-g4", name: "G4", note: "G", octave: 4 },
    { id: "note-a4", name: "A4", note: "A", octave: 4 },
    { id: "note-c5", name: "C5", note: "C", octave: 5 },
    { id: "note-d5", name: "D5", note: "D", octave: 5 },
    { id: "note-e5", name: "E5", note: "E", octave: 5 },
    { id: "note-g5", name: "G5", note: "G", octave: 5 },
    { id: "note-a5", name: "A5", note: "A", octave: 5 },
  ],
}

// Function to generate synthetic sounds using Web Audio API
export async function generateSyntheticSound(
  soundCue: SoundCue,
  audioContext: AudioContext | OfflineAudioContext,
): Promise<void> {
  try {
    // Resume context if suspended (only for AudioContext, not OfflineAudioContext)
    if (audioContext instanceof AudioContext && audioContext.state === "suspended") {
      await audioContext.resume()
    }

    const totalSoundDurationSeconds = (soundCue.duration || 1000) / 1000 // Convert to seconds
    const frequency =
      soundCue.frequency ||
      (soundCue.note
        ? NOTE_FREQUENCIES[soundCue.note as keyof typeof NOTE_FREQUENCIES]
        : 440)
    const waveform = soundCue.waveform || "sine"
    const attackDuration = soundCue.attackDuration || 0.01 // Default 10ms
    const releaseDuration = soundCue.releaseDuration || 0.5 // Default 500ms

    // Create oscillator
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    // FM synthesis support
    if (soundCue.fm) {
      const modOsc = audioContext.createOscillator()
      const modGain = audioContext.createGain()
      modOsc.frequency.setValueAtTime(
        frequency * soundCue.fm.modRatio,
        audioContext.currentTime,
      )
      modGain.gain.setValueAtTime(
        soundCue.fm.modIndex * frequency,
        audioContext.currentTime,
      )
      modOsc.connect(modGain).connect(oscillator.frequency)
      modOsc.start()
      modOsc.stop(audioContext.currentTime + totalSoundDurationSeconds)
    }

    // Connect nodes
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    // Set oscillator properties
    oscillator.type = waveform
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)

    // Create envelope (Attack, Sustain, Release)
    const now = audioContext.currentTime
    const peakVolume = 0.5 // Max volume
    const endVolume = 0.001 // Near silence

    // Attack phase
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(peakVolume, now + attackDuration)

    // Sustain phase (hold peak volume until release starts)
    const sustainStart = now + attackDuration
    const releaseStart = now + totalSoundDurationSeconds - releaseDuration

    if (releaseStart > sustainStart) {
      // If there's a distinct sustain phase
      gainNode.gain.linearRampToValueAtTime(peakVolume, releaseStart)
    } else {
      // If attack + release is longer than or equal to total duration,
      // start release immediately after attack (or even during attack if attackDuration is long)
      gainNode.gain.linearRampToValueAtTime(
        peakVolume,
        Math.max(now + attackDuration, now + totalSoundDurationSeconds - releaseDuration),
      )
    }

    // Release phase
    gainNode.gain.exponentialRampToValueAtTime(endVolume, now + totalSoundDurationSeconds)

    // Add harmonics if specified
    if (soundCue.harmonics) {
      soundCue.harmonics.forEach((h) => {
        const harmonicOsc = audioContext.createOscillator()
        const harmonicGain = audioContext.createGain()

        harmonicOsc.connect(harmonicGain)
        harmonicGain.connect(audioContext.destination)

        harmonicOsc.type = waveform
        harmonicOsc.frequency.setValueAtTime(
          frequency * h.ratio,
          audioContext.currentTime,
        )

        const harmonicVolume = peakVolume * h.amplitude

        harmonicGain.gain.setValueAtTime(0, now)
        harmonicGain.gain.linearRampToValueAtTime(
          harmonicVolume,
          now + attackDuration,
        )
        harmonicGain.gain.exponentialRampToValueAtTime(endVolume, now + h.decay)

        harmonicOsc.start(now)
        harmonicOsc.stop(now + h.decay)
      })
    }

    // Start and stop the oscillator
    oscillator.start(now)
    oscillator.stop(now + totalSoundDurationSeconds)

    // Clean up (only for AudioContext, not OfflineAudioContext as it's managed by render)
    if (audioContext instanceof AudioContext) {
      setTimeout(
        () => {
          try {
            audioContext.close()
          } catch (e) {
            console.warn("Error closing audio context:", e)
          }
        },
        totalSoundDurationSeconds * 1000 + 100,
      )
    }
  } catch (error) {
    console.error("Error generating synthetic sound:", error)
    throw error
  }
}

// Generate looping ambient noise using Web Audio API
export async function generateAmbientSound(
  ambient: AmbientSound,
  audioContext: AudioContext | OfflineAudioContext,
  duration: number,
  volumeOverride?: number,
): Promise<void> {
  try {
    if (audioContext instanceof AudioContext && audioContext.state === "suspended") {
      await audioContext.resume()
    }

    const bufferSize = Math.floor(duration * audioContext.sampleRate)
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
    const data = buffer.getChannelData(0)

    // Simple white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true

    let lastNode: AudioNode = source

    if (ambient.filterType) {
      const filter = audioContext.createBiquadFilter()
      filter.type = ambient.filterType
      filter.frequency.setValueAtTime(ambient.filterFrequency || 1000, 0)
      lastNode.connect(filter)
      lastNode = filter
    }

    const gainNode = audioContext.createGain()
    const targetVolume = volumeOverride ?? ambient.volume ?? 0.2
    gainNode.gain.setValueAtTime(targetVolume, 0)
    lastNode.connect(gainNode)
    gainNode.connect(audioContext.destination)

    if (ambient.lfoFrequency) {
      const lfo = audioContext.createOscillator()
      const lfoGain = audioContext.createGain()
      lfo.frequency.setValueAtTime(ambient.lfoFrequency, 0)
      lfoGain.gain.setValueAtTime(targetVolume, 0)
      lfo.connect(lfoGain)
      lfoGain.connect(gainNode.gain)
      lfo.start(0)
      lfo.stop(duration)
    }

    source.start(0)
    source.stop(duration)
  } catch (error) {
    console.error("Error generating ambient sound:", error)
    throw error
  }
}
