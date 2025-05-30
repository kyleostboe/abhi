"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, resolvedTheme, theme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    console.log("ThemeToggle mounted. Resolved theme:", resolvedTheme, "Actual theme prop:", theme)
  }, [resolvedTheme, theme]) // Added theme to dependency array

  const toggleTheme = () => {
    const newTheme = resolvedTheme === "dark" ? "light" : "dark"
    console.log("ThemeToggle: Attempting to set theme to:", newTheme, "Current resolvedTheme:", resolvedTheme)
    setTheme(newTheme)
  }

  React.useEffect(() => {
    if (mounted) {
      console.log(
        "ThemeToggle: theme or resolvedTheme changed. New resolvedTheme:",
        resolvedTheme,
        "New theme prop:",
        theme,
      )
    }
  }, [theme, resolvedTheme, mounted])

  if (!mounted) {
    return <div style={{ width: "40px", height: "40px" }} aria-hidden="true" />
  }

  // If resolvedTheme is still undefined after mounting, it's a clear sign next-themes isn't working.
  // We can render a fallback or an error indicator.
  if (!resolvedTheme) {
    console.error("ThemeToggle: resolvedTheme is undefined after mount. Next-themes might not be initialized.")
    return (
      <div
        style={{ width: "40px", height: "40px", border: "1px solid red" }}
        title="Theme not loaded"
        aria-hidden="true"
      />
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative overflow-hidden rounded-full p-2"
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {resolvedTheme === "dark" ? (
          <motion.div
            key="moon"
            initial={{ y: -20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 20, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Moon className="h-5 w-5 text-slate-400" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ y: -20, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 20, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <Sun className="h-5 w-5 text-amber-500" />
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  )
}
