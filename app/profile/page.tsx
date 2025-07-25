"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/components/ui/use-toast"
import { Navigation } from "@/components/navigation"

interface Meditation {
  id: string
  title: string
  created_at: string
}

export default function ProfilePage() {
  const { session } = useAuth()
  const router = useRouter()
  const [meditations, setMeditations] = useState<Meditation[]>([])

  useEffect(() => {
    if (!session) return
    supabase
      .from("meditations")
      .select("id, title, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" })
        } else {
          setMeditations(data || [])
        }
      })
  }, [session])

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-6 space-y-4 bg-white dark:bg-gray-900">
          <p className="text-center">Please <a href="/login" className="text-blue-600">sign in</a> to view your profile.</p>
        </Card>
      </div>
    )
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />
      <div className="max-w-2xl mx-auto mt-10 space-y-6">
        <Card className="p-6 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold dark:text-gray-200">My Meditations</h2>
            <Button variant="ghost" onClick={handleSignOut}>Sign Out</Button>
          </div>
          {meditations.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">No meditations saved.</p>
          ) : (
            <ul className="space-y-2">
              {meditations.map((m) => (
                <li key={m.id} className="flex justify-between border-b pb-2 border-gray-200 dark:border-gray-700">
                  <span className="dark:text-gray-300">{m.title}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{new Date(m.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
