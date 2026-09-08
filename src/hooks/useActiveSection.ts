import { useEffect, useState } from 'react'

export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0])

  useEffect(() => {
    let observer: IntersectionObserver
    let frame = 0
    const connect = () => {
      observer?.disconnect()
      // IntersectionObserver percentages resolve against width, not height.
      // Use a pixel-based reading line so wide, short screens work as well.
      const line = Math.round(window.innerHeight * .25)
      observer = new IntersectionObserver((entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        if (visible) setActive(visible.target.id)
      }, { rootMargin: `-${line}px 0px -${window.innerHeight - line - 1}px 0px`, threshold: 0 })
      ids.forEach((id) => {
        const element = document.getElementById(id)
        if (element) observer.observe(element)
      })
    }
    const resize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(connect)
    }
    connect()
    window.addEventListener('resize', resize)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [ids])

  return active
}
