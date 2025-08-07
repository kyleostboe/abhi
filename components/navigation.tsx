"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { name: "Adjuster", href: "/" },
    { name: "Encoder", href: "/encoder" },
    { name: "Donate", href: "/donate" },
    { name: "Contact", href: "/contact" },
  ]

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative z-10 flex justify-center py-4 mb-8"
    >
      <div className="flex space-x-4 bg-white/70 backdrop-blur-md rounded-full px-4 py-2 shadow-lg dark:bg-gray-900/70 dark:shadow-white/10 border border-gray-200 dark:border-gray-700">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} passHref>
            <motion.div
              className={cn(
                "relative px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200",
                pathname === item.href
                  ? "text-white bg-gradient-to-r from-logo-rose-500 to-logo-purple-500 dark:from-logo-rose-700 dark:to-logo-purple-700 shadow-md"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50",
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {item.name}
            </motion.div>
          </Link>
        ))}
      </div>
    </motion.nav>
  )
}
