"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface AuthButtonsProps {
  onLogin?: () => void
  className?: string
}

export function AuthButtons({ onLogin, className }: AuthButtonsProps) {
  return (
    <div data-id="auth-buttons-container" className={cn("flex items-center", className)}>
      <Link
        data-id="login-button"
        href="/auth/login"
        onClick={onLogin}
        className="inline-flex items-center justify-center bg-gray-600 font-black text-white shadow-[0_0_20px_rgba(0,0,0,0.12)] transition-shadow hover:bg-gray-700 hover:shadow-none text-sm font-serif tracking-tight rounded-[9px] px-[13px] py-2"
      >
        Login
      </Link>
    </div>
  )
}
