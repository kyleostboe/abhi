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
          // w-full is essential: a fixed narrow width here collapses the field to a sliver and
          // makes text wrap one character per line, which the auto-grow effect below then turns
          // into an extremely tall column.
          "flex w-full min-w-0 h-auto min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm tracking-normal text-gray-600 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className,
        )}
        rows={1} // Start with 1 row; auto-grows to fit content (min-height keeps a sane floor)
        ref={textareaRef} // Use our internal ref
        {...props} // Ensure existing props (including placeholder from parent) are passed
      />
    )
  },
)
Textarea.displayName = "Textarea"

export { Textarea }
