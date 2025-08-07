import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00"
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds * 1000) % 1000)

  const pad = (num: number, length: number = 2) => num.toString().padStart(length, "0")

  return `${pad(minutes)}:${pad(remainingSeconds)}.${pad(milliseconds, 3)}`
}

export function formatFileSize(bytes: number, dp: number = 2): string {
  const thresh = 1024
  if (Math.abs(bytes) < thresh) {
    return bytes + " B"
  }
  const units = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
  let u = -1
  const r = 10 ** dp
  do {
    bytes /= thresh
    ++u
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1)
  return bytes.toFixed(dp) + " " + units[u]
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function monitorMemory() {
  if (typeof window !== "undefined" && (window.performance as any)?.memory) {
    const memory = (window.performance as any).memory
    const used = memory.usedJSHeapSize / (1024 * 1024)
    const total = memory.totalJSHeapSize / (1024 * 1024)
    const limit = memory.jsHeapSizeLimit / (1024 * 1024)
    console.log(`Memory: Used ${used.toFixed(2)} MB / Total ${total.toFixed(2)} MB (Limit: ${limit.toFixed(2)} MB)`)
  }
}

export function forceGarbageCollection() {
  if (typeof window !== "undefined" && (window as any).gc) {
    console.log("Forcing garbage collection...")
    ;(window as any).gc()
  } else {
    console.log("Garbage collection not available.")
  }
}
