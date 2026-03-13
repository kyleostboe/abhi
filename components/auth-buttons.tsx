"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface AuthButtonsProps {
  onLogin?: () => void
  className?: string
}

export function AuthButtons({ onLogin, className }: AuthButtonsProps) {
  return (
    <div data-id="auth-buttons-container" className={cn("flex items-center relative z-20", className)}>
      <Link
        data-id="login-button"
        href="/auth/login"
        onClick={onLogin}
        className="inline-flex items-center justify-center font-black font-serif tracking-tight rounded-[9px] py-[5px] px-3.5 bg-popover shadow-[0_4px_6px_-1px_rgba(0,0,0,0.15)] transition-shadow duration-200 ease-in-out hover:shadow-none active:shadow-none text-stone-500 text-sm"
      >
        Login
      </Link>
    </div>
  )
}
