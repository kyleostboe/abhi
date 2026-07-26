import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // h-[33px] together with py-4 left a 1px content box, so the text sat cramped against
          // the field's edges. The height now carries the spacing on its own.
          "flex w-full ring-offset-background file:border-0 file:bg-white file:text-xs file:font-medium file:text-foreground placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 disabled:cursor-not-allowed disabled:opacity-60 md:text-xs px-4 h-[38px] rounded-sm border-0 shadow-2xl bg-white [&:-webkit-autofill]:shadow-[0_0_0px_1000px_white_inset,0_25px_50px_-12px_rgba(0,0,0,0.25)] [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(55,65,81)] [&:-webkit-autofill:hover]:shadow-[0_0_0px_1000px_white_inset,0_25px_50px_-12px_rgba(0,0,0,0.25)] [&:-webkit-autofill:focus]:shadow-[0_0_0px_1000px_white_inset,0_25px_50px_-12px_rgba(0,0,0,0.25)] text-xs",
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
