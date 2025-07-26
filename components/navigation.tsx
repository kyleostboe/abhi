"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { HomeIcon, FlaskConicalIcon, BookOpenIcon, HandHeartIcon, UserIcon } from "lucide-react"
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
                ? "bg-gray-600 text-white"
                : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            <item.icon className="h-6 w-6" />
            <span className="sr-only">{item.label}</span>
          </Link>
        )
      })}
      {user ? (
        <>
          <Link
            href="/profile"
            className={cn(
              "flex items-center justify-center w-full p-3 rounded-lg transition-colors",
              pathname === "/profile"
                ? "bg-gray-600 text-white"
                : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
            )}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src="/placeholder-user.jpg" alt="User Avatar" />
              <AvatarFallback>{user.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <span className="sr-only">Profile</span>
          </Link>
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="flex items-center justify-center w-full p-3 rounded-lg transition-colors text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <UserIcon className="h-6 w-6" />
            <span className="sr-only">Sign Out</span>
          </Button>
        </>
      ) : (
        <Link
          href="/login"
          className={cn(
            "flex items-center justify-center w-full p-3 rounded-lg transition-colors",
            pathname === "/login"
              ? "bg-gray-600 text-white"
              : "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700",
          )}
        >
          <UserIcon className="h-6 w-6" />
          <span className="sr-only">Login</span>
        </Link>
      )}
    </nav>
  )
}
