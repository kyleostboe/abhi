"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
        <Navigation />
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <Card className="p-12 text-center border-[3px] border-muted shadow-xl">
            <h2 className="text-2xl font-black font-serif text-gray-700 mb-4">
              Sign in to access settings
            </h2>
            <p className="text-gray-600 font-serif mb-6">
              Create an account or sign in to manage your profile and preferences.
            </p>
            <Button
              onClick={() => (window.location.href = "/auth/login")}
              className="bg-gradient-to-r from-logo-teal-500 to-logo-blue-400 text-white font-black shadow-md"
            >
              Sign in
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
        <Navigation />
        <div className="container max-w-4xl mx-auto py-8 px-4 text-center">
          <p className="text-gray-600 font-serif">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <Navigation />
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card className="mx-auto w-full max-w-2xl border-[3px] border-muted shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="flex items-center space-x-[5px]">
                <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[16px] h-[16px] shadow-md" />
                <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[11px] w-[11px] shadow" />
                <div className="w-5 bg-gradient-to-br from-logo-amber to-orange-300 rounded-[4px] h-[11px] shadow-sm" />
                <div className="bg-gradient-to-br from-gray-600 to-gray-500 border-[3px] bg-muted h-11 w-3 border-stone-200 shadow-md rounded-md" />
                <div className="w-5 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-[4px] h-[11px] shadow-sm" />
                <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[11px] w-[11px] shadow" />
                <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[16px] h-[16px] shadow-md" />
              </div>
            </div>
            <CardTitle className="text-2xl font-black font-serif text-gray-700">Account Settings</CardTitle>
            <CardDescription className="font-serif">Manage your profile and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="displayName" className="font-black text-gray-700">
                Display Name
              </Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="bg-white shadow-2xl rounded-sm border-0 text-gray-700 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <p className="text-xs text-gray-500 font-serif">This is how your name will appear in the app</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email" className="font-black text-gray-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-gray-100 rounded-sm border-0 text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              <p className="text-xs text-gray-500 font-serif">Email cannot be changed from settings</p>
            </div>

            <div className="flex justify-end gap-3 rounded-sm font-serif">
              <Button variant="ghost" className="text-gray-600" onClick={() => window.history.back()}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 text-white font-black shadow-md"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            <div className="rounded-md border-[3px] border-muted bg-muted/30 p-4">
              <h3 className="font-black font-serif text-gray-700 text-sm mb-2">Account Information</h3>
              <div className="text-sm text-gray-600 space-y-1 font-serif">
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
