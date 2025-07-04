"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MenuIcon } from "lucide-react"
// Removed: import { ThemeToggle } from "@/components/theme-toggle"

export function Navigation() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <img src="/placeholder-logo.svg" alt="abhī logo" className="h-6 w-6" />
            <span className="sr-only">abhī</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link
              href="/"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/" ? "text-foreground" : "text-foreground/60",
              )}
            >
              Adjuster
            </Link>
            <Link
              href="/encoder"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/encoder" ? "text-foreground" : "text-foreground/60",
              )}
            >
              Encoder
            </Link>
            <Link
              href="/labs"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/labs" ? "text-foreground" : "text-foreground/60",
              )}
            >
              Labs
            </Link>
            <Link
              href="/donate"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/donate" ? "text-foreground" : "text-foreground/60",
              )}
            >
              Donate
            </Link>
            <Link
              href="/contact"
              className={cn(
                "transition-colors hover:text-foreground/80",
                pathname === "/contact" ? "text-foreground" : "text-foreground/60",
              )}
            >
              Contact
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {/* Removed: <ThemeToggle /> */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <MenuIcon className="h-6 w-6" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/">Adjuster</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/encoder">Encoder</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/labs">Labs</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/donate">Donate</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/contact">Contact</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
