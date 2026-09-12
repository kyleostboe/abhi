"use client"

import Link from "next/link"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import type { MotionValue } from "framer-motion"
import { Moon, Sun } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { layoutBox, type Box } from "@/lib/layout-box"
import { isPillTravelling, labelPos, pillPos, snapAll } from "@/lib/swipe-progress"
import { UserMenu } from "./user-menu"

interface NavigationProps {
  showProfileButton?: boolean
}

/**
 * Bare icon — no plate, no shadow. The h-10/w-10 box is only there to keep a tappable target
 * around a 22px glyph; nothing about it is painted.
 *
 * A pass at matching the profile button on the other end of the bar gave this the same white disc
 * and shadow. That was wrong: two white shapes at the two ends of the bar competed with the nav
 * itself, and the ask was only ever a slightly larger glyph. The size stayed, the plate went.
 */
const ICON_BUTTON_BASE =
  "flex h-10 w-10 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"

/**
 * The tabs, in the order the swipe strip visits them — `components/swipe-navigator.tsx` and
 * `components/screen-strip.tsx` hold the same order, and the index into this array is the position
 * `lib/swipe-progress.ts` speaks in.
 *
 * The pill and the labels used to carry `view-transition-name`s, because the nav sat in the root
 * snapshot and would otherwise hard-swap in a single frame while the pill was mid-travel. There
 * are no snapshots any more — the nav is live DOM throughout a swipe, like everything else — so
 * the names are gone and the pill simply moves.
 */
const TABS = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/journal", label: "Journal" },
] as const

/**
 * Where the selection sits when the route is not on the strip at all — `/settings`.
 *
 * Far enough from every tab that all three labels are at rest. It has to be a *position* rather
 * than a special case, because the labels take their colour from `labelPos` alone: leaving it
 * where it was painted Home white on a white nav, with no pill under it to make that legible.
 */
const OFF_STRIP = -10

/** The two ends of the label colour ramp: `text-gray-600` at rest, white under the pill. */
const LABEL_REST = [75, 85, 99] as const
const LABEL_SELECTED = [255, 255, 255] as const

/** `useLayoutEffect` warns during SSR, and the measurement has to happen before the first paint. */
const useMeasureEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

/**
 * Write a position onto an element, now and on every change, for as long as this render stands.
 *
 * Deliberately not `useTransform` and a `motion.div`, and not a matter of taste — the framer
 * version was built first and had a real defect. Its derived values resubscribe in a layout effect
 * on every render, so the window between the old subscription being torn down and the new one
 * being made is a layout-effect phase. `snapLabels` fires in exactly that window (the navigator
 * resolves its transition from a layout effect on the pathname), so the labels' one and only
 * change notification was delivered to nobody, and their colour stayed frozen at the mid-drag
 * blend for good. Measured after a swipe: `labelPos` at 1.000 with the DOM still painting
 * `rgb(186,188,192)`.
 *
 * Applying the current value on every subscribe is what makes this self-healing: a notification
 * missed for any reason is repaired by the next render, and there is always a render after a
 * navigation.
 *
 * No dependency array on purpose. The subscription is one closure and one Set insertion, and it is
 * cheaper than the class of bug the alternative invites.
 */
function useMotionStyle(
  ref: React.RefObject<HTMLElement | null>,
  value: MotionValue<number>,
  apply: (el: HTMLElement, position: number) => void,
) {
  const applyRef = useRef(apply)
  applyRef.current = apply

  useMeasureEffect(() => {
    const write = (position: number) => {
      const el = ref.current
      if (el) applyRef.current(el, position)
    }
    write(value.get())
    return value.on("change", write)
  })
}

/** Linear blend between two boxes. `t` outside 0..1 is clamped — the strip has ends. */
function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * Math.max(0, Math.min(1, t))
}

/** The pill's box at a continuous tab position: 1.4 is four tenths of the way to the Journal. */
function boxAt(boxes: Box[], position: number): Box {
  const clamped = Math.max(0, Math.min(boxes.length - 1, position))
  const lower = Math.floor(clamped)
  const upper = Math.min(boxes.length - 1, lower + 1)
  const t = clamped - lower
  const a = boxes[lower]
  const b = boxes[upper]
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), w: lerp(a.w, b.w, t), h: lerp(a.h, b.h, t) }
}

/**
 * A label's colour at a continuous position: white where the pill is, grey everywhere else, and
 * continuous in between — so a label goes white as the pill arrives and grey as it leaves, and
 * there is never a frame of white text on white background.
 */
function labelColour(distance: number): string {
  const t = Math.max(0, 1 - Math.abs(distance))
  const channel = (i: number) => Math.round(lerp(LABEL_REST[i], LABEL_SELECTED[i], t))
  return `rgb(${channel(0)}, ${channel(1)}, ${channel(2)})`
}

/**
 * Placeholder for a light/dark switcher. Deliberately does not touch the theme — it only swaps
 * its own glyph, to hold the slot and the interaction while the actual dark palette is still
 * undecided. `next-themes` is already mounted in app/layout.tsx, so wiring this up later is a
 * matter of calling its setter here rather than building anything new.
 *
 * This slot used to hold a Timer button. The Timer is now an option on every page's own switch
 * (components/mode-switch.tsx), which also cleared up two controls sharing the accessible name
 * "Timer" on the same page.
 */
