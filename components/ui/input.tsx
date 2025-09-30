import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full ring-offset-background file:border-0 file:bg-white file:text-xs file:font-medium file:text-foreground placeholder:text-gray-500 focus-visible:outline-none focus-visible:border-[3px] focus-visible:border-gray-600 disabled:cursor-not-allowed disabled:border-gray-500 md:text-xs border-[3px] rounded-[10px] bg-white py-4 px-4 text-sm border-stone-300 shadow-none h-11",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }
