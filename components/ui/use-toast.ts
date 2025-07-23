"use client"

import * as React from "react"

import type { ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToastsMap = Map<
  string,
  {
    toast: ToastProps
    timeout: ReturnType<typeof setTimeout> | null
  }
>

type ActionType =
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

function reducer(state: State, action: ActionType): State {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects !
      if (toastId) {
        clearTimeout(toastTimeouts.get(toastId)!)
      }

      return {
        ...state,
        toasts: state.toasts.map((t) => (t.id === toastId ? { ...t, open: false } : t)),
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

const listeners: ((state: State) => void)[] = []

let memoryState: State = { toasts: [] }

function dispatch(action: ActionType) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

type Toast = Pick<ToastProps, "id" | "duration" | "promise"> &
  (
    | {
        type: "success" | "error" | "default" | "action" | "loading"
        title?: string
        description?: string
        icon?: React.ReactNode
        cancel?: {
          label: string
          onClick?: () => void
        }
        action?: {
          label: string
          onClick?: () => void
        }
        onDismiss?: (toast: ToastProps) => void
        onAutoClose?: (toast: ToastProps) => void
        onCloseButtonStyle?: React.CSSProperties
        unstyled?: boolean
        classNames?: ToastProps["classNames"]
        style?: React.CSSProperties
        descriptionClassName?: string
      }
    | {
        type: "promise"
        title?: string
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

  const addToast = React.useCallback((toast: ToastProps) => {
    dispatch({ type: "ADD_TOAST", toast })
  }, [])

  const updateToast = React.useCallback((toast: ToastProps) => {
    dispatch({ type: "UPDATE_TOAST", toast })
  }, [])

  const dismissToast = React.useCallback((toastId?: string) => {
    dispatch({ type: "DISMISS_TOAST", toastId })
  }, [])

  const removeToast = React.useCallback((toastId?: string) => {
    dispatch({ type: "REMOVE_TOAST", toastId })
  }, [])

  return {
    ...state,
    addToast,
    updateToast,
    dismissToast,
    removeToast,
  }
}

export { useToast }
