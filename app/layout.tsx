import type React from "react"
import type { Metadata } from "next"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "abhī - Meditation Length Adjuster",
  description: "Adjust the length of pauses in meditation audio files to match a target duration",
  generator: "v0.dev",
  openGraph: {
    title: "abhī - Meditation Length Adjuster",
    description: "Adjust the length of pauses in meditation audio files to match a target duration",
    url: "https://v0-abhi-ten.vercel.app/",
    images: [
      {
        url: "/og-image-v2.png?v=3",
        width: 1200,
        height: 630,
        alt: "abhī meditation app interface showing pause adjustment features",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "abhī - Meditation Length Adjuster",
    description: "Adjust the length of pauses in meditation audio files to match a target duration",
    images: ["/og-image-v2.png?v=3"],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  console.log("RootLayout is rendering.")
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${inter.className} transition-colors duration-300 ease-in-out`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
