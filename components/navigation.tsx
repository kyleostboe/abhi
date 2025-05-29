"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"

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
            isActive(item.path) ? "text-teal-700 font-medium" : "text-gray-500 hover:text-teal-600"
          }`}
        >
          {item.name}
        </Link>
      ))}
    </div>
  )
}
