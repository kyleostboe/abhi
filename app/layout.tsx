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
  openGraph: {
    title: "abhī - Meditation Pause Adjuster",
    description: "Adjust the length of pauses in meditation audio files to match a target duration",
    url: "https://v0-abhi-ten.vercel.app/", // IMPORTANT: Replace with your actual deployed URL
    images: [
      {
        url: "https://v0-abhi-ten.vercel.app/placeholder.svg?height=630&width=1200&query=meditation%20app%20logo", // Absolute URL for OG image
        width: 1200,
        height: 630,
        alt: "abhī - Meditation Pause Adjuster",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "abhī - Meditation Pause Adjuster",
    description: "Adjust the length of pauses in meditation audio files to match a target duration",
    images: ["https://v0-abhi-ten.vercel.app/placeholder.svg?height=630&width=1200&query=meditation%20app%20logo"], // Absolute URL for Twitter image
  },
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
