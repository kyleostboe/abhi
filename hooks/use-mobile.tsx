"use client"

import { useState, useEffect } from "react"

export function useMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      // Check for screen width (common for mobile detection)
      const isSmallScreen = typeof window !== "undefined" && window.innerWidth < 768

      // Check for common mobile user agent strings
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)

      setIsMobile(isSmallScreen || isMobileUserAgent)
    }

    // Initial check
    checkMobile()

    // Add event listener for window resize
    if (typeof window !== "undefined") {
      window.addEventListener("resize", checkMobile)
      return () => {
        window.removeEventListener("resize", checkMobile)
      }
    }
  }, [])

  return isMobile
}
