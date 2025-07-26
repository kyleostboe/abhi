export const NOTE_FREQUENCIES = {
  C4: 261.63,
  "C#4": 277.18,
  D4: 293.66,
  "D#4": 311.13,
  E4: 329.63,
  F4: 349.23,
  "F#4": 369.99,
  G4: 392.0,
  "G#4": 415.3,
  A4: 440.0,
  "A#4": 466.16,
  B4: 493.88,
  C5: 523.25,
  "C#5": 554.37,
  D5: 587.33,
  "D#5": 622.25,
  E5: 659.25,
  F5: 698.46,
  "F#5": 739.99,
  G5: 783.99,
  "G#5": 830.61,
  A5: 880.0,
  "A#5": 932.33,
  B5: 987.77,
} as const

export const ambientSounds = [
  { name: "Ocean Waves", src: "/sounds/ocean-waves.mp3" },
  { name: "Rainfall", src: "/sounds/rainfall.mp3" },
  { name: "Forest Birds", src: "/sounds/forest-birds.mp3" },
  { name: "Gentle Stream", src: "/sounds/gentle-stream.mp3" },
  { name: "White Noise", src: "/sounds/white-noise.mp3" },
  { name: "Campfire", src: "/sounds/campfire.mp3" },
  { name: "Thunderstorm", src: "/sounds/thunderstorm.mp3" },
  { name: "Mountain Stream", src: "/sounds/mountain-stream.mp3" },
]

