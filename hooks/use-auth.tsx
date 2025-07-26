"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { User, Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

const SupabaseContext = createContext<
  | {
      user: User | null
      session: Session | null
      loading: boolean
      signIn: (email: string, password: string) => Promise<{ error: Error | null }>
      signUp: (email: string, password: string) => Promise<{ error: Error | null }>
      signOut: () => Promise<{ error: Error | null }>
    }
  | undefined
>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  const getSession = useCallback(async () => {
    setLoading(true)
    const {
      data: { session: currentSession },
      error,
    } = await supabase.auth.getSession()
    if (error) {
      console.error("Error getting session:", error.message)
      setUser(null)
      setSession(null)
    } else {
      setUser(currentSession?.user || null)
      setSession(currentSession || null)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    getSession()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setUser(currentSession?.user || null)
      setSession(currentSession || null)
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
    <SupabaseContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(SupabaseContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
