import { useEffect } from 'react'

const dirtyEditors = new Set<symbol>()

function handleBeforeUnload(event: BeforeUnloadEvent): void {
  event.preventDefault()
  event.returnValue = true
}

export function useUnsavedChanges(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return

    const editor = Symbol()
    if (dirtyEditors.size === 0) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }
    dirtyEditors.add(editor)

    return () => {
      dirtyEditors.delete(editor)
      if (dirtyEditors.size === 0) {
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [isDirty])
}
