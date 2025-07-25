"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { getClientSupabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function AuthForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = getClientSupabase()

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Success!",
        description: isSignUp
          ? "Account created. Please check your email for verification."
          : "Logged in successfully.",
        variant: "default",
      })
      router.push("/") // Redirect to home or dashboard after successful auth
      router.refresh() // Refresh to update server-side session
    }
    setLoading(false)
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{isSignUp ? "Sign Up" : "Log In"}</CardTitle>
        <CardDescription>
          {isSignUp ? "Create your account to get started." : "Welcome back! Enter your credentials."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isSignUp ? "Signing Up..." : "Logging In..."}
              </>
            ) : isSignUp ? (
              "Sign Up"
            ) : (
              "Log In"
            )}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <Button variant="link" onClick={() => setIsSignUp(false)} className="p-0 h-auto">
                Log In
              </Button>
            </>
          ) : (
            <>
              Don't have an account?{" "}
              <Button variant="link" onClick={() => setIsSignUp(true)} className="p-0 h-auto">
                Sign Up
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
