import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// The Home page's Adjuster/Creator tools are the app's reference styling, and every button in
// them shares one vocabulary: serif + font-black type, an 11px radius, and a soft shadow that
// lifts on hover. The variants below encode that vocabulary so a bare <Button /> anywhere in the
// app already looks like it belongs, instead of falling back to shadcn's near-black `bg-primary`.
const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[11px] font-serif text-sm font-black tracking-tight ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        // Home's "Process Audio" button — the commit action. Deliberately two stops rather than
        // Home's from/via/to: tailwind-merge can replace `from-*`/`to-*` when a call site brings
        // its own gradient, but it has nothing to replace a `via-*` with, so a third stop would
        // leak grey into every custom-gradient button in the app.
        default:
          "bg-gradient-to-b from-gray-600 to-[#9b8da3] text-white shadow-md hover:shadow-none",
        // Home's "Start Recording" button — the additive/creative action.
        accent:
          "bg-gradient-to-br from-logo-rose-300 to-logo-emerald-500 text-white shadow-md hover:shadow-none",
        // Home's "Stop Recording" state.
        destructive:
          "bg-gradient-to-br from-logo-rose-300 to-logo-rose-600 text-white shadow-md hover:shadow-none",
        // Home's Resources chips (and the Library's source filters), which are the app's
        // established outline treatment.
        outline:
          "rounded-[8px] border-[3px] border-gray-500 bg-white text-gray-600 shadow-md hover:shadow-none",
        secondary: "bg-muted text-gray-600 shadow-inner hover:bg-muted/70",
        ghost: "text-gray-600 hover:bg-muted",
        link: "text-gray-600 underline underline-offset-2 hover:no-underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        // No radius here on purpose: sizes are merged after variants, so setting one would
        // clobber the outline variant's chip radius on small chips.
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-8",
        icon: "h-10 w-10 rounded-[10px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
