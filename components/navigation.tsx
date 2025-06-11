"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "./theme-toggle" // Import the new ThemeToggle

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Contact", path: "/contact" },
    { name: "Donate", path: "/donate" },
  ]

  const isActive = (path: string) => pathname === path

  return (
    <div className="flex justify-center items-center space-x-8 mb-6 pt-8">
      {navItems.map((item) => (
        <Link
          key={item.path}
          href={item.path}
          className={`px-3 py-2 rounded text-base font-light transition-all ${
            isActive(item.path)
              ? "text-logo-teal-700 dark:text-logo-teal-400 font-medium" // Updated dark mode text color
              : "text-gray-500 dark:text-gray-400 hover:text-logo-teal-600 dark:hover:text-logo-teal-300" // Updated dark mode text color
          }`}
        >
          {item.name}
        </Link>
      ))}
      <div className="ml-auto pl-4 md:ml-8">
        {" "}
        <ThemeToggle />
      </div>
    </div>
  )
}
