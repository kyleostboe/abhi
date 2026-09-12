> **Superseded — Option B was implemented.** All three screens are now mounted at once
> (`components/screen-strip.tsx`) and a swipe is a transform on painted DOM. The View
> Transitions work this document describes is gone from the codebase; it is kept because the
> defects it catalogues are real and will bite anything that reintroduces snapshots or a
> transform above the page, and because the measurements are the before-numbers for the change
> that replaced it. Option A is history; Option B is what shipped.
>
> Measured after: both screens on screen during the drag (ink in the incoming bands while the
> outgoing bands still have theirs), and the frozen window after release at 33ms in production
> against 68–111ms before.

# Stabilising the chrome across page changes

Status: **shipped.** The chrome is hoisted, the swipe slides the content region, and the
switch and the Adjuster's tabs both move on measured pills. The Option A / Option B
comparison below is kept only as the record of why the shape is what it is; the decision it
asks for was made in favour of A, and the blocker it cites turned out not to exist.

This document exists because the plan previously lived only in a chat transcript and was
effectively lost.

## The problem

Navigating between Home, Library and Journal rebuilds the entire page. Each of the three
routes rendered *its own* `Navigation`, `LogoMark` and `ModeSwitch`, with the layout
holding only providers — so a navigation genuinely destroyed the nav, the logo, the switch
and the content card, and constructed fresh ones.

That is why the logo and the switch appear to *glitch* rather than hold still: after every
page change they are literally different DOM nodes. **No animation can fix this.** Two
attempts were made before the cause was measured — first `app/template.tsx`, then the View
Transitions API in `components/swipe-navigator.tsx` — and neither could have worked,
because both were animating a rebuild rather than preventing it.

## Option A — hoist the chrome into the layout

Move nav + card + wash + logo + switch into a shared shell that the layout renders, so
Next preserves those nodes across route changes and only the page body swaps. This is
exactly the "minimal necessary stuff changes" behaviour.

- **Pros:** keeps `/library` and `/journal` as real URLs; no routing changes.
- **Cons:** real surgery on `app/page.tsx` (~4.4k lines) and `app/library/page.tsx`
  (~3.9k), whose root structures differ slightly. The pages must give up their outer shell,
  and their tab state has to be readable by the layout's switch (would need the
  cross-component sync in `hooks/use-persisted-choice.ts` extended).

### The blocker that stopped it

Library's **card element owns its drag-and-drop upload handlers** (`onDragOver` / `onDrop`),
and each page's content shares its padding wrapper with the header. Hoisting the card
therefore means moving page-specific behaviour — including file upload — into shared
chrome. Breaking upload silently is a bad trade for smoothness, which is what pushed the
recommendation toward Option B.

## Option B — collapse the three routes into one (recommended)

Make the page change a piece of *state* inside a single route rather than a navigation, so
nothing unmounts. A flat carousel translate between the three views then becomes trivial,
and even the body persists.

- **Pros:** nothing unmounts, so there is no hoisting and no card surgery; upload handlers
  stay exactly where they are; strictly smoother than A, including the page body itself.
- **Cons:** `/library` and `/journal` stop being real URLs unless they are synced back with
  `history.replaceState`; back-button behaviour needs deliberate handling.

## Current state in the tree

**Both stages done.** The card, the wash, the logo and the switch are now the layout's, and a
navigation no longer rebuilds any of them.

**Stage 1 — the card became one component.** The card's class list turned out to be
*byte-identical* in all three pages, so the "card surgery" this document originally cited as
Option A's blocker was much smaller than claimed: the Library's drop handlers passed straight
through as ordinary props and upload was untouched. Verified at the time: 248 tests, 0 lint
errors, each page's rendered text identical to its pre-refactor baseline (Home 634 chars,
Library 82, Journal 78), one wash per page, no console errors.

**Stage 2 — the chrome hoisted into the layout** as `components/page-chrome.tsx`, the way
`AppShell` was. It renders the page ground, the card, its inner `overflow-hidden` container,
the `HeaderWash`, `LogoMark`, `ModeSwitch` and the signed-out `AuthButtons`; `{children}` is
only the part below the header. `components/page-card.tsx` is gone.

