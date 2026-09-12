/**
 * Dev-only helpers for the style inspector overlay (components/dev/style-inspector.tsx) and its
 * API route (app/api/__dev_style/route.ts). Pure string/token logic so it can be unit tested
 * without touching the DOM or the filesystem — none of this runs in production.
 */

export type StyleCategory =
  | "padding-top"
  | "padding-right"
  | "padding-bottom"
  | "padding-left"
  | "padding-x"
  | "padding-y"
  | "padding"
  | "margin-top"
  | "margin-right"
  | "margin-bottom"
  | "margin-left"
  | "margin-x"
  | "margin-y"
  | "margin"
  | "gap"
  | "gap-x"
  | "gap-y"
  | "background-color"
  | "text-color"
  | "text-align"
  | "border-color"
  | "border-width"
  | "border-radius"
  | "font-size"
  | "font-weight"
  | "font-family"
  | "box-shadow"
  | "width"
  | "height"

const FONT_SIZE_KEYWORDS = new Set([
  "xs",
  "sm",
  "base",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "8xl",
  "9xl",
])

const FONT_WEIGHT_KEYWORDS = new Set([
  "thin",
  "extralight",
  "light",
  "normal",
  "medium",
  "semibold",
  "bold",
  "extrabold",
  "black",
])

/** The three families Tailwind ships. `font-black` and friends are weights and classify there. */
const FONT_FAMILY_KEYWORDS = new Set(["sans", "serif", "mono"])

/**
 * Shadow *sizes*. Deliberately a closed set rather than a prefix test, because `shadow-` is also
 * how a shadow's colour is written (`shadow-gray-500`, `shadow-black/20`) and those are a
 * different property. An unknown `shadow-…` is left unclassified rather than guessed at.
 */
const SHADOW_KEYWORDS = new Set(["none", "2xs", "xs", "sm", "md", "lg", "xl", "2xl", "inner"])

/** `text-left` and friends. Alignment is its own property, so it needs its own category: while it
 * sat in the non-colour list below it classified as `font-size`, and a font-size edit therefore
 * removed an element's alignment along with its size. */
const TEXT_ALIGN_KEYWORDS = new Set(["left", "center", "right", "justify", "start", "end"])

/**
 * The `text-…` utilities that are neither a size, a colour nor an alignment. They are recognised
 * only so they are not mistaken for a colour, and they deliberately belong to no category: there is
 * no control for them, and an unclassified token is left untouched by `applyTokenToClassList`,
 * which is what should happen when you change something else on the element.
 *
 * Only names that can actually follow `text-` belong here. The unprefixed decoration and transform
 * utilities (`underline`, `uppercase`, `italic`, `truncate`…) can never reach this list — they do
 * not start with `text-`, so `classifyToken` has already passed judgement on them by then.
 */
const TEXT_DECORATION_KEYWORDS = new Set(["wrap", "nowrap", "balance", "pretty", "ellipsis", "clip"])

const BG_NON_COLOR_PREFIXES = [
  "bg-gradient-to-",
  "bg-none",
  "bg-clip-",
  "bg-repeat",
  "bg-no-repeat",
  "bg-fixed",
  "bg-local",
  "bg-scroll",
  "bg-auto",
  "bg-cover",
  "bg-contain",
  "bg-top",
  "bg-bottom",
  "bg-center",
  "bg-left",
  "bg-right",
  "bg-blend-",
  "bg-origin-",
]

const BORDER_STYLE_SUFFIXES = new Set(["solid", "dashed", "dotted", "double", "hidden", "none"])

/** Is this bracketed value a length (px/rem/em/%/vh/vw/ch) rather than a color? */
function isArbitraryLength(value: string): boolean {
  return /^-?\d*\.?\d+(px|rem|em|%|vh|vw|ch|svh|dvh)$/.test(value)
}

function isArbitraryColor(value: string): boolean {
  return /^#|^rgb|^hsl|^oklch|^var\(/.test(value)
}

