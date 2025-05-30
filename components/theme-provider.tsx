"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Add a console log here to see if this component is rendered on the client
  React.useEffect(() => {
    console.log("ThemeProvider is mounted and rendering on the client with props:", props)
  }, [])

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
