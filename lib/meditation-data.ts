import type { Instruction as ImportedInstruction, SoundCue as ImportedSoundCue } from "./types"
import type { AmbientSound } from "./types"
import { getAudioContext } from "./audio-utils"

export interface Instruction extends ImportedInstruction {
  // Additional properties can be added here if needed
}

export interface SoundCue extends ImportedSoundCue {
  // Additional properties can be added here if needed
}

export const INSTRUCTIONS_LIBRARY: Instruction[] = [
  // Core Instructions
  {
    id: "breath_focus",
    text: "Focus on your breath.",
    category: "Core",
  },
  {
    id: "body_scan",
    text: "Bring awareness to your body.",
    category: "Core",
  },
  {
    id: "return_focus",
    text: "Gently return your attention to the breath.",
    category: "Core",
  },
  {
    id: "silence_instruction",
    text: "Rest in silence.",
    category: "Core",
  },
  // Metta (Loving Kindness) Instructions
  {
    id: "loving_kindness",
    text: "May you be happy, may you be peaceful.",
    category: "Metta",
  },
  {
    id: "compassion",
    text: "Feel compassion for yourself and others.",
    category: "Metta",
  },
  // Mindfulness Instructions
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
    text: "May I/you/ourselves accept myself/yourself/ourselves as I am/you are/we are",
    category: "Metta",
  },
  {
    id: "metta-10",
    text: "May I/you/ourselves forgive myself/yourself/ourselves",
    category: "Metta",
  },
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
  // Sensory Instructions
  {
    id: "sound_awareness",
    text: "Notice the sounds around you.",
    category: "Sensory",
  },
  // Visualization Instructions
  {
    id: "visualize_light",
    text: "Visualize a soft, warm light filling your body.",
    category: "Visualization",
  },
  // Advanced Instructions
  {
    id: "open_awareness",
    text: "Rest in open awareness.",
    category: "Advanced",
  },
  // Body Instructions
  {
    id: "release_tension",
    text: "Release any tension in your body.",
    category: "Body",
  },
]

export const SOUND_CUES_LIBRARY: SoundCue[] = [
  {
    id: "bell_high",
    name: "High Bell",
    src: "synthetic:bell_high",
    waveform: "triangle",
    frequency: 1200,
    duration: 700,
    attackDuration: 0.01,
    releaseDuration: 0.7,
  },
  {
    id: "bell_mid",
    name: "Mid Bell",
    src: "synthetic:bell_mid",
    waveform: "triangle",
    frequency: 800,
    duration: 800,
    attackDuration: 0.01,
    releaseDuration: 0.8,
  },
  {
    id: "chime_soft",
    name: "Soft Chime",
    src: "synthetic:chime_soft",
    waveform: "sine",
    frequency: 1500,
    duration: 1000,
    attackDuration: 0.01,
    releaseDuration: 1.0,
  },
  {
    id: "tone_short_low",
    name: "Short Low Tone",
    src: "synthetic:tone_short_low",
    waveform: "sine",
    frequency: 300,
    duration: 300,
    attackDuration: 0.01,
    releaseDuration: 0.3,
  },
  {
    id: "tone_short_high",
    name: "Short High Tone",
    src: "synthetic:tone_short_high",
    waveform: "sine",
    frequency: 900,
    duration: 300,
    attackDuration: 0.01,
    releaseDuration: 0.3,
  },
  {
    id: "wood_block",
    name: "Wood Block",
    src: "synthetic:wood_block",
    duration: 100,
    attackDuration: 0.01,
    releaseDuration: 0.1,
  },
  {
    id: "singing_bowl",
    name: "Singing Bowl",
    src: "/sounds/singing-bowl.mp3",
    duration: 3.0,
  },
]

export const AMBIENT_SOUNDS_LIBRARY: AmbientSound[] = [
  {
    id: "rain",
    name: "Rain",
    src: "synthetic:rain",
    noiseType: "white",
    filterType: "lowpass",
    filterFrequency: 1000,
    lfoFrequency: 0.1,
    volume: 0.3,
  },
  {
    id: "ocean_waves",
    name: "Ocean Waves",
    src: "synthetic:ocean_waves",
    noiseType: "pink",
    filterType: "bandpass",
    filterFrequency: 500,
    lfoFrequency: 0.05,
    volume: 0.4,
  },
  {
    id: "forest_ambience",
    name: "Forest Ambience",
    src: "synthetic:forest_ambience",
    noiseType: "brown",
    filterType: "lowpass",
    filterFrequency: 800,
    lfoFrequency: 0.08,
    volume: 0.35,
  },
  {
    id: "mountain_stream",
    name: "Mountain Stream",
    src: "/sounds/mountain-stream.mp3",
    volume: 0.4,
  },
  {
    id: "thunderstorm",
    name: "Thunderstorm",
    src: "/sounds/thunderstorm.mp3",
    volume: 0.3,
  },
]

export const NOTE_FREQUENCIES = {
  "C4": 261.63, "C#4": 277.18, "D4": 293.66, "D#4": 311.13, "E4": 329.63, "F4": 349.23, "F#4": 369.99, "G4": 392.00, "G#4": 415.30, "A4": 440.00, "A#4": 466.16, "B4": 493.88,
  "C5": 523.25, "C#5": 554.37, "D5": 587.33, "D#5": 622.25, "E5": 659.25, "F5": 698.46, "F#5": 739.99, "G5": 783.99, "G#5": 830.61, "A5": 880.00, "A#5": 932.33, "B5": 987.77,
  "C6": 1046.50, "C#6": 1108.73, "D6": 1174.66, "D#6": 1244.51, "E6": 1318.51, "F6": 1396.91, "F#6": 1479.98, "G6": 1567.98, "G#6": 1661.22, "A6": 1760.00, "A#6": 1864.66, "B6": 1975.53,
}

