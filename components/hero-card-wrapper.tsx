"use client"

import type { ComponentProps, CSSProperties, ReactNode } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname } from "next/navigation"

import { PageCard } from "@/components/page-card"
import { cn } from "@/lib/utils"

interface HeroCardWrapperProps {
  hero: ReactNode
  children: ReactNode
  beforeContent?: ReactNode
  containerClassName?: string
  heroClassName?: string
  contentClassName?: string
  cardClassName?: string
  cardStyle?: CSSProperties
  contentKey?: string
  cardProps?: ComponentProps<typeof PageCard>
}

export function HeroCardWrapper({
  hero,
  children,
  beforeContent,
  containerClassName,
  heroClassName,
  contentClassName,
  cardClassName,
  cardStyle,
  contentKey,
  cardProps,
}: HeroCardWrapperProps) {
  const pathname = usePathname()
  const transitionKey = contentKey ?? pathname
  const mergedClassName = cn("w-full", cardProps?.className, cardClassName)
  const mergedStyle: CSSProperties = {
    borderRadius: "4rem 3rem 2rem 1rem",
    ...(cardProps?.style ?? {}),
    ...(cardStyle ?? {}),
  }

  return (
    <div className={cn("space-y-6", containerClassName)}>
      {beforeContent}
      <PageCard
        {...cardProps}
        className={mergedClassName}
        style={mergedStyle}
      >
        <div className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 blur-3xl -translate-y-1/2">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 via-rose-300/15 via-purple-400/10 to-teal-300/20" />
            <div className="absolute top-2 left-8 w-16 h-12 rounded-full bg-gradient-to-br from-emerald-300/30 to-teal-400/25 rotate-12" />
            <div className="absolute top-6 right-12 w-20 h-8 rounded-full bg-gradient-to-bl from-rose-300/25 to-purple-400/20 -rotate-6" />
            <div className="absolute top-1 left-1/3 w-12 h-16 rounded-full bg-gradient-to-tr from-amber-300/20 to-orange-400/15 rotate-45" />
            <div className="absolute top-8 right-1/4 w-14 h-10 rounded-full bg-gradient-to-tl from-blue-300/25 to-indigo-400/20 -rotate-12" />
          </div>
          <div className={cn("relative text-center px-[69px] pt-16 pb-8", heroClassName)}>{hero}</div>
        </div>
        <div className={cn("px-6 md:px-10 pb-10", contentClassName)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={transitionKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
              className="w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </PageCard>
    </div>
  )
}
