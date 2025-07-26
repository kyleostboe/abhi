"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { toast } from "@/components/ui/use-toast"
import { Navigation } from "@/components/navigation"

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  subscription_tier: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { session, user, signOut } = useAuth() // Use useAuth hook
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")

  useEffect(() => {
    if (!session) {
      router.push("/login")
      return
    }

    const fetchProfile = async () => {
      setLoading(true)
      if (!user) {
        setLoading(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("id, email, full_name, avatar_url, subscription_tier")
          .eq("id", user.id)
          .single()

        if (error) throw error

        if (data) {
          setProfile(data)
          setFullName(data.full_name || "")
          setAvatarUrl(data.avatar_url || "")
        }
      } catch (error: any) {
        toast({
          title: "Error fetching profile",
          description: error.message,
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [session, user, router])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    if (!user) {
      toast({
        title: "Error",
        description: "User not logged in.",
        variant: "destructive",
      })
      setLoading(false)
      return
    }

    try {
      const updates = {
        id: user.id,
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("user_profiles").upsert(updates)

      if (error) throw error

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      })
    } catch (error: any) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <p className="text-gray-700 dark:text-gray-300">Loading profile...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
        <Navigation />
        <div className="max-w-md mx-auto mt-10 text-center">
          <Card className="p-6 space-y-4 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-2xl font-bold dark:text-gray-200">Profile Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                There was an issue loading your profile. Please try logging in again.
              </p>
              <Button onClick={handleSignOut}>Go to Login</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />
      <div className="max-w-md mx-auto mt-10">
        <Card className="p-6 space-y-6 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold dark:text-gray-200">User Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24 border-2 border-primary">
                <AvatarImage src={avatarUrl || "/placeholder-user.png"} alt="User Avatar" />
                <AvatarFallback>{profile.full_name ? profile.full_name[0] : profile.email[0]}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold dark:text-gray-200">{profile.full_name || "No Name Set"}</h3>
              <p className="text-gray-600 dark:text-gray-400">{profile.email}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Subscription Tier: {profile.subscription_tier}</p>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your Full Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL</Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Update Profile"}
              </Button>
            </form>

            <Button variant="destructive" className="w-full" onClick={handleSignOut} disabled={loading}>
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
