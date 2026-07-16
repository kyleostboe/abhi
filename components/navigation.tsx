"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { UserMenu } from "./user-menu"

interface NavigationProps {
  showProfileButton?: boolean
}

export function Navigation({ showProfileButton = false }: NavigationProps) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()

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
        {showProfileButton && isAuthenticated && (
          <div className="absolute right-0 rounded-full">
            <UserMenu buttonVariant="nav" />
          </div>
        )}
      </div>
    </nav>
  )
}
