"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

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

  if (loading) {
    return (
      <Card className="w-full max-w-md bg-white/70 backdrop-blur-md dark:bg-gray-800/70 dark:shadow-white/10 shadow-2xl">
        <CardContent className="p-6 text-center">Loading user data...</CardContent>
      </Card>
    )
  }

  if (!user) {
    return null // Redirect handled by useEffect
  }

  return (
    <Card className="w-full max-w-md bg-white/70 backdrop-blur-md dark:bg-gray-800/70 dark:shadow-white/10 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-2xl text-center">User Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>User ID:</strong> {user.id}
        </p>
        <Button onClick={handleSignOut} className="w-full" variant="destructive">
          Sign Out
        </Button>
      </CardContent>
    </Card>
  )
}
