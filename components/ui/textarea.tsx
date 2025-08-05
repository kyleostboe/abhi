"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    // Combine the passed ref with our internal ref
    React.useImperativeHandle(ref, () => textareaRef.current!)

    React.useEffect(() => {
      if (textareaRef.current) {
        // Reset height to auto to correctly calculate scrollHeight
        textareaRef.current.style.height = "auto"
        // Set height to scrollHeight
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
      }
    }, [props.value]) // Re-run when value changes

    return (
      <textarea
        className={cn(
          "flex w-full border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 border-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm rounded-md text-sm resize-none pt-0 min-w-0", // Removed overflow-hidden, added min-w-0
          className,
        )}
        rows={1} // Start with 1 row
        ref={textareaRef} // Use our internal ref
        placeholder="Enter an instruction..." // Set the placeholder text
        {...props}
      />
    )
  },
)
Textarea.displayName = "Textarea"

export { Textarea }
