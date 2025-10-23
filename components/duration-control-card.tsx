"use client"

import { PropsWithChildren } from "react"

import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

interface DurationControlCardProps extends PropsWithChildren {
  title: string
  gradientClassName: string
  bodyClassName?: string
  className?: string
}

export function DurationControlCard({
  title,
  gradientClassName,
  bodyClassName,
  className,
  children,
}: DurationControlCardProps) {
  return (
    <Card className={cn("overflow-hidden border-none shadow-lg bg-white rounded-xl", className)}>
      <div className={cn("px-6 py-3 text-white bg-gradient-to-br", gradientClassName)}>
        <h3 className="text-base font-black tracking-tight">{title}</h3>
      </div>
      <div className={cn("px-6 py-6 space-y-4", bodyClassName)}>{children}</div>
    </Card>
  )
}
