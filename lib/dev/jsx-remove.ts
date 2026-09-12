/**
 * Dev-only: cut a JSX element out of the source that produced it, for the style inspector's
 * Delete action (app/api/dev-delete/route.ts).
 *
 * Takes a source string and a location and returns a new source string — no filesystem, no DOM —
 * so the whole rule is unit testable.
 *
 * The rule is deliberately narrow. Only an element that *is* the markup can be removed: a plain
 * child of another element, or the lone occupant of a `{…}`. Everything else is a template rather
 * than a thing that exists once — `cond && <X/>`, `items.map((i) => <X/>)` — and cutting the
 * element out of those leaves an operator with nothing to operate on. Those are refused with an
 * explanation instead of half-removed.
 *
 * Whatever the narrow rule misses, the re-parse gate catches: the new source is parsed before it
 * is handed back, so a removal that would break the file can never reach disk.
 */

import { parse } from "@babel/parser"
import traverse, { type NodePath } from "@babel/traverse"
import * as t from "@babel/types"

export type RemoveResult =
  | { ok: true; source: string; removed: string }
  | { ok: false; error: string }

type Target = t.JSXElement

const PARSE_OPTIONS = { sourceType: "module", plugins: ["jsx", "typescript"] } as const satisfies Parameters<
  typeof parse
>[1]

/**
 * The element whose opening tag covers this location. Mirrors the match in
 * app/api/dev-style/route.ts: the reported location can be anywhere inside a multi-line tag, and
 * among the elements that span it the most specific one wins — an outer wrapper usually spans the
 * same line as the element inside it.
 */
function findElementPath(ast: t.File, line: number, column: number): NodePath<Target> | null {
  let best: NodePath<Target> | null = null
  let bestSpan = Infinity
  let bestDistance = Infinity

  traverse(ast, {
    // One visitor covers both shapes: Babel 8 folds a self-closing element into `JSXElement` with
    // `closingElement: null`, so `<Bell />` and `<div>…</div>` arrive here alike.
    JSXElement(path) {
      const loc = path.node.openingElement.loc
      if (!loc) return
      if (line < loc.start.line || line > loc.end.line) return
      const span = loc.end.line - loc.start.line
      const distance = Math.abs(loc.start.column - column)
      if (span < bestSpan || (span === bestSpan && distance < bestDistance)) {
        bestSpan = span
        bestDistance = distance
        best = path
      }
    },
  })

  return best
}

/**
 * True when the element is markup in its own right rather than the body of an expression. A plain
 * child qualifies; so does `{<X/>}`, whose container becomes an empty `{}` — valid, and the only
 * thing that could have been meant.
 */
function isRemovableInPlace(path: NodePath<Target>): boolean {
  const parentPath = path.parentPath
  if (!parentPath) return false
  if (parentPath.isJSXElement() || parentPath.isJSXFragment()) return true
  return parentPath.isJSXExpressionContainer() && parentPath.node.expression === path.node
}

/**
 * Grow a node's range to whole lines when nothing but whitespace shares them, so a deletion takes
 * the blank line it leaves with it instead of replacing the element with a gap.
 */
function widenToWholeLines(source: string, start: number, end: number): [number, number] {
  const lineStart = source.lastIndexOf("\n", start - 1) + 1
  const from = source.slice(lineStart, start).trim() === "" ? lineStart : start
  const lineEnd = source.indexOf("\n", end)
  const to = lineEnd !== -1 && source.slice(end, lineEnd).trim() === "" ? lineEnd + 1 : end
  return [from, to]
}

export function removeJsxElementAt(source: string, line: number, column: number): RemoveResult {
  let ast: t.File
  try {
    ast = parse(source, PARSE_OPTIONS)
  } catch (e) {
    return { ok: false, error: `could not parse the file: ${(e as Error).message}` }
  }

  const path = findElementPath(ast, line, column)
  if (!path) {
    return { ok: false, error: `No JSX element found at ${line}:${column}.` }
  }

  if (!isRemovableInPlace(path)) {
    return {
      ok: false,
      error:
        "That element comes from an expression — a condition, a map or a helper — rather than sitting in the markup as itself, so removing it here would leave the expression with nothing to act on. Select its parent element and delete that instead.",
    }
  }

  const { start, end } = path.node
  if (start == null || end == null) {
    return { ok: false, error: "That element is missing position information." }
  }

  const [from, to] = widenToWholeLines(source, start, end)
  const next = source.slice(0, from) + source.slice(to)

  // The gate. Never hand back source that does not parse — anything the rule above did not foresee
  // is refused here rather than written to disk.
  try {
    parse(next, PARSE_OPTIONS)
  } catch {
    return {
      ok: false,
      error:
        "Removing that element would break the file. Select the element that contains it and delete that instead.",
    }
  }

  return { ok: true, source: next, removed: source.slice(start, end) }
}
