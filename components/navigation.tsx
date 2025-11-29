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
    <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center py-4 px-4">
      <div className="relative flex w-full max-w-4xl items-center justify-center">
        <ul className="flex rounded-sm bg-white px-[9px] py-3.5 space-x-0 shadow-2xl">
          <li>
            <Link
              href="/"
              className={cn(
                "py-2 transition-colors font-black font-serif text-sm shadow-none rounded-sm tracking-tight px-[13px]",
                pathname === "/"
                  ? "bg-gradient-to-r from-gray-600 to-gray-500 border-stone-200 border-[3px] text-white shadow-md "
                  : "text-gray-600 rounded-[9px]  ",
              )}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/library"
              className={cn(
                "py-2 transition-colors font-black font-serif text-sm shadow-none rounded-sm tracking-tight px-[13px]",
                pathname === "/library"
                  ? "bg-gradient-to-r from-gray-600 to-gray-500 border-stone-200 border-[3px] text-white shadow-md "
                  : "text-gray-600 rounded-[9px]  ",
              )}
            >
              Library
            </Link>
          </li>
          <li>
            <Link
              href="/journal"
              className={cn(
                "py-2 text-sm transition-colors font-black font-serif shadow-none rounded-sm tracking-tight px-[13px]",
                pathname === "/journal"
                  ? "bg-gradient-to-r from-gray-600 to-gray-500 border-stone-200 border-[3px] text-white shadow-md "
                  : "text-gray-600 rounded-[9px] ",
              )}
            >
              Journal
            </Link>
          </li>
        </ul>
        {showProfileButton && isAuthenticated && (
          <div className="absolute right-0 rounded-full shadow-2xl">
            <UserMenu buttonVariant="nav" />
          </div>
        )}
      </div>
    </nav>
  )
}
