"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatTime } from "@/lib/utils"

export function MeditationTimer() {
  const [minutes, setMinutes] = useState(5)
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [gradientType, setGradientType] = useState<"primary" | "secondary">("primary")

  useEffect(() => {
    setSecondsLeft(minutes * 60)
  }, [minutes])

  useEffect(() => {
    if (!isRunning) return
    if (secondsLeft <= 0) {
      setIsRunning(false)
      return
    }
    const interval = setInterval(() => {
      setSecondsLeft((s) => s - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, secondsLeft])

  const handleStart = () => {
    setSecondsLeft(minutes * 60)
    setIsRunning(true)
  }

  const handleReset = () => {
    setIsRunning(false)
    setSecondsLeft(minutes * 60)
  }

  const totalSeconds = minutes * 60
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100
  const radius = 80
  const circumference = 2 * Math.PI * radius

  const primaryGradient = "linear-gradient(135deg, #fda4af 0%, #10b981 100%)"
  const secondaryGradient = "linear-gradient(135deg, #60a5fa 0%, #fbbf24 100%)"
  const currentGradient = gradientType === "primary" ? primaryGradient : secondaryGradient

  return (
    <Card className="p-8 mb-10 bg-white dark:bg-gray-900 shadow-lg max-w-lg mx-auto">
      <div className="flex flex-col items-center space-y-8 font-serif font-black">
        <div
          className="relative shadow-md"
          style={{
            background: currentGradient,
            borderRadius: "4rem 3rem 2rem 1rem",
            border: "6px solid #374151",
            padding: "2rem",
          }}
        >
          <svg className="w-56 h-56 -rotate-90" viewBox="0 0 180 180">
            <circle
              cx="90"
              cy="90"
              r={radius}
              strokeWidth="12"
              className="text-white/30"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="90"
              cy="90"
              r={radius}
              strokeWidth="12"
              stroke="currentColor"
              fill="transparent"
              className="text-white transition-all"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - (progress / 100) * circumference}
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center font-serif font-black"
            style={{
              fontSize: "3.5rem",
              color: "#6b7280",
              textShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            {formatTime(secondsLeft)}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            variant={gradientType === "primary" ? "default" : "outline"}
            size="sm"
            onClick={() => setGradientType("primary")}
            className="text-xs"
          >
            Rose-Emerald
          </Button>
          <Button
            variant={gradientType === "secondary" ? "default" : "outline"}
            size="sm"
            onClick={() => setGradientType("secondary")}
            className="text-xs"
          >
            Blue-Amber
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMinutes((m) => Math.max(1, m - 1))}
            disabled={isRunning}
          >
            -
          </Button>
          <Input
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(Number.parseInt(e.target.value) || 0)}
            className="w-16 text-center"
            disabled={isRunning}
          />
          <Button variant="outline" size="icon" onClick={() => setMinutes((m) => m + 1)} disabled={isRunning}>
            +
          </Button>
        </div>

        <div className="flex gap-2">
          {isRunning ? (
            <Button onClick={() => setIsRunning(false)}>Pause</Button>
          ) : (
            <Button onClick={handleStart}>{secondsLeft === totalSeconds ? "Start" : "Resume"}</Button>
          )}
          <Button variant="outline" onClick={handleReset} disabled={secondsLeft === totalSeconds && !isRunning}>
            Reset
          </Button>
        </div>
      </div>
    </Card>
  )
}