Three things made this cheaper than the document predicted:

- The switch's state did not have to move. `hooks/use-persisted-choice.ts` was already written
  for this — its subscribers mean the chrome and the page body can hold the same key, so the
  chrome drives `home-mode`, `library-tab` etc. and the pages keep reading them unchanged.
  The chrome holds *every* route's keys at once (six hooks, unconditional, stable keys) rather
  than looking one up by route, because re-keying a hook as you navigate leaves it showing the
  previous route's tab for a frame.
- `before` was not the problem it looked like. The Library's `before` was a Radix `Dialog`,
  already a portal, so it moved inside the page's content with no visual change; only Home's
  `memoryWarning` genuinely needs to sit *above* the card, and gets a `PageBefore` portal into
  a slot the chrome leaves for it. The `fixed` debug button explicitly must **not** go inside
  the card — `backdrop-blur` makes the card the containing block for fixed positioning, which
  would both move it and clip it.
- The header was made **unconditional** rather than signed-in-only. Keeping it tied to auth meant a
  signed-out swipe from Home lost the logo and the switch outright — a louder kind of movement than
  the one being fixed — so the switch is now decorative on signed-out Library and Journal (those
  pages are a sign-in prompt either way) in exchange for chrome that never moves. The chrome's base
  top padding moved with it: the route configs no longer carry one, because only the chrome knows
  whether the signed-out Login / Sign Up button is floating over the card.

Verified after stage 2, signed out, Home → Library → Home: the card is the **same DOM node** at an
unchanged rect; the card's position (32, 164) and width never change while its height interpolates;
the logo's centre is 442.5px on every route, so the mark does not move even though its box is
padded differently; and the switch's y and height never change while its width moves 199px →
231px about that same centre. All three routes render one card, one wash and one header, with text
matching the stage-1 baselines plus exactly the switch's labels — Home 634 unchanged, Library 82 →
104, Journal 78 → 93. The two deltas are the labels the unconditional header now shows signed out,
right down to the character: "Meditations Playlists" is 22 with its separator, "Notes Sessions" 15.

## The swipe transition: five separate defects, all now fixed

The view transition never worked. It was not one bug but five, and each one alone was enough to
make a swipe look wrong. They are recorded together because they were mistaken for each other
for a long time, and the first two in particular look identical from the outside.

**1. A deadlock in the update callback.** `swipe-navigator.tsx` awaited `requestAnimationFrame`
inside the `startViewTransition` callback. Chromium defers the rendering steps — and therefore
rAF — until that callback settles, so the callback waited on a frame that could only arrive once
the browser gave up. Measured:

| inside the update callback | time to settle |
| --- | --- |
| `requestAnimationFrame` ×2 | **4061ms**, then aborted |
| `setTimeout(…, 0)` | 371ms |
| nothing (synchronous) | 424ms |

Chromium aborts at ~4s with `TimeoutError: Transition was aborted because of timeout in DOM
update`, and `void transition.finished.finally(...)` had no `.catch()`, so the abort became an
unhandled rejection. Fixed by resolving the callback's promise from a timer-governed path and
adding the `.catch()`.

**2. The "new" snapshot was a blank page.** `app/template.tsx` mounted its framer-motion wrapper
with `initial={{ opacity: 0 }}`. `flushSync` in the navigator exists precisely so the browser can
snapshot the incoming route — so the snapshot was taken with the whole document at opacity 0.
Every swipe animated onto a transparent page. The template also branched on `"startViewTransition"
in document`, which is false on the server, so server and client disagreed about that style and
React reported a **hydration mismatch on every load**. Both are gone: the template now renders
identical markup in both environments and animates nothing, and the fallback slide for browsers
without the API is CSS keyed off `data-nav-fallback`, which only the non-view-transition path
sets. `lib/nav-direction.ts` existed only to serve the old branch and was deleted.

