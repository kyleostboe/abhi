"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { LogOut, UserIcon, Database, Shield } from "lucide-react"

interface SettingsViewProps {
  user: User
}

export function SettingsView({ user }: SettingsViewProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="mt-2 text-neutral-400">Manage your account and dashboard preferences</p>
      </div>

      {/* Account Info */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <UserIcon className="h-5 w-5" />
            Account Information
          </CardTitle>
          <CardDescription className="text-neutral-400">Your current account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-neutral-400">Email</p>
              <p className="text-white">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">User ID</p>
              <p className="font-mono text-sm text-white">{user.id}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Created At</p>
              <p className="text-white">{new Date(user.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-neutral-400">Last Sign In</p>
              <p className="text-white">
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Info */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Database className="h-5 w-5" />
            Database Connection
          </CardTitle>
          <CardDescription className="text-neutral-400">Supabase integration status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <Shield className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="font-medium text-white">Connected</p>
              <p className="text-sm text-neutral-400">Real-time updates enabled</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-white">Actions</CardTitle>
          <CardDescription className="text-neutral-400">Manage your session</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSignOut} variant="destructive" className="bg-red-600 hover:bg-red-700">
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
