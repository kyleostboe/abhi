import type { Instruction as ImportedInstruction, SoundCue as ImportedSoundCue } from "./types"
import type { AmbientSound } from "./types"

export interface Instruction extends ImportedInstruction {
  // Additional properties can be added here if needed
}

export interface SoundCue extends ImportedSoundCue {
  // Additional properties can be added here if needed
}

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
  // New Instructions
  {
    id: "instr-1",
    text: "Bring your attention to your breath.",
    category: "Focus",
  },
  {
    id: "instr-2",
    text: "Notice the sensation of the air entering and leaving your nostrils.",
    category: "Focus",
  },
  {
    id: "instr-3",
    text: "Expand your awareness to include sounds around you.",
    category: "Awareness",
  },
  {
    id: "instr-4",
    text: "Feel the weight of your body on the cushion or chair.",
    category: "Body Scan",
  },
  {
    id: "instr-5",
    text: "Observe any thoughts that arise without judgment.",
    category: "Thoughts",
  },
  {
    id: "instr-6",
    text: "Gently return your attention to your breath.",
    category: "Return",
  },
  {
    id: "instr-7",
    text: "Allow your mind to settle into a state of open awareness.",
    category: "Awareness",
  },
  {
    id: "instr-8",
    text: "Notice the rise and fall of your abdomen with each breath.",
    category: "Body Scan",
  },
  {
    id: "instr-9",
    text: "Cultivate a feeling of kindness towards yourself.",
    category: "Metta",
  },
  {
    id: "instr-10",
    text: "Let go of any tension you might be holding in your shoulders.",
    category: "Body Scan",
  },
  {
    id: "instr-11",
    text: "Rest in the present moment, just as it is.",
    category: "Presence",
  },
  {
    id: "instr-12",
    text: "If your mind wanders, simply acknowledge it and redirect.",
    category: "Thoughts",
  },
  {
    id: "instr-13",
    text: "Feel the ground beneath you, supporting you.",
    category: "Body Scan",
  },
  {
    id: "instr-14",
    text: "Notice the space between thoughts.",
    category: "Thoughts",
  },
  {
    id: "instr-15",
    text: "Breathe in peace, breathe out tension.",
    category: "Breath",
  },
  {
    id: "instr-16",
    text: "Open to whatever arises, pleasant or unpleasant.",
    category: "Awareness",
  },
  {
    id: "instr-17",
    text: "Send well-wishes to a loved one.",
    category: "Metta",
  },
  {
    id: "instr-18",
    text: "Feel the warmth in your hands.",
    category: "Body Scan",
  },
  {
    id: "instr-19",
    text: "Let your awareness expand to fill the room.",
    category: "Awareness",
  },
  {
    id: "instr-20",
    text: "Simply be.",
    category: "Presence",
  },
]

export const SOUND_CUES_LIBRARY: SoundCue[] = [
  {
    id: "singing_bowl",
    name: "Singing Bowl",
    src: "synthetic:singing_bowl",
    frequency: 432,
    duration: 2500, // Total sound length in ms
    waveform: "sine",
    harmonics: [864, 1296, 1728], // More harmonics for richness
    attackDuration: 0.1, // 100ms attack
    releaseDuration: 2.0, // 2000ms release
  },
  {
    id: "gentle_chime",
    name: "Gentle Chime",
    src: "synthetic:chime_gentle",
    frequency: 1200, // Higher pitch
    duration: 700, // Total sound length in ms
    waveform: "triangle", // Softer than square, sharper than sine
    attackDuration: 0.01, // 10ms attack
    releaseDuration: 0.5, // 500ms release
  },
  {
    id: "soft_gong",
    name: "Soft Gong",
    src: "synthetic:soft_gong",
    frequency: 180, // Lower, deeper tone
    duration: 3000, // Total sound length in ms
    waveform: "sine",
    harmonics: [360, 540, 720], // For depth
    attackDuration: 0.2, // 200ms attack
    releaseDuration: 2.5, // 2500ms release
  },
  {
    id: "short_bell",
    name: "Short Bell",
    src: "synthetic:short_bell",
    frequency: 1500, // High, clear ring
    duration: 500, // Total sound length in ms
    waveform: "square", // Sharper, more metallic
    attackDuration: 0.005, // 5ms attack
    releaseDuration: 0.2, // 200ms release
  },
  {
    id: "clear_tone",
    name: "Clear Tone",
    src: "synthetic:clear_tone",
    frequency: 528,
    duration: 1500, // Total sound length in ms
    waveform: "sine",
    attackDuration: 0.05, // 50ms attack
    releaseDuration: 1.0, // 1000ms release
  },
  // New Sound Cues
  { id: "bell-1", name: "Single Bell", src: "/sounds/bell-single.mp3" },
  { id: "bell-3", name: "Triple Bell", src: "/sounds/bell-triple.mp3" },
  { id: "gong-1", name: "Gong", src: "/sounds/gong.mp3" },
  { id: "chime-1", name: "Wind Chime", src: "/sounds/wind-chime.mp3" },
  { id: "water-drop", name: "Water Drop", src: "/sounds/water-drop.mp3" },
  { id: "synth-rise", name: "Synth Rise", src: "synthetic:rise" },
  { id: "synth-fall", name: "Synth Fall", src: "synthetic:fall" },
  { id: "synth-pulse", name: "Synth Pulse", src: "synthetic:pulse" },
]

