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
    <Card className={cn("overflow-hidden border-none shadow-lg bg-transparent rounded-xl", className)}>
      <div className={cn("px-6 text-white bg-gradient-to-br text-center py-[9px]", gradientClassName)}>
        <h3 className="font-black tracking-tight text-base">{title}</h3>
      </div>
      <div className={cn("px-6 py-6 space-y-0", bodyClassName)}>{children}</div>
    </Card>
  )
}
