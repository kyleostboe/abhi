"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  HomeIcon,
  FlaskConicalIcon,
  UserIcon,
  DollarSignIcon,
  MailIcon,
  LogInIcon,
  LogOutIcon,
  BookOpenIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/components/ui/use-toast"

export function Navigation() {
  const pathname = usePathname()
  const { session } = useAuth()

  const handleSignOut = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      })
    }
  }

  const navItems = [
    { href: "/", label: "Home", icon: HomeIcon },
    { href: "/labs", label: "Labs", icon: FlaskConicalIcon },
    { href: "/donate", label: "Donate", icon: DollarSignIcon },
    { href: "/contact", label: "Contact", icon: MailIcon },
  ]

  return (
    <nav className="fixed left-0 top-0 h-full w-20 bg-white/70 backdrop-blur-md p-4 flex flex-col items-center justify-between dark:bg-gray-800/70 dark:shadow-white/10 shadow-2xl z-50">
      <div className="flex flex-col items-center space-y-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href} passHref>
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center justify-center p-2 h-auto w-auto text-gray-600 dark:text-gray-400",
                  isActive && "text-gray-900 dark:text-gray-50 bg-gray-100 dark:bg-gray-600/50 rounded-md",
                  "hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors duration-200",
                )}
              >
                <item.icon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </Button>
            </Link>
          )
        })}
      </div>
      <div className="flex flex-col items-center space-y-6">
        {session ? (
          <>
            <Link href="/profile" passHref>
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center justify-center p-2 h-auto w-auto text-gray-600 dark:text-gray-400",
                  pathname === "/profile" &&
                    "text-gray-900 dark:text-gray-50 bg-gray-100 dark:bg-gray-600/50 rounded-md",
                  "hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors duration-200",
                )}
              >
                <UserIcon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">Profile</span>
              </Button>
            </Link>
            <Link href="/meditations" passHref>
              <Button
                variant="ghost"
                className={cn(
                  "flex flex-col items-center justify-center p-2 h-auto w-auto text-gray-600 dark:text-gray-400",
                  pathname === "/meditations" &&
                    "text-gray-900 dark:text-gray-50 bg-gray-100 dark:bg-gray-600/50 rounded-md",
                  "hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors duration-200",
                )}
              >
                <BookOpenIcon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium">Meditations</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={handleSignOut}
              className="flex flex-col items-center justify-center p-2 h-auto w-auto text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors duration-200"
            >
              <LogOutIcon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Sign Out</span>
            </Button>
          </>
        ) : (
          <Link href="/login" passHref>
            <Button
              variant="ghost"
              className={cn(
                "flex flex-col items-center justify-center p-2 h-auto w-auto text-gray-600 dark:text-gray-400",
                pathname === "/login" && "text-gray-900 dark:text-gray-50 bg-gray-100 dark:bg-gray-600/50 rounded-md",
                "hover:bg-gray-200 dark:hover:bg-gray-700/50 transition-colors duration-200",
              )}
            >
              <LogInIcon className="h-6 w-6 mb-1" />
              <span className="text-xs font-medium">Sign In</span>
            </Button>
          </Link>
        )}
      </div>
    </nav>
  )
}
