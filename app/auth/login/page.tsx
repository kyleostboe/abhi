"use client"

import { useState } from "react"
import { useRouter } from 'next/navigation'
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      await new Promise(resolve => setTimeout(resolve, 500))
      window.location.href = '/'
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card className="border-[3px] border-muted shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="flex items-center space-x-[5px]">
                  <div className="bg-gradient-to-br from-logo-teal to-logo-emerald rounded-sm transform rotate-12 w-[16px] h-[16px] shadow-md" />
                  <div className="bg-gradient-to-br from-logo-rose to-pink-300 rounded-full h-[11px] w-[11px] shadow" />
                  <div className="w-5 bg-gradient-to-br from-logo-amber to-orange-300 rounded-[4px] h-[11px] shadow-sm" />
                  <div className="bg-gradient-to-br from-gray-600 to-gray-500 border-[3px] bg-muted h-11 w-3 border-stone-200 shadow-md rounded-md" />
                  <div className="w-5 bg-gradient-to-br from-logo-purple to-indigo-300 rounded-[4px] h-[11px] shadow-sm" />
                  <div className="bg-gradient-to-br from-blue-400 to-cyan-300 rounded-full h-[11px] w-[11px] shadow" />
                  <div className="bg-gradient-to-br from-logo-emerald to-logo-teal rounded-sm transform -rotate-12 w-[16px] h-[16px] shadow-md" />
                </div>
              </div>
              <CardTitle className="text-2xl font-black font-serif text-gray-700">Login</CardTitle>
              <CardDescription className="font-serif">Enter your email to access your account</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="font-black text-gray-700">
                      Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-white shadow-2xl rounded-sm border-0 text-gray-700 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="font-black text-gray-700">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-white shadow-2xl rounded-sm border-0 text-gray-700 placeholder:text-gray-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                  {error && <p className="text-sm text-red-500 font-serif">{error}</p>}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-logo-rose-300 to-logo-emerald-500  text-white font-black shadow-md"
                    disabled={isLoading}
                  >
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </div>
                <div className="text-center font-serif text-gray-600 mt-5 text-xs">
                  Don't have an account?{" "}
                  <Link href="/auth/sign-up" className="underline underline-offset-4 font-black text-sm text-gray-500">
                    Sign up
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
