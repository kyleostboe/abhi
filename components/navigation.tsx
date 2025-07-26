"use client"
import { usePathname } from "next/navigation"
import { HomeIcon, FlaskConicalIcon, BookOpenIcon, HandHeartIcon } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
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

  return null
}