export const soundCues = [
  { name: "Bell (Single)", src: "/sounds/bell-single.mp3" },
  { name: "Chime (Soft)", src: "/sounds/chime-soft.mp3" },
  { name: "Gong (Deep)", src: "/sounds/gong-deep.mp3" },
  { name: "Singing Bowl", src: "/sounds/singing-bowl.mp3" },
  { name: "Zen Drum", src: "/sounds/zen-drum.mp3" },
  { name: "Synth Pad (Warm)", src: "/sounds/synth-pad-warm.mp3" },
  { name: "Raindrop Plink", src: "/sounds/raindrop-plink.mp3" },
  { name: "Wind Chimes", src: "/sounds/wind-chimes.mp3" },
  { name: "Heartbeat", src: "/sounds/heartbeat.mp3" },
  { name: "Ocean Wave Crash", src: "/sounds/ocean-wave-crash.mp3" },
  { name: "Bird Chirp", src: "/sounds/bird-chirp.mp3" },
  { name: "Gentle Whoosh", src: "/sounds/gentle-whoosh.mp3" },
  { name: "Soft Hum", src: "/sounds/soft-hum.mp3" },
  { name: "Synth Pluck", src: "/sounds/synth-pluck.mp3" },
  { name: "Water Drop", src: "/sounds/water-drop.mp3" },
  { name: "Forest Ambience", src: "/sounds/forest-ambience.mp3" },
  { name: "Distant Thunder", src: "/sounds/distant-thunder.mp3" },
  { name: "Wind Gust", src: "/sounds/wind-gust.mp3" },
  { name: "Crickets", src: "/sounds/crickets.mp3" },
  { name: "Owl Hoot", src: "/sounds/owl-hoot.mp3" },
  { name: "Tibetan Bowl", src: "/sounds/tibetan-bowl.mp3" },
  { name: "Rain on Window", src: "/sounds/rain-on-window.mp3" },
  { name: "Fire Crackle", src: "/sounds/fire-crackle.mp3" },
  { name: "Bubbling Water", src: "/sounds/bubbling-water.mp3" },
  { name: "Gentle Breeze", src: "/sounds/gentle-breeze.mp3" },
  { name: "Distant Chimes", src: "/sounds/distant-chimes.mp3" },
  { name: "Soft Synth Swell", src: "/sounds/soft-synth-swell.mp3" },
  { name: "Deep Drone", src: "/sounds/deep-drone.mp3" },
  { name: "Whispering Wind", src: "/sounds/whispering-wind.mp3" },
  { name: "Calm Ocean", src: "/sounds/calm-ocean.mp3" },
  { name: "Forest Night", src: "/sounds/forest-night.mp3" },
  { name: "River Flow", src: "/sounds/river-flow.mp3" },
  { name: "White Noise (Pink)", src: "/sounds/white-noise-pink.mp3" },
  { name: "Brown Noise", src: "/sounds/brown-noise.mp3" },
  { name: "Fan Noise", src: "/sounds/fan-noise.mp3" },
  { name: "City Rain", src: "/sounds/city-rain.mp3" },
  { name: "Distant City", src: "/sounds/distant-city.mp3" },
  { name: "Cafe Ambience", src: "/sounds/cafe-ambience.mp3" },
  { name: "Library Quiet", src: "/sounds/library-quiet.mp3" },
  { name: "Train Journey", src: "/sounds/train-journey.mp3" },
  { name: "Airplane Cabin", src: "/sounds/airplane-cabin.mp3" },
  { name: "Underwater Bubbles", src: "/sounds/underwater-bubbles.mp3" },
  { name: "Space Ambience", src: "/sounds/space-ambience.mp3" },
  { name: "Dolphin Calls", src: "/sounds/dolphin-calls.mp3" },
  { name: "Whale Song", src: "/sounds/whale-song.mp3" },
  { name: "Jungle Night", src: "/sounds/jungle-night.mp3" },
  { name: "Desert Wind", src: "/sounds/desert-wind.mp3" },
  { name: "Cave Dripping", src: "/sounds/cave-dripping.mp3" },
  { name: "Volcano Rumble", src: "/sounds/volcano-rumble.mp3" },
  { name: "Distant Explosion", src: "/sounds/distant-explosion.mp3" },
  { name: "Clock Ticking", src: "/sounds/clock-ticking.mp3" },
  { name: "Heart Monitor", src: "/sounds/heart-monitor.mp3" },
  { name: "Keyboard Typing", src: "/sounds/keyboard-typing.mp3" },
  { name: "Office Ambience", src: "/sounds/office-ambience.mp3" },
  { name: "School Hallway", src: "/sounds/school-hallway.mp3" },
  { name: "Restaurant Chatter", src: "/sounds/restaurant-chatter.mp3" },
  { name: "Marketplace", src: "/sounds/marketplace.mp3" },
  { name: "Farm Animals", src: "/sounds/farm-animals.mp3" },
  { name: "Dog Barking", src: "/sounds/dog-barking.mp3" },
  { name: "Cat Purring", src: "/sounds/cat-purring.mp3" },
  { name: "Baby Crying", src: "/sounds/baby-crying.mp3" },
  { name: "Laughter", src: "/sounds/laughter.mp3" },
  { name: "Applause", src: "/sounds/applause.mp3" },
  { name: "Crowd Cheering", src: "/sounds/crowd-cheering.mp3" },
  { name: "Footsteps", src: "/sounds/footsteps.mp3" },
  { name: "Door Creak", src: "/sounds/door-creak.mp3" },
  { name: "Car Horn", src: "/sounds/car-horn.mp3" },
  { name: "Traffic Noise", src: "/sounds/traffic-noise.mp3" },
  { name: "Siren", src: "/sounds/siren.mp3" },
  { name: "Telephone Ring", src: "/sounds/telephone-ring.mp3" },
  { name: "Alarm Clock", src: "/sounds/alarm-clock.mp3" },
  { name: "Buzzer", src: "/sounds/buzzer.mp3" },
  { name: "Camera Click", src: "/sounds/camera-click.mp3" },
  { name: "Typewriter", src: "/sounds/typewriter.mp3" },
  { name: "Cash Register", src: "/sounds/cash-register.mp3" },
  { name: "Coin Drop", src: "/sounds/coin-drop.mp3" },
  { name: "Paper Rustle", src: "/sounds/paper-rustle.mp3" },
  { name: "Pen Click", src: "/sounds/pen-click.mp3" },
  { name: "Zipper", src: "/sounds/zipper.mp3" },
  { name: "Crinkle", src: "/sounds/crinkle.mp3" },
  { name: "Squeak", src: "/sounds/squeak.mp3" },
  { name: "Thud", src: "/sounds/thud.mp3" },
  { name: "Boing", src: "/sounds/boing.mp3" },
  { name: "Whistle", src: "/sounds/whistle.mp3" },
  { name: "Chirp", src: "/sounds/chirp.mp3" },
  { name: "Click", src: "/sounds/click.mp3" },
  { name: "Pop", src: "/sounds/pop.mp3" },
  { name: "Snap", src: "/sounds/snap.mp3" },
  { name: "Swish", src: "/sounds/swish.mp3" },
  { name: "Zap", src: "/sounds/zap.mp3" },
  { name: "Beep", src: "/sounds/beep.mp3" },
  { name: "Ding", src: "/sounds/ding.mp3" },
  { name: "Whoop", src: "/sounds/whoop.mp3" },
  { name: "Synth Arp", src: "/sounds/synth-arp.mp3" },
  { name: "Digital Glitch", src: "/sounds/digital-glitch.mp3" },
  { name: "Robot Voice", src: "/sounds/robot-voice.mp3" },
  { name: "Laser Gun", src: "/sounds/laser-gun.mp3" },
  { name: "Explosion", src: "/sounds/explosion.mp3" },
  { name: "Swoosh", src: "/sounds/swoosh.mp3" },
  { name: "Rumble", src: "/sounds/rumble.mp3" },
  { name: "Creepy Ambience", src: "/sounds/creepy-ambience.mp3" },
  { name: "Dungeon Echo", src: "/sounds/dungeon-echo.mp3" },
  { name: "Dragon Roar", src: "/sounds/dragon-roar.mp3" },
  { name: "Sword Clash", src: "/sounds/sword-clash.mp3" },
  { name: "Magic Spell", src: "/sounds/magic-spell.mp3" },
  { name: "Fairy Dust", src: "/sounds/fairy-dust.mp3" },
  { name: "Cartoon Boing", src: "/sounds/cartoon-boing.mp3" },
  { name: "Slide Whistle", src: "/sounds/slide-whistle.mp3" },
  { name: "Rimshot", src: "/sounds/rimshot.mp3" },
  { name: "Cymbal Crash", src: "/sounds/cymbal-crash.mp3" },
  { name: "Drum Roll", src: "/sounds/drum-roll.mp3" },
  { name: "Trumpet Fanfare", src: "/sounds/trumpet-fanfare.mp3" },
  { name: "Orchestra Hit", src: "/sounds/orchestra-hit.mp3" },
  { name: "Choir Swell", src: "/sounds/choir-swell.mp3" },
  { name: "Piano Chord", src: "/sounds/piano-chord.mp3" },
  { name: "Guitar Strum", src: "/sounds/guitar-strum.mp3" },
  { name: "Violin Pizzicato", src: "/sounds/violin-pizzicato.mp3" },
  { name: "Flute Trill", src: "/sounds/flute-trill.mp3" },
  { name: "Saxophone Honk", src: "/sounds/saxophone-honk.mp3" },
  { name: "Clarinet Squeak", src: "/sounds/clarinet-squeak.mp3" },
  { name: "Trombone Slide", src: "/sounds/trombone-slide.mp3" },
  { name: "Tuba Oompah", src: "/sounds/tuba-oompah.mp3" },
  { name: "Harp Glissando", src: "/sounds/harp-glissando.mp3" },
  { name: "Xylophone", src: "/sounds/xylophone.mp3" },
  { name: "Marimba", src: "/sounds/marimba.mp3" },
  { name: "Glockenspiel", src: "/sounds/glockenspiel.mp3" },
  { name: "Triangle", src: "/sounds/triangle.mp3" },
  { name: "Cowbell", src: "/sounds/cowbell.mp3" },
  { name: "Tambourine", src: "/sounds/tambourine.mp3" },
  { name: "Shaker", src: "/sounds/shaker.mp3" },
  { name: "Conga", src: "/sounds/conga.mp3" },
  { name: "Bongo", src: "/sounds/bongo.mp3" },
  { name: "Tabla", src: "/sounds/tabla.mp3" },
  { name: "Didgeridoo", src: "/sounds/didgeridoo.mp3" },
  { name: "Bagpipes", src: "/sounds/bagpipes.mp3" },
  { name: "Accordion", src: "/sounds/accordion.mp3" },
  { name: "Harmonica", src: "/sounds/harmonica.mp3" },
  { name: "Banjo", src: "/sounds/banjo.mp3" },
  { name: "Ukulele", src: "/sounds/ukulele.mp3" },
  { name: "Mandolin", src: "/sounds/mandolin.mp3" },
  { name: "Sitar", src: "/sounds/sitar.mp3" },
  { name: "Theremin", src: "/sounds/theremin.mp3" },
  { name: "Synthesizer", src: "/sounds/synthesizer.mp3" },
  { name: "Electric Guitar", src: "/sounds/electric-guitar.mp3" },
  { name: "Bass Guitar", src: "/sounds/bass-guitar.mp3" },
  { name: "Drums", src: "/sounds/drums.mp3" },
  { name: "Piano", src: "/sounds/piano.mp3" },
  { name: "Violin", src: "/sounds/violin.mp3" },
  { name: "Cello", src: "/sounds/cello.mp3" },
  { name: "Double Bass", src: "/sounds/double-bass.mp3" },
  { name: "Flute", src: "/sounds/flute.mp3" },
  { name: "Oboe", src: "/sounds/oboe.mp3" },
  { name: "Clarinet", src: "/sounds/clarinet.mp3" },
  { name: "Bassoon", src: "/sounds/bassoon.mp3" },
  { name: "French Horn", src: "/sounds/french-horn.mp3" },
  { name: "Trumpet", src: "/sounds/trumpet.mp3" },
  { name: "Trombone", src: "/sounds/trombone.mp3" },
  { name: "Tuba", src: "/sounds/tuba.mp3" },
  { name: "Harp", src: "/sounds/harp.mp3" },
  { name: "Choir", src: "/sounds/choir.mp3" },
  { name: "Orchestra", src: "/sounds/orchestra.mp3" },
  { name: "Synth Bell", src: "synthetic:bell" },
  { name: "Synth Chime", src: "synthetic:chime" },
  { name: "Synth Pad", src: "synthetic:pad" },
  { name: "Synth Pluck", src: "synthetic:pluck" },
  { name: "Synth Drone", src: "synthetic:drone" },
]

