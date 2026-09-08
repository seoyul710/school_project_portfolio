import { useEffect } from 'react'

/** Align a shared hash after React and web fonts have established the layout. */
export function useInitialHash() {
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    let cancelled = false
    let frame = 0
    const cancel = () => { cancelled = true }
    const align = () => {
      void document.fonts.ready.then(() => {
        frame = requestAnimationFrame(() => {
          if (cancelled || window.location.hash.slice(1) !== hash) return
          document.getElementById(hash)?.scrollIntoView({ behavior: 'instant', block: 'start' })
        })
      })
    }
    // Never pull readers back after they have started navigating or scrolling.
    const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const
    events.forEach((event) => window.addEventListener(event, cancel, { once: true, passive: true }))
    if (document.readyState === 'complete') align()
    else window.addEventListener('load', align, { once: true })
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      window.removeEventListener('load', align)
      events.forEach((event) => window.removeEventListener(event, cancel))
    }
  }, [])
}
