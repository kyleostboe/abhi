"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"
import Link from "next/link"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isSignUp) {
        const { error } = await signUp(email, password)
        if (error) throw error
        toast({
          title: "Sign Up Successful",
          description: "Please check your email to confirm your account.",
        })
      } else {
        const { error } = await signIn(email, password)
        if (error) throw error
        toast({
          title: "Sign In Successful",
          description: "Welcome back!",
        })
        router.push("/profile")
      }
    } catch (error: any) {
      console.error("Authentication error:", error.message)
      toast({
        title: "Authentication Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-white/70 backdrop-blur-md dark:bg-gray-800/70 dark:shadow-white/10 shadow-2xl">
      <CardHeader>
        <CardTitle className="text-2xl text-center">{isSignUp ? "Sign Up" : "Login"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : isSignUp ? "Sign Up" : "Login"}
          </Button>
        </form>
        <div className="mt-4 text-center text-sm">
          {isSignUp ? (
            <>
              Already have an account?{" "}
              <Link href="#" onClick={() => setIsSignUp(false)} className="underline">
                Login
              </Link>
            </>
          ) : (
            <>
              Don&apos;t have an account?{" "}
              <Link href="#" onClick={() => setIsSignUp(true)} className="underline">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
