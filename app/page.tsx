"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Slider, SliderTrack, SliderFilledTrack, SliderThumb } from "@chakra-ui/react"
import {
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  useToast,
  Switch,
  FormLabel,
  HStack,
  Text,
  Box,
  Spinner,
  Tooltip,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  FormControl,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Stack,
  Heading,
  Divider,
  Kbd,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
} from "@chakra-ui/react"
import { SettingsIcon, AddIcon, DeleteIcon } from "@chakra-ui/icons"
import { saveAs } from "file-saver"
import { useHotkeys } from "react-hotkeys-hook"
import { useDebounce } from "use-debounce"
import { Howl, Howler } from "howler"
import { useImmer } from "use-immer"
import dynamic from "next/dynamic"

const DynamicDebugPanel = dynamic(() => import("@/components/debug-panel").then((mod) => mod.DebugPanel), {
  ssr: false,
})

// === UTILS ===
const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max)

const generateId = () => {
  return Math.random().toString(36).substring(2, 15)
}

// === CONSTANTS ===
const DEFAULT_VOLUME = 0.25
const DEFAULT_RATE = 1.0
const DEFAULT_DETUNE = 0
const DEFAULT_WAVE_TYPE = "sine"
const DEFAULT_ATTACK = 0.05
const DEFAULT_RELEASE = 0.05
const DEFAULT_LOOP = false
const DEFAULT_AUTOPLAY = false
const DEFAULT_PAN = 0
const DEFAULT_REVERB = 0
const DEFAULT_DELAY = 0
const DEFAULT_FILTER = 0
const DEFAULT_FILTER_TYPE = "lowpass"
const DEFAULT_FILTER_Q = 1
const DEFAULT_FILTER_GAIN = 0
const DEFAULT_DISTORTION = 0
const DEFAULT_BITCRUSH = 0
const DEFAULT_NOISE_GATE_THRESHOLD = -60
const DEFAULT_NOISE_GATE_ATTACK = 0.01
const DEFAULT_NOISE_GATE_RELEASE = 0.05
const DEFAULT_NOISE_GATE_ENABLED = false
const DEFAULT_MASTER_VOLUME = 1

const WAVE_TYPES = ["sine", "square", "sawtooth", "triangle"]
const FILTER_TYPES = ["lowpass", "highpass", "bandpass", "notch", "allpass"]

// === TYPES ===
type Status = {
  message: string
  type: "success" | "error" | "warning" | "info"
}

type Sound = {
  id: string
  name: string
  src: string
  volume: number
  rate: number
  detune: number
  waveType: string
  attack: number
  release: number
  loop: boolean
  autoplay: boolean
  pan: number
  reverb: number
  delay: number
  filter: number
  filterType: string
  filterQ: number
  filterGain: number
  distortion: number
  bitcrush: number
  noiseGateThreshold: number
  noiseGateAttack: number
  noiseGateRelease: number
  noiseGateEnabled: boolean
}

