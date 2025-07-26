"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import type { Session } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase"

interface AuthContextType {
  session: Session | null
  user: any | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signOut: async () => console.warn("signOut function not ready yet, check if AuthProvider is properly initialized"),
})

export function useAuth(): AuthContextType {
  return useContext(AuthContext)
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const getInitialSession = async () => {
      setIsLoading(true)
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        setSession(initialSession)
        setUser(initialSession?.user || null)
      } catch (error) {
        console.error("Error getting initial session:", error)
      } finally {
        setIsLoading(false)
      }
    }

    getInitialSession()

    // Set up listener for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state change event:", event)
      setSession(currentSession)
      setUser(currentSession?.user || null)
    })

    // Clean up subscription
    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      console.log("Signed out successfully")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const value: AuthContextType = {
    session,
    user,
    isLoading,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