export const INSTRUCTIONS_LIBRARY = [
  {
    category: "Introduction",
    text: "Welcome to your meditation. Find a comfortable posture, whether sitting or lying down.",
  },
  {
    category: "Introduction",
    text: "Gently close your eyes, or soften your gaze downwards.",
  },
  {
    category: "Breath Awareness",
    text: "Bring your attention to your breath, noticing the natural rhythm of inhalation and exhalation.",
  },
  {
    category: "Breath Awareness",
    text: "Feel the sensation of the breath as it enters and leaves your body.",
  },
  {
    category: "Body Scan",
    text: "Shift your awareness to your body. Notice any points of contact with the surface beneath you.",
  },
  {
    category: "Body Scan",
    text: "Scan your body from head to toe, noticing any areas of tension or relaxation.",
  },
  {
    category: "Thoughts & Emotions",
    text: "As thoughts arise, simply observe them without judgment, like clouds passing in the sky.",
  },
  {
    category: "Thoughts & Emotions",
    text: "Acknowledge any emotions present, allowing them to be without needing to change them.",
  },
  {
    category: "Sounds",
    text: "Expand your awareness to include the sounds around you. Listen without labeling or reacting.",
  },
  {
    category: "Sounds",
    text: "Notice the subtle sounds, near and far, as they appear and disappear.",
  },
  {
    category: "Gratitude",
    text: "Bring to mind something you are grateful for. Allow the feeling of gratitude to fill your heart.",
  },
  {
    category: "Gratitude",
    text: "Reflect on the simple blessings in your life.",
  },
  {
    category: "Loving-Kindness",
    text: "Send wishes of well-being to yourself: May I be happy, may I be peaceful, may I be free from suffering.",
  },
  {
    category: "Loving-Kindness",
    text: "Extend these wishes to a loved one: May they be happy, may they be peaceful, may they be free from suffering.",
  },
  {
    category: "Loving-Kindness",
    text: "Extend these wishes to all beings: May all beings be happy, may all beings be peaceful, may all beings be free from suffering.",
  },
  {
    category: "Open Awareness",
    text: "Rest in open awareness, allowing whatever arises in your experience to simply be.",
  },
  {
    category: "Open Awareness",
    text: "Let your attention be vast and inclusive, encompassing all sensations, thoughts, and sounds.",
  },
  {
    category: "Conclusion",
    text: "Gently bring your awareness back to your body and the space around you.",
  },
  {
    category: "Conclusion",
    text: "When you are ready, slowly open your eyes, carrying this sense of peace into your day.",
  },
  {
    category: "Conclusion",
    text: "Take a moment to appreciate this time you've given to yourself.",
  },
  {
    category: "Focus",
    text: "Gently direct your attention to the sensations in your hands.",
  },
  {
    category: "Focus",
    text: "Notice the feeling of your feet on the ground.",
  },
  {
    category: "Focus",
    text: "Focus on the rise and fall of your abdomen with each breath.",
  },
  {
    category: "Counting Breaths",
    text: "Count your breaths from one to ten, and if your mind wanders, gently return to one.",
  },
  {
    category: "Counting Breaths",
    text: "Inhale one, exhale one. Inhale two, exhale two. Continue up to ten.",
  },
  {
    category: "Body Scan (Detailed)",
    text: "Bring awareness to your scalp, relaxing any tension there.",
  },
  {
    category: "Body Scan (Detailed)",
    text: "Soften the muscles around your eyes and jaw.",
  },
  {
    category: "Body Scan (Detailed)",
    text: "Relax your shoulders, letting them drop away from your ears.",
  },
  {
    category: "Body Scan (Detailed)",
    text: "Feel your arms and hands becoming heavy and relaxed.",
  },
  {
    category: "Body Scan (Detailed)",
    text: "Notice your chest and abdomen, allowing them to be soft.",
  },
  {
    category: "Body Scan (Detailed)",
    text: "Relax your hips and glutes, releasing any holding.",
  },
  {
    category: "Body Scan (Detailed)",
    text: "Feel your legs and feet, sensing the ground beneath them.",
  },
  {
    category: "Visualisation",
    text: "Imagine a calm, peaceful place. See the details, feel the atmosphere.",
  },
  {
    category: "Visualisation",
    text: "Visualize a warm, golden light filling your body, bringing comfort and healing.",
  },
  {
    category: "Affirmation",
    text: "Repeat silently to yourself: I am calm, I am present, I am at peace.",
  },
  {
    category: "Affirmation",
    text: "Affirm: I am worthy of love and happiness.",
  },
  {
    category: "Movement",
    text: "Gently stretch your fingers and toes, bringing subtle movement back to your body.",
  },
  {
    category: "Movement",
    text: "Slowly roll your head from side to side, releasing any stiffness in your neck.",
  },
  {
    category: "Sensory Awareness",
    text: "Notice any smells in the air, without judgment.",
  },
  {
    category: "Sensory Awareness",
    text: "Become aware of the temperature of the air on your skin.",
  },
  {
    category: "Mindfulness of Daily Activities",
    text: "Bring this mindful awareness to your next activity, whether it's drinking water or walking.",
  },
  {
    category: "Mindfulness of Daily Activities",
    text: "Practice being fully present in simple, everyday tasks.",
  },
  {
    category: "Compassion",
    text: "Bring to mind someone who is struggling. Send them wishes of ease and peace.",
  },
  {
    category: "Compassion",
    text: "Cultivate a sense of compassion for yourself and others.",
  },
  {
    category: "Silence",
    text: "Now, rest in silence for a few moments, simply being with what is.",
  },
  {
    category: "Silence",
    text: "Allow the silence to deepen your experience.",
  },
  {
    category: "Breath Anchor",
    text: "Return your attention to the anchor of your breath, a steady point of focus.",
  },
  {
    category: "Breath Anchor",
    text: "Each inhale and exhale is a gentle reminder to be here, now.",
  },
  {
    category: "Body Scan (Quick)",
    text: "Quickly scan your body, releasing any obvious areas of tension.",
  },
  {
    category: "Body Scan (Quick)",
    text: "Notice the overall feeling of your body in this moment.",
  },
  {
    category: "Sounds (Background)",
    text: "Let sounds be part of the background, not pulling your attention away.",
  },
  {
    category: "Sounds (Background)",
    text: "Allow sounds to simply pass through your awareness.",
  },
  {
    category: "Thoughts (Clouds)",
    text: "Imagine thoughts as clouds drifting across the sky of your mind.",
  },
  {
    category: "Thoughts (Clouds)",
    text: "Observe thoughts without getting caught up in their stories.",
  },
  {
    category: "Emotions (Waves)",
    text: "Feel emotions like waves, rising and falling, without resistance.",
  },
  {
    category: "Emotions (Waves)",
    text: "Allow emotions to be felt fully, then let them go.",
  },
  {
    category: "Intention",
    text: "Set an intention for your day, carrying this mindful awareness forward.",
  },
  {
    category: "Intention",
    text: "What quality do you wish to cultivate today?",
  },
  {
    category: "Gratitude (Specific)",
    text: "Think of three specific things you are grateful for right now.",
  },
  {
    category: "Gratitude (Specific)",
    text: "Feel the warmth of appreciation for these simple things.",
  },
  {
    category: "Loving-Kindness (Difficult Person)",
    text: "Extend wishes of well-being to someone you find challenging.",
  },
  {
    category: "Loving-Kindness (Difficult Person)",
    text: "May they be free from suffering, may they find peace.",
  },
  {
    category: "Open Awareness (Spaciousness)",
    text: "Rest in the spaciousness of your awareness, vast and open.",
  },
  {
    category: "Open Awareness (Spaciousness)",
    text: "Feel the sense of boundless awareness.",
  },
  {
    category: "Conclusion (Gentle Return)",
    text: "Gently begin to deepen your breath, preparing to return.",
  },
  {
    category: "Conclusion (Gentle Return)",
    text: "Wiggle your fingers and toes, slowly re-engaging with your physical body.",
  },
  {
    category: "Conclusion (Carry Forward)",
    text: "Carry this sense of calm and clarity into the rest of your day.",
  },
  {
    category: "Conclusion (Carry Forward)",
    text: "May you be well, happy, and peaceful.",
  },
]

