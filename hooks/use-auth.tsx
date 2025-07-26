"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase"

const SupabaseContext = createContext<
  | {
      user: User | null
      loading: boolean
      signIn: (email: string, password: string) => Promise<{ error: Error | null }>
      signUp: (email: string, password: string) => Promise<{ error: Error | null }>
      signOut: () => Promise<{ error: Error | null }>
    }
  | undefined
>(undefined)

const supabase = createClient()

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const getSession = useCallback(async () => {
    setLoading(true)
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    if (error) {
      console.error("Error getting session:", error.message)
      setUser(null)
    } else {
      setUser(session?.user || null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    getSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => {
      authListener?.unsubscribe()
    }
  }, [getSession])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }, [])

  return (
    <SupabaseContext.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</SupabaseContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
