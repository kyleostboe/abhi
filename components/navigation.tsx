"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { Home, Mail, HeartIcon, Info } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation" // Added import
import { cn } from "@/lib/utils" // Added import

export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname() // Added usePathname hook

  return (
    <nav className="max-w-4xl mx-auto mb-8 px-0 w-64">
      <div className="flex justify-center py-4 items-stretch pb-0 text-center">
        {/* Logo/Brand */}
        <div className="flex items-center space-x-2"></div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6 flex-grow justify-center pt-3.5">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
                pathname === "/" && "text-black font-bold",
              )}
            >
              <Home className={cn("w-4 h-4", pathname === "/" ? "text-black" : "text-gray-600")} />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
                pathname === "/contact" && "text-black font-bold",
              )}
            >
              <Mail className={cn("h-4 w-4", pathname === "/contact" ? "text-black" : "text-gray-600")} />
            </Button>
          </Link>
          <Link href="/about">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
                pathname === "/about" && "text-black font-bold",
              )}
            >
              <HeartIcon className={cn("h-4 w-4", pathname === "/about" ? "text-black" : "text-gray-600")} />
            </Button>
          </Link>
          <ThemeToggle />
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center space-x-2 text-center pb-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-800 rounded-lg dark:shadow-white/10 border-gray-200 dark:border-gray-700 p-4 space-y-2 font-serif font-black border-0 shadow-lg">
          <Link href="/" onClick={() => setIsMenuOpen(false)}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 font-black",
                pathname === "/" && "text-black font-bold",
              )}
            >
              <Home className={cn("h-4 w-4 mr-2", pathname === "/" ? "text-black" : "text-gray-600")} />
              Home
            </Button>
          </Link>
          <Link href="/contact" onClick={() => setIsMenuOpen(false)}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 font-black",
                pathname === "/contact" && "text-black font-bold",
              )}
            >
              <Mail className={cn("h-4 w-4 mr-2", pathname === "/contact" ? "text-black" : "text-gray-600")} />
              Contact
            </Button>
          </Link>
          <Link href="/about" onClick={() => setIsMenuOpen(false)}>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full justify-start text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 font-black",
                pathname === "/about" && "text-black font-bold",
              )}
            >
              <Info className={cn("h-4 w-4 mr-2", pathname === "/about" ? "text-black" : "text-gray-600")} />
              About
            </Button>
          </Link>
        </div>
      )}
    </nav>
  )
}
