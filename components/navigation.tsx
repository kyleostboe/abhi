"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export function Navigation() {
  const pathname = usePathname()
  const { session, signOut } = useAuth()

  return (
    <nav className="flex justify-center py-4 mb-8">
      <ul className="flex space-x-4 bg-white/70 backdrop-blur-md px-6 py-3 dark:bg-gray-800/70 dark:shadow-white/10 rounded-md shadow-2xl">
        <li>
          <Link
            href="/"
            className={`font-medium hover:underline ${pathname === "/" ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            href="/labs"
            className={`font-medium hover:underline ${pathname === "/labs" ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}
          >
            Labs
          </Link>
        </li>
        <li>
          <Link
            href="/contact"
            className={`font-medium hover:underline ${pathname === "/contact" ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}
          >
            Contact
          </Link>
        </li>
        <li>
          <Link
            href="/donate"
            className={`font-medium hover:underline ${pathname === "/donate" ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}
          >
            Donate
          </Link>
        </li>
        {session ? (
          <>
            <li>
              <Link
                href="/profile"
                className={`flex items-center font-medium hover:underline ${pathname === "/profile" ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}
              >
                <Avatar className="mr-2 h-6 w-6">
                  <AvatarImage src="/placeholder-user.jpg" alt="User Avatar" />
                  <AvatarFallback>{session.user.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                Profile
              </Link>
            </li>
            <li>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Sign Out
              </Button>
            </li>
          </>
        ) : (
          <li>
            <Link
              href="/login"
              className={`font-medium hover:underline ${pathname === "/login" ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}`}
            >
              Sign In
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
