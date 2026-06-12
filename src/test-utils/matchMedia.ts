export function installMatchMediaStub(matches: (query: string) => boolean) {
  const original = window.matchMedia

  window.matchMedia = (query: string) =>
    ({
      matches: matches(query),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList

  return () => {
    window.matchMedia = original
  }
}

export function installCoarsePointerMatchMediaStub() {
  return installMatchMediaStub((query) => {
    if (query === '(pointer: coarse)') return true
    if (query === '(pointer: fine)') return false
    return false
  })
}

export function installNarrowViewportMatchMediaStub() {
  return installMatchMediaStub((query) => {
    if (query === '(min-width: 640px)') return false
    return false
  })
}
