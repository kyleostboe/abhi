import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  const milliseconds = Math.floor((seconds * 1000) % 1000)

  const pad = (num: number, length = 2) => num.toString().padStart(length, "0")

  return `${pad(minutes)}:${pad(remainingSeconds)}.${pad(milliseconds, 3).substring(0, 2)}`
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