function ThemeTogglePlaceholder() {
  const [dark, setDark] = useState(false)
  const Icon = dark ? Moon : Sun

  return (
    <button
      type="button"
      onClick={() => setDark((value) => !value)}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      title="Light / dark mode — not wired up yet"
      className={cn(ICON_BUTTON_BASE, "text-gray-400 hover:text-gray-600")}
    >
      <Icon className="h-[22px] w-[22px] stroke-2 text-[22px]" />
    </button>
  )
}

/**
 * The dark pill behind the selected tab.
 *
 * One always-mounted element positioned by measurement — the house pattern, shared with
 * `components/mode-switch.tsx` and the Adjuster's tabs. Explicitly **not** `layoutId`: the
 * shared-layout version cross-fades a lead copy over the label it is leaving, and the reason that
 * was rejected is written out at `app/page.tsx`.
 *
 * `view-transition-name` is what lets it keep moving *during* the page slide. The nav is a sibling
 * of the page content and so lives in the root snapshot, which `app/globals.css` gives
 * `animation: none` — a frozen picture that is replaced in one frame. Naming the pill lifts it out
 * of that picture into a group of its own, and it is the group's box that is then interpolated,
 * from the quad the finger left it at to the quad of the destination tab.
 */
function NavPill({ boxes }: { boxes: Box[] }) {
  const ref = useRef<HTMLDivElement | null>(null)

  useMotionStyle(ref, pillPos, (el, position) => {
    if (boxes.length !== TABS.length) return
    const box = boxAt(boxes, position)
    el.style.left = `${box.x}px`
    el.style.top = `${box.y}px`
    el.style.width = `${box.w}px`
    el.style.height = `${box.h}px`
  })

  if (boxes.length !== TABS.length) return null

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute rounded-sm border-[3px] border-stone-200 bg-gradient-to-r from-gray-600 to-gray-500 shadow-md"
    />
  )
}

/** One tab's text. Its colour comes from `labelPos` alone, so nothing here depends on the route. */
function NavLabel({ index, tab }: { index: number; tab: (typeof TABS)[number] }) {
  const ref = useRef<HTMLSpanElement | null>(null)

  useMotionStyle(ref, labelPos, (el, position) => {
    el.style.color = labelColour(position - index)
  })

  return (
    <span ref={ref} className="relative block">
      {tab.label}
    </span>
  )
}

export function Navigation({ showProfileButton = false }: NavigationProps) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()

  const listRef = useRef<HTMLUListElement | null>(null)
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [boxes, setBoxes] = useState<Box[]>([])

  const index = TABS.findIndex((tab) => tab.href === pathname)

  const measure = useCallback(() => {
    const list = listRef.current
    if (!list) return
    const next = linkRefs.current.map((link) => (link ? layoutBox(link, list) : null))
    if (next.length !== TABS.length || next.some((box) => box === null)) return
    setBoxes(next as Box[])
  }, [])

  useMeasureEffect(() => {
    measure()
    const list = listRef.current
    if (!list || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [measure])

  /**
   * Put the selection where the route says, for every arrival that was *not* a swipe — a first
   * load, a tab tap, the back button. A committing swipe deliberately does not go through here:
   * the navigator has already aimed the pill at its destination and started it travelling, and
   * re-setting it on the pathname change would cut that journey short.
   */
  useMeasureEffect(() => {
    if (isPillTravelling()) return
    snapAll(index === -1 ? OFF_STRIP : index)
  }, [index])

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 flex justify-center py-3.5 px-4 pb-3.5">
      <div className="relative flex w-full max-w-4xl items-center justify-center">
        <ul
          ref={listRef}
          className="relative flex rounded-sm bg-white px-2 space-x-0 py-[13px] pt-[8px] pb-[8px] border-[#f2f2f2] border-[0px]"
        >
          {/* A route outside the three — /settings — has no place on the strip, so nothing is
              painted rather than the pill parking on an arbitrary tab. */}
          {index !== -1 && <NavPill boxes={boxes} />}
          {TABS.map((tab, i) => (
            <li key={tab.href}>
              <Link
                href={tab.href}
                scroll={false}
                ref={(node) => {
                  linkRefs.current[i] = node
                }}
                aria-current={pathname === tab.href ? "page" : undefined}
                // The transparent border is on all three, always, so the boxes the pill is
                // measured against never change size as the selection moves. The pill carries the
                // background and the border colour that used to live on the selected link.
                className="relative block rounded-[9px] border-[3px] border-transparent px-3 py-2 font-serif text-xs font-black tracking-tight shadow-none"
              >
                <NavLabel index={i} tab={tab} />
              </Link>
            </li>
          ))}
        </ul>
        <div className="absolute left-0">
          <ThemeTogglePlaceholder />
        </div>
        {showProfileButton && isAuthenticated && (
          <div className="absolute right-0 rounded-full">
            <UserMenu buttonVariant="nav" />
          </div>
        )}
      </div>
    </nav>
  )
}
