"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = theme === "system" ? resolvedTheme : theme

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-600 shadow-md transition-all duration-200 hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-gray-500 dark:bg-gray-900 dark:text-gray-200",
        className,
      )}
      onClick={() => (mounted ? setTheme(currentTheme === "dark" ? "light" : "dark") : null)}
    >
      <Sun aria-hidden className="h-4 w-4 transition-all duration-200 dark:scale-0 dark:opacity-0" />
      <Moon
        aria-hidden
        className="absolute h-4 w-4 scale-0 opacity-0 transition-all duration-200 dark:scale-100 dark:opacity-100"
      />
      <span className="sr-only">Toggle theme</span>
    </button>
  )
}
