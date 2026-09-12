// Appends Claude's reply to a design-note thread so it shows up in the inspector panel. Goes
// through the app/api/dev-notes "reply" action (same as a browser send) rather than writing
// .dev-design-notes.json directly — that route serializes every write through one queue, so this
// can't race a note landing in the browser at the same instant.
// Usage: node devtools/reply-design-note.mjs <threadId> "reply text"
const [threadId, text] = process.argv.slice(2)

if (!threadId || !text) {
  console.error('Usage: node devtools/reply-design-note.mjs <threadId> "reply text"')
  process.exit(1)
}

const res = await fetch("http://localhost:3000/api/dev-notes", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action: "reply", threadId, text }),
})
const data = await res.json()

if (!res.ok || data.error) {
  console.error(`Reply failed: ${data.error || res.statusText}`)
  process.exit(1)
}

console.log(`Replied on ${threadId}`)
