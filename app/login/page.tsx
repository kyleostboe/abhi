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

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSigningIn(true)
    if (!supabase.auth) {
      toast({
        title: "Error",
        description: "Supabase client not initialized. Check environment variables.",
        variant: "destructive",
      })
      setIsSigningIn(false)
      return
    }
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreatingAccount(true)
    if (!supabase.auth) {
      toast({
        title: "Error",
        description: "Supabase client not initialized. Check environment variables.",
        variant: "destructive",
      })
      setIsCreatingAccount(false)
      return
    }
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
    }
    setIsCreatingAccount(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-950">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Login or Sign Up</CardTitle>
          <CardDescription>Enter your email and password to access your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSignIn} className="space-y-4">
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
            <Button type="submit" className="w-full" disabled={isSigningIn}>
              {isSigningIn ? "Signing In..." : "Sign In"}
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
            onClick={handleSignUp}
            disabled={isCreatingAccount}
          >
            {isCreatingAccount ? "Creating Account..." : "Create Account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
