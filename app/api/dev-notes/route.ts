import { NextResponse, type NextRequest } from "next/server"
import fs from "node:fs/promises"
import path from "node:path"

// Message bus between the design inspector in the browser and Claude in the terminal. Notes you
// leave on a selection land in .dev-design-notes.json (gitignored); Claude reads that file, does
// the work, and appends a reply. Dev-only, like the rest of components/dev/.
//
// Every write to the store — a note send, a linked send, and Claude's reply — goes through the
// same read-modify-write queue below, including from devtools/reply-design-note.mjs, which calls
// this route over HTTP rather than touching the file itself. That's what makes sending several
// notes back to back (or a reply landing mid-send) safe: each write starts from the state the
// previous one actually produced, instead of two concurrent reads racing to overwrite each other.

const STORE_FILE = ".dev-design-notes.json"

export interface NoteMessage {
  role: "user" | "claude"
  text: string
  at: string
  /** Requested model for a user message ("auto" = whichever Claude Code session is watching
   * handles it directly; anything else is a request to hand it to a subagent on that model). */
  model?: string
  /** Requested reasoning effort, paired with `model`. Not mechanically enforceable on a spawned
   * subagent today — there's no effort parameter to pass it through as — so this is read as a
   * strong hint about how much depth/verification you want, not a hard dial. */
  effort?: string
}

export interface NoteElement {
  file: string
  line: number
  column: number
  tag: string
  page: string
  changes?: string[]
}

export interface NoteThread {
  id: string
  createdAt: string
  updatedAt: string
  status: "awaiting-claude" | "answered"
  elements: NoteElement[]
  messages: NoteMessage[]
}

interface Store {
  threads: NoteThread[]
}

function storePath() {
  return path.join(process.cwd(), STORE_FILE)
}

async function readStore(): Promise<Store> {
  try {
    return JSON.parse(await fs.readFile(storePath(), "utf8")) as Store
  } catch {
    return { threads: [] }
  }
}

async function writeStore(store: Store) {
  await fs.writeFile(storePath(), JSON.stringify(store, null, 2), "utf8")
}

// Serializes every read-modify-write so concurrent requests can't race each other's fs.readFile.
let queue: Promise<unknown> = Promise.resolve()
function enqueue<T>(job: (store: Store) => Promise<T> | T): Promise<T> {
  const result = queue.then(async () => {
    const store = await readStore()
    const value = await job(store)
    await writeStore(store)
    return value
  })
  queue = result.catch(() => {}) // one failed job must not wedge the queue for the next one
  return result
}

function devOnly() {
  return process.env.NODE_ENV === "development"
}

export async function GET() {
  if (!devOnly()) return NextResponse.json({ error: "not found" }, { status: 404 })
  const store = await readStore()
  return NextResponse.json(store)
}

export async function POST(request: NextRequest) {
  if (!devOnly()) return NextResponse.json({ error: "not found" }, { status: 404 })

  try {
    const body = await request.json()

    if (body.action === "send") {
      const { threadId, elements, text, model, effort } = body as {
        threadId?: string
        elements: NoteElement[]
        text: string
        model?: string
        effort?: string
      }
      if (!text?.trim()) return NextResponse.json({ error: "empty note" }, { status: 400 })

      const resultThreadId = await enqueue((store) => {
        const now = new Date().toISOString()
        let thread = threadId ? store.threads.find((t) => t.id === threadId) : undefined
        if (!thread) {
          thread = {
            id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            createdAt: now,
            updatedAt: now,
            status: "awaiting-claude",
            elements: elements ?? [],
            messages: [],
          }
          store.threads.push(thread)
        }
        thread.messages.push({
          role: "user",
          text: text.trim(),
          at: now,
          model: model && model !== "auto" ? model : undefined,
          effort: effort && effort !== "auto" ? effort : undefined,
        })
        thread.status = "awaiting-claude"
        thread.updatedAt = now
        return thread.id
      })

      return NextResponse.json({ ok: true, threadId: resultThreadId })
    }

    if (body.action === "reply") {
      const { threadId, text } = body as { threadId: string; text: string }
      if (!threadId || !text?.trim()) {
        return NextResponse.json({ error: "threadId and text are required" }, { status: 400 })
      }

      const found = await enqueue((store) => {
        const thread = store.threads.find((t) => t.id === threadId)
        if (!thread) return false
        const now = new Date().toISOString()
        thread.messages.push({ role: "claude", text, at: now })
        thread.status = "answered"
        thread.updatedAt = now
        return true
      })

      if (!found) return NextResponse.json({ error: `no thread ${threadId}` }, { status: 404 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: `unknown action: ${body.action}` }, { status: 400 })
  } catch (e) {
    return NextResponse.json({ error: `unexpected error: ${(e as Error).message}` }, { status: 500 })
  }
}