/** Classify a single Tailwind utility token into the style category it edits, if any. */
export function classifyToken(token: string): StyleCategory | null {
  if (token.startsWith("p-")) return "padding"
  if (token.startsWith("px-")) return "padding-x"
  if (token.startsWith("py-")) return "padding-y"
  if (token.startsWith("pt-")) return "padding-top"
  if (token.startsWith("pr-")) return "padding-right"
  if (token.startsWith("pb-")) return "padding-bottom"
  if (token.startsWith("pl-")) return "padding-left"

  const bareToken = token.startsWith("-") ? token.slice(1) : token
  if (bareToken.startsWith("m-")) return "margin"
  if (bareToken.startsWith("mx-")) return "margin-x"
  if (bareToken.startsWith("my-")) return "margin-y"
  if (bareToken.startsWith("mt-")) return "margin-top"
  if (bareToken.startsWith("mr-")) return "margin-right"
  if (bareToken.startsWith("mb-")) return "margin-bottom"
  if (bareToken.startsWith("ml-")) return "margin-left"

  if (token.startsWith("gap-x-")) return "gap-x"
  if (token.startsWith("gap-y-")) return "gap-y"
  if (token.startsWith("gap-")) return "gap"

  if (token.startsWith("rounded")) return "border-radius"

  if (token.startsWith("border")) {
    const rest = token.slice("border".length).replace(/^-/, "")
    if (rest === "" || /^\d+$/.test(rest) || /^\[.+\]$/.test(rest)) {
      // border, border-2, border-[3px]
      if (rest === "" || /^-?\d/.test(rest) || rest.startsWith("[")) {
        const bracket = rest.match(/^\[(.+)\]$/)
        if (bracket && isArbitraryColor(bracket[1])) return "border-color"
        return "border-width"
      }
    }
    if (BORDER_STYLE_SUFFIXES.has(rest)) return null
    const bracket = rest.match(/^\[(.+)\]$/)
    if (bracket) {
      return isArbitraryLength(bracket[1]) ? "border-width" : "border-color"
    }
    if (rest.length > 0) return "border-color"
  }

  if (token.startsWith("bg-")) {
    if (BG_NON_COLOR_PREFIXES.some((p) => token.startsWith(p))) return null
    return "background-color"
  }

  if (token.startsWith("text-")) {
    const rest = token.slice("text-".length)
    if (TEXT_ALIGN_KEYWORDS.has(rest)) return "text-align"
    if (FONT_SIZE_KEYWORDS.has(rest)) return "font-size"
    const bracket = rest.match(/^\[(.+)\]$/)
    if (bracket) {
      return isArbitraryLength(bracket[1]) ? "font-size" : "text-color"
    }
    if (TEXT_DECORATION_KEYWORDS.has(rest)) return null
    return "text-color"
  }

  if (token.startsWith("font-")) {
    const rest = token.slice("font-".length)
    if (FONT_WEIGHT_KEYWORDS.has(rest)) return "font-weight"
    if (FONT_FAMILY_KEYWORDS.has(rest)) return "font-family"
  }

  // Inner and outer shadows are one category on purpose: they are alternatives, so picking one in
  // the inspector has to remove the other rather than leave both on the element.
  if (token.startsWith("inset-shadow-")) return "box-shadow"
  if (token.startsWith("shadow-") || token === "shadow") {
    const rest = token === "shadow" ? "" : token.slice("shadow-".length)
    if (rest === "" || SHADOW_KEYWORDS.has(rest) || /^\[.+\]$/.test(rest)) return "box-shadow"
  }

  if (token.startsWith("w-")) return "width"
  if (token.startsWith("h-")) return "height"

  return null
}

/**
 * Replace (or add) the token for `category` within an existing space-separated class string.
 * Returns the new class string. Category matches are removed even if there are several
 * (e.g. a stray duplicate `p-4 p-2`), then `newToken` is appended once — pass `newToken: null`
 * to clear the category entirely.
 */
export function applyTokenToClassList(classList: string, category: StyleCategory, newToken: string | null): string {
  const tokens = classList.split(/\s+/).filter(Boolean)
  const kept = tokens.filter((t) => classifyToken(t) !== category)
  if (newToken) kept.push(newToken)
  return kept.join(" ")
}

/** Find the first existing token in `classList` matching `category`, if any. */
export function findTokenForCategory(classList: string, category: StyleCategory): string | null {
  const tokens = classList.split(/\s+/).filter(Boolean)
  for (const t of tokens) {
    if (classifyToken(t) === category) return t
  }
  return null
}
