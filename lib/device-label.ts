/**
 * A name for the device a meditation's audio was left on.
 *
 * Stored on the row when the audio is not uploaded, so that a second device can say "on your
 * iPhone" instead of "on another device" — the difference between something a person can act on
 * and something they have to go and work out.
 *
 * Deliberately coarse. This is a signpost, not telemetry: it names a kind of machine so a sentence
 * reads naturally, and there is no version, no model, and nothing that would distinguish two
 * iPhones from each other. It goes in a database column, so the least that does the job is the
 * right amount.
 *
 * Pure, and takes the user-agent string rather than reading `navigator`, which is what makes the
 * matching order testable — iPad before Mac, Android before Linux — since those pairs overlap in
 * exactly the way that gets them wrong.
 */

export const UNKNOWN_DEVICE_LABEL = "another device"

export const describeDevice = (userAgent: string | null | undefined): string => {
  if (typeof userAgent !== "string" || userAgent.trim().length === 0) return UNKNOWN_DEVICE_LABEL

  const ua = userAgent.toLowerCase()

  // Order matters throughout. An iPad on recent iPadOS reports itself as a Mac and is only
  // distinguishable by touch support, which is not in the string — so a genuine "ipad" token is
  // checked first and the ambiguous case is allowed to read as a Mac.
  if (ua.includes("ipad")) return "iPad"
  if (ua.includes("iphone")) return "iPhone"
  if (ua.includes("ipod")) return "iPod"
  // Android contains "linux", so it has to win.
  if (ua.includes("android")) return ua.includes("mobile") ? "Android phone" : "Android tablet"
  if (ua.includes("macintosh") || ua.includes("mac os x")) return "Mac"
  if (ua.includes("windows")) return "Windows PC"
  if (ua.includes("cros")) return "Chromebook"
  if (ua.includes("linux")) return "Linux PC"

  return UNKNOWN_DEVICE_LABEL
}

/** The current device's label, or null where there is no navigator to ask (SSR, tests). */
export const currentDeviceLabel = (): string | null => {
  if (typeof navigator === "undefined") return null
  const label = describeDevice(navigator.userAgent)
  return label === UNKNOWN_DEVICE_LABEL ? null : label
}