// === COMPONENTS ===
function MeditationAdjuster() {
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [sounds, setSounds] = useImmer<Sound[]>([])
  const [masterVolume, setMasterVolume] = useState(DEFAULT_MASTER_VOLUME)
  const [debugMessages, setDebugMessages] = useState<any[]>([])
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importText, setImportText] = useState("")
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false)
  const cancelRef = useRef(null)
  const toast = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()

  const debugLog = (...messages: any[]) => {
    setDebugMessages((prev) => [...prev, messages])
  }

  // === EFFECTS ===
  useEffect(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      const deviceInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        memory: (navigator as any).deviceMemory || "unknown",
        cores: navigator.hardwareConcurrency || "unknown",
        connection: (navigator as any).connection?.effectiveType || "unknown",
        screenSize: `${window.screen.width}x${window.screen.height}`,
        viewportSize: `${window.innerWidth}x${window.innerHeight}`,
        pixelRatio: window.devicePixelRatio,
      }
      debugLog("Device Info", deviceInfo)

      if (process.env.NODE_ENV === "development") {
        console.log("=== ABHI DEBUG INFO ===")
        console.table(deviceInfo)
      }
    }
  }, [])

  useEffect(() => {
    const storedSounds = localStorage.getItem("meditation-sounds")
    if (storedSounds) {
      try {
        const parsedSounds = JSON.parse(storedSounds)
        setSounds(parsedSounds)
        debugLog("Loaded sounds from localStorage", parsedSounds)
      } catch (e) {
        console.error("Error parsing sounds from localStorage", e)
        setStatus({
          message: "Error loading sounds from localStorage",
          type: "error",
        })
      }
    }

    const storedMasterVolume = localStorage.getItem("master-volume")
    if (storedMasterVolume) {
      try {
        const parsedMasterVolume = Number.parseFloat(storedMasterVolume)
        setMasterVolume(parsedMasterVolume)
        Howler.volume(parsedMasterVolume)
        debugLog("Loaded master volume from localStorage", parsedMasterVolume)
      } catch (e) {
        console.error("Error parsing master volume from localStorage", e)
        setStatus({
          message: "Error loading master volume from localStorage",
          type: "error",
        })
      }
    }
  }, [setSounds])

  useEffect(() => {
    localStorage.setItem("meditation-sounds", JSON.stringify(sounds))
    debugLog("Saved sounds to localStorage", sounds)
  }, [sounds])

  useEffect(() => {
    localStorage.setItem("master-volume", masterVolume.toString())
    Howler.volume(masterVolume)
    debugLog("Saved master volume to localStorage", masterVolume)
  }, [masterVolume])

  useEffect(() => {
    const urlSounds = searchParams.get("sounds")
    if (urlSounds) {
      try {
        const parsedSounds = JSON.parse(urlSounds)
        setSounds(parsedSounds)
        debugLog("Loaded sounds from URL", parsedSounds)
        toast({
          title: "Sounds loaded from URL",
          status: "success",
          duration: 3000,
          isClosable: true,
        })
        router.replace("/", { scroll: false }) // remove the sounds from the URL
      } catch (e) {
        console.error("Error parsing sounds from URL", e)
        setStatus({ message: "Error loading sounds from URL", type: "error" })
      }
    }
  }, [searchParams, setSounds, router, toast])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const BrowserAudioContext = window.AudioContext || (window as any).webkitContext
      if (BrowserAudioContext) {
        const ctx = new BrowserAudioContext()
        setAudioContext(ctx)
        debugLog("AudioContext initialized", { state: ctx.state })
      } else {
        debugLog("AudioContext not supported by browser")
        setStatus({ message: "Web Audio API is not supported. Please use a modern browser.", type: "error" })
      }
    }
    // The main component unmount cleanup (another useEffect) will handle closing the audioContext from state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      // Component Unmount cleanup
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close().then(() => {
          debugLog("AudioContext closed")
        })
      }
    }
  }, [audioContext])

  // === HANDLERS ===
  const addSound = useCallback(() => {
    const newSound: Sound = {
      id: generateId(),
      name: "New Sound",
      src: "",
      volume: DEFAULT_VOLUME,
      rate: DEFAULT_RATE,
      detune: DEFAULT_DETUNE,
      waveType: DEFAULT_WAVE_TYPE,
      attack: DEFAULT_ATTACK,
      release: DEFAULT_RELEASE,
      loop: DEFAULT_LOOP,
      autoplay: DEFAULT_AUTOPLAY,
      pan: DEFAULT_PAN,
      reverb: DEFAULT_REVERB,
      delay: DEFAULT_DELAY,
      filter: DEFAULT_FILTER,
      filterType: DEFAULT_FILTER_TYPE,
      filterQ: DEFAULT_FILTER_Q,
      filterGain: DEFAULT_FILTER_GAIN,
      distortion: DEFAULT_DISTORTION,
      bitcrush: DEFAULT_BITCRUSH,
      noiseGateThreshold: DEFAULT_NOISE_GATE_THRESHOLD,
      noiseGateAttack: DEFAULT_NOISE_GATE_ATTACK,
      noiseGateRelease: DEFAULT_NOISE_GATE_RELEASE,
      noiseGateEnabled: DEFAULT_NOISE_GATE_ENABLED,
    }
    setSounds((draft) => {
      draft.push(newSound)
    })
    debugLog("Added sound", newSound)
  }, [setSounds])

  const removeSound = useCallback(
    (id: string) => {
      setSounds((draft) => {
        const index = draft.findIndex((sound) => sound.id === id)
        if (index > -1) {
          draft.splice(index, 1)
          debugLog("Removed sound", id)
        }
      })
    },
    [setSounds],
  )

  const updateSound = useCallback(
    (id: string, updates: Partial<Sound>) => {
      setSounds((draft) => {
        const index = draft.findIndex((sound) => sound.id === id)
        if (index > -1) {
          Object.assign(draft[index], updates)
          debugLog("Updated sound", id, updates)
        }
      })
    },
    [setSounds],
  )

  const handleMasterVolumeChange = useCallback(
    (value: number) => {
      setMasterVolume(value)
    },
    [setMasterVolume],
  )

  const emergencyCleanup = () => {
    Howler.unload()
    Howler.volume(DEFAULT_MASTER_VOLUME)
    setMasterVolume(DEFAULT_MASTER_VOLUME)
    setSounds([])
    localStorage.removeItem("meditation-sounds")
    localStorage.removeItem("master-volume")
    setDebugMessages([])
    if (typeof window !== "undefined" && window.gc) {
      // Guard here
      window.gc()
      setTimeout(() => typeof window !== "undefined" && window.gc && window.gc(), 100) // And here
      setTimeout(() => typeof window !== "undefined" && window.gc && window.gc(), 500) // And here
    }
    debugLog("Emergency cleanup complete")
    toast({
      title: "Emergency cleanup complete",
      status: "success",
      duration: 3000,
      isClosable: true,
    })
  }

  const handleImport = () => {
    try {
      const parsedSounds = JSON.parse(importText)
      setSounds(parsedSounds)
      debugLog("Imported sounds", parsedSounds)
      toast({
        title: "Sounds imported",
        status: "success",
        duration: 3000,
        isClosable: true,
      })
    } catch (e) {
      console.error("Error parsing sounds from import", e)
      setStatus({ message: "Error parsing sounds from import", type: "error" })
      toast({
        title: "Error importing sounds",
        description: "Invalid JSON",
        status: "error",
        duration: 3000,
        isClosable: true,
      })
    }
    setIsImportModalOpen(false)
  }

  const handleExport = () => {
    setIsExportModalOpen(true)
  }

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(sounds))
    toast({
      title: "Sounds copied to clipboard",
      status: "success",
      duration: 3000,
      isClosable: true,
    })
  }

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(sounds)], {
      type: "application/json",
    })
    saveAs(blob, "meditation-sounds.json")
  }

  const handleShare = () => {
    const baseUrl = window.location.origin
    const soundsParam = encodeURIComponent(JSON.stringify(sounds))
    const shareableUrl = `${baseUrl}/?sounds=${soundsParam}`
    navigator.clipboard.writeText(shareableUrl)
    toast({
      title: "Shareable URL copied to clipboard",
      description: "Share this URL with others to share your sounds!",
      status: "success",
      duration: 5000,
      isClosable: true,
    })
  }

  const deleteAllSounds = () => {
    setSounds([])
    setIsDeleteAllDialogOpen(false)
    debugLog("All sounds deleted")
    toast({
      title: "All sounds deleted",
      status: "success",
      duration: 3000,
      isClosable: true,
    })
  }

  const cleanupMemory = () => {
    Howler.unload()
    if (audioContext && audioContext.state !== "closed") {
      audioContext.suspend()
    }

    if (typeof window !== "undefined" && window.gc) {
      // Guard here
      window.gc()
    }
    setTimeout(() => {
      if (typeof window !== "undefined" && window.gc) {
        // And here
        window.gc()
      }
    }, 100)
    debugLog("Memory cleanup complete")
    toast({
      title: "Memory cleanup complete",
      status: "success",
      duration: 3000,
      isClosable: true,
    })
  }

  // === HOTKEYS ===
  useHotkeys("shift+a", () => addSound())
  useHotkeys("shift+c", () => cleanupMemory())
  useHotkeys("shift+e", () => emergencyCleanup())
  useHotkeys("shift+d", () => {
    setIsDeleteAllDialogOpen(true)
  })
  useHotkeys("shift+i", () => {
    setIsImportModalOpen(true)
  })
  useHotkeys("shift+x", () => {
    handleExport()
  })
  useHotkeys("shift+s", () => {
    setIsSettingsOpen((o) => !o)
  })

  // === RENDER ===
  return (
    <Box pt={4} maxW="container.md" mx="auto" textAlign="center" pb={12}>
      <Heading as="h1" size="2xl" mb={4}>
        Meditation Adjuster <Badge colorScheme="green">v0.4.0</Badge>
      </Heading>
      <Text color="gray.500" mb={8}>
        Create and adjust ambient soundscapes for meditation, focus, or relaxation.
      </Text>

      {status && (
        <Alert status={status.type} mb={4}>
          <AlertIcon />
          <AlertTitle mr={2}>{status.message}</AlertTitle>
        </Alert>
      )}

      <HStack spacing={4} justify="center" mb={6}>
        <Tooltip label="Add Sound (Shift + A)">
          <IconButton icon={<AddIcon />} aria-label="Add Sound" onClick={addSound} />
        </Tooltip>
        <Tooltip label="Settings (Shift + S)">
          <IconButton icon={<SettingsIcon />} aria-label="Settings" onClick={() => setIsSettingsOpen(true)} />
        </Tooltip>
      </HStack>

      {sounds.map((sound) => (
        <SoundPanel
          key={sound.id}
          sound={sound}
          onUpdate={(updates) => updateSound(sound.id, updates)}
          onRemove={() => removeSound(sound.id)}
          audioContext={audioContext}
          debugLog={debugLog}
        />
      ))}

      <Box mt={8}>
        <HStack spacing={4} align="center" justify="center">
          <Text fontWeight="bold">Master Volume</Text>
          <Slider
            aria-label="master-volume"
            defaultValue={DEFAULT_MASTER_VOLUME * 100}
            min={0}
            max={100}
            step={1}
            onChange={(value) => handleMasterVolumeChange(value / 100)}
            width="sm"
          >
            <SliderTrack bg="red.100">
              <SliderFilledTrack bg="red.500" />
            </SliderTrack>
            <SliderThumb />
          </Slider>
        </HStack>
      </Box>

      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Settings</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Button colorScheme="blue" onClick={handleShare}>
                Share Sounds
              </Button>
              <Button colorScheme="blue" onClick={handleCopyToClipboard}>
                Copy Sounds to Clipboard
              </Button>
              <Button colorScheme="blue" onClick={handleDownload}>
                Download Sounds
              </Button>
              <Button colorScheme="blue" onClick={() => setIsImportModalOpen(true)}>
                Import Sounds
              </Button>
              <Button colorScheme="blue" onClick={handleExport}>
                Export Sounds
              </Button>
              <Divider />
              <Alert status="warning">
                <AlertIcon />
                <AlertTitle mr={2}>Danger Zone!</AlertTitle>
              </Alert>
              <Button colorScheme="red" onClick={() => setIsDeleteAllDialogOpen(true)}>
                Delete All Sounds <Kbd>Shift</Kbd> + <Kbd>D</Kbd>
              </Button>
              <Button colorScheme="red" onClick={emergencyCleanup}>
                Emergency Cleanup <Kbd>Shift</Kbd> + <Kbd>E</Kbd>
              </Button>
              <Button colorScheme="red" onClick={cleanupMemory}>
                Memory Cleanup <Kbd>Shift</Kbd> + <Kbd>C</Kbd>
              </Button>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Import Sounds</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>JSON</FormLabel>
              <Input type="text" value={importText} onChange={(e) => setImportText(e.target.value)} />
            </FormControl>
            <Button colorScheme="blue" onClick={handleImport} mt={4}>
              Import
            </Button>
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Export Sounds</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>JSON</FormLabel>
              <Input type="text" value={JSON.stringify(sounds)} isReadOnly onClick={(e) => e.target.select()} />
            </FormControl>
          </ModalBody>
        </ModalContent>
      </Modal>

      <AlertDialog
        isOpen={isDeleteAllDialogOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsDeleteAllDialogOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete All Sounds
            </AlertDialogHeader>

            <AlertDialogBody>Are you sure? You can't undo this action afterwards.</AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsDeleteAllDialogOpen(false)}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={deleteAllSounds} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <DynamicDebugPanel />
    </Box>
  )
}

