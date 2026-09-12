"use client"

import type React from "react"
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { animate, motion, useMotionValue, useReducedMotion, type Transition } from "framer-motion"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { layoutBox, type Box } from "@/lib/layout-box"

/**
 * The switch shared by Home, the Library and the Journal: the options for that page, with the
 * Timer hanging off the bottom edge as a third, icon-only option. Together they read as a single
 * rounded T — the options are the bar, the Timer is the stem.
 *
 * **The silhouette is one SVG path, not a stack of boxes.** It used to be three elements — bar,
 * stem, and two gradient wedges filling the junctions — and every attempt to give that assembly
 * an inset edge produced a visible seam, because a `box-shadow` stops dead at an element boundary
 * and those boundaries run straight through the middle of the shape. Drawn as a single outline
 * there is nowhere for a seam to exist, and the inset shading (an SVG inner-shadow filter) can
 * follow the whole perimeter including the two concave curves, which no box-shadow can do.
 *
 * The path is measured from the laid-out content rather than hardcoded, because the bar's width
 * depends on each page's option labels. The buttons still own layout; the SVG only paints behind
 * them.
 */

// useLayoutEffect warns during SSR, and this needs to measure before the first paint so the shape
// never flashes in unpainted.
const useMeasureEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

const BAR_RADIUS = 12 // matches `rounded-sm`, which app/globals.css redefines as 12px
const STEM_RADIUS = 12 // the Timer tab, matching the bar above it

/**
 * Classes for one option in the switch.
 *
 * 11px is chosen by eye, not derived. Strict concentricity with the outline would be 7px
 * (12px outline − 5px inset), and it measured correctly but read too tight; 11px sits a hair
 * inside the outline's own 12px and looks better at this size. Kept as a literal because Tailwind
 * only extracts class names it can see in the source — a computed `rounded-[${n}px]` would never
 * be generated at all.
 *
 * Shared because all three pages were carrying their own copy of this class list, which is how
 * they drifted apart before.
 */
const OPTION_RADIUS_CLASS = "rounded-[11px]"

/**
 * The white pill behind the selected option, and behind the Timer when it is open.
 *
 * A single element that slides rather than a `bg-white` that blinks off one button and on to the
 * next: it is rendered once, positioned by measurement, and animated between targets, so opening
 * the Timer reads as the selection *moving* down to the stem instead of two backgrounds swapping.
 *
 * `pointer-events-none` because it is painted over the trough but under the buttons, and must not
 * swallow their clicks. `aria-hidden` because it says nothing the button's own state does not.
 */
function SwitchPill({ box, transition }: { box: Box; transition: Transition }) {
  return (
    <motion.div
      aria-hidden
      className={cn("pointer-events-none absolute bg-white shadow-md", OPTION_RADIUS_CLASS)}
      initial={false}
      animate={{ left: box.x, top: box.y, width: box.w, height: box.h }}
      transition={transition}
    />
  )
}

export function switchOptionClass(extra?: string) {
  return cn(
    OPTION_RADIUS_CLASS,
    // `shrink-0` matters for the length of the width animation: the bar is narrower than its new
    // labels until the resize catches up, and a shrinking flex item would squash them rather than
    // let them be clipped.
    "shrink-0 px-4 py-3 font-serif text-sm font-black tracking-tight text-gray-600",
    extra,
  )
}

interface Dims {
  barW: number
  barH: number
  stemW: number
  stemH: number
  /** The stem's top edge, in the column's own coordinates. Measured, not derived — see STEM_GAP. */
  stemTop: number
}

/** One route's set of option buttons, identified by the ids it was built from. */
interface OptionLayer {
  key: string
  node: React.ReactNode
}

/**
 * Snappy and only faintly elastic. The pill is chasing a target that moves at most once per
 * navigation, so a slow spring would read as lag rather than as travel.
 */
const PILL_SPRING: Transition = { type: "spring", stiffness: 420, damping: 40 }

