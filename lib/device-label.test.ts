import { describe, expect, it } from "vitest"

import { UNKNOWN_DEVICE_LABEL, describeDevice } from "./device-label"

describe("describeDevice", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15", "iPhone"],
    ["Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15", "iPad"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36", "Mac"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", "Windows PC"],
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36", "Android phone"],
    ["Mozilla/5.0 (Linux; Android 14; SM-X700) AppleWebKit/537.36 Safari/537.36", "Android tablet"],
    ["Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36", "Chromebook"],
    ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36", "Linux PC"],
  ])("names %s as %s", (userAgent, expected) => {
    expect(describeDevice(userAgent)).toBe(expected)
  })

  // Both of these contain a token that an earlier-checked rule would otherwise claim, which is
  // the whole reason the order is fixed rather than incidental.
  it("does not call an iPhone a Mac, despite 'like Mac OS X'", () => {
    expect(describeDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)")).toBe("iPhone")
  })

  it("does not call an Android phone a Linux PC, despite 'Linux'", () => {
    expect(describeDevice("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile")).toBe("Android phone")
  })

  it("is case insensitive", () => {
    expect(describeDevice("MOZILLA/5.0 (IPHONE; CPU IPHONE OS 17_0)")).toBe("iPhone")
  })

  it.each([null, undefined, "", "   ", "something entirely unfamiliar"])(
    "falls back for %p",
    (userAgent) => {
      expect(describeDevice(userAgent)).toBe(UNKNOWN_DEVICE_LABEL)
    },
  )
})
