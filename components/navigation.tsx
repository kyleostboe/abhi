"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

export function Navigation() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    const { error } = await signOut()
    if (error) {
      console.error("Error signing out:", error.message)
      toast({
        title: "Sign Out Failed",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      })
      router.push("/login")
    }
  }

  return (
    <nav className="flex justify-center py-4 mb-8">
      <ul className="flex space-x-4 bg-white/70 backdrop-blur-md px-6 py-3 dark:bg-gray-800/70 dark:shadow-white/10 rounded-md shadow-2xl">
        <li>
          <Link
            href="/"
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === "/"
                ? "bg-gray-600 text-white dark:bg-gray-600"
                : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            href="/labs"
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === "/labs"
                ? "bg-gray-600 text-white dark:bg-gray-600"
                : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            Labs
          </Link>
        </li>
        <li>
          <Link
            href="/donate"
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === "/donate"
                ? "bg-gray-600 text-white dark:bg-gray-600"
                : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            Donate
          </Link>
        </li>
        <li>
          <Link
            href="/contact"
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === "/contact"
                ? "bg-gray-600 text-white dark:bg-gray-600"
                : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            Contact
          </Link>
        </li>
        {user ? (
          <>
            <li>
              <Link
                href="/profile"
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  pathname === "/profile"
                    ? "bg-gray-600 text-white dark:bg-gray-600"
                    : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
                )}
              >
                Profile
              </Link>
            </li>
            <li>
              <Button
                onClick={handleSignOut}
                variant="ghost"
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Sign Out
              </Button>
            </li>
          </>
        ) : (
          <li>
            <Link
              href="/login"
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === "/login"
                  ? "bg-gray-600 text-white dark:bg-gray-600"
                  : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
              )}
            >
              Login
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