export const generateSyntheticSound = async (soundCue: { name: string; src: string }, audioContext: AudioContext) => {
  const now = audioContext.currentTime
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()

  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)

  switch (soundCue.src) {
    case "synthetic:bell":
      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(880, now) // A5
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.7, now + 0.01)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5)
      oscillator.start(now)
      oscillator.stop(now + 1.5)
      break
    case "synthetic:chime":
      oscillator.type = "triangle"
      oscillator.frequency.setValueAtTime(1320, now) // E6
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.6, now + 0.02)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.0)
      oscillator.start(now)
      oscillator.stop(now + 1.0)
      break
    case "synthetic:pad":
      oscillator.type = "sawtooth"
      oscillator.frequency.setValueAtTime(220, now) // A3
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.4, now + 1.0)
      gainNode.gain.linearRampToValueAtTime(0.4, now + 3.0)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 5.0)
      oscillator.start(now)
      oscillator.stop(now + 5.0)
      break
    case "synthetic:pluck":
      oscillator.type = "square"
      oscillator.frequency.setValueAtTime(440, now) // A4
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.8, now + 0.005)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
      oscillator.start(now)
      oscillator.stop(now + 0.5)
      break
    case "synthetic:drone":
      oscillator.type = "sine"
      oscillator.frequency.setValueAtTime(110, now) // A2
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.3, now + 2.0)
      gainNode.gain.linearRampToValueAtTime(0.3, now + 10.0)
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 12.0)
      oscillator.start(now)
      oscillator.stop(now + 12.0)
      break
    default:
      console.warn("Unknown synthetic sound cue:", soundCue.src)
      break
  }
}

