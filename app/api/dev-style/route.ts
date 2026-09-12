import { NextResponse, type NextRequest } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import { parse } from "@babel/parser"
import traverse from "@babel/traverse"
import * as t from "@babel/types"
import { applyTokenToClassList, classifyToken, type StyleCategory } from "@/lib/dev/tailwind-edit"

// Style inspector only: lets the dev-only overlay (components/dev/style-inspector.tsx) write a
// Tailwind class straight into the JSX source that produced the clicked element. Never reachable
// outside `next dev` — both this guard and the overlay's own dev-only mount are required so this
// never ships.
function assertDev() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("dev-only route")
  }
}

interface EditRequest {
  file: string
  line: number
  column: number
  category: StyleCategory
  token: string | null
}

function findJsxElementNear(ast: t.File, line: number, column: number): t.JSXOpeningElement | null {
  let best: t.JSXOpeningElement | null = null
  let bestSpan = Infinity
  let bestDistance = Infinity

  traverse(ast, {
    JSXOpeningElement(nodePath) {
      const loc = nodePath.node.loc
      if (!loc) return
      // The reported line can be anywhere in a multi-line opening tag (e.g. the compiler may
      // point at the closing `>` rather than the `<Tag` start), so match the whole tag's range
      // rather than requiring an exact start-line hit. Among matches, prefer the most specific
      // (smallest-span) element — an outer multi-line wrapper can span the same line too.
      if (line < loc.start.line || line > loc.end.line) return
      const span = loc.end.line - loc.start.line
      const distance = Math.abs(loc.start.column - column)
      if (span < bestSpan || (span === bestSpan && distance < bestDistance)) {
        bestSpan = span
        bestDistance = distance
        best = nodePath.node
      }
    },
  })

  return best
}

/** Collect every string literal reachable inside a className attribute's value expression. */
function collectStringLiterals(expr: t.Node, out: t.StringLiteral[]) {
  if (t.isStringLiteral(expr)) {
    out.push(expr)
  } else if (t.isTemplateLiteral(expr)) {
    // Static text only — quasis aren't editable as class tokens reliably, skip.
  } else if (t.isCallExpression(expr)) {
    for (const arg of expr.arguments) collectStringLiterals(arg, out)
  } else if (t.isConditionalExpression(expr)) {
    collectStringLiterals(expr.consequent, out)
    collectStringLiterals(expr.alternate, out)
  } else if (t.isLogicalExpression(expr)) {
    collectStringLiterals(expr.right, out)
  } else if (t.isArrayExpression(expr)) {
    for (const el of expr.elements) if (el) collectStringLiterals(el, out)
  } else if (t.isParenthesizedExpression(expr)) {
    collectStringLiterals(expr.expression, out)
  }
}

export async function POST(request: NextRequest) {
  try {
    assertDev()
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  try {
    const body = (await request.json()) as EditRequest
    const { file, line, column, category, token } = body

    const projectRoot = process.cwd()
    const resolved = path.isAbsolute(file) ? file : path.resolve(projectRoot, file)
    if (!resolved.startsWith(projectRoot + path.sep)) {
      return NextResponse.json({ error: `path outside project: ${resolved}` }, { status: 400 })
    }

    const source = await fs.readFile(resolved, "utf8")

    let ast: t.File
    try {
      ast = parse(source, {
        sourceType: "module",
        plugins: ["jsx", "typescript"],
      })
    } catch (e) {
      return NextResponse.json({ error: `parse failed: ${(e as Error).message}` }, { status: 400 })
    }

    const element = findJsxElementNear(ast, line, column)
    if (!element) {
      return NextResponse.json({ error: `no JSX element found at ${file}:${line}:${column}` }, { status: 404 })
    }

    const classNameAttr = element.attributes.find(
      (a): a is t.JSXAttribute => t.isJSXAttribute(a) && a.name.name === "className",
    )

    // Case 1: className="..." literal, or className={"..."} — edit the string in place.
    if (classNameAttr?.value) {
      const literals: t.StringLiteral[] = []
      if (t.isStringLiteral(classNameAttr.value)) {
        literals.push(classNameAttr.value)
      } else if (t.isJSXExpressionContainer(classNameAttr.value)) {
        collectStringLiterals(classNameAttr.value.expression, literals)
      }

      if (literals.length > 0) {
        // Prefer editing whichever literal already carries a token in this category; otherwise
        // fall back to the last literal, so a fresh token is evaluated last — cn()/tailwind-merge
        // resolves conflicting utilities by which one appears last, so this is what lets the new
        // value reliably win over an earlier literal's conflicting class.
        let target = literals[literals.length - 1]
        for (const lit of literals) {
          if (lit.value.split(/\s+/).some((tok) => classifyToken(tok) === category)) {
            target = lit
            break
          }
        }

        if (!target.start || !target.end) {
          return NextResponse.json({ error: "literal missing position info" }, { status: 500 })
        }

        const newValue = applyTokenToClassList(target.value, category, token)
        const quote = source[target.start] === "'" ? "'" : '"'
        const replacement = `${quote}${newValue}${quote}`
        const newSource = source.slice(0, target.start) + replacement + source.slice(target.end)
        await fs.writeFile(resolved, newSource, "utf8")
        return NextResponse.json({ ok: true, appliedClass: newValue })
      }
    }

    // Case 2: the element has no className at all — add one, so it wins via cn()'s tailwind-merge
    // (last argument wins for conflicting utilities), matching this repo's convention in
    // components/ui/*.
    //
    // Only when there is genuinely no className. An element whose className is a call with no
    // string literals in it — `className={switchOptionClass(active)}` — reaches here too, and
    // adding a second attribute to that produced invalid JSX ("JSX elements cannot have multiple
    // attributes with the same name") that broke the build. Refuse instead and say why.
    if (classNameAttr) {
      return NextResponse.json(
        {
          error:
            "This element's className is computed with no editable string literal (e.g. a helper call), so there's nothing to edit and adding a second className would be invalid JSX. Edit the helper, or select a parent.",
        },
        { status: 409 },
      )
    }

    if (!token) {
      return NextResponse.json({ ok: true, appliedClass: null, note: "nothing to clear" })
    }

    if (!element.name.loc) {
      return NextResponse.json({ error: "element missing position info" }, { status: 500 })
    }

    const insertAt = element.name.end!
    const insertion = ` className="${token}"`
    const newSource = source.slice(0, insertAt) + insertion + source.slice(insertAt)
    await fs.writeFile(resolved, newSource, "utf8")
    return NextResponse.json({ ok: true, appliedClass: token, note: "added new className prop" })
  } catch (e) {
    return NextResponse.json({ error: `unexpected error: ${(e as Error).message}` }, { status: 500 })
  }
}
