"use client"

import { Suspense, createContext, useContext, useMemo, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { usePersistedChoice, usePersistedFlag } from "@/hooks/use-persisted-choice"
import { HeaderWash, LogoMark } from "@/components/logo-mark"
import { ModeSwitch, switchOptionClass } from "@/components/mode-switch"
import { AuthButtons } from "@/components/auth-buttons"
/**
 * Loaded as its own chunk, not folded into the layout's.
 *
 * The strip pulls all three screens with it — ~9k lines — and the layout is shared with
 * `/settings` and the auth pages, which render no strip at all. A static import put that weight on
 * every route in the app: measured at 2318 kB of JavaScript on `/settings`, which had been 360 kB.
 * Split, only the routes that actually show a strip pay for it.
 *
 * `ssr` stays on: the screens' markup is part of the server-rendered HTML, and turning it off
 * would blank the first paint of every page.
 */
const ScreenStrip = dynamic(() => import("@/components/screen-strip").then((m) => m.ScreenStrip))
import { PageLoading } from "@/components/page-loading"
import { useScreenActive } from "@/components/screen-active"

/**
 * The card, the wash, the logo and the mode switch — rendered by the layout, once, for the three
 * main pages.
 *
 * Every page used to render its own copy of all of it, which is why navigating destroyed and
 * rebuilt them. Two different DOM nodes cannot be animated into stillness, so the logo and the
 * switch appeared to jump on every swipe no matter what the transition did: this is the fix for
 * that, and it only works while they are outside the pages.
 *
 * The page's own content is still `{children}`, so what changes on a swipe is the content below
 * the header and nothing else.
 *
 * **Route-gated on purpose.** Pages migrate one at a time; a route that is not in `CHROME` gets
 * its children passed straight through, so the pages that still render their own card keep
 * working. Add a route here only when that page has given its card up.
 */

/**
 * The switch's options, and the per-page look of the header around it.
 *
 * `outerClass` and `headerClass` carry the page's own spacing, which is the one thing that really
 * does differ between the three. They are here rather than in three conditional branches inside
 * the markup because a config that can be read at a glance is the whole reason these headers
 * drifted apart the first time.
 *
 * They deliberately carry no base `pt-*`: the chrome supplies that, because only the chrome knows
 * whether the signed-out Login / Sign Up button is floating over the top of the card. A `pt-*` here
 * would be a second base value in the same class list, and which one won would come down to
 * Tailwind's ordering. Breakpoint paddings (`md:pt-14`) are fine — they are a different rule.
 */
type ChromeRoute = {
  outerClass: string
  headerClass: string
  switchClass: string
  /** Home is a tool surface, not a document; the card says so. */
  cardRole?: string
  options: readonly { id: string; label: string }[]
}

const CHROME: Record<string, ChromeRoute> = {
  "/": {
    outerClass: "relative",
    // Signed out, the floating Login / Sign Up button sits over the top of the card, so the
    // header has to start below it.
    headerClass: "relative text-center px-[69px] md:pt-14",
    switchClass: "mb-[33px]",
    cardRole: "application",
    options: [
      { id: "adjuster", label: "Adjuster" },
      { id: "creator", label: "Creator" },
    ],
  },
  "/library": {
    outerClass: "font-serif font-black",
    headerClass: "relative px-4 sm:px-8 lg:px-12 md:pt-14",
    switchClass: "mb-8",
    options: [
      { id: "meditations", label: "Meditations" },
      { id: "playlists", label: "Playlists" },
    ],
  },
  "/journal": {
    outerClass: "",
    headerClass:
      "relative overflow-hidden border-b border-muted px-4 pb-6 sm:px-8 md:pt-14 lg:px-12",
    switchClass: "relative",
    options: [
      { id: "notes", label: "Notes" },
      { id: "sessions", label: "Sessions" },
    ],
  },
}

const OUTER_CLASS =
  "min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-0 md:p-8 pt-0 md:pt-24"

/**
 * The card.
 *
 * It used to be a named view-transition element so its height could interpolate between two
 * separately-mounted pages. There is only one mounted tree now, so the height is the strip's to
 * animate (`components/screen-strip.tsx` measures the active column) and the name is gone with the
 * rest of the transition machinery.
 */
const CARD_CLASS =
  "relative w-full md:max-w-4xl md:mx-auto backdrop-blur-lg shadow-none md:shadow-[0_24px_40px_-12px_rgba(0,0,0,0.13)] overflow-hidden transition-colors rounded-none md:rounded-3xl duration-300 ease-in-out"

/**
 * `data-page-content` is how `components/swipe-navigator.tsx` finds the region a swipe moves, and
 * how `app/globals.css` scopes the drag transform.
 *
 * It used to carry `view-transition-name: page-content` as well, and the comment here used to
 * explain at length why the named element and the dragged element had to be two different
 * elements. None of that survives Option B: there is no transition, because nothing unmounts. The
 * strip inside is ordinary DOM and a swipe is a transform on it.
 */

/** Filled by the chrome, read by `PageBefore`. */
const BeforeSlotContext = createContext<HTMLElement | null>(null)

/**
 * Content that has to sit between the page ground and the card — a banner above the card, a
 * floating button.
 *
 * It cannot simply be rendered by the page, because the page is *inside* the card now and these
 * belong outside it. A portal to the slot the chrome leaves for them keeps the DOM position
 * exactly where it was, which is what keeps `position: fixed` and `mb-*` behaving as they did.
 */
export function PageBefore({ children }: { children: ReactNode }) {
  const slot = useContext(BeforeSlotContext)
  // The slot is above the card and shared by all three screens, so an off-screen screen must not
  // put anything in it. Without this, Home's content appeared on the Library and the Journal.
  const active = useScreenActive()
  if (!slot || !active) return null
  return createPortal(children, slot)
}

export function PageChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const { isAuthenticated, login } = useAuth()
  const [beforeSlot, setBeforeSlot] = useState<HTMLDivElement | null>(null)

  // Every route's choice is held here at once rather than looking one up by the current route.
  // Hooks cannot be called conditionally, and re-keying one hook as you navigate would leave it
  // showing the previous route's tab for a frame. Each key is stable, so each one just works —
  // and because they are the same keys the pages read, `use-persisted-choice`'s subscribers keep
  // the page body in step with a switch it no longer renders.
  const [homeMode, setHomeMode] = usePersistedChoice(
    "home-mode",
    ["adjuster", "creator", "timer"] as const,
    "adjuster",
  )
  const [homeTab, setHomeTab] = usePersistedChoice(
    "home-tab",
    ["adjuster", "creator", "timer"] as const,
    "adjuster",
  )
  const [libraryTab, setLibraryTab] = usePersistedChoice(
    "library-tab",
    ["meditations", "playlists"] as const,
    "meditations",
  )
  const [libraryTimer, setLibraryTimer] = usePersistedFlag("library-timer")
  const [journalTab, setJournalTab] = usePersistedChoice(
    "journal-tab",
    ["notes", "sessions"] as const,
    "notes",
  )
  const [journalTimer, setJournalTimer] = usePersistedFlag("journal-timer")

  // The Timer is a detour rather than a destination, so pressing its button again puts you back
  // where you were instead of dropping you on the first option.
  const [toolBeforeTimer, setToolBeforeTimer] = useState<"adjuster" | "creator">("adjuster")

  const route = CHROME[pathname]

  const switchState = useMemo(() => {
    // Home keeps the Timer as a third value of the same choice; the other two keep it in a
    // separate flag. That asymmetry is the pages' own and is preserved here rather than levelled
    // out, because the pages' content still branches on the values they already had.
    if (pathname === "/") {
      const timerOpen = homeMode === "timer"
      return {
        selected: timerOpen ? null : homeMode,
        timerOpen,
        select: (id: string) => {
          if (id === "adjuster" || id === "creator") {
            setToolBeforeTimer(id)
            setHomeMode(id)
            setHomeTab(id)
          }
        },
        toggleTimer: () =>
          setHomeMode((current) => {
            if (current === "timer") {
              setHomeTab(toolBeforeTimer)
              // Leave no #timer behind, or a refresh would reopen what was just closed.
              if (typeof window !== "undefined" && window.location.hash === "#timer") {
                window.history.replaceState(
                  null,
                  "",
                  window.location.pathname + window.location.search,
                )
              }
              return toolBeforeTimer
            }
            if (current === "adjuster" || current === "creator") setToolBeforeTimer(current)
            setHomeTab("timer")
            return "timer"
          }),
      }
    }

    if (pathname === "/library") {
      return {
        selected: libraryTimer ? null : libraryTab,
        timerOpen: libraryTimer,
        select: (id: string) => {
          setLibraryTab(id as "meditations" | "playlists")
          setLibraryTimer(false)
        },
        toggleTimer: () => setLibraryTimer((open) => !open),
      }
    }

    return {
      selected: journalTimer ? null : journalTab,
      timerOpen: journalTimer,
      select: (id: string) => {
        setJournalTab(id as "notes" | "sessions")
        setJournalTimer(false)
      },
      toggleTimer: () => setJournalTimer((open) => !open),
    }
  }, [
    pathname,
    homeMode,
    toolBeforeTimer,
    setHomeMode,
    setHomeTab,
    libraryTab,
    libraryTimer,
    setLibraryTab,
    setLibraryTimer,
    journalTab,
    journalTimer,
    setJournalTab,
    setJournalTimer,
  ])

  // Not a migrated route: the page still owns its card, so pass children through untouched.
  if (!route) return <>{children}</>

  return (
    <div className={cn(OUTER_CLASS, route.outerClass)}>
      <div ref={setBeforeSlot} />
      {!isAuthenticated && (
        <div className="absolute inset-x-0 top-[68px] z-20 flex justify-center md:static md:z-10 md:pb-7 md:pt-0 pt-[3px]">
          <AuthButtons onLogin={login} />
        </div>
      )}

      {/* The downward-only shadow is deliberate: `shadow-xl` blurs outward in every direction, so
          its top edge bleeds a dark band under the transparent nav as you scroll. Offset exceeds
          the blur radius here, so nothing paints above the card's top edge while the elevation
          below is unchanged. */}
      <div className={CARD_CLASS} role={route.cardRole}>
        <div className="relative overflow-hidden">
          <HeaderWash />

          {/* The header is unconditional, and that is the point of it. Every page used to show it
              only when signed in, except Home — so a signed-out swipe lost the logo and the switch
              entirely, which is a louder kind of movement than the one being fixed. It is chrome:
              it belongs to the shell, and it does not get to depend on who is looking at it.

              The cost is that signed out on Library and Journal the options do not change what is
              on screen, because those pages are a sign-in prompt until you sign in either way. A
              switch that holds still and does little beats a switch that disappears. */}
          <div className={cn(route.headerClass, isAuthenticated ? "pt-24" : "pt-[124px]")}>
            <LogoMark className="mb-6" />
            <ModeSwitch
              className={route.switchClass}
              // The option ids rather than the route, so the labels cross-fade only when they
              // actually differ.
              contentKey={route.options.map((option) => option.id).join("|")}
              timerActive={switchState.timerOpen}
              // -1 while the Timer is open, which is what sends the pill down to the stem.
              activeIndex={route.options.findIndex((option) => option.id === switchState.selected)}
              onTimerClick={switchState.toggleTimer}
            >
              {route.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => switchState.select(option.id)}
                  className={switchOptionClass()}
                >
                  {option.label}
                </button>
              ))}
            </ModeSwitch>
          </div>

          {/* Two elements, and they have to be two.

              The named one is the transition's; the inner one is the finger's. A committing swipe
              keeps its offset until the transition takes over — that is what stops the page sliding
              back to the edge and waiting, which is the "it tries to move and then fails" — and for
              the slide to resume from that offset it has to be in the outgoing snapshot. But a
              transform on the *named* element moves the transition's own group box: Chromium places
              a group at the captured element's quad, so a page dragged 200px left would be
              snapshotted 200px to the left of the card and animated from there, displacing the
              transition rather than moving the content. Split in two, both hold — the name's
              geometry is never transformed, so the group is where it belongs, and the inner
              element's offset is ordinary painted content, so it is in the picture exactly as it
              was on screen when the finger let go. */}
          <div data-page-content>
            <BeforeSlotContext.Provider value={beforeSlot}>
              {/* The Library and the Journal both call `useSearchParams()`, which needs a Suspense
                  boundary above it or a statically-rendered route bails out to client rendering at
                  build time. That boundary used to be each route's own `loading.tsx`; the screens
                  are rendered from here now, on every route, so the boundary has to be here too. */}
              <Suspense fallback={<PageLoading />}>
                <ScreenStrip />
              </Suspense>
            </BeforeSlotContext.Provider>
          </div>
        </div>
      </div>
    </div>
  )
}
