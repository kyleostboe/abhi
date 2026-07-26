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
          // Matches the Input primitive's look — white, borderless, lifted by a shadow rather
          // than a rule — so a Textarea sitting next to an Input in the same dialog doesn't
          // read as a different kind of control.
          // w-full is essential: a fixed narrow width collapses the field to a sliver and makes
          // text wrap one character per line, which the auto-grow effect below then turns into
          // an extremely tall column.
          "flex w-full min-w-0 h-auto min-h-[80px] rounded-sm border-0 bg-white px-4 py-3 text-xs tracking-normal text-gray-700 shadow-2xl placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
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
