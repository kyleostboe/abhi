import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Badges follow the same serif/black + soft-shadow language as the Home tool chrome.
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 font-serif text-xs font-black tracking-tight transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-to-b from-gray-600 to-[#9b8da3] text-white shadow-md",
        secondary: "border-transparent bg-muted text-gray-600 shadow-inner",
        destructive: "border-transparent bg-gradient-to-br from-logo-rose-300 to-logo-rose-600 text-white shadow-md",
        outline: "border-gray-500 text-gray-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