**3. Both snapshots were the outgoing page.** This was the real one. `router.push` is
asynchronous: it returns long before React has rendered the incoming route, so at snapshot time
the DOM still held the page being left — measured directly, `location.pathname` was still `/`
when the incoming snapshot was taken. The transition was animating the old page onto itself, and
the real destination then appeared in an unrelated hard cut. That is the "whole page flashes" and
the "swipe went somewhere I didn't aim". Fixed by returning a promise from the update callback
and resolving it from a `useLayoutEffect` when the pathname actually changes; the browser will
not take the incoming snapshot until that promise settles. The wait is ~200ms, and the animation
runs after it.

**4. `backdrop-filter` cannot be snapshotted.** Chromium will not render `backdrop-filter`
content into a view-transition snapshot, and **one such element anywhere on the page is enough to
blank the entire captured frame**. The card's `backdrop-blur-lg` did this, so the card came out
empty on both sides. Measuring it showed the blur is also a complete no-op — the only thing behind
the card is the page ground's linear gradient, and blurring a smooth gradient returns the same
gradient (a pixel diff of the page with and without it reports **zero** differing pixels). The
blur is therefore left in place and switched off for the duration of the transition by
`html[data-nav-dir] * { backdrop-filter: none !important }`, which costs nothing visible because
the live page is behind the transition's own overlay.

**5. The destination had no card to move to.** Both `loading.tsx` files returned `null`, so at the
moment the router committed the destination there was **no card in the DOM at all** — the named
element did not exist, and Chromium scaled the outgoing card down to a degenerate box. Both
boundaries now render `components/page-loading.tsx`, which is a real element with a spinner, so
something exists on both sides of the transition at the same size. (That component used to render
a whole `PageCard`; with the card in the layout it renders only content, or it would nest a card
inside a card.)

What it does now: the nav, the page ground, the card, the logo and the switch all hold perfectly
still — they never re-render on a navigation, so they are not part of either snapshot in any
meaningful sense — while the page's **content region** slides a full card-width in the direction
of the swipe, which is the carousel the gesture was always meant to be. The named element is
therefore the content wrapper, not the card: naming the card was what dragged the logo and the
switch across the screen with it, which was the original complaint.

**Known remaining gap:** the animation starts **110–128ms** after the gesture, because the
destination route has to render before the browser will snapshot it. That is the price of a
*correct* two-sided transition with an asynchronous router; Option B (nothing unmounts) is what
removes it. The gesture itself no longer waits — the content holds the drag all the way through it.

`router.prefetch` for all three routes was added and measured to make **no difference at all**
(110–128ms before, 110–126ms after). The wait is not a fetch; by then the payload is in the router
cache and the cost is React rendering these pages, which are 4.6k and 3.8k lines with 70 and 60
`useState` calls. It is left in because a swipe is the one navigation with nowhere to hang a
prefetch off — `<Link>` warms a route on hover or in the viewport, and a swipe has neither.

The wait is also what the `loading.tsx` boundaries buy. Deleting them to try to get the real page
into the incoming snapshot instead made the commit wait for the page to be ready, and the gap went
to **412–976ms**. They stay, and the cost is that the incoming snapshot is the loading state.

**What was left, and what happened to it.** The destination page's *own* data used to be the
honest answer to "no loading": Library and Journal mounted and fetched in an effect, so the loading
boundary stayed on screen for **330–1005ms** after the gesture, well past the 260ms transition.
Preloading the route did not touch that, and the conclusion here was that only preloading the data
would — or keeping the pages mounted (Option B).

Preloading the data is what was done, and it did not need Option B. `components/data-warmer.tsx`
warms the whole index once when auth resolves — meditations, recordings, playlists, the journal's
notes and folders, sessions and settings — into the stale-while-revalidate resources in
`lib/app-data.ts`. The pages then seed their own state from `peek()` in a `useState` initialiser,
which is synchronous module memory and therefore available *during the first render*, so the
incoming view-transition snapshot is the real page rather than its loading state. Each page still
revalidates on mount (presigned R2 playback URLs expire after an hour), but underneath what is
already on screen.

