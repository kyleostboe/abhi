"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { HomeIcon, FlaskConicalIcon, BookOpenIcon, HandHeartIcon } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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

  const navItems = [
    { href: "/", icon: HomeIcon, label: "Home" },
    { href: "/labs", icon: FlaskConicalIcon, label: "Labs" },
    { href: "/contact", icon: BookOpenIcon, label: "Contact" },
    { href: "/donate", icon: HandHeartIcon, label: "Donate" },
  ]

  return (
    <nav className="flex justify-center py-4 mb-8">
      <ul className="flex space-x-4 bg-white/70 backdrop-blur-md px-6 py-3 dark:bg-gray-800/70 dark:shadow-white/10 rounded-md shadow-2xl">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-gray-600 text-white dark:bg-gray-600"
                  : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
              )}
            >
              {item.label}
            </Link>
          </li>
        ))}
        {user ? (
          <>
            <li>
              <Link
                href="/profile"
                className={cn(
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center",
                  pathname === "/profile"
                    ? "bg-gray-600 text-white dark:bg-gray-600"
                    : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
                )}
              >
                <Avatar className="mr-2 h-6 w-6">
                  <AvatarImage src="/placeholder-user.jpg" alt="User Avatar" />
                  <AvatarFallback>{user.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
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