export const defaultMeditation = {
  title: "Default Guided Meditation",
  timeline: [
    {
      id: "intro-1",
      type: "instruction",
      timestamp: 0,
      text: "Welcome to your meditation. Find a comfortable posture.",
    },
    {
      id: "bell-1",
      type: "sound_cue",
      timestamp: 1000,
      soundCueName: "Bell (Single)",
      soundCueSrc: "/sounds/bell-single.mp3",
    },
    {
      id: "breath-1",
      type: "instruction",
      timestamp: 5000,
      text: "Gently bring your attention to your breath.",
    },
    {
      id: "ambient-1",
      type: "ambient_sound",
      timestamp: 7000,
      ambientSoundName: "Ocean Waves",
      ambientSoundSrc: "/sounds/ocean-waves.mp3",
      ambientSoundVolume: 0.3,
    },
    {
      id: "body-1",
      type: "instruction",
      timestamp: 15000,
      text: "Notice the sensations in your body, from head to toe.",
    },
    {
      id: "chime-1",
      type: "sound_cue",
      timestamp: 20000,
      soundCueName: "Chime (Soft)",
      soundCueSrc: "/sounds/chime-soft.mp3",
    },
    {
      id: "thoughts-1",
      type: "instruction",
      timestamp: 25000,
      text: "Observe any thoughts that arise, letting them pass like clouds.",
    },
    {
      id: "gong-1",
      type: "sound_cue",
      timestamp: 35000,
      soundCueName: "Gong (Deep)",
      soundCueSrc: "/sounds/gong-deep.mp3",
    },
    {
      id: "return-1",
      type: "instruction",
      timestamp: 40000,
      text: "When you are ready, gently open your eyes.",
    },
  ],
}