export const AMBIENT_SOUNDS_LIBRARY: AmbientSound[] = [
  {
    id: "rain",
    name: "Rain",
    src: "synthetic:rain",
    noiseType: "white",
    filterType: "highpass",
    filterFrequency: 1000,
    lfoFrequency: 20,
    volume: 0.2,
  },
  {
    id: "waves",
    name: "Ocean Waves",
    src: "synthetic:waves",
    noiseType: "white",
    filterType: "lowpass",
    filterFrequency: 500,
    lfoFrequency: 0.2,
    volume: 0.25,
  },
  {
    id: "forest",
    name: "Forest",
    src: "synthetic:forest",
    noiseType: "brown",
    filterType: "lowpass",
    filterFrequency: 800,
    lfoFrequency: 0.5,
    volume: 0.2,
  },
  {
    id: "wind",
    name: "Wind",
    src: "synthetic:wind",
    noiseType: "white",
    filterType: "lowpass",
    filterFrequency: 400,
    lfoFrequency: 0.1,
    volume: 0.2,
  },
  // New Ambient Sounds
  { id: "rain", name: "Rain", src: "/sounds/rain.mp3" },
  { id: "forest", name: "Forest Birds", src: "/sounds/forest.mp3" },
  { id: "ocean", name: "Ocean Waves", src: "/sounds/ocean.mp3" },
  { id: "river", name: "Gentle River", src: "/sounds/river.mp3" },
  { id: "white-noise", name: "White Noise", src: "synthetic:white-noise", noiseType: "white" },
  { id: "pink-noise", name: "Pink Noise", src: "synthetic:pink-noise", noiseType: "pink" },
  { id: "brown-noise", name: "Brown Noise", src: "synthetic:brown-noise", noiseType: "brown" },
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
}

