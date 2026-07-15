"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface MarqueeTextProps {
  text: string
  className?: string
}

// Renders `text` on a single line. If it's too wide for its container, it slowly
// scrolls back and forth so the full text eventually becomes visible instead of being
// clipped — otherwise renders as plain static text.
export function MarqueeText({ text, className }: MarqueeTextProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    const textEl = textRef.current
    if (!container || !textEl) return

    const measure = () => {
      const overflow = textEl.scrollWidth - container.clientWidth
      setDistance(overflow > 0 ? overflow : 0)
    }
    measure()

    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [text])

  return (
    <div ref={containerRef} className={cn("overflow-hidden whitespace-nowrap", className)}>
      <span
        ref={textRef}
        className={cn("inline-block", distance > 0 && "animate-marquee-scroll")}
        style={distance > 0 ? ({ "--marquee-distance": `-${distance}px` } as React.CSSProperties) : undefined}
      >
        {text}
      </span>
    </div>
  )
}
