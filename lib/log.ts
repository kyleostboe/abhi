/**
 * Logging shim.
 *
 * `debug` and `warn` are development-only. The app is deliberately chatty while audio is being
 * decoded, analysed and re-encoded — that trace is useful at a breakpoint and noise everywhere
 * else, and it previously shipped to every user's console.
 *
 * `error` always emits: on the server it lands in the platform logs, and on the client it is
 * usually the only artifact a user can hand back in a bug report.
 *
 * Prefix messages with a bracketed namespace (`[storage]`, `[journal]`) so a filtered console
 * still reads well.
 */

const isDev = process.env.NODE_ENV !== "production"

export const log = {
  debug: (...args: unknown[]): void => {
    if (isDev) console.log(...args)
  },
  warn: (...args: unknown[]): void => {
    if (isDev) console.warn(...args)
  },
  error: (...args: unknown[]): void => {
    console.error(...args)
  },
}
