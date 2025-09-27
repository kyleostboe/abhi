import type React from "react"
import "./globals.css"import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "abhī - Meditation Tool",
  description: "Adjust meditation length or create custom meditation timelines.",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className="my-0" lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvidemy-0 bg-whitetribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
