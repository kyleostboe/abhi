"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { TEST_PROFILE_ID } from "@/lib/test-profile"

export default function SettingsPage() {
  const [username, setUsername] = useState("testuser")
  const [displayName, setDisplayName] = useState("Test User")
  const [email, setEmail] = useState("test@example.com")
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username,
          display_name: displayName,
          email,
          updated_at: new Date().toISOString(),
        })
        .eq("id", TEST_PROFILE_ID)

      if (error) throw error

      toast({
        title: "Settings saved",
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 font-black font-serif">
      <div className="mb-8">
        <h1 className="font-black text-xl mb-0 text-gray-600">Account Settings</h1>
        
      </div>

      <Card className="p-6 shadow-lg">
        <div className="space-y-6">
          <div>
            <h2 className="font-bold mb-4 text-gray-600 text-base">Profile Information</h2>
            <div className="space-y-4">
              <div className="text-gray-600">
                <Label htmlFor="username" className="text-sm font-semibold text-gray-700">
                  Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">This is your unique identifier on the platform</p>
              </div>

              <div className="text-gray-600">
                <Label htmlFor="displayName" className="text-sm font-semibold text-gray-700">
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">This is how your name will appear to others</p>
              </div>

              <div className="text-gray-600">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">We'll use this for important account notifications</p>
              </div>
            </div>
          </div>

          

          <div>
            <h2 className="font-bold mb-4 text-gray-600 text-base">Preferences</h2>
            
          </div>

          

          <div className="flex justify-end gap-3 rounded-sm font-serif">
            <Button variant="outline" onClick={() => window.history.back()}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-gray-600 to-gray-500 text-white hover:opacity-90"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Card>

      <Card className="mt-6 p-6 bg-gray-50">
        <h3 className="font-semibold mb-2 text-gray-600 text-base">Account Information</h3>
        <div className="text-xs text-gray-600 space-y-1">
          <p className="text-gray-500">Account ID: {TEST_PROFILE_ID}</p>
          <p className="text-gray-500">Account Type: Test Account (No authentication required)</p>
          <p className="text-amber-600 mt-2 font-black text-xs">
            Note: Authentication and password management will be added in a future update
          </p>
        </div>
      </Card>
    </div>
  )
}
