"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex justify-center py-4 mb-5">
      <ul className="flex backdrop-blur-md shadow-2xl rounded-sm bg-white px-[9px] py-3.5 space-x-[9px]">
        <li>
          <Link
            href="/"
            className={cn(
              "px-4 py-2 transition-colors font-black font-serif text-sm shadow-none rounded-sm",
              pathname === "/"
                ? "bg-gradient-to-r from-gray-600 to-gray-500 border-stone-200 border-[3px] text-white shadow-md "
                : "text-gray-600 rounded-[10px] hover:bg-muted hover:shadow-inner ",
            )}
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            href="/library"
            className={cn(
              "px-4 py-2 transition-colors font-black font-serif text-sm shadow-none rounded-sm",
              pathname === "/library"
                ? "bg-gradient-to-r from-gray-600 to-gray-500 border-stone-200 border-[3px] text-white shadow-md "
                : "text-gray-600 rounded-[10px] hover:bg-muted hover:shadow-inner ",
            )}
          >
            Library
          </Link>
        </li>
        <li>
          <Link
            href="/journal"
            className={cn(
              "px-4 py-2 text-sm transition-colors font-black font-serif shadow-none rounded-sm",
              pathname === "/journal"
                ? "bg-gradient-to-r from-gray-600 to-gray-500 border-stone-200 border-[3px] text-white shadow-md "
                : "text-gray-600 rounded-[10px] hover:bg-muted hover:shadow-inner ",
            )}
          >
            Journal
          </Link>
        </li>
      </ul>
    </nav>
  )
}
