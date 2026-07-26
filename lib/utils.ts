import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { log } from "@/lib/log"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * True for the abort a cancelled fetch/decode throws. Superseded audio analysis aborts its own
 * in-flight work, and that is an expected outcome rather than a failure worth reporting.
 */
export const isAbortError = (error: unknown): boolean => {
  if (typeof DOMException !== "undefined" && error instanceof DOMException) {
    return error.name === "AbortError"
  }
  if (typeof error === "object" && error !== null && "name" in error) {
    return (error as { name?: string }).name === "AbortError"
  }
  return false
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${["Bytes", "KB", "MB", "GB"][i]}`
}

export const forceGarbageCollection = () => {
  if (typeof window !== "undefined" && (window as any).gc) {
    log.debug("Attempting to force garbage collection.")
    ;(window as any).gc()
  }
}

export const monitorMemory = () => {
  if (typeof performance !== "undefined" && (performance as any).memory) {
    const memory = (performance as any).memory
    const usedMB = memory.usedJSHeapSize / 1048576
    const limitMB = memory.jsHeapSizeLimit / 1048576
    log.debug(`Memory usage: ${usedMB.toFixed(2)}MB / ${limitMB.toFixed(2)}MB`)
    if (usedMB > limitMB * 0.75) {
      log.warn("High memory usage detected, forcing GC.")
      forceGarbageCollection()
      return true
    }
  }
  return false
}
