import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface SectionTitleProps {
  children: ReactNode
  className?: string
}

export function SectionTitle({ children, className }: SectionTitleProps) {
  return (
    <div
      className={cn(
        "bg-gradient-to-r from-gray-700 to-gray-800 py-3 px-6 dark:from-gray-800 dark:to-gray-900",
        className,
      )}
    >
      <h3 className="text-white font-black">{children}</h3>
    </div>
  )
}
