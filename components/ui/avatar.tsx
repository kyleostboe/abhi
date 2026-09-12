"use client"

import type * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"

import { cn } from "@/lib/utils"

function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      // `size-*` and `h-*`/`w-*` are separate utility groups, so `size-8` here survives a caller's
      // `h-9 w-9` and width and height can end up resolving from different declarations. Keeping
      // the default as `h-8 w-8` puts both axes in the same group as the caller's and merges clean.
      className={cn("relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  )
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image data-slot="avatar-image" className={cn("aspect-square size-full", className)} {...props} />
  )
}

function AvatarFallback({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full font-serif border-2 border-stone-200 text-xs shadow-2xl",
        className,
      )}
      {...props}
    />
  )
}

export { Avatar, AvatarImage, AvatarFallback }
