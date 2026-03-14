"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { setAuthState } from "@/lib/auth-state"

type AuthContextValue = {
  status: "loading" | "authenticated" | "unauthenticated"
  isAuthenticated: boolean
  userId: string | null
  user: User | null
  login: (returnTo?: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading")
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!isMounted) return

        if (session?.user) {
          console.log("[v0] Auth: User authenticated -", session.user.email)
          setStatus("authenticated")
          setUser(session.user)
          setAuthState({ status: "authenticated", userId: session.user.id })
        } else {
          console.log("[v0] Auth: No session found")
          setStatus("unauthenticated")
          setUser(null)
          setAuthState({ status: "unauthenticated", userId: null })
        }
      } catch (error) {
        console.error("[v0] Auth session check failed:", error)
        if (isMounted) {
          setStatus("unauthenticated")
          setUser(null)
          setAuthState({ status: "unauthenticated", userId: null })
        }
      }
    }

    void checkSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: unknown, session: any) => {
      console.log("[v0] Auth state changed:", _event, session?.user?.email)
      if (!isMounted) return

      if (session?.user) {
        setStatus("authenticated")
        setUser(session.user)
        setAuthState({ status: "authenticated", userId: session.user.id })
      } else {
        setStatus("unauthenticated")
        setUser(null)
        setAuthState({ status: "unauthenticated", userId: null })
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const login = (returnTo?: string) => {
    const targetReturnTo =
      typeof returnTo === "string" && returnTo.trim().length > 0
        ? returnTo.trim()
        : typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}${window.location.hash}`
          : "/"

    const params = new URLSearchParams({ returnTo: targetReturnTo })
    router.push(`/auth/login?${params.toString()}`)
  }

  const logout = async () => {
    console.log("[v0] Logging out user")
    const supabase = createClient()
    await supabase.auth.signOut()
    setStatus("unauthenticated")
    setUser(null)
    setAuthState({ status: "unauthenticated", userId: null })
    window.location.href = '/'
  }

  const value: AuthContextValue = {
    status,
    isAuthenticated: status === "authenticated",
    userId: user?.id ?? null,
    user,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
