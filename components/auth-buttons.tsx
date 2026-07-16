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
      <Link
        data-id="login-button"
        href="/auth/login"
        onClick={onLogin}
        className="inline-flex items-center justify-center gap-1.5 font-black font-serif tracking-tight rounded-[11px] py-[7px] px-4 bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 shadow-md text-white transition-shadow duration-200 ease-in-out hover:shadow-none active:shadow-none text-xs"
      >
        <LogIn className="w-4 h-4" />
        Login / Sign Up
      </Link>
    </div>
  )
}
