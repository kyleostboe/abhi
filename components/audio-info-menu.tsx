"use client"

import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Info } from "lucide-react"

interface AudioInfoItem {
  label: string
  value: ReactNode
  hint?: ReactNode
}

interface AudioInfoMenuProps {
  items: AudioInfoItem[]
  align?: "start" | "center" | "end"
  className?: string
  buttonLabel?: string
}

export function AudioInfoMenu({
  items,
  align = "end",
  className,
  buttonLabel = "View audio details",
}: AudioInfoMenuProps) {
  if (!items || items.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={buttonLabel}
          className={`h-8 w-8 rounded-full text-white/90 hover:text-white hover:bg-white/20 focus-visible:ring-0 focus-visible:ring-offset-0 ${
            className ?? ""
          }`}
          onClick={(event) => event.stopPropagation()}
        >
          <Info className="h-4 w-4 text-white" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-64 rounded-sm border-muted border-2 bg-white/95 p-3 font-serif text-xs font-black text-gray-700 shadow-xl backdrop-blur"
      >
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex flex-col gap-0.5">
              <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400">
                {item.label}
              </span>
              <span className="text-xs font-black text-gray-700">{item.value}</span>
              {item.hint ? (
                <span className="text-[11px] font-medium text-gray-500">{item.hint}</span>
              ) : null}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
