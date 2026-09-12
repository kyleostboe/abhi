// Prints one line whenever the design inspector sends a new note, so Claude Code's Monitor tool
// can surface it as a notification. Run from the project root: node devtools/watch-design-notes.mjs
import fs from "node:fs"
import path from "node:path"

const FILE = path.join(process.cwd(), ".dev-design-notes.json")
const seen = new Map()

function read() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"))
  } catch {
    return null
  }
}

function tick() {
  const store = read()
  if (!store?.threads) return
  for (const thread of store.threads) {
    const userCount = thread.messages.filter((m) => m.role === "user").length
    if (seen.get(thread.id) === userCount) continue
    seen.set(thread.id, userCount)
    if (thread.status !== "awaiting-claude") continue
    const last = [...thread.messages].reverse().find((m) => m.role === "user")
    if (!last) continue
    const where = thread.elements.map((e) => `${e.file}:${e.line}`).join(", ") || "(no element)"
    const text = last.text.replace(/\s+/g, " ").slice(0, 400)
    const request = [last.model && `model: ${last.model}`, last.effort && `effort: ${last.effort}`]
      .filter(Boolean)
      .join(", ")
    const requestTag = request ? ` | requested ${request}` : ""
    console.log(`[design-note] ${thread.id}${requestTag} | ${where} | ${text}`)
  }
}

tick()
setInterval(tick, 2000)