/**
 * How long the labels take to change, and how the trough resizes to meet them.
 *
 * They **fade, in sequence**, and the switch makes no other movement: the width animation is the
 * only thing in it that travels. The labels used to slide in from the side the way the page does,
 * which read as a second carousel bolted to the top of the card — the words appeared to swipe with
 * the page rather than simply become the new words.
 *
 * The two fades do not overlap. A cross-fade with both sets on screen at once was the first thing
 * tried, and it is wrong for text: "Adjuster" dissolving into "Meditations" in the same place
 * renders as both at once — visibly "MAdjusterns" — which reads as a rendering fault rather than as
 * a transition. Out for the first half, in for the second, is still a change with no travel and
 * nothing legible in between.
 *
 * 260ms total, so the switch still finishes exactly when the page slide does — the labels are part
 * of the page arriving, and a switch on its own clock arrives a beat early or late against it. The
 * trough resizing on this clock rather than on a spring is the other half of that, and not a matter
 * of taste: the bar is `overflow-hidden` and its labels are `min-w-max`, so any frame where the bar
 * is narrower than the labels on screen clips them. Sharing the duration and the easing means the
 * shortfall falls to zero exactly as the slide ends, instead of lingering as a clipped label at
 * rest.
 */
const LABEL_SLIDE = 0.26

const LABEL_EASE = [0.22, 0.61, 0.36, 1] as const

/** Half the clock each way. `LABEL_IN` starts where `LABEL_OUT` ends, so the sets never share a
 *  frame. */
const LABEL_OUT = LABEL_SLIDE / 2
const LABEL_IN = LABEL_SLIDE / 2

/**
 * A rounded rectangle as a closed path.
 *
 * This used to build the whole switch as a single T — bar and stem joined by two concave fillets,
 * with sweep-flag 0 on the junction arcs because that flag is the whole difference between a flare
 * and a bulge. The Timer is its own control now, so there is no junction left to draw and both
 * shapes are the same simple thing at different sizes.
 *
 * Each is still measured from the laid-out content rather than hardcoded, because the bar's width
 * depends on each page's option labels.
 */
function buildRoundedRect(x: number, y: number, w: number, h: number, radius: number): string {
  const R = Math.max(0, Math.min(radius, h / 2, w / 2))
  return [
    `M ${x + R} ${y}`,
    `H ${x + w - R}`,
    `A ${R} ${R} 0 0 1 ${x + w} ${y + R}`,
    `V ${y + h - R}`,
    `A ${R} ${R} 0 0 1 ${x + w - R} ${y + h}`,
    `H ${x + R}`,
    `A ${R} ${R} 0 0 1 ${x} ${y + h - R}`,
    `V ${y + R}`,
    `A ${R} ${R} 0 0 1 ${x + R} ${y}`,
    "Z",
  ].join(" ")
}

/**
 * The switch's two troughs, as one path with two disjoint subpaths.
 *
 * One path rather than two elements so a single inner-shadow filter pass covers both. The shapes
 * do not touch, so the filter gives each its own complete edge — which is the point of separating
 * them: the Timer reads as a control with a rim all the way round rather than as a tab hanging off
 * the bar.
 */
function buildTroughs({ barW, barH, stemW, stemH, stemTop }: Dims): string {
  const bar = buildRoundedRect(0, 0, barW, barH, BAR_RADIUS)
  const stem = buildRoundedRect((barW - stemW) / 2, stemTop, stemW, stemH, STEM_RADIUS)
  return `${bar} ${stem}`
}

