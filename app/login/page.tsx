"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/components/ui/use-toast"
import { Navigation } from "@/components/navigation"

export default function LoginPage() {
  const router = useRouter()
  const { session } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignup, setIsSignup] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Check if supabase client is initialized before attempting to use it
      if (!supabase.auth) {
        toast({
          title: "Configuration Error",
          description: "Supabase client is not initialized. Check environment variables.",
          variant: "destructive",
        })
        return
      }

      if (isSignup) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) toast({ title: "Sign up failed", description: error.message, variant: "destructive" })
        else toast({ title: "Check your email", description: "Confirm your account" })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) toast({ title: "Sign in failed", description: error.message, variant: "destructive" })
        else router.push("/profile")
      }
    } finally {
      setLoading(false)
    }
  }

  if (session) {
    router.push("/profile")
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />
      <div className="max-w-md mx-auto mt-10">
        <Card className="p-6 space-y-4 bg-white dark:bg-gray-900 shadow-lg border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-center dark:text-gray-200">{isSignup ? "Sign Up" : "Sign In"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isSignup ? "Create Account" : "Sign In"}
            </Button>
          </form>
          <Button variant="ghost" className="w-full" onClick={() => setIsSignup(!isSignup)}>
            {isSignup ? "Have an account? Sign In" : "Need an account? Sign Up"}
          </Button>
        </Card>
      </div>
    </div>
  )
}
