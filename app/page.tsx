"use client"
import { Button } from "@/components/ui/button"
import type { Instruction, SoundCue } from "@/lib/types" // Import types
import Link from "next/link"

interface TimelineItem {
  id: string
  type: "instruction" | "sound"
  duration: number // in seconds
  content: Instruction | SoundCue
}

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 p-4 text-center">
      <div className="max-w-3xl space-y-8">
        <h1 className="text-6xl font-extrabold text-gray-900 dark:text-gray-50 leading-tight">
          Welcome to <span className="text-blue-600 dark:text-blue-400">abhī</span>
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300">
          Your personal companion for deep meditation and mindfulness practice. Craft custom meditation sessions with
          precise control over instructions, sound cues, and ambient soundscapes.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link href="/encoder" passHref>
            <Button className="px-8 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md shadow-lg transition-colors">
              Start Encoding
            </Button>
          </Link>
          <Link href="/labs" passHref>
            <Button
              variant="outline"
              className="px-8 py-3 text-lg border-blue-600 text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800 font-bold rounded-md shadow-lg transition-colors bg-transparent"
            >
              Explore Labs
            </Button>
          </Link>
        </div>
        <div className="mt-12 text-gray-600 dark:text-gray-400">
          <p>
            "Abhī" (अभि) is a Sanskrit prefix meaning "towards," "into," or "in the direction of." It signifies movement
            towards a goal or a deeper state.
          </p>
          <p className="mt-2">May your practice lead you towards profound peace and insight.</p>
        </div>
      </div>
    </div>
  )
}
