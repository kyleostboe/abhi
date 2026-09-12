// Webpack dev-only pre-loader for the style inspector (components/dev/style-inspector.tsx).
//
// Injects a `data-devloc="relative/path.tsx:line:col"` attribute onto every JSX opening element,
// computed from the *original* file text, before Next's own SWC loader compiles the file. This
// gives the browser a plain, reliable DOM attribute to read a click back to its exact source
// location — no reliance on React's internal per-element debug stacks, which React 19 only
// captures accurately for the first 10,000 JSX elements created in a page session (see
// ReactSharedInternals.recentlyCreatedOwnerStacks in react-jsx-dev-runtime) and silently falls
// back to a shared, meaningless stack after that budget is exhausted — which this app blows
// through almost immediately due to its size and Framer Motion re-renders.
//
// Never wired up outside `next dev` (see next.config.mjs) and never touches the files on disk —
// only the in-memory copy webpack compiles.

const path = require("node:path")
const { parse } = require("@babel/parser")
const traverse = require("@babel/traverse").default

module.exports = function devLocLoader(source) {
  const projectRoot = this.rootContext || process.cwd()
  const relPath = path.relative(projectRoot, this.resourcePath).split(path.sep).join("/")

  let ast
  try {
    ast = parse(source, { sourceType: "module", plugins: ["jsx", "typescript"] })
  } catch {
    return source // leave unparsable files untouched; SWC will report the real error
  }

  const insertions = []
  traverse(ast, {
    JSXOpeningElement(nodePath) {
      const node = nodePath.node
      if (!node.name.loc || node.name.end == null) return
      const { line, column } = node.name.loc.start
      insertions.push({ at: node.name.end, text: ` data-devloc="${relPath}:${line}:${column + 1}"` })
    },
  })

  if (insertions.length === 0) return source

  insertions.sort((a, b) => b.at - a.at)
  let out = source
  for (const { at, text } of insertions) {
    out = out.slice(0, at) + text + out.slice(at)
  }
  return out
}