The 110–128ms render wait above is a separate thing and is unchanged: that is React rendering a
4.6k/3.8k-line page, and removing it still means Option B.

### The content follows the finger

It used to sit still for the whole gesture and then jump into the slide, which reads as the swipe
being *ignored* until it is over. Now `components/swipe-navigator.tsx` puts
`[data-page-content][data-swiping] { transform: translate3d(var(--swipe-x), …) }` on the content
region as the finger moves, and the release hands the same element to the transition.

**The second half of that took three attempts, and the two failures are the useful part.**

The gesture used to end by clearing the drag before `startViewTransition` was called, and start the
slide part way in with a negative `animation-delay` — the inverse-easing sum that `lib/swipe-motion.ts`
used to hold. Correct on paper, and it left a hole in the middle of it: nothing clears the drag
*before* `startViewTransition`, so for the whole time the router needs — measured at **110–128ms**,
the route committing being what the transition's update callback waits for — the content sits back at
the edge it was dragged from, and the transition only then picks it up. That is the gesture appearing
to fail and then going.

Clearing it inside the update callback instead does not help: the outgoing snapshot is taken around
that callback, and the offset was in neither snapshot. Clearing it where the promise *settles* does
not help either, for the same reason. The offset has to be somewhere the outgoing snapshot can see it,
and it cannot be on the element the transition named — a transform on a named element moves the
group, because Chromium places a group at the captured element's quad, so a page dragged 240px left
would be snapshotted 240px off the card and animated from there.

So there are **two elements** (`components/page-chrome.tsx`): the outer one carries the
`view-transition-name` and is never transformed, the inner one carries the drag. The group's geometry
stays put, and the offset is ordinary painted content, so it is in the outgoing picture exactly as it
was on screen when the finger let go. Measured on composited frames: the content holds **at the full
240px of the drag through +22, +50 and +96ms** — the entire wait — where it used to be back at 0 on
the first frame after release.

The incoming page then has to compensate, or the two are `100% + --swipe-dx` apart and a gap opens
between them in the middle of the card for the whole slide. `--swipe-dx` is that compensation, and
with it they stay exactly one card apart — which is what they were while the finger was moving them.
Zero unless a swipe set it, so a link or the back button still travels the full width.

The back-out after a gesture too short to navigate is still a one-shot `element.animate()` rather
than a CSS transition: a transition would be in the way on the committing path, where the drag has to
be gone before the incoming snapshot, and it would leave a rule behind to interfere.

Two guards go with it. The transform is gated on `data-swiping` rather than always present, and the
navigator declines any gesture that starts under a `position: fixed` element — a transform anywhere
above the page's markup becomes the containing block for every fixed descendant, so the Library's
full-screen player would jump out from under the card the moment a swipe started on it. (Checked
directly: no absolutely- or fixed-positioned element in the content region is anchored above it, so
nothing else is affected either.)

**Beware the harness.** `MAX_DURATION` in the navigator is 800ms, and a film rig that steps a drag
six times with 90ms between moves comes to ~860ms once the CDP round-trips are counted — so the
gesture is silently *abandoned*, and what gets filmed is the spring-back. That is exactly the shape
of the bug being investigated, so it looked like the fix had not worked. The rigs step at 45ms now.

### The switch, and the same idea in the Adjuster

The switch's options differ per route, which used to mean a different bar width and a different
selected node. Both are animated now (`components/mode-switch.tsx`): the bar resizes from the old
route's labels to the new one's, and a single white pill is positioned by measurement and animated
between targets, so it also travels down to the Timer stem when the Timer opens instead of two
backgrounds swapping.

**Everything the switch does on a navigation runs on one clock** — 260ms,
`cubic-bezier(0.22, 0.61, 0.36, 1)`, the same as `::view-transition-*` on `page-content`. The labels
change, the trough resizes and the pill travels together, because the labels are part of the page
arriving and a switch on its own clock arrives a beat early or late against it.

Two defects had to be measured out of it first, and both were reported as one complaint — that the
switch "shows the previous switch length too long":

