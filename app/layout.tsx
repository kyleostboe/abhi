import type React from "react"
import type { Metadata } from "next"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "abhī - Meditation Pause Adjuster",
  description: "Adjust the length of pauses in meditation audio files to match a target duration",
  generator: "v0.dev",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Added a console log here to confirm RootLayout execution on server/client
  console.log("RootLayout is rendering.")

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.className} transition-colors duration-300 ease-in-out`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light" // Explicitly set to light
          enableSystem={false} // Disable system preference detection
          disableTransitionOnChange={false}
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
