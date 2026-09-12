import { NextResponse, type NextRequest } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"
import { removeJsxElementAt } from "@/lib/dev/jsx-remove"

// Style inspector's Delete action: removes the JSX element behind a selected node from the source
// that produced it. Dev-only, and gated exactly like app/api/dev-style — both this guard and the
// overlay's own dev-only mount are required so this never ships.
function assertDev() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("dev-only route")
  }
}

interface DeleteRequest {
  file: string
  line: number
  column: number
}

export async function POST(request: NextRequest) {
  try {
    assertDev()
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 })
  }

  try {
    const body = (await request.json()) as DeleteRequest

    const projectRoot = process.cwd()
    const resolved = path.isAbsolute(body.file) ? body.file : path.resolve(projectRoot, body.file)
    if (!resolved.startsWith(projectRoot + path.sep)) {
      return NextResponse.json({ error: `path outside project: ${resolved}` }, { status: 400 })
    }

    const source = await fs.readFile(resolved, "utf8")
    const result = removeJsxElementAt(source, body.line, body.column)

    // Every refusal here is a "this element cannot be removed safely", not a server fault — 409 so
    // the panel can show the reason rather than an unexpected-error message.
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 409 })
    }

    await fs.writeFile(resolved, result.source, "utf8")
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: `unexpected error: ${(e as Error).message}` }, { status: 500 })
  }
}
