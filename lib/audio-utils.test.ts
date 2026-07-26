import { describe, expect, it } from "vitest"
import {
  AUDIO_EXPORT_FORMAT_LABELS,
  AUDIO_EXPORT_FORMAT_SHORT_LABELS,
  DISTRIBUTION_MAX_BYTES,
  extensionForContainer,
  getDistributionMaxBytes,
  type AudioExportFormat,
} from "./audio-utils"

const FORMATS: AudioExportFormat[] = ["opus", "aac", "wav", "mp3"]

describe("extensionForContainer", () => {
  it("maps each known container to its file extension", () => {
    expect(extensionForContainer("ogg")).toBe("ogg")
    expect(extensionForContainer("m4a")).toBe("m4a")
    expect(extensionForContainer("mp3")).toBe("mp3")
  })

  it("falls back to wav for unknown, undefined or null containers", () => {
    expect(extensionForContainer(undefined)).toBe("wav")
    expect(extensionForContainer(null)).toBe("wav")
  })
})

describe("getDistributionMaxBytes", () => {
  it("leaves opus uncapped, since it is streamed rather than size-limited", () => {
    expect(getDistributionMaxBytes("opus")).toBe(Number.POSITIVE_INFINITY)
  })

  it("caps every other format at the shared distribution limit", () => {
    for (const format of FORMATS.filter((f) => f !== "opus")) {
      expect(getDistributionMaxBytes(format)).toBe(DISTRIBUTION_MAX_BYTES)
    }
  })

  it("uses a 48MB limit", () => {
    expect(DISTRIBUTION_MAX_BYTES).toBe(48 * 1024 * 1024)
  })
})

describe("format label tables", () => {
  it("has a long and short label for every export format", () => {
    for (const format of FORMATS) {
      expect(AUDIO_EXPORT_FORMAT_LABELS[format]).toBeTruthy()
      expect(AUDIO_EXPORT_FORMAT_SHORT_LABELS[format]).toBeTruthy()
    }
  })
})
