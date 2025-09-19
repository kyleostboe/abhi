"use client"

import type { ComponentProps } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

type MotionDivProps = ComponentProps<typeof motion.div>

export function PageCard({
  className,
  layoutId: _layoutId,
  initial,
  animate,
  exit,
  transition,
  ...props
}: MotionDivProps) {
  return (
    <motion.div
      layoutId="page-card"
      initial={initial ?? { opacity: 1, y: 0 }}
      animate={animate ?? { opacity: 1, y: 0 }}
      exit={exit ?? { opacity: 1, y: 0 }}
      transition={transition ?? { duration: 0.45, ease: "easeInOut" }}
      className={cn(
        "relative max-w-4xl mx-auto bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl overflow-hidden transition-colors duration-300 ease-in-out",
        className,
      )}
      {...props}
    />
  )
}