// Musical meditation notes organized by category
export const MUSICAL_NOTES = {
  Metta: [
    { id: "metta-c4", name: "C4", note: "C", octave: 4 },
    { id: "metta-e4", name: "E4", note: "E", octave: 4 },
    { id: "metta-g4", name: "G4", note: "G", octave: 4 },
    { id: "metta-c5", name: "C5", note: "C", octave: 5 },
  ],
  Mindfulness: [
    { id: "mind-a4", name: "A4", note: "A", octave: 4 },
    { id: "mind-c5", name: "C5", note: "C", octave: 5 },
    { id: "mind-d5", name: "D5", note: "D", octave: 5 },
    { id: "mind-a4-return", name: "A4 (return)", note: "A", octave: 4 },
  ],
  Nonduality: [
    { id: "non-g3", name: "G3", note: "G", octave: 3 },
    { id: "non-d4", name: "D4", note: "D", octave: 4 },
    { id: "non-g4", name: "G4", note: "G", octave: 4 },
  ],
  "Body Scan": [
    { id: "body-g5", name: "G5", note: "G", octave: 5 },
    { id: "body-f5", name: "F5", note: "F", octave: 5 },
    { id: "body-e5", name: "E5", note: "E", octave: 5 },
    { id: "body-d5", name: "D5", note: "D", octave: 5 },
    { id: "body-c5", name: "C5", note: "C", octave: 5 },
    { id: "body-b4", name: "B4", note: "B", octave: 4 },
    { id: "body-a4", name: "A4", note: "A", octave: 4 },
  ],
  // New Musical Notes
  "C Major Scale": [
    { id: "c4", name: "C4", note: "C", octave: 4 },
    { id: "d4", name: "D4", note: "D", octave: 4 },
    { id: "e4", name: "E4", note: "E", octave: 4 },
    { id: "f4", name: "F4", note: "F", octave: 4 },
    { id: "g4", name: "G4", note: "G", octave: 4 },
    { id: "a4", name: "A4", note: "A", octave: 4 },
    { id: "b4", name: "B4", note: "B", octave: 4 },
    { id: "c5", name: "C5", note: "C", octave: 5 },
  ],
  Chords: [
    { id: "c-major", name: "C Major Chord", note: "C", octave: 4, chord: ["E4", "G4"] },
    { id: "g-major", name: "G Major Chord", note: "G", octave: 4, chord: ["B4", "D5"] },
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

    const duration = soundCue.duration || 1 // Default to 1 second if not specified
    const frequency = soundCue.frequency || 440 // Default to A4 if not specified
    const waveform = soundCue.waveform || "sine"
    const attackDuration = soundCue.attackDuration || 0.05
    const releaseDuration = soundCue.releaseDuration || 0.5

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.type = waveform
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)

    // ADSR envelope (simplified)
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + attackDuration) // Attack
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration - releaseDuration) // Decay/Sustain (hold until release starts)
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration) // Release

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + duration)

    return new Promise<void>((resolve) => {
      // For OfflineAudioContext, we don't need to wait for the sound to finish playing
      // as rendering handles it. For regular AudioContext, this is a simple delay.
      if (audioContext instanceof OfflineAudioContext) {
        resolve()
      } else {
        setTimeout(resolve, duration * 1000)
      }
    })
  } catch (error) {
    console.error("Error generating synthetic sound:", error)
    throw error
  }
}

// Generate looping ambient noise using Web Audio API
export async function generateAmbientSound(
  ambientSound: AmbientSound,
  audioContext: AudioContext | OfflineAudioContext,
  totalDuration: number,
  volume = 0.5,
): Promise<void> {
  try {
    if (audioContext instanceof AudioContext && audioContext.state === "suspended") {
      await audioContext.resume()
    }

    const bufferSize = audioContext.sampleRate * totalDuration
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate)
    const output = buffer.getChannelData(0)

    // Generate noise
    for (let i = 0; i < bufferSize; i++) {
      let value = Math.random() * 2 - 1 // White noise
      if (ambientSound.noiseType === "pink") {
        // Simplified pink noise (more complex algorithms exist)
        value = (value + (Math.random() * 2 - 1) * 0.5 + (Math.random() * 2 - 1) * 0.25) / 1.75
      } else if (ambientSound.noiseType === "brown") {
        // Simplified brownian noise
        value = (output[i - 1] || 0) + (Math.random() * 2 - 1) * 0.1
        if (value > 1) value = 1
        if (value < -1) value = -1
      }
      output[i] = value * volume
    }

    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.loop = true // Ambient sounds should loop
    source.start(0)
    source.stop(totalDuration) // Stop at the end of the total duration

    // Apply filter if specified
    if (ambientSound.filterType && ambientSound.filterFrequency) {
      const filter = audioContext.createBiquadFilter()
      filter.type = ambientSound.filterType
      filter.frequency.setValueAtTime(ambientSound.filterFrequency, audioContext.currentTime)
      source.connect(filter)
      filter.connect(audioContext.destination)
    } else {
      source.connect(audioContext.destination)
    }

    return new Promise<void>((resolve) => {
      if (audioContext instanceof OfflineAudioContext) {
        resolve()
      } else {
        // For real-time context, the sound will play in the background.
        // We resolve immediately as the sound is "generated" and playing.
        resolve()
      }
    })
  } catch (error) {
    console.error("Error generating ambient sound:", error)
    throw error
  }
}
