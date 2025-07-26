"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { HomeIcon, FlaskConicalIcon, BookOpenIcon, HandHeartIcon, UserIcon } from "lucide-react"
import { useAuth } from "@/hooks/use-auth" // Ensure this import is correct

export function Navigation() {
  const pathname = usePathname()
  const { user } = useAuth() // Use the useAuth hook

  const navItems = [
    { href: "/", icon: HomeIcon, label: "Home" },
    { href: "/labs", icon: FlaskConicalIcon, label: "Labs" },
    { href: "/contact", icon: BookOpenIcon, label: "Contact" },
    { href: "/donate", icon: HandHeartIcon, label: "Donate" },
    { href: user ? "/profile" : "/login", icon: UserIcon, label: user ? "Profile" : "Login" }, // Dynamic link based on auth
  ]

  return (
    <nav className="flex flex-col items-center space-y-2 p-4 bg-gray-100 dark:bg-gray-800 h-full border-r border-gray-200 dark:border-gray-700">
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center justify-center w-full p-3 rounded-lg transition-colors",
              isActive
                ? "bg-gray-600 text-white" // Changed from green-600 to gray-600
                : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="sr-only">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
