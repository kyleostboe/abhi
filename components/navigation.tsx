"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Home, Settings, DollarSign, Mail } from 'lucide-react'

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Encoder", href: "/encoder", icon: Settings },
    { name: "Donate", href: "/donate", icon: DollarSign },
    { name: "Contact", href: "/contact", icon: Mail },
  ]

  return (
    <nav className="flex justify-center py-4 mb-8">
      <div className="flex space-x-2 bg-white/70 backdrop-blur-md rounded-full p-1 shadow-lg dark:bg-gray-900/70 dark:shadow-white/10">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} passHref>
            <Button
              variant="ghost"
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
                pathname === item.href && "bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-50",
              )}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.name}
            </Button>
          </Link>
        ))}
      </div>
    </nav>
  )
}
