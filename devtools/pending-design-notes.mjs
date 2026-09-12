// Surfaces unanswered design notes to Claude automatically, so a note left in the browser doesn't
// sit in .dev-design-notes.json until someone thinks to ask about it.
//
// Two modes, wired to two hooks in .claude/settings.json:
//
//   context  (UserPromptSubmit) — prints the pending threads as additionalContext, so every time
//            you say anything, whatever you left in the inspector arrives with it.
//   stop     (Stop)             — refuses to let the turn end while a thread is unanswered.
//
// The escape hatch matters as much as the block: replying on a thread marks it answered, so a note
// that can't be acted on (needs a decision, is ambiguous) is cleared by *replying to say so*, not
// by ignoring it. Without that, "unanswered" would be a trap with no way out.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const STORE = path.join(ROOT, ".dev-design-notes.json")

/**
 * These hooks are registered in *user* settings rather than in this repo's .claude/settings.json,
 * because the settings watcher only watches directories that already held a settings file when a
 * session started — and ~/.claude did, while this repo's .claude did not. Registering them there
 * is what lets them load without restarting Claude Code.
 *
 * The cost of being global is that this script now runs in every project, so it has to know when
 * it is not wanted: the notes belong to this repo, and surfacing them while you are working
 * somewhere else would be noise at best and confusing at worst.
 */
function inThisProject() {
  const cwd = path.resolve(process.cwd())
  return cwd === ROOT || cwd.startsWith(ROOT + path.sep)
}

function pendingThreads() {
  try {
    const store = JSON.parse(fs.readFileSync(STORE, "utf8"))
    return (store.threads ?? []).filter((t) => t.status === "awaiting-claude")
  } catch {
    // No store yet, or mid-write. Either way there is nothing to report — never block on a file
    // that simply isn't there.
    return []
  }
}

function describe(threads) {
  const lines = [`${threads.length} unanswered design note${threads.length === 1 ? "" : "s"} from the inspector:`]
  for (const t of threads) {
    lines.push(``, `Thread ${t.id} (left ${t.updatedAt}):`)
    for (const e of t.elements ?? []) {
      lines.push(`  on <${e.tag}> at ${e.file}:${e.line}, page ${e.page}`)
    }
    for (const m of t.messages ?? []) {
      if (m.role !== "user") continue
      const model = m.model && m.model !== "auto" ? ` [requested model: ${m.model}${m.effort ? `, effort ${m.effort}` : ""}]` : ""
      lines.push(`  "${m.text}"${model}`)
    }
  }
  lines.push(
    ``,
    `Do the work, then reply with: node devtools/reply-design-note.mjs <threadId> "what you did"`,
    `Replying is what marks a thread answered — so if a note needs a decision from the user rather`,
    `than work, reply saying so instead of leaving it open.`,
  )
  return lines.join("\n")
}

const mode = process.argv[2]
const threads = inThisProject() ? pendingThreads() : []

if (threads.length === 0) {
  // Silence is the common case. Print nothing at all so the hook is invisible when idle.
  process.exit(0)
}

if (mode === "context") {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: describe(threads) },
    }),
  )
  process.exit(0)
}

if (mode === "stop") {
  // stop_hook_active means this Stop hook already blocked once and Claude is still going. Blocking
  // again from the same state is how a hook turns into an infinite loop, so it declines to.
  let input = ""
  try {
    input = fs.readFileSync(0, "utf8")
  } catch {
    /* no stdin — treat as a first pass */
  }
  let alreadyBlocked = false
  try {
    alreadyBlocked = JSON.parse(input || "{}").stop_hook_active === true
  } catch {
    /* unparseable stdin — treat as a first pass */
  }
  if (alreadyBlocked) process.exit(0)

  process.stdout.write(JSON.stringify({ decision: "block", reason: describe(threads) }))
  process.exit(0)
}

console.error(`Usage: node devtools/pending-design-notes.mjs <context|stop>`)
process.exit(1)
