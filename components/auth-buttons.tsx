"use client"

import Link from "next/link"
import { LogIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

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
        className={cn(buttonVariants({ variant: "accent" }), "h-auto gap-1.5 px-4 py-[7px] text-xs active:shadow-none")}
      >
        <LogIn className="w-4 h-4" />
        Login / Sign Up
      </Link>
    </div>
  )
}
