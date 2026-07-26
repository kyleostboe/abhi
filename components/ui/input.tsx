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
          "flex h-[38px] w-full rounded-sm border-0 bg-white px-4 text-xs ring-offset-background",
          "placeholder:text-gray-500 focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0 md:text-xs",
          // White, borderless, lifted by a shadow — the same field treatment as the Home tools.
          "shadow-2xl",
          // A disabled field has to still read as a field: swap the lift for an inset on a muted
          // surface, rather than fading a white box that sits on a white card.
          "disabled:cursor-not-allowed disabled:bg-muted/70 disabled:text-gray-500 disabled:shadow-inner",
          "file:border-0 file:bg-white file:text-xs file:font-medium file:text-foreground",
          "[&:-webkit-autofill]:shadow-[0_0_0px_1000px_white_inset,0_25px_50px_-12px_rgba(0,0,0,0.25)] [&:-webkit-autofill]:[-webkit-text-fill-color:rgb(55,65,81)] [&:-webkit-autofill:hover]:shadow-[0_0_0px_1000px_white_inset,0_25px_50px_-12px_rgba(0,0,0,0.25)] [&:-webkit-autofill:focus]:shadow-[0_0_0px_1000px_white_inset,0_25px_50px_-12px_rgba(0,0,0,0.25)]",
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