function SoundPanel({
  sound,
  onUpdate,
  onRemove,
  audioContext,
  debugLog,
}: {
  sound: Sound
  onUpdate: (updates: Partial<Sound>) => void
  onRemove: () => void
  audioContext: AudioContext | null
  debugLog: (...messages: any[]) => void
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [howl, setHowl] = useState<Howl | null>(null)
  const [debouncedVolume, setDebouncedVolume] = useState(sound.volume)
  const [debouncedRate, setDebouncedRate] = useState(sound.rate)
  const [debouncedDetune, setDebouncedDetune] = useState(sound.detune)
  const [debouncedPan, setDebouncedPan] = useState(sound.pan)
  const [debouncedReverb, setDebouncedReverb] = useState(sound.reverb)
  const [debouncedDelay, setDebouncedDelay] = useState(sound.delay)
  const [debouncedFilter, setDebouncedFilter] = useState(sound.filter)
  const [debouncedFilterQ, setDebouncedFilterQ] = useState(sound.filterQ)
  const [debouncedFilterGain, setDebouncedFilterGain] = useState(sound.filterGain)
  const [debouncedDistortion, setDebouncedDistortion] = useState(sound.distortion)
  const [debouncedBitcrush, setDebouncedBitcrush] = useState(sound.bitcrush)
  const [debouncedNoiseGateThreshold, setDebouncedNoiseGateThreshold] = useState(sound.noiseGateThreshold)
  const [debouncedNoiseGateAttack, setDebouncedNoiseGateAttack] = useState(sound.noiseGateAttack)
  const [debouncedNoiseGateRelease, setDebouncedNoiseGateRelease] = useState(sound.noiseGateRelease)

  const [error, setError] = useState<string | null>(null)

  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false)

  const toast = useToast()

  // Debounce useEffects
  const [volumeDebounced] = useDebounce(debouncedVolume, 500)
  const [rateDebounced] = useDebounce(debouncedRate, 500)
  const [detuneDebounced] = useDebounce(debouncedDetune, 500)
  const [panDebounced] = useDebounce(debouncedPan, 500)
  const [reverbDebounced] = useDebounce(debouncedReverb, 500)
  const [delayDebounced] = useDebounce(debouncedDelay, 500)
  const [filterDebounced] = useDebounce(debouncedFilter, 500)
  const [filterQDebounced] = useDebounce(debouncedFilterQ, 500)
  const [filterGainDebounced] = useDebounce(debouncedFilterGain, 500)
  const [distortionDebounced] = useDebounce(debouncedDistortion, 500)
  const [bitcrushDebounced] = useDebounce(debouncedBitcrush, 500)
  const [noiseGateThresholdDebounced] = useDebounce(debouncedNoiseGateThreshold, 500)
  const [noiseGateAttackDebounced] = useDebounce(debouncedNoiseGateAttack, 500)
  const [noiseGateReleaseDebounced] = useDebounce(debouncedNoiseGateRelease, 500)

  // === EFFECTS ===
  useEffect(() => {
    if (howl) {
      howl.volume(volumeDebounced)
    }
  }, [volumeDebounced, howl])

  useEffect(() => {
    if (howl) {
      howl.rate(rateDebounced)
    }
  }, [rateDebounced, howl])

  useEffect(() => {
    if (howl) {
      howl.detune(detuneDebounced)
    }
  }, [detuneDebounced, howl])

  useEffect(() => {
    if (howl) {
      howl.pan(panDebounced)
    }
  }, [panDebounced, howl])

  useEffect(() => {
    if (howl) {
      howl.reverb(reverbDebounced)
    }
  }, [reverbDebounced, howl])

  useEffect(() => {
    if (howl) {
      howl.delay(delayDebounced)
    }
  }, [delayDebounced, howl])

  useEffect(() => {
    if (howl) {
      howl.filter(filterDebounced, sound.filterType, filterQDebounced, filterGainDebounced)
    }
  }, [filterDebounced, sound.filterType, filterQDebounced, filterGainDebounced, howl])

  useEffect(() => {
    if (howl) {
      howl.distortion(distortionDebounced)
    }
  }, [distortionDebounced, howl])

  useEffect(() => {
    if (howl) {
      howl.bitcrush(bitcrushDebounced)
    }
  }, [bitcrushDebounced, howl])

  useEffect(() => {
    if (howl) {
      howl.noiseGate(noiseGateThresholdDebounced, sound.noiseGateAttack, sound.noiseGateRelease, sound.noiseGateEnabled)
    }
  }, [noiseGateThresholdDebounced, sound.noiseGateAttack, sound.noiseGateRelease, sound.noiseGateEnabled, howl])

  useEffect(() => {
    if (sound.src) {
      setIsLoading(true)
      setError(null)

      const newHowl = new Howl({
        src: [sound.src],
        html5: true, // Force HTML5 Audio for streaming
        loop: sound.loop,
        autoplay: sound.autoplay,
        volume: sound.volume,
        rate: sound.rate,
        detune: sound.detune,
        onload: () => {
          setIsLoading(false)
          debugLog("Sound loaded", sound.id, sound.src)
        },
        onloaderror: (id, error) => {
          setIsLoading(false)
          setError(`Error loading sound: ${error}`)
          console.error("Error loading sound", id, error)
          toast({
            title: "Error loading sound",
            description: error,
            status: "error",
            duration: 5000,
            isClosable: true,
          })
        },
        onplay: () => {
          setIsPlaying(true)
          debugLog("Sound started playing", sound.id)
        },
        onpause: () => {
          setIsPlaying(false)
          debugLog("Sound paused", sound.id)
        },
        onstop: () => {
          setIsPlaying(false)
          debugLog("Sound stopped", sound.id)
        },
      })

      newHowl.pan(sound.pan)
      newHowl.reverb(sound.reverb)
      newHowl.delay(sound.delay)
      newHowl.filter(sound.filter, sound.filterType, sound.filterQ, sound.filterGain)
      newHowl.distortion(sound.distortion)
      newHowl.bitcrush(sound.bitcrush)
      newHowl.noiseGate(sound.noiseGateThreshold, sound.noiseGateAttack, sound.noiseGateRelease, sound.noiseGateEnabled)

      setHowl(newHowl)

      return () => {
        newHowl.unload()
        debugLog("Sound unloaded", sound.id)
      }
    } else {
      // If there's no source, ensure there's no Howl instance
      setHowl(null)
      setIsLoading(false)
      setIsPlaying(false)
    }
  }, [
    sound.src,
    sound.loop,
    sound.autoplay,
    sound.volume,
    sound.rate,
    sound.detune,
    sound.pan,
    sound.reverb,
    sound.delay,
    sound.filter,
    sound.filterType,
    sound.filterQ,
    sound.filterGain,
    sound.distortion,
    sound.bitcrush,
    sound.noiseGateThreshold,
    sound.noiseGateAttack,
    sound.noiseGateRelease,
    sound.noiseGateEnabled,
    debugLog,
    toast,
  ])

  // === HANDLERS ===
  const togglePlay = () => {
    if (howl) {
      if (isPlaying) {
        howl.pause()
      } else {
        howl.play()
      }
    }
  }

  const handleVolumeChange = (value: number) => {
    setDebouncedVolume(value)
    onUpdate({ volume: value })
  }

  const handleRateChange = (value: number) => {
    setDebouncedRate(value)
    onUpdate({ rate: value })
  }

  const handleDetuneChange = (value: number) => {
    setDebouncedDetune(value)
    onUpdate({ detune: value })
  }

  const handlePanChange = (value: number) => {
    setDebouncedPan(value)
    onUpdate({ pan: value })
  }

  const handleReverbChange = (value: number) => {
    setDebouncedReverb(value)
    onUpdate({ reverb: value })
  }

  const handleDelayChange = (value: number) => {
    setDebouncedDelay(value)
    onUpdate({ delay: value })
  }

  const handleFilterChange = (value: number) => {
    setDebouncedFilter(value)
    onUpdate({ filter: value })
  }

  const handleFilterTypeChange = (value: string) => {
    onUpdate({ filterType: value })
  }

  const handleFilterQChange = (value: number) => {
    setDebouncedFilterQ(value)
    onUpdate({ filterQ: value })
  }

  const handleFilterGainChange = (value: number) => {
    setDebouncedFilterGain(value)
    onUpdate({ filterGain: value })
  }

  const handleDistortionChange = (value: number) => {
    setDebouncedDistortion(value)
    onUpdate({ distortion: value })
  }

  const handleBitcrushChange = (value: number) => {
    setDebouncedBitcrush(value)
    onUpdate({ bitcrush: value })
  }

  const handleNoiseGateThresholdChange = (value: number) => {
    setDebouncedNoiseGateThreshold(value)
    onUpdate({ noiseGateThreshold: value })
  }

  const handleNoiseGateAttackChange = (value: number) => {
    setDebouncedNoiseGateAttack(value)
    onUpdate({ noiseGateAttack: value })
  }

  const handleNoiseGateReleaseChange = (value: number) => {
    setDebouncedNoiseGateRelease(value)
    onUpdate({ noiseGateRelease: value })
  }

  const handleNoiseGateEnabledChange = (value: boolean) => {
    onUpdate({ noiseGateEnabled: value })
    if (howl) {
      howl.noiseGate(sound.noiseGateThreshold, sound.noiseGateAttack, sound.noiseGateRelease, value)
    }
  }

  // === RENDER ===
  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} mb={4} boxShadow="sm" bg="white">
      <HStack justify="space-between" align="center" mb={4}>
        <Input placeholder="Sound Name" value={sound.name} onChange={(e) => onUpdate({ name: e.target.value })} />
        <HStack>
          <Tooltip label="Play/Pause">
            <IconButton
              icon={
                isLoading ? (
                  <Spinner size="sm" />
                ) : isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path
                      fillRule="evenodd"
                      d="M6.75 5.25a3 3 0 013 3v1.5h3a3 3 0 013 3v1.5a3 3 0 01-3 3h-3v1.5a3 3 0 01-3 3A3 3 0 013.75 16.5v-1.5H.75a3 3 0 01-3-3V9a3 3 0 013-3h3v-1.5a3 3 0 013-3zm9 0a3 3 0 013 3v1.5h3a3 3 0 013 3v1.5a3 3 0 01-3 3h-3v1.5a3 3 0 01-3 3A3 3 0 0115.75 16.5v-1.5h-3a3 3 0 01-3-3V9a3 3 0 013-3h3v-1.5a3 3 0 013-3z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path
                      fillRule="evenodd"
                      d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                      clipRule="evenodd"
                    />
                  </svg>
                )
              }
              aria-label="Play/Pause"
              onClick={togglePlay}
              isLoading={isLoading}
              isDisabled={!sound.src}
            />
          </Tooltip>
          <Tooltip label="Remove Sound">
            <IconButton icon={<DeleteIcon />} aria-label="Remove Sound" onClick={onRemove} />
          </Tooltip>
        </HStack>
      </HStack>

      <Input placeholder="Sound URL" value={sound.src} onChange={(e) => onUpdate({ src: e.target.value })} />
      {error && (
        <Alert status="error" mt={2}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Volume</Text>
        <Slider
          aria-label="volume"
          defaultValue={DEFAULT_VOLUME * 100}
          min={0}
          max={100}
          step={1}
          onChange={(value) => handleVolumeChange(value / 100)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Rate</Text>
        <Slider
          aria-label="rate"
          defaultValue={DEFAULT_RATE * 100}
          min={0}
          max={200}
          step={1}
          onChange={(value) => handleRateChange(value / 100)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Detune</Text>
        <Slider
          aria-label="detune"
          defaultValue={DEFAULT_DETUNE}
          min={-1200}
          max={1200}
          step={1}
          onChange={(value) => handleDetuneChange(value)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Pan</Text>
        <Slider
          aria-label="pan"
          defaultValue={DEFAULT_PAN}
          min={-1}
          max={1}
          step={0.01}
          onChange={(value) => handlePanChange(value)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Reverb</Text>
        <Slider
          aria-label="reverb"
          defaultValue={DEFAULT_REVERB}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleReverbChange(value)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Delay</Text>
        <Slider
          aria-label="delay"
          defaultValue={DEFAULT_DELAY}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleDelayChange(value)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Filter</Text>
        <Slider
          aria-label="filter"
          defaultValue={DEFAULT_FILTER}
          min={0}
          max={22050}
          step={1}
          onChange={(value) => handleFilterChange(value)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Filter Type</Text>
        <Select
          aria-label="filter-type"
          defaultValue={sound.filterType}
          onChange={(e) => handleFilterTypeChange(e.target.value)}
          width="sm"
        >
          {FILTER_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Filter Q</Text>
        <Slider
          aria-label="filter-q"
          defaultValue={DEFAULT_FILTER_Q}
          min={0.0001}
          max={1000}
          step={0.01}
          onChange={(value) => handleFilterQChange(value)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Filter Gain</Text>
        <Slider
          aria-label="filter-gain"
          defaultValue={DEFAULT_FILTER_GAIN}
          min={-40}
          max={40}
          step={0.01}
          onChange={(value) => handleFilterGainChange(value)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Distortion</Text>
        <Slider
          aria-label="distortion"
          defaultValue={DEFAULT_DISTORTION}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleDistortionChange(value)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Bitcrush</Text>
        <Slider
          aria-label="bitcrush"
          defaultValue={DEFAULT_BITCRUSH}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleBitcrushChange(value)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Noise Gate Threshold</Text>
        <Slider
          aria-label="noise-gate-threshold"
          defaultValue={DEFAULT_NOISE_GATE_THRESHOLD}
          min={-100}
          max={0}
          step={1}
          onChange={(value) => handleNoiseGateThresholdChange(value)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Noise Gate Attack</Text>
        <Slider
          aria-label="noise-gate-attack"
          defaultValue={DEFAULT_NOISE_GATE_ATTACK}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleNoiseGateAttackChange(value)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Noise Gate Release</Text>
        <Slider
          aria-label="noise-gate-release"
          defaultValue={DEFAULT_NOISE_GATE_RELEASE}
          min={0}
          max={1}
          step={0.01}
          onChange={(value) => handleNoiseGateReleaseChange(value)}
          width="sm"
        >
          <SliderTrack bg="red.100">
            <SliderFilledTrack bg="red.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </HStack>

      <HStack spacing={4} align="center" mt={4}>
        <Text fontWeight="bold">Noise Gate Enabled</Text>
        <Switch
          aria-label="noise-gate-enabled"
          isChecked={sound.noiseGateEnabled}
          onChange={(e) => handleNoiseGateEnabledChange(e.target.checked)}
        />
      </HStack>

      <Button mt={4} onClick={() => setIsAdvancedSettingsOpen(!isAdvancedSettingsOpen)}>
        Advanced Settings
      </Button>

      {isAdvancedSettingsOpen && (
        <Box mt={4} p={4} borderWidth="1px" borderRadius="md">
          <FormControl display="flex" alignItems="center" mb={2}>
            <FormLabel htmlFor={`loop-${sound.id}`} mb="0">
              Loop
            </FormLabel>
            <Switch
              id={`loop-${sound.id}`}
              isChecked={sound.loop}
              onChange={(e) => onUpdate({ loop: e.target.checked })}
            />
          </FormControl>

          <FormControl display="flex" alignItems="center" mb={2}>
            <FormLabel htmlFor={`autoplay-${sound.id}`} mb="0">
              Autoplay
            </FormLabel>
            <Switch
              id={`autoplay-${sound.id}`}
              isChecked={sound.autoplay}
              onChange={(e) => onUpdate({ autoplay: e.target.checked })}
            />
          </FormControl>

          <FormControl>
            <FormLabel>Wave Type</FormLabel>
            <Select value={sound.waveType} onChange={(e) => onUpdate({ waveType: e.target.value })}>
              {WAVE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </FormControl>

          <HStack spacing={4} align="center" mt={4}>
            <Text fontWeight="bold">Attack</Text>
            <NumberInput
              defaultValue={DEFAULT_ATTACK}
              min={0}
              max={10}
              step={0.01}
              onChange={(valueString) => {
                const value = Number.parseFloat(valueString)
                onUpdate({ attack: value })
              }}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </HStack>

          <HStack spacing={4} align="center" mt={4}>
            <Text fontWeight="bold">Release</Text>
            <NumberInput
              defaultValue={DEFAULT_RELEASE}
              min={0}
              max={10}
              step={0.01}
              onChange={(valueString) => {
                const value = Number.parseFloat(valueString)
                onUpdate({ release: value })
              }}
            >
              <NumberInputField />
              <NumberInputStepper>
                <NumberIncrementStepper />
                <NumberDecrementStepper />
              </NumberInputStepper>
            </NumberInput>
          </HStack>
        </Box>
      )}
    </Box>
  )
}

export default MeditationAdjuster
