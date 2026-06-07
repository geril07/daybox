import { useCallback, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

export const EASE_OUT: [number, number, number, number] = [0.2, 0, 0, 1]
export const EASE_IN: [number, number, number, number] = [0.4, 0, 1, 1]

export const TRANSITION_ENTER = { duration: 0.16, ease: EASE_OUT }
export const TRANSITION_EXIT = { duration: 0.14, ease: EASE_IN }
export const TRANSITION_MOVE = { duration: 0.22, ease: EASE_OUT }
export const TRANSITION_TOGGLE = { duration: 0.14, ease: EASE_OUT }

export function useLayoutSnap() {
  const [snapLayout, setSnapLayout] = useState(false)

  useEffect(() => {
    if (!snapLayout) return
    const id = requestAnimationFrame(() => setSnapLayout(false))
    return () => cancelAnimationFrame(id)
  }, [snapLayout])

  // flushSync is load-bearing: it forces the React state update and the caller's
  // store action to commit in the same render so motion measures the new layout
  // with the snap transition. Without it, React 18+ auto-batching does not apply
  // across the React/zustand boundary, and motion would commit a render with the
  // snap transition but the old layout (or vice versa), causing a visible slide.
  const snap = useCallback((applyChange: () => void) => {
    flushSync(() => {
      setSnapLayout(true)
      applyChange()
    })
  }, [])

  return { snapLayout, snap }
}
