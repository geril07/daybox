import { useCallback, useRef } from 'react'

export function useEvent<Args extends unknown[], Return>(
  callback: (...args: Args) => Return,
): (...args: Args) => Return {
  const ref = useRef(callback)

  // eslint-disable-next-line react-hooks/refs
  ref.current = callback

  return useCallback((...args) => {
    return ref.current(...args)
  }, [])
}
