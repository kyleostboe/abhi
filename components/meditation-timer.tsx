"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function MeditationTimer() {
  const [minutes, setMinutes] = useState(5)
  const [secondsLeft, setSecondsLeft] = useState(minutes * 60)
  const [isRunning, setIsRunning] = useState(false)

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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
  }

  const handleStart = () => {
    setSecondsLeft(minutes * 60)
    setIsRunning(true)
  }

  const handleReset = () => {
    setIsRunning(false)
    setSecondsLeft(minutes * 60)
  }

  return (
    <Card className="p-6 mb-10 bg-white dark:bg-gray-900 shadow-lg max-w-md mx-auto">
      <div className="text-center font-serif font-black">
        <div className="text-4xl mb-4 text-gray-700 dark:text-gray-200">
          {formatTime(secondsLeft)}
        </div>
        <div className="flex items-center justify-center space-x-2 mb-6">
          <Input
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
            className="w-20 text-center"
          />
          <span className="text-gray-600 dark:text-gray-400 text-sm">minutes</span>
        </div>
        <div className="space-x-2">
          <Button onClick={handleStart} disabled={isRunning}>
            Start
          </Button>
          <Button onClick={() => setIsRunning(false)} disabled={!isRunning}>
            Pause
          </Button>
          <Button onClick={handleReset}>Reset</Button>
        </div>
      </div>
    </Card>
  )
}

