import type React from "react"
import "./globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/hooks/use-auth"
import { PageStatePreserver } from "@/components/page-state-preserver"
import { SwipeNavigator } from "@/components/swipe-navigator"
import { AppShell } from "@/components/app-shell"
import { DataWarmer } from "@/components/data-warmer"
import { PageChrome } from "@/components/page-chrome"
import { MotionPreferences } from "@/components/motion-preferences"
import StyleInspector from "@/components/dev/style-inspector"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "abhī - Meditation Tool",
  description: "Adjust meditation length or create custom meditation timelines.",
  generator: "v0.dev",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="my-0" lang="en" suppressHydrationWarning>
      <body className={`bg-gradient-to-r from-gray-50 to-muted ${inter.className}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <MotionPreferences>
            <AuthProvider>
              <DataWarmer />
              <PageStatePreserver />
              <SwipeNavigator />
              <AppShell />
              <PageChrome>{children}</PageChrome>
              <Toaster />
              {process.env.NODE_ENV === "development" && <StyleInspector />}
            </AuthProvider>
          </MotionPreferences>
        </ThemeProvider>
      </body>
    </html>
  )
}
