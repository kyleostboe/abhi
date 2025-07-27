"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { UserCircle2 } from "lucide-react"

export function Navigation() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      toast({
        title: "Logout Error",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      })
      router.push("/login")
    }
  }

  return (
    <header className="flex items-center justify-between h-16 px-4 md:px-6 bg-transparent">
      <Link className="flex items-center gap-2 text-lg font-semibold" href="/">
        <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-logo-amber via-logo-rose via-logo-purple to-logo-teal dark:from-logo-amber dark:via-logo-rose dark:via-logo-purple dark:to-logo-teal">
          abhī
        </span>
      </Link>
      <nav className="flex items-center gap-4 sm:gap-6">
        <Link
          className="font-medium hover:underline underline-offset-4 text-gray-600 dark:text-gray-300"
          href="/adjuster"
        >
          Adjuster
        </Link>
        <Link
          className="font-medium hover:underline underline-offset-4 text-gray-600 dark:text-gray-300"
          href="/encoder"
        >
          Encoder
        </Link>
        <Link
          className="font-medium hover:underline underline-offset-4 text-gray-600 dark:text-gray-300"
          href="/donate"
        >
          Donate
        </Link>
        <Link
          className="font-medium hover:underline underline-offset-4 text-gray-600 dark:text-gray-300"
          href="/contact"
        >
          Contact
        </Link>
        {!isLoading &&
          (user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <UserCircle2 className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Link href="/meditations" className="w-full">
                    My Meditations
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          ))}
      </nav>
    </header>
  )
}
