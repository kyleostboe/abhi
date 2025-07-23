"use client"

import { useState, useEffect } from "react"

const MOBILE_BREAKPOINT = 768

export const useMobile = () => {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    checkMobile() // Check on initial render

    window.addEventListener("resize", checkMobile) // Add event listener for resize

    return () => {
      window.removeEventListener("resize", checkMobile) // Clean up on unmount
    }
  }, [])

  return !!isMobile
}