export const MUSICAL_NOTES = {
  "C": [
    { id: "C4", name: "C4", note: "C", octave: 4, src: "musical:C4" },
    { id: "C5", name: "C5", note: "C", octave: 5, src: "musical:C5" },
    { id: "C6", name: "C6", note: "C", octave: 6, src: "musical:C6" },
  ],
  "D": [
    { id: "D4", name: "D4", note: "D", octave: 4, src: "musical:D4" },
    { id: "D5", name: "D5", note: "D", octave: 5, src: "musical:D5" },
    { id: "D6", name: "D6", note: "D", octave: 6, src: "musical:D6" },
  ],
  "E": [
    { id: "E4", name: "E4", note: "E", octave: 4, src: "musical:E4" },
    { id: "E5", name: "E5", note: "E", octave: 5, src: "musical:E5" },
    { id: "E6", name: "E6", note: "E", octave: 6, src: "musical:E6" },
  ],
  "F": [
    { id: "F4", name: "F4", note: "F", octave: 4, src: "musical:F4" },
    { id: "F5", name: "F5", note: "F", octave: 5, src: "musical:F5" },
    { id: "F6", name: "F6", note: "F", octave: 6, src: "musical:F6" },
  ],
  "G": [
    { id: "G4", name: "G4", note: "G", octave: 4, src: "musical:G4" },
    { id: "G5", name: "G5", note: "G", octave: 5, src: "musical:G5" },
    { id: "G6", name: "G6", note: "G", octave: 6, src: "musical:G6" },
  ],
  "A": [
    { id: "A4", name: "A4", note: "A", octave: 4, src: "musical:A4" },
    { id: "A5", name: "A5", note: "A", octave: 5, src: "musical:A5" },
    { id: "A6", name: "A6", note: "A", octave: 6, src: "musical:A6" },
  ],
  "B": [
    { id: "B4", name: "B4", note: "B", octave: 4, src: "musical:B4" },
    { id: "B5", name: "B5", note: "B", octave: 5, src: "musical:B5" },
    { id: "B6", name: "B6", note: "B", octave: 6, src: "musical:B6" },
  ],
}

// Function to generate synthetic sound based on SoundCue definition
export const generateSyntheticSound = async (soundCue: SoundCue, audioContext: AudioContext | OfflineAudioContext): Promise<void> => {
  if (!soundCue.src.startsWith("synthetic:")) {
    console.warn("Not a synthetic sound cue:", soundCue);
    return;
  }

  const startTime = audioContext.currentTime;
  const baseVolume = 0.3; // Base volume for synthetic sounds

  switch (soundCue.id) {
    case "bell_high":
    case "bell_mid":
    case "chime_soft":
    case "tone_short_low":
    case "tone_short_high": {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = soundCue.waveform || "sine";
      oscillator.frequency.setValueAtTime(soundCue.frequency || 440, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(baseVolume, startTime + (soundCue.attackDuration || 0.01));
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + (soundCue.duration || 500) / 1000);

      oscillator.start(startTime);
      oscillator.stop(startTime + (soundCue.duration || 500) / 1000);
      break;
    }
    case "wood_block": {
      const bufferSize = Math.floor(audioContext.sampleRate * (soundCue.duration || 100) / 1000);
      const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = noiseBuffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const decay = Math.exp(-i / (bufferSize * 0.1));
        data[i] = (Math.random() * 2 - 1) * decay * 0.5;
      }

      const noiseSource = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();

      noiseSource.buffer = noiseBuffer;
      noiseSource.connect(gainNode);
      gainNode.connect(audioContext.destination);

      gainNode.gain.setValueAtTime(baseVolume * 0.8, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + (soundCue.releaseDuration || 0.1));

      noiseSource.start(startTime);
      break;
    }
    default:
      console.warn(`Unknown synthetic sound ID: ${soundCue.id}`);
  }
};

// Function to generate ambient sound based on AmbientSound definition
export const generateAmbientSound = async (
  ambientSound: AmbientSound,
  audioContext: AudioContext | OfflineAudioContext,
  duration: number, // in seconds
  volume: number,
): Promise<void> => {
  if (!ambientSound.src.startsWith("synthetic:")) {
    console.warn("Not a synthetic ambient sound:", ambientSound);
    return;
  }

  const bufferSize = audioContext.sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    let value;
    switch (ambientSound.noiseType) {
      case "white":
        value = Math.random() * 2 - 1;
        break;
      case "pink":
        // Simple pink noise approximation (more complex for true pink noise)
        value = (Math.random() * 2 - 1 + (Math.random() * 2 - 1) * 0.5 + (Math.random() * 2 - 1) * 0.25) / 1.75;
        break;
      case "brown":
        // Simple brownian noise approximation
        value = (data[i - 1] || 0) + (Math.random() * 2 - 1) * 0.02;
        break;
      default:
        value = Math.random() * 2 - 1;
    }
    data[i] = value * volume;
  }

  const source = audioContext.createBufferSource();
  source.buffer = buffer;

  const gainNode = audioContext.createGain();
  gainNode.gain.value = volume;

  source.connect(gainNode);

  if (ambientSound.filterType && ambientSound.filterFrequency) {
    const filter = audioContext.createBiquadFilter();
    filter.type = ambientSound.filterType;
    filter.frequency.setValueAtTime(ambientSound.filterFrequency, audioContext.currentTime);
    gainNode.connect(filter);
    filter.connect(audioContext.destination);
  } else {
    gainNode.connect(audioContext.destination);
  }

  source.loop = true;
  source.start(0);
  source.stop(duration); // Ensure it stops at the end of the meditation
};
