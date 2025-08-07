import * as React from "react"

import { type ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToastsMap = Map<
  string,
  {
    toast: ToastProps
    timeout: ReturnType<typeof setTimeout>
  }
>

type Action =
  | {
      type: "ADD_TOAST"
      toast: ToastProps
    }
  | {
      type: "UPDATE_TOAST"
      toast: ToastProps
    }
  | {
      type: "DISMISS_TOAST"
      toastId?: string
    }
  | {
      type: "REMOVE_TOAST"
      toastId?: string
    }

interface State {
  toasts: ToastProps[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This means all toasts will be dismissed
      // Make sure this doesn't happen in your app.
      if (toastId) {
        toastTimeouts.forEach((timeout, id) => {
          if (id === toastId) {
            clearTimeout(timeout)
            toastTimeouts.delete(id)
          }
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId ? { ...t, open: false } : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

type Toast = Pick<ToastProps, "id" | "duration" | "promise"> &
  (
    | {
        variant?: "default" | "destructive"
        title?: string
        description?: string
        action?: React.ReactNode
      }
    | {
        promise: Promise<any>
        loading: string
        success: string
        error: string
      }
  )

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  const toast = React.useCallback((props: Toast) => {
    const id = props.id || `toast-${Date.now()}`

    if ("promise" in props) {
      let loadingToastId: string | undefined

      const updateToast = (newProps: Partial<ToastProps>) => {
        if (loadingToastId) {
          dispatch({
            type: "UPDATE_TOAST",
            toast: { id: loadingToastId, ...newProps },
          })
        }
      }

      loadingToastId = addToast({
        id,
        title: props.loading,
        duration: 1000000, // Indefinite duration for loading toast
      })

      props.promise
        .then(() => {
          updateToast({
            title: props.success,
            variant: "default",
            duration: props.duration || 5000,
            open: true,
          })
        })
        .catch(() => {
          updateToast({
            title: props.error,
            variant: "destructive",
            duration: props.duration || 5000,
            open: true,
          })
        })
        .finally(() => {
          // Ensure the toast is eventually removed after its final duration
          if (loadingToastId) {
            addToRemoveQueue(loadingToastId)
          }
        })

      return loadingToastId
    } else {
      return addToast(props)
    }
  }, [])

  const addToast = React.useCallback((props: ToastProps) => {
    const id = props.id || `toast-${Date.now()}`

    dispatch({
      type: "ADD_TOAST",
      toast: {
        ...props,
        id,
        open: true,
        onOpenChange: (open) => {
          if (!open) {
            dispatch({ type: "DISMISS_TOAST", toastId: id })
          }
        },
      },
    })

    if (props.duration !== Infinity) {
      addToRemoveQueue(id)
    }

    return id
  }, [])

  return {
    ...state,
    toast,
    dismiss: React.useCallback((toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }), []),
  }
}

export { useToast }
