"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sun, Moon } from 'lucide-react'
import { cn } from "@/lib/utils"

export function Navigation() {
  const { theme, setTheme } = useTheme()

  return (
    <nav className="flex justify-between items-center py-4 px-6 md:px-10 max-w-4xl mx-auto mb-8">
      <div className="flex space-x-4">
        <Link href="/" passHref>
          <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-serif font-black">
            Home
          </Button>
        </Link>
        <Link href="/donate" passHref>
          <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-serif font-black">
            Donate
          </Button>
        </Link>
        <Link href="/contact" passHref>
          <Button variant="ghost" className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-serif font-black">
            Contact
          </Button>
        </Link>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        <span className="sr-only">Toggle theme</span>
      </Button>
    </nav>
  )
}
