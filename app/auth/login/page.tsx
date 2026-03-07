"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Mode = "login" | "signup"

const Logo = () => (
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
)

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login")

  // Login state
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loginLoading, setLoginLoading] = useState(false)

  // Sign-up state
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [signupRepeatPassword, setSignupRepeatPassword] = useState("")
  const [signupDisplayName, setSignupDisplayName] = useState("")
  const [signupError, setSignupError] = useState<string | null>(null)
  const [signupLoading, setSignupLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setLoginLoading(true)
    setLoginError(null)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })
      if (error) throw error
      await new Promise((resolve) => setTimeout(resolve, 500))
      window.location.href = "/"
    } catch (error: unknown) {
      setLoginError(error instanceof Error ? error.message : "An error occurred")
      setLoginLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setSignupLoading(true)
    setSignupError(null)

    if (signupPassword !== signupRepeatPassword) {
      setSignupError("Passwords do not match")
      setSignupLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo:
            process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
            `${window.location.origin}/library`,
          data: {
            display_name: signupDisplayName || signupEmail.split("@")[0],
          },
        },
      })
      if (error) throw error
      setSignupSuccess(true)
    } catch (error: unknown) {
      setSignupError(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setSignupLoading(false)
    }
  }

  const inputClass = "bg-stone-200 shadow-inner rounded-sm border-0 text-gray-700 placeholder:text-gray-500"

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Card className="border-[3px] border-muted shadow-2xl bg-transparent backdrop-blur-sm">
          <CardHeader className="text-center">
            <Logo />
            <CardTitle className="text-2xl font-black font-serif text-gray-700">
              {mode === "login" ? "Login" : "Sign up"}
            </CardTitle>
            <CardDescription className="font-serif">
              {mode === "login"
                ? "Enter your email to access your account"
                : "Create a new account"}
            </CardDescription>

            {/* Mode toggle */}
            <div className="flex mt-3 rounded-sm overflow-hidden border-[3px] border-muted">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-1.5 text-sm font-black font-serif transition-colors ${
                  mode === "login"
                    ? "bg-stone-200 text-gray-700 shadow-inner"
                    : "bg-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 py-1.5 text-sm font-black font-serif transition-colors ${
                  mode === "signup"
                    ? "bg-stone-200 text-gray-700 shadow-inner"
                    : "bg-transparent text-gray-400 hover:text-gray-600"
                }`}
              >
                Sign up
              </button>
            </div>
          </CardHeader>

          <CardContent>
            {mode === "login" ? (
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="login-email" className="font-black text-gray-700">
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="login-password" className="font-black text-gray-700">
                      Password
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  {loginError && <p className="text-sm text-red-500 font-serif">{loginError}</p>}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-logo-teal-500 to-logo-blue-400 text-white font-black shadow-md"
                    disabled={loginLoading}
                  >
                    {loginLoading ? "Logging in..." : "Login"}
                  </Button>
                </div>
              </form>
            ) : signupSuccess ? (
              <div className="flex flex-col gap-4 text-center">
                <p className="font-serif text-gray-700 text-sm">
                  Account created! Check your email to confirm your address, then{" "}
                  <button
                    type="button"
                    onClick={() => { setSignupSuccess(false); setMode("login") }}
                    className="underline underline-offset-4 font-black text-logo-teal-600"
                  >
                    log in
                  </button>
                  .
                </p>
              </div>
            ) : (
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="display-name" className="font-black text-gray-700">
                      Display Name
                    </Label>
                    <Input
                      id="display-name"
                      type="text"
                      placeholder="Your name"
                      value={signupDisplayName}
                      onChange={(e) => setSignupDisplayName(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-email" className="font-black text-gray-700">
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="signup-password" className="font-black text-gray-700">
                      Password
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password" className="font-black text-gray-700">
                      Repeat Password
                    </Label>
                    <Input
                      id="repeat-password"
                      type="password"
                      required
                      value={signupRepeatPassword}
                      onChange={(e) => setSignupRepeatPassword(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  {signupError && <p className="text-sm text-red-500 font-serif">{signupError}</p>}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-logo-teal-500 to-logo-blue-400 text-white font-black shadow-md"
                    disabled={signupLoading}
                  >
                    {signupLoading ? "Creating account..." : "Sign up"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