- **The trough was measured late.** The bar's target width arrived from a `ResizeObserver` callback,
  four frames after the labels had already been swapped in — and for those four frames the switch
  held the *previous route's* width with the new labels clipped inside it. Re-measured in a layout
  effect keyed on the options, which runs before the paint.
- **Then it was animated on a spring**, which was still 8px short 100ms after the slide had finished.
  On a tween sharing the slide's duration and easing, the shortfall falls to zero exactly as the
  slide ends.

The pill needed its own fix: it was measured with `getBoundingClientRect`, which includes the
incoming layer's slide transform, so on a swipe it arrived from the side with the labels and chased
them back. It measures layout now (`offsetLeft`/`offsetTop`), which a transform does not reach.

**The labels fade; they do not travel.** They used to slide in from the side the page does, which
made the switch read as a second carousel bolted to the top of the card — the words appeared to swipe
with the page rather than simply become the new words. Now the outgoing set fades out over the first
half of the clock and the incoming set fades in over the second, so the width animation is the only
thing in the switch that moves.

Sequential rather than overlapping, and that is the one thing that was not a matter of taste: a
genuine cross-fade was the first thing tried, and with both sets at half opacity in the same place
"Adjuster" dissolving into "Meditations" renders as both at once — visibly "MAdjusterns" — which
reads as a rendering fault rather than as a transition. Out for 130ms, in for 130ms, nothing legible
in between.

### The two things the transition was doing that were not the slide

Reported as "the carousel dips the content a bit" and "a dark blip at the top of the app, visible on
the navigation bar". Neither was the keyframes, which are pure horizontal `translateX`.

**The dip was a vertical squash of the whole page.** A view-transition snapshot is a replaced
element and defaults to `object-fit: fill`, so it is *stretched* to whatever the group box currently
is. The group animates its height between the two pages — measured 691px becoming 630px — so an
821×691 picture of the page was being squashed to 91% and back for the length of the transition.
`height: auto` on the two `page-content` snapshots keeps each at its own height; the group's
`overflow: clip` then crops the outgoing page's bottom edge as the box shrinks, which is a crop and
not a distortion. Verified by reading the pseudo-elements' computed style mid-transition, which is
the only way to tell a crop from a stretch: the old snapshot stays 821×691 while the group passes
through 640, 634, 632.

**The blip was the navigation bar's selected pill.** `components/navigation.tsx` carried
`transition-colors` on the three links. `transition-colors` does not cover `background-image`, and
the selected style is a gradient — so on a navigation the dark pill vanished in a single frame while
the text colour faded out over 150ms behind it. Measured on composited frames at the pill:
`rgb(255,255,255)` on the first frame — white text on white, nothing there at all — taking until
~200ms to be dark again. It lands in the middle of the page transition, and it was the *only* thing
in the entire top of the app that moved: a grid of probe points over the header found deviations
there and nowhere else. The three links drop `transition-colors` and swap the selection in one frame.
It was doing nothing else — the class only ever animated the selection change.

The Adjuster's own Settings / Advanced tabs (`app/page.tsx`) got the same treatment and deliberately
the same spring, since the two switches sit a few hundred pixels apart. It is **one** pill moved by
measurement, not a `layoutId` shared between the triggers: the shared-layout version crossfades the
outgoing element by painting a lead copy of it over the trigger it left, which wipes the label
underneath for about four frames. The trigger's `data-[state=active]:bg-white` is switched off so
there is only ever one background for the selection.

`router.prefetch` was once tried for the gap, measured **no improvement**, and reverted. It has since
been reinstated for a different reason — see "Known remaining gap" above, which is where the numbers
are now.

## Decision

Option A, in the end. Option B — collapsing the three routes into one — was recommended here on the
strength of two claims that did not survive contact with the code: that hoisting meant "card
surgery", and that it meant moving page-specific behaviour like the upload handlers into shared
chrome. The card's class list turned out to be byte-identical across all three pages and the drop
handlers passed through as ordinary props untouched. Keeping `/library` and `/journal` as real URLs
is worth the ~200ms the asynchronous router costs.
