"use client"

import type React from "react"
import { MotionConfig } from "framer-motion"

/**
 * Honours the OS "reduce motion" setting across every Framer Motion animation in the app.
 *
 * `reducedMotion="user"` makes Framer drop transform and layout animations while keeping opacity
 * ones, which is the behaviour the setting actually asks for — content still appears, it just
 * stops flying around. This has to be a client component because MotionConfig uses context, and
 * it wraps the tree at the root so individual pages never have to remember.
 *
 * CSS transitions are handled separately in globals.css; Framer drives its animations from JS and
 * would ignore a stylesheet rule.
 */
export function MotionPreferences({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
