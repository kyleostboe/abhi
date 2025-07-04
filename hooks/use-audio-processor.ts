"use client"

import { useRef, useCallback } from "react"

interface AudioConfig {
  maxFileSize: number
  sampleRate: number
  maxDuration: number
  skipSamples: number
  memoryThreshold: number
  processingTimeout: number
}

const MOBILE_CONFIG: AudioConfig = {
  maxFileSize: 50 * 1024 * 1024,
  sampleRate: 22050,
  maxDuration: 60,
  skipSamples: 20,
  memoryThreshold: 20 * 1024 * 1024,
  processingTimeout: 120000,
}

const DESKTOP_CONFIG: AudioConfig = {
  maxFileSize: 500 * 1024 * 1024,
  sampleRate: 44100,
  maxDuration: 120,
  skipSamples: 10,
  memoryThreshold: 150 * 1024 * 1024,
  processingTimeout: 600000,
}

export const useAudioProcessor = (isMobile: boolean) => {
  const audioContextRef = useRef<AudioContext | null>(null)
  const config = isMobile ? MOBILE_CONFIG : DESKTOP_CONFIG

  const initializeAudioContext = useCallback(async () => {
    if (audioContextRef.current?.state !== "closed") {
      await audioContextRef.current?.close()
    }

    const AudioContextAPI = window.AudioContext || (window as any).webkitAudioContext
    const ctx = new AudioContextAPI({ sampleRate: config.sampleRate })
    audioContextRef.current = ctx

    if (ctx.state === "suspended") {
      const resumeContext = () => ctx.resume()
      document.addEventListener("click", resumeContext, { once: true })
    }

    return ctx
  }, [config.sampleRate])

  const validateFile = useCallback(
    (file: File): boolean => {
      if (!file.type.startsWith("audio/") && !file.name.toLowerCase().endsWith(".m4a")) {
        throw new Error("Please select a valid audio file.")
      }

      if (file.size > config.maxFileSize) {
        throw new Error(`File too large. Max ${isMobile ? "50MB" : "500MB"}.`)
      }

      return true
    },
    [config.maxFileSize, isMobile],
  )

  const loadAudioFile = useCallback(
    async (file: File): Promise<AudioBuffer> => {
      validateFile(file)

      const ctx = audioContextRef.current || (await initializeAudioContext())
      const arrayBuffer = await file.arrayBuffer()

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error("Audio decoding timeout")), 30000)

        ctx
          .decodeAudioData(arrayBuffer.slice(0))
          .then((buffer) => {
            clearTimeout(timeoutId)
            resolve(buffer)
          })
          .catch((error) => {
            clearTimeout(timeoutId)
            reject(error)
          })
      })
    },
    [validateFile, initializeAudioContext],
  )

  const detectSilenceRegions = useCallback(
    async (
      buffer: AudioBuffer,
      threshold: number,
      minSilenceDur: number,
      onProgress?: (progress: number) => void,
    ): Promise<{ start: number; end: number }[]> => {
      const sampleRate = buffer.sampleRate
      const channelData = buffer.getChannelData(0)
      const silenceRegions: { start: number; end: number }[] = []
      let silenceStart: number | null = null
      let consecutiveSilentSamples = 0

      for (let i = 0; i < channelData.length; i += config.skipSamples) {
        if (i % (sampleRate * (isMobile ? 2 : 5)) === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0))
          onProgress?.(20 + Math.floor((i / channelData.length) * 10))
        }

        const amplitude = Math.abs(channelData[i])
        if (amplitude < threshold) {
          if (silenceStart === null) silenceStart = i
          consecutiveSilentSamples++
        } else {
          if (silenceStart !== null && (consecutiveSilentSamples * config.skipSamples) / sampleRate >= minSilenceDur) {
            silenceRegions.push({ start: silenceStart / sampleRate, end: i / sampleRate })
          }
          silenceStart = null
          consecutiveSilentSamples = 0
        }
      }

      if (silenceStart !== null && (consecutiveSilentSamples * config.skipSamples) / sampleRate >= minSilenceDur) {
        silenceRegions.push({ start: silenceStart / sampleRate, end: channelData.length / sampleRate })
      }

      return silenceRegions
    },
    [config.skipSamples, isMobile],
  )

  return {
    audioContextRef,
    config,
    initializeAudioContext,
    loadAudioFile,
    detectSilenceRegions,
  }
}
