"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { LogoMark } from "@/components/logo-mark"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { Navigation } from "@/components/navigation"

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth()
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setIsLoading(false)
      return
    }

    const loadProfile = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single()

        if (!error && data) {
          setDisplayName(data.display_name || "")
        }
        setEmail(user.email || "")
      } catch (error) {
        console.error("[v0] Error loading profile:", error)
      } finally {
        setIsLoading(false)
      }
    }

    void loadProfile()
  }, [isAuthenticated, user, supabase])

  const handleSave = async () => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Error",
        description: "You must be logged in to update settings.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error

      toast({
        title: "Settings saved",
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      console.error("[v0] Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pt-20 md:p-8 md:pt-24">
        <Navigation />
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <Card className="rounded-xl border-none bg-white p-12 text-center shadow-lg">
            <h2 className="mb-4 font-serif text-2xl font-black tracking-tight text-gray-700">Sign in to access settings</h2>
            <p className="mb-6 font-serif text-xs tracking-tight text-gray-500">
              Create an account or sign in to manage your profile and preferences.
            </p>
            <Button onClick={() => (window.location.href = "/auth/login")} variant="accent">
              Sign in
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pt-20 md:p-8 md:pt-24">
        <Navigation />
        <div className="container max-w-4xl mx-auto py-8 px-4 text-center">
          <p className="font-serif text-xs tracking-tight text-gray-500">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 pt-20 md:p-8 md:pt-24">
      <Navigation />
      <div className="container max-w-4xl mx-auto py-8 px-4">
        {/* Same shell as the Home tools: white, borderless, xl radius, gradient title strip. */}
        <Card className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl border-none bg-white shadow-lg">
          <div className="bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 px-6 py-[9px] text-center">
            <h3 className="font-serif text-base font-black tracking-tight text-white">Account Settings</h3>
          </div>
          <CardHeader className="pb-4 text-center">
            <LogoMark className="mb-3" />
            <CardDescription>Manage your profile and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
              <p className="font-serif text-xs tracking-tight text-gray-500">This is how your name will appear in the app</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
              />
              <p className="font-serif text-xs tracking-tight text-gray-500">Email cannot be changed from settings</p>
            </div>

            <div className="flex justify-end gap-3 rounded-sm font-serif">
              <Button variant="ghost" className="text-gray-600" onClick={() => window.history.back()}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving} variant="accent">
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            <div className="rounded-[10px] bg-muted/60 p-4 shadow-inner">
              <h3 className="mb-2 font-serif text-sm font-black tracking-tight text-gray-700">Account Information</h3>
              <div className="space-y-1 font-serif text-xs tracking-tight text-gray-600">
                <p>Account ID: {user?.id}</p>
                <p>Email: {email}</p>
                <p className="text-logo-teal-600 mt-3 font-black text-xs">
                  Audio files are stored locally on this device. Metadata syncs across your devices.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
