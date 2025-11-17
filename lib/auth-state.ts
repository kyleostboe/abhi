export type AuthSnapshot = {
  status: "loading" | "authenticated" | "unauthenticated"
  userId: string | null
}

let currentState: AuthSnapshot = {
  status: "unauthenticated",
  userId: null,
}

export function setAuthState(next: AuthSnapshot) {
  currentState = next
}

export function getAuthState(): AuthSnapshot {
  return currentState
}
