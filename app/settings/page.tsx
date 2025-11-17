"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
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
      <div className="container max-w-4xl mx-auto py-8 px-4 font-black font-serif">
        <div className="mb-8">
          <h1 className="font-black text-3xl mb-2 text-gray-700">Account Settings</h1>
          <p className="text-gray-600 font-serif font-normal">Manage your profile and preferences</p>
        </div>

        <Card className="p-6 shadow-xl border-[3px] border-muted">
          <div className="space-y-6">
            <div>
              <h2 className="font-bold mb-4 text-gray-600 text-lg">Profile Information</h2>
              <div className="space-y-4">
                <div className="text-gray-600">
                  <Label htmlFor="displayName" className="text-sm font-semibold text-gray-700">
                    Display Name
                  </Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                    className="mt-1 border-[3px] border-muted"
                  />
                  <p className="text-xs text-gray-500 mt-1 font-serif font-normal">
                    This is how your name will appear in the app
                  </p>
                </div>

                <div className="text-gray-600">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="mt-1 border-[3px] border-muted bg-gray-50"
                  />
                  <p className="text-xs text-gray-500 mt-1 font-serif font-normal">
                    Email cannot be changed from settings
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 rounded-sm font-serif">
              <Button variant="outline" onClick={() => window.history.back()}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-gradient-to-r from-logo-teal-500 to-logo-blue-400 text-white font-black shadow-md hover:shadow-none"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="mt-6 p-6 bg-muted/30 border-[3px] border-muted">
          <h3 className="font-semibold mb-2 text-gray-700 text-base">Account Information</h3>
          <div className="text-sm text-gray-600 space-y-1 font-serif font-normal">
            <p>Account ID: {user?.id}</p>
            <p>Email: {email}</p>
            <p className="text-logo-teal-600 mt-3 font-black text-xs">
              Audio files are stored locally on this device. Metadata syncs across your devices.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
