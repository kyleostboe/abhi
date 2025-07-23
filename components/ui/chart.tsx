"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const ChartContext = React.createContext<
  | {
      config: Record<string, { label?: string; color?: string; icon?: React.ElementType }>
    }
  | undefined
>(undefined)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within <Chart>")
  }

  return context
}

const chartVariants = cva("flex aspect-video items-center justify-center text-foreground", {
  variants: {
    size: {
      xs: "h-[200px] w-[200px]",
      sm: "h-[250px] w-[250px]",
      md: "h-[300px] w-[300px]",
      lg: "h-[350px] w-[350px]",
      xl: "h-[400px] w-[400px]",
    },
  },
})

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> &
    VariantProps<typeof chartVariants> & {
      config: Record<string, { label?: string; color?: string; icon?: React.ElementType }>
    }
>(({ config, className, children, ...props }, ref) => {
  return (
    <ChartContext.Provider value={{ config }}>
      <div ref={ref} className={cn(chartVariants({ size: "md" }), "w-full", className)} {...props}>
        {children}
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

const ChartTooltip = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    hideIndicator?: boolean
    indicator?: string
  }
>(({ hideIndicator = false, indicator = "bottom", className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "z-50 flex cursor-default items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-md dark:border-slate-800 dark:bg-slate-950",
      className,
    )}
    {...props}
  >
    {!hideIndicator && (
      <div
        className={cn(
          "mr-2 h-2 w-2 rounded-full",
          indicator === "top" && "absolute -top-1 left-1/2 -translate-x-1/2",
          indicator === "right" && "absolute -right-1 top-1/2 -translate-y-1/2",
          indicator === "bottom" && "absolute -bottom-1 left-1/2 -translate-x-1/2",
          indicator === "left" && "absolute -left-1 top-1/2 -translate-y-1/2",
        )}
        style={{
          backgroundColor: "var(--color)",
        }}
      />
    )}
    {children}
  </div>
))
ChartTooltip.displayName = "ChartTooltip"

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div"> & {
    hideIndicator?: boolean
    indicator?: string
  }
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn("flex flex-col space-y-1", className)} {...props}>
    {children}
  </div>
))
ChartTooltipContent.displayName = "ChartTooltipContent"

const ChartTooltipTrigger = React.forwardRef<HTMLButtonElement, React.ComponentPropsWithoutRef<typeof Slot>>(
  ({ children, className, ...props }, ref) => (
    <Slot ref={ref} className={cn("z-10 block", className)} {...props}>
      {children}
    </Slot>
  ),
)
ChartTooltipTrigger.displayName = "ChartTooltipTrigger"

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartTooltipTrigger, useChart }
