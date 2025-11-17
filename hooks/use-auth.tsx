"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import { TEST_PROFILE_ID } from "@/lib/test-profile"
import { getAuthState, setAuthState } from "@/lib/auth-state"

type AuthContextValue = {
  status: "loading" | "authenticated" | "unauthenticated"
  isAuthenticated: boolean
  userId: string | null
  login: () => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">(
    typeof window === "undefined" ? "loading" : getAuthState().status,
  )
  const [userId, setUserId] = useState<string | null>(getAuthState().userId)

  useEffect(() => {
    let isMounted = true

    const hydrateFromSession = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const sessionUserId = data.session?.user?.id ?? null
        if (!isMounted) return

        if (sessionUserId) {
          setStatus("authenticated")
          setUserId(sessionUserId)
        } else {
          setStatus("unauthenticated")
          setUserId(null)
        }
      } catch (error) {
        console.warn("Unable to hydrate auth session", error)
        if (!isMounted) return
        setStatus("unauthenticated")
        setUserId(null)
      }
    }

    void hydrateFromSession()

    return () => {
      isMounted = false
    }
  }, [supabase])

  useEffect(() => {
    setAuthState({ status, userId })
  }, [status, userId])

  const login = () => {
    setStatus("authenticated")
    setUserId(TEST_PROFILE_ID)
  }

  const logout = () => {
    setStatus("unauthenticated")
    setUserId(null)
    void supabase.auth.signOut()
  }

  const value: AuthContextValue = {
    status,
    isAuthenticated: status === "authenticated",
    userId,
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
