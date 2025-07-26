"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import type { Session, User } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"

interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const getSession = useCallback(async () => {
    setLoading(true)
    try {
      if (!supabase.auth) {
        console.error("Supabase client not initialized in AuthProvider. Check environment variables.")
        setLoading(false)
        return
      }
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error) throw error

      setSession(session)
      setUser(session?.user || null)
    } catch (error: any) {
      console.error("Error getting session:", error.message)
      toast({
        title: "Authentication Error",
        description: error.message,
        variant: "destructive",
      })
      setSession(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const signOut = useCallback(async () => {
    setLoading(true)
    try {
      if (!supabase.auth) {
        console.error("Supabase client not initialized for signOut. Check environment variables.")
        setLoading(false)
        return
      }
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setSession(null)
      setUser(null)
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      })
    } catch (error: any) {
      console.error("Error signing out:", error.message)
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    getSession()

    if (!supabase.auth) {
      console.error("Supabase client not initialized for auth listener. Check environment variables.")
      return
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => {
      authListener?.unsubscribe()
    }
  }, [getSession])

  return <AuthContext.Provider value={{ session, user, loading, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