export function ModeSwitch({
  children,
  contentKey,
  timerActive = false,
  activeIndex = -1,
  onTimerClick,
  className,
}: {
  children: React.ReactNode
  /** Identifies which set of options `children` is. A change to it starts the label change. */
  contentKey: string
  timerActive?: boolean
  /** Which option is selected, or -1 for none — which is the case while the Timer is open. */
  activeIndex?: number
  /** Toggles the Timer for the page in place — the Timer never navigates anywhere. */
  onTimerClick: () => void
  className?: string
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const stemRef = useRef<HTMLButtonElement>(null)
  /** The icon square inside the Timer button — what the pill travels to, not the whole tab. */
  const stemButtonRef = useRef<HTMLSpanElement>(null)
  const [dims, setDims] = useState<Dims | null>(null)
  // The bar's *rendered* width. It is state rather than a derivation of `dims` because it has to
  // lag: a navigation swaps the labels in one commit, and this is what turns that swap into the
  // bar growing to fit them.
  const [barW, setBarW] = useState<number | null>(null)
  const [pill, setPill] = useState<Box | null>(null)
  const reduceMotion = useReducedMotion()
  const filterId = useRef(`mode-switch-inset-${Math.random().toString(36).slice(2, 9)}`).current

  /**
   * The labels leaving the bar, held mounted for the length of the fade.
   *
   * Without this the bar's width and its labels disagree for the whole resize: the incoming labels
   * are in place from the first frame while the trough is still the outgoing route's width. On the
   * way *down* that is plainly visible — a 231px trough holding 199px of labels leaves 16px of
   * empty recess at each end, which reads as the switch keeping its old length. Keeping the outgoing
   * set on screen means every frame has labels belonging to the width being shown.
   *
   * It sits above the incoming set rather than beside it, so the fade goes *through* the bar's own
   * width rather than through a stack of two different ones. `pointer-events-none` because its
   * handlers belong to a route that is being left.
   */
  const [outgoing, setOutgoing] = useState<OptionLayer | null>(null)
  const [live, setLive] = useState<OptionLayer>({ key: contentKey, node: children })
  // Motion values, not `animate` props: the incoming set has to be *already invisible* on its first
  // painted frame. An `animate` prop would instead tween it from the opacity it was already at, so
  // the two sets would overlap for the first frames of the change.
  const incomingOpacity = useMotionValue(1)
  const outgoingOpacity = useMotionValue(1)

  // Adjusted during render rather than from an effect. An effect runs after the commit, so there
  // would be one frame with the incoming labels on screen and nothing fading out under them.
  if (live.key !== contentKey) {
    setOutgoing(live)
    setLive({ key: contentKey, node: children })
  }

  // What the width animation is currently at, kept in a ref so the effect reads its own last value
  // without depending on the state it sets (which would restart it every frame).
  const shownW = useRef<number | null>(null)

  const measure = useCallback(() => {
    // Measured from the *content*, never from the bar: the bar's width is set by this component,
    // so measuring it would be a feedback loop that never reaches the natural width.
    const content = contentRef.current
    const stem = stemRef.current
    if (!content || !stem) return
    const next: Dims = {
      barW: content.offsetWidth,
      barH: content.offsetHeight,
      stemW: stem.offsetWidth,
      stemH: stem.offsetHeight,
      stemTop: stem.offsetTop,
    }
    setDims((prev) =>
      prev &&
      prev.barW === next.barW &&
      prev.barH === next.barH &&
      prev.stemW === next.stemW &&
      prev.stemH === next.stemH &&
      prev.stemTop === next.stemTop
        ? prev
        : next,
    )
  }, [])

  useMeasureEffect(() => {
    measure()
    // The bar's width follows its labels, which differ per page and reflow with the font.
    const observer = new ResizeObserver(measure)
    if (contentRef.current) observer.observe(contentRef.current)
    if (stemRef.current) observer.observe(stemRef.current)
    return () => observer.disconnect()
  }, [measure])

  // Re-measured the moment the options change, rather than waiting for the `ResizeObserver` above
  // to notice. The observer is not wrong, it is just late: it reports from a callback after layout,
  // measured at four frames here, and for those four the bar was still holding the previous route's
  // width with the new labels already on screen. That gap — narrow trough, full-width labels, both
  // clipped — is the "shows the previous switch length" half of the complaint. A layout effect runs
  // before the paint, so the resize starts on the same frame the labels swap.
  useMeasureEffect(() => {
    measure()
  }, [contentKey, measure])

  useMeasureEffect(() => {
    if (!outgoing) return
    // Layout effect, so both are already true when the browser paints the frame that swapped the
    // labels: the incoming set is invisible and the outgoing set is fully on screen.
    incomingOpacity.set(0)
    outgoingOpacity.set(1)
    if (reduceMotion) {
      incomingOpacity.set(1)
      setOutgoing(null)
      return
    }
    // Linear, unlike the width tween: this is a fade, and the slide's ease is shaped for travel.
    animate(outgoingOpacity, 0, {
      duration: LABEL_OUT,
      ease: "linear",
      onComplete: () => setOutgoing(null),
    })
    // Deliberately no cleanup that stops these. Clearing `outgoing` when the outgoing fade ends
    // re-runs this effect, and a cleanup would then cancel the still-running incoming fade —
    // measured with an earlier version of this, that froze the incoming labels part way. Framer
    // stops the previous animation on a value when a new one starts, so a mid-change swipe
    // supersedes rather than fights.
    animate(incomingOpacity, 1, { duration: LABEL_IN, delay: LABEL_OUT, ease: "linear" })
  }, [outgoing, reduceMotion, incomingOpacity, outgoingOpacity])

  useMeasureEffect(() => {
    if (!dims) return
    const from = shownW.current
    // First measurement, an unmoved bar, or the user asking for no motion: go straight there.
    if (from === null || from === dims.barW || reduceMotion) {
      shownW.current = dims.barW
      setBarW(dims.barW)
      return
    }
    const controls = animate(from, dims.barW, {
      duration: LABEL_SLIDE,
      ease: LABEL_EASE,
      onUpdate: (value) => {
        shownW.current = value
        setBarW(value)
      },
    })
    return () => controls.stop()
  }, [dims, reduceMotion])

  // The pill is positioned in the switch's own box, so it can travel between the bar and the stem
  // — which it does when the Timer opens, because the Timer replaces the selection rather than
  // sitting alongside it.
  useMeasureEffect(() => {
    const inner = innerRef.current
    const target = timerActive
      ? stemButtonRef.current
      : (contentRef.current?.children[activeIndex] as HTMLElement | undefined)
    if (!inner || !target) {
      setPill(null)
      return
    }
    const next = layoutBox(target, inner)
    setPill((prev) =>
      prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h
        ? prev
        : next,
    )
    // `barW` is a dependency because the bar is centred: as it grows the labels shift under it,
    // and the pill has to be re-measured against where they actually are.
  }, [activeIndex, timerActive, barW, dims])

  const width = barW ?? dims?.barW ?? undefined

  return (
    <div className={cn("flex justify-center mb-[21px]", className)}>
      <div ref={innerRef} className="relative inline-flex flex-col items-center">
        {dims && (
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0"
            width={width}
            height={dims.stemTop + dims.stemH}
            viewBox={`0 0 ${width} ${dims.stemTop + dims.stemH}`}
          >
            <defs>
              {/* Inner shadow, in two passes.
                  Each pass is the same trick: blur the shape's own alpha, then keep the part of
                  the *original* the blurred copy doesn't cover — `in="SourceAlpha" in2=<blur>`,
                  in that order. Reversing those operands keeps the region outside the shape
                  instead, which is an outer shadow. Working off the path's alpha is what lets the
                  result follow the concave fillets, which a box-shadow structurally cannot do.

                  Two passes because one isn't enough. Tailwind's `shadow-inner` — what the
                  Adjuster's Settings/Advanced switch uses — is `inset 0 2px 4px`, offset
                  downwards, so it grooves the top edge and leaves the sides nearly untouched and
                  the bottom bare. Reproducing only that read as almost nothing on a shape this
                  size. So: an un-offset pass draws an even edge the whole way round the
                  perimeter, and an offset pass adds the familiar top groove on top of it. */}
              <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="edgeBlur" />
                <feComposite in="SourceAlpha" in2="edgeBlur" operator="out" result="edgeRing" />
                <feFlood floodColor="#000000" floodOpacity="0.13" result="edgeTint" />
                <feComposite in="edgeTint" in2="edgeRing" operator="in" result="edgeShadow" />

                <feOffset in="SourceAlpha" dx="0" dy="2" result="offset" />
                <feGaussianBlur in="offset" stdDeviation="2" result="topBlur" />
                <feComposite in="SourceAlpha" in2="topBlur" operator="out" result="topRing" />
                <feFlood floodColor="#000000" floodOpacity="0.08" result="topTint" />
                <feComposite in="topTint" in2="topRing" operator="in" result="topShadow" />

                <feMerge>
                  <feMergeNode in="SourceGraphic" />
                  <feMergeNode in="edgeShadow" />
                  <feMergeNode in="topShadow" />
                </feMerge>
              </filter>
            </defs>
            <path
              d={buildTroughs({ ...dims, barW: barW ?? dims.barW })}
              fill="var(--recess)"
              filter={`url(#${filterId})`}
            />
          </svg>
        )}

        {/* Painted after the trough and before the buttons, which is the whole of its stacking
            story: it must cover the recess and sit under the labels. */}
        {pill && (
          <SwitchPill box={pill} transition={reduceMotion ? { duration: 0 } : PILL_SPRING} />
        )}

        {/* The bar. Transparent — the SVG behind it paints the trough. The width is explicit and
            animated, with `overflow-hidden` doing the clipping, so a navigation's new labels are
            revealed by the bar growing rather than by the text reflowing inside it. The bar is
            centred inside the column, and its contents are centred inside *it*, so the switch
            widens symmetrically about the mark. */}
        <div className="relative flex justify-center overflow-hidden" style={{ width }}>
          {/* Last route's labels, on their way out. Centred on the same axis as the incoming set,
              so the fade happens in place rather than across it. */}
          {outgoing && (
            <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center">
              <motion.div
                aria-hidden
                data-switch-outgoing
                className="flex min-w-max gap-1 p-[5px] text-sm text-gray-600"
                style={{ opacity: outgoingOpacity }}
              >
                {outgoing.node}
              </motion.div>
            </div>
          )}
          <motion.div
            ref={contentRef}
            data-switch-incoming
            className="relative flex min-w-max gap-1 p-[5px] text-sm text-gray-600"
            style={{ opacity: incomingOpacity }}
          >
            {children}
          </motion.div>
        </div>

        {/* The Timer: its own control, sitting under the switch rather than hanging off it.
            It used to be a bare 32px icon button floating in a trough the switch drew around it,
            which left the surround dead to the pointer — the recess looked like part of the
            control and did nothing when clicked. The button *is* the whole tab now, trough
            included, and it is inset by the same 5px so the Timer sits in an identical surround
            to an option in the bar. */}
        <button
          ref={stemRef}
          type="button"
          onClick={onTimerClick}
          aria-label="Timer"
          aria-pressed={timerActive}
          title="Timer"
          // The gap to the switch above (`mt-`) is deliberately a plain literal in this string
          // and nowhere else. It has now eaten a design-inspector edit twice: first as an inline
          // `style={{ marginTop }}`, which beats any class outright, and then as a constant passed
          // after this literal to `cn()` — which is `twMerge`, so the *last* conflicting class
          // wins and the constant silently overrode the class the inspector had just written into
          // the source. Both times the edit saved correctly and did nothing. Anything that sets
          // this margin from outside this string will do it again.
          //
          // The trough behind the button follows it either way: the SVG is drawn from the
          // button's measured `offsetTop` rather than from a number, so the shape and the layout
          // cannot disagree.
          className="relative rounded-sm p-[5px] mt-[7px]"
        >
          <span
            ref={stemButtonRef}
            className={cn(
              // The options' own 11px: the pill takes this shape here as it does in the bar, and
              // it agrees with the tab's own 12px rim — 11px sitting a hair inside 12px, exactly
              // the relationship an option has to the bar above.
              "flex h-8 w-8 items-center justify-center text-gray-600",
              OPTION_RADIUS_CLASS,
            )}
          >
            {/* Bold at all times. The two labels in the bar above are `font-black` selected or not —
                the pill is what says which tab you are on, so weight saying it too was a second
                answer to a question already answered. */}
            <Clock className="h-4 w-4 stroke-[2.75]" />
          </span>
        </button>
      </div>
    </div>
  )
}
