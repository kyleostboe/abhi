"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

interface AuthButtonsProps {
  onLogin: () => void
  className?: string
}

export function AuthButtons({ onLogin, className }: AuthButtonsProps) {
  return (
    <div
      data-id="auth-buttons-container"
      className={cn(
        "flex items-center gap-3 rounded-sm py-[9px] px-[9px]",
        className,
      )}
    >
      <button
        data-id="login-button"
        onClick={onLogin}
        className="bg-white font-black text-gray-600 shadow-[0_0_20px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-none hover:text-gray-800 text-sm font-serif tracking-tight rounded-[9px] px-[13px] py-2"
      >
        Login
      </button>
      <Link
        data-id="signup-button"
        href="/auth/sign-up"
        className="inline-flex items-center justify-center bg-gray-600 font-black text-white shadow-[0_0_20px_rgba(0,0,0,0.12)] transition-shadow hover:bg-gray-700 hover:shadow-none text-sm font-serif tracking-tight rounded-[9px] px-[13px] py-2"
      >
        Sign Up
      </Link>
    </div>
  )
}
