"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex justify-center py-4 mb-5">
      <ul className="flex space-x-4 bg-white/70 backdrop-blur-md px-6 py-3 dark:bg-gray-800/70 dark:shadow-white/10 rounded-lg shadow-2xl">
        <li>
          <Link
            href="/"
            className={cn(
              "px-4 py-2 transition-colors rounded-md font-black font-serif text-sm shadow-none",
              pathname === "/"
                ? "bg-gray-600 text-white shadow-md dark:bg-gray-700"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            href="/contact"
            className={cn(
              "px-4 py-2 text-sm transition-colors rounded-md font-black font-serif shadow-none",
              pathname === "/contact"
                ? "bg-gray-600 text-white shadow-md dark:bg-gray-700"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            Contact
          </Link>
        </li>
        <li>
          <Link
            href="/donate"
            className={cn(
              "px-4 py-2 text-sm transition-colors rounded-md font-black font-serif shadow-none",
              pathname === "/donate"
                ? "bg-gray-600 text-white shadow-md dark:bg-gray-700"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            Donate
          </Link>
        </li>
      </ul>
    </nav>
  )
}
