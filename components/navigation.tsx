"use client"

import Link from "next/link"
import { Clock } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { UserMenu } from "./user-menu"

interface NavigationProps {
  showProfileButton?: boolean
  /**
   * Toggles the Timer. Provided by the home page, which owns the tool state and can switch
   * without navigating — pressing it again returns to the tool that was open before. Everywhere
   * else the button is a link that goes home and opens it there, with nothing to toggle back to.
   */
  onTimerClick?: () => void
  timerActive?: boolean
}

/**
 * Bare icon — no plate, no shadow. The h-9/w-9 box is only there to keep a tappable target
 * around an 20px glyph; nothing about it is painted.
 */
const TIMER_BUTTON_BASE =
  "flex h-9 w-9 items-center justify-center rounded-full bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

export function Navigation({ showProfileButton = false, onTimerClick, timerActive = false }: NavigationProps) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()

  const timerClasses = cn(
    TIMER_BUTTON_BASE,
    timerActive ? "text-gray-800" : "text-gray-400 hover:text-gray-600",
  )

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center py-3.5 px-4 pb-3.5">
      <div className="relative flex w-full max-w-4xl items-center justify-center">
        <ul className="flex rounded-sm bg-white px-2 space-x-0 shadow-[0_8px_20px_-6px_rgba(0,0,0,0.14)] py-[13px]">
          <li>
            <Link
              href="/"
              scroll={false}
              className={cn(
                "transition-colors font-black font-serif text-xs shadow-none rounded-sm tracking-tight px-3 py-2",
                pathname === "/"
                  ? "bg-gradient-to-r from-gray-600 to-gray-500 border-stone-200 border-[3px] text-white shadow-md"
                  : "text-gray-600 rounded-[9px] border-[3px] border-transparent",
              )}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/library"
              scroll={false}
              className={cn(
                "transition-colors font-black font-serif text-xs shadow-none rounded-sm tracking-tight px-3 py-2",
                pathname === "/library"
                  ? "bg-gradient-to-r from-gray-600 to-gray-500 border-stone-200 border-[3px] text-white shadow-md"
                  : "text-gray-600 rounded-[9px] border-[3px] border-transparent",
              )}
            >
              Library
            </Link>
          </li>
          <li>
            <Link
              href="/journal"
              scroll={false}
              className={cn(
                "text-xs transition-colors font-black font-serif shadow-none rounded-sm tracking-tight px-3 py-2",
                pathname === "/journal"
                  ? "bg-gradient-to-r from-gray-600 to-gray-500 border-stone-200 border-[3px] text-white shadow-md"
                  : "text-gray-600 rounded-[9px] border-[3px] border-transparent",
              )}
            >
              Journal
            </Link>
          </li>
        </ul>
        <div className="absolute left-0">
          {onTimerClick ? (
            <button
              type="button"
              onClick={onTimerClick}
              aria-label="Timer"
              aria-pressed={timerActive}
              title="Timer"
              className={timerClasses}
            >
              <Clock className={cn("h-5 w-5", timerActive ? "stroke-[2.75]" : "stroke-2")} />
            </button>
          ) : (
            <Link href="/#timer" aria-label="Timer" title="Timer" className={timerClasses}>
              <Clock className="h-5 w-5 stroke-2" />
            </Link>
          )}
        </div>
        {showProfileButton && isAuthenticated && (
          <div className="absolute right-0 rounded-full">
            <UserMenu buttonVariant="nav" />
          </div>
        )}
      </div>
    </nav>
  )
}
