"use client"

import { Settings, LogOut } from "lucide-react"
import Link from "next/link"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"

interface UserMenuProps {
  showLoginButton?: boolean
  buttonVariant?: "default" | "nav"
}

export function UserMenu({ showLoginButton = false, buttonVariant = "default" }: UserMenuProps) {
  const { user, logout, isAuthenticated, login } = useAuth()

  if (!isAuthenticated || !user) {
    if (!showLoginButton) return null

    return (
      <Button variant="ghost"
        onClick={() => login()}
        size="sm"
        className="bg-white text-gray-600 shadow-lg hover:shadow-sm hover:text-gray-900 hover:bg-white font-bold text-xs h-8 px-4 rounded-[8px] transition-all duration-200"
      >
        Login / Sign up
      </Button>
    )
  }

  const displayName = (user.user_metadata?.display_name as string) || user.email || "User"
  const email = user.email || ""
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  // In the nav, the trigger wears the navigation bar's own shadow — but scaled to a 36px circle
  // rather than copied. The bar's exact numbers cannot be carried across: its `-8px` spread shrinks
  // a 36px circle's shadow box to 20px, and the 38px blur then smears that over an area far larger
  // than the element, which collapses the peak opacity until nothing is visible at all. Holding the
  // direction and the colour while tightening the blur and the spread is what makes the same idea
  // read at this size.
  const triggerClasses =
    buttonVariant === "nav"
      ? "relative h-9 w-9 rounded-full bg-white shadow-[0_8px_16px_-4px_rgba(0,0,0,0.20)] transition-shadow hover:bg-white"
      : "relative h-9 w-9 rounded-full bg-white shadow-[0_18px_38px_rgba(0,0,0,0.2)] transition-shadow hover:shadow-none hover:bg-white/90"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={triggerClasses}>
          {/* The border is the navigation bar's own selector border — `border-[3px]
              border-stone-200`, the same ring the pill wears at components/navigation.tsx — so the
              two ends of the bar are edged alike. The fallback's own two-pixel default is
              cancelled, otherwise the two rings sit inside each other. */}
          <Avatar className="h-9 w-9 rounded-full border-[3px] border-stone-200">
            <AvatarFallback className="border-0 bg-gradient-to-br from-gray-600 to-gray-500 text-white font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            <p className="font-medium text-sm">{displayName}</p>
            <p className="text-xs tracking-tight text-gray-500">{email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
