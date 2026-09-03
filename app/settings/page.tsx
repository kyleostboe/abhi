"use client"

import { useEffect, useState } from "react"
import { Card, CardDescription, CardHeader } from "@/components/ui/card"
import { LogoMark } from "@/components/logo-mark"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"
import { Navigation } from "@/components/navigation"
import { log } from "@/lib/log"
import { useUserSettings } from "@/hooks/use-user-settings"
import { formatDayBoundary } from "@/lib/user-settings"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth()
  const [displayName, setDisplayName] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const { settings, updateSettings } = useUserSettings()

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
        log.error("Error loading profile:", error)
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
      log.error("Error saving settings:", error)
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
          <div className="bg-gradient-to-br from-gray-600 to-gray-500 px-6 py-[9px] text-center">
            <h3 className="font-serif text-base font-black tracking-tight text-white">Account Settings</h3>
          </div>
          <CardHeader className="pb-4 text-center">
            <LogoMark className="mb-3" />
            <CardDescription>Manage your profile and preferences</CardDescription>
          </CardHeader>

          {/* Sections, not tools. The Creator heads Timeline Events / Notes / Miscellaneous with
              a bare serif heading on white, and that is the right weight here — a second and
              third gradient inside a card that already has one is what made this shout. */}
          <div className="space-y-8 px-6 pb-8 md:px-8">
            <section className="space-y-3">
              <h4 className="text-base font-black text-gray-600">Profile</h4>

              <div className="grid gap-2 font-serif">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
                <p className="text-xs tracking-tight text-gray-400">This is how your name will appear in the app</p>
              </div>

              <div className="grid gap-2 font-serif">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={email} disabled />
                <p className="text-xs tracking-tight text-gray-400">Email cannot be changed from settings</p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-1">
                <Button variant="ghost" className="text-gray-600" onClick={() => window.history.back()}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving} className="w-full max-w-[240px]">
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-base font-black text-gray-600">Practice</h4>

              <div className="grid gap-2 font-serif">
                <Label>Practice day starts at</Label>
                <div className="flex flex-wrap gap-2">
                  {[0, 3, 4, 5, 6].map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => void updateSettings({ dayBoundaryHour: hour })}
                      // The Library's filter chip, unchanged — the app already has one
                      // "pick one of these" control and this is it.
                      className={cn(
                        "flex items-center justify-center rounded-[8px] border-[3px] px-5 py-1 text-xs font-black shadow-md transition-all duration-200 ease-out",
                        settings.dayBoundaryHour === hour
                          ? "border-transparent bg-gradient-to-r from-gray-600 to-gray-500 text-white"
                          : "border-gray-500 bg-white text-gray-600 hover:shadow-none",
                      )}
                    >
                      {formatDayBoundary(hour)}
                    </button>
                  ))}
                </div>
                <p className="text-xs tracking-tight text-gray-400">
                  A sit before this hour counts toward the previous day, so sitting late doesn&apos;t cost you a
                  streak.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="text-base font-black text-gray-600">Account</h4>

              <div className="space-y-1 font-serif text-xs tracking-tight text-gray-500">
                <p>Account ID: {user?.id}</p>
                <p>Email: {email}</p>
                <p className="pt-2 text-gray-400">
                  Audio files are stored locally on this device. Metadata syncs across your devices.
                </p>
              </div>
            </section>
          </div>
        </Card>
      </div>
    </div>
  )
}
