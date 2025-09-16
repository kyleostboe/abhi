"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex justify-center px-4 py-4 mb-5">
      <div className="flex items-center gap-3">
        <ul className="flex space-x-4 bg-white/70 backdrop-blur-md px-6 py-3 shadow-2xl rounded-sm dark:bg-gray-900/70">
          <li>
            <Link
              href="/"
              className={cn(
                "px-4 py-2 transition-colors font-black font-serif text-sm shadow-none rounded-sm dark:text-gray-200",
                pathname === "/"
                  ? "bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-md "
                  : "text-gray-600 hover:bg-gray-100 ",
              )}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/contact"
              className={cn(
                "px-4 py-2 text-sm transition-colors font-black font-serif shadow-none rounded-md dark:text-gray-200",
                pathname === "/contact"
                  ? "bg-gray-600 text-white shadow-md "
                  : "text-gray-600 hover:bg-gray-100 ",
              )}
            >
              Contact
            </Link>
          </li>
          <li>
            <Link
              href="/donate"
              className={cn(
                "px-4 py-2 text-sm transition-colors font-black font-serif shadow-none rounded-md dark:text-gray-200",
                pathname === "/donate"
                  ? "bg-gray-600 text-white shadow-md "
                  : "text-gray-600 hover:bg-gray-100 ",
              )}
            >
              Donate
            </Link>
          </li>
        </ul>
        <ThemeToggle />
      </div>
    </nav>
  )
}
