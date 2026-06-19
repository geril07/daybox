import { throttle } from 'es-toolkit/function'
import { useCallback, useEffect, useMemo } from 'react'

import { useEvent } from '@/shared/utils/useEvent'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useThrottledCallback<F extends (...args: any[]) => void>(
  callback: F,
  throttleMs: number,
): F {
  const stableCallback = useEvent(callback)

  const throttled = useMemo(
    () => throttle(stableCallback, throttleMs),
    [stableCallback, throttleMs],
  )

  useEffect(() => {
    return () => {
      throttled.cancel()
    }
  }, [throttled])

  return useCallback(
    (...args: Parameters<F>) => {
      throttled(...args)
    },
    [throttled],
  ) as F
}
