import { useEffect, useRef, useState } from 'react'

import {
  Button,
  Toast,
  ToastAction,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  useToastManager,
} from '@/shared/ui'

import { reloadApp } from './reloadApp'
import { watchForAppUpdate } from './watchForAppUpdate'

const DISMISSED_BUILDS_KEY = 'daybox-dismissed-updates'

function readDismissedBuilds(): Set<string> {
  try {
    const saved: unknown = JSON.parse(
      sessionStorage.getItem(DISMISSED_BUILDS_KEY) ?? '[]',
    )
    if (Array.isArray(saved))
      return new Set(saved.filter((id): id is string => typeof id === 'string'))
  } catch {
    // Keep dismissal working in memory when session storage is unavailable.
  }
  return new Set()
}

export function AppUpdateNotice() {
  return (
    <div className="relative shrink-0">
      <ToastProvider>
        <UpdateToast />
      </ToastProvider>
    </div>
  )
}

function UpdateToast() {
  const [availableBuild, setAvailableBuild] = useState<string | null>(null)
  const dismissedBuilds = useRef(readDismissedBuilds())
  const { toasts, add, close } = useToastManager()

  useEffect(() => {
    if (!import.meta.env.PROD) return
    return watchForAppUpdate(__APP_BUILD_ID__, setAvailableBuild)
  }, [])

  useEffect(() => {
    if (!availableBuild || dismissedBuilds.current.has(availableBuild)) return
    let active = true
    const id = add({
      id: 'app-update',
      title: 'A new version of DayBox is available',
      description: 'Reload to update.',
      timeout: 0,
      priority: 'low',
      onClose: () => {
        if (!active) return
        dismissedBuilds.current.add(availableBuild)
        try {
          sessionStorage.setItem(
            DISMISSED_BUILDS_KEY,
            JSON.stringify([...dismissedBuilds.current]),
          )
        } catch {
          // The in-memory set still suppresses this build for the mounted app.
        }
      },
      actionProps: { children: 'Reload', onClick: reloadApp },
    })
    return () => {
      active = false
      close(id)
    }
  }, [availableBuild, add, close])

  return (
    <ToastViewport className="absolute">
      {toasts.map((item) => (
        <Toast key={item.id} toast={item}>
          <ToastContent className="flex-col items-stretch">
            <div className="flex flex-col gap-1">
              <ToastTitle />
              <ToastDescription />
            </div>
            <div className="flex justify-end gap-2">
              <ToastClose
                aria-label="Later"
                aria-hidden={false}
                render={<Button variant="ghost" size="sm" />}
              >
                Later
              </ToastClose>
              <ToastAction render={<Button size="sm" />} />
            </div>
          </ToastContent>
        </Toast>
      ))}
    </ToastViewport>
  )
}
