"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Navigation } from "@/components/navigation"
import { useAuth } from "@/hooks/use-auth"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [isSignupMode, setIsSignupMode] = useState(false) // New state to toggle between sign-in/sign-up forms
  const router = useRouter()
  const { session } = useAuth()

  // Redirect if already logged in
  if (session) {
    router.push("/profile")
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Basic check for Supabase client initialization
    if (!supabase.auth) {
      toast({
        title: "Configuration Error",
        description: "Supabase client is not initialized. Check environment variables.",
        variant: "destructive",
      })
      return
    }

    if (isSignupMode) {
      setIsCreatingAccount(true)
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        toast({
          title: "Sign Up Error",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Account created! Please check your email to confirm.",
        })
        // Optionally switch to sign-in mode after successful signup
        setIsSignupMode(false)
      }
      setIsCreatingAccount(false)
    } else {
      setIsSigningIn(true)
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast({
          title: "Sign In Error",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Signed in successfully!",
        })
        router.push("/profile") // Redirect to profile or dashboard
      }
      setIsSigningIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8 md:pt-0">
      <Navigation />
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">{isSignupMode ? "Sign Up" : "Sign In"}</CardTitle>
            <CardDescription>
              {isSignupMode
                ? "Create your account to get started."
                : "Enter your email and password to access your account."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSigningIn || isCreatingAccount}>
                {isSignupMode
                  ? isCreatingAccount
                    ? "Creating Account..."
                    : "Create Account"
                  : isSigningIn
                    ? "Signing In..."
                    : "Sign In"}
              </Button>
            </form>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => setIsSignupMode(!isSignupMode)}
              disabled={isSigningIn || isCreatingAccount}
            >
              {isSignupMode ? "Already have an account? Sign In" : "Need an account? Sign Up"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
