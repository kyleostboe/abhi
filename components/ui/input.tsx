import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full ring-offset-background file:border-0 file:bg-white file:text-xs file:font-medium file:text-foreground placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-0 focus-visible:border-0 disabled:cursor-not-allowed disabled:border-gray-500 md:text-xs py-4 px-4 text-sm h-[33px] border-stone-300 rounded-sm border-0 shadow-2xl bg-transparent [&:-webkit-autofill]:shadow-[0_0_0px_1000px_white_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(55,65,81)] [&:-webkit-autofill:hover]:shadow-[0_0_0px_1000px_white_inset] [&:-webkit-autofill:focus]:shadow-[0_0_0px_1000px_white_inset]",
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
