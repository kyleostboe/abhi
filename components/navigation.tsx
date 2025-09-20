"use client"

import { cn } from "@/lib/utils"

interface NavigationProps {
  activePage: "home" | "library" | "contact" | "donate"
  setActivePage: (page: "home" | "library" | "contact" | "donate") => void
}

export function Navigation({ activePage, setActivePage }: NavigationProps) {
  return (
    <nav className="flex justify-center py-4 mb-5">
      <ul className="flex space-x-4 bg-white/70 backdrop-blur-md px-6 py-3 shadow-2xl rounded-sm">
        <li>
          <button
            onClick={() => setActivePage("home")}
            className={cn(
              "px-4 py-2 transition-colors font-black font-serif text-sm shadow-none rounded-sm",
              activePage === "home"
                ? "bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-md "
                : "text-gray-600 hover:bg-gray-100 ",
            )}
          >
            Home
          </button>
        </li>
        <li>
          <button
            onClick={() => setActivePage("library")}
            className={cn(
              "px-4 py-2 transition-colors font-black font-serif text-sm shadow-none rounded-sm",
              activePage === "library"
                ? "bg-gradient-to-r from-gray-600 to-gray-500 text-white shadow-md "
                : "text-gray-600 hover:bg-gray-100 ",
            )}
          >
            Library
          </button>
        </li>
        <li>
          <button
            onClick={() => setActivePage("contact")}
            className={cn(
              "px-4 py-2 text-sm transition-colors font-black font-serif shadow-none rounded-md",
              activePage === "contact" ? "bg-gray-600 text-white shadow-md " : "text-gray-600 hover:bg-gray-100 ",
            )}
          >
            Contact
          </button>
        </li>
        <li>
          <button
            onClick={() => setActivePage("donate")}
            className={cn(
              "px-4 py-2 text-sm transition-colors font-black font-serif shadow-none rounded-md",
              activePage === "donate" ? "bg-gray-600 text-white shadow-md " : "text-gray-600 hover:bg-gray-100 ",
            )}
          >
            Donate
          </button>
        </li>
      </ul>
    </nav>
  )
}
