"use client"

import Link from "next/link"
import { LogIn } from "lucide-react"
import { cn } from "@/lib/utils"

interface AuthButtonsProps {
  onLogin?: () => void
  className?: string
}

export function AuthButtons({ onLogin, className }: AuthButtonsProps) {
  return (
    <div data-id="auth-buttons-container" className={cn("flex items-center relative z-20", className)}>
      {/* Styled like the tools' "Save to Library" / "Convert Format" affordances: plain serif
          text on the page that lifts slightly on hover, rather than a filled button. */}
      <Link
        data-id="login-button"
        href="/auth/login"
        onClick={onLogin}
        className="inline-flex w-44 items-center justify-center gap-2 border-0 bg-transparent py-3 font-serif text-xs font-black text-gray-600 shadow-none transition-transform duration-150 hover:scale-105 active:scale-105"
      >
        <LogIn className="h-4 w-4" />
        Login / Sign Up
      </Link>
    </div>
  )
}
