"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface AuthButtonsProps {
  onLogin: () => void
  className?: string
}

export function AuthButtons({ onLogin, className }: AuthButtonsProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl bg-white/70 px-4 py-3 shadow-[0_0_20px_rgba(0,0,0,0.08)] backdrop-blur-sm",
        className,
      )}
    >
      <Button
        onClick={onLogin}
        className="rounded-xl bg-white px-6 py-3 text-base font-black text-gray-600 shadow-[0_0_20px_rgba(0,0,0,0.12)] transition-shadow hover:shadow-none hover:text-gray-800"
      >
        Log In
      </Button>
      <Button
        asChild
        className="rounded-xl bg-gray-600 px-6 py-3 text-base font-black text-white shadow-[0_0_20px_rgba(0,0,0,0.12)] transition-shadow hover:bg-gray-700 hover:shadow-none"
      >
        <Link href="/auth/sign-up">Sign Up</Link>
      </Button>
    </div>
  )
}
