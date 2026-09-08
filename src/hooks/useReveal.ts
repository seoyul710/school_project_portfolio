import { useEffect } from 'react'

export function useReveal() {
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pending = new Set<Element>()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-visible', 'true')
            entry.target.removeAttribute('data-pending')
            pending.delete(entry.target)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0, rootMargin: '0px 0px -24px 0px' },
    )
    const observe = (element: Element) => {
      if (motion.matches || element.hasAttribute('data-visible') || pending.has(element)) return
      // Never hide content already on screen, including direct hash destinations.
      if (element.getBoundingClientRect().top < window.innerHeight) {
        element.setAttribute('data-visible', 'true')
        return
      }
      element.setAttribute('data-pending', '')
      pending.add(element)
      observer.observe(element)
    }
    document.querySelectorAll('[data-reveal]').forEach(observe)
    // Filtering inserts new cards; each new element must be observed as well.
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return
          if (node.matches('[data-reveal]')) observe(node)
          node.querySelectorAll('[data-reveal]').forEach(observe)
        })
      })
      pending.forEach((element) => {
        if (!element.isConnected) {
          observer.unobserve(element)
          pending.delete(element)
        }
      })
    })
    mutations.observe(document.getElementById('main-content')!, { childList: true, subtree: true })
    const revealAll = () => {
      if (!motion.matches) return
      pending.forEach((element) => element.removeAttribute('data-pending'))
      pending.clear()
      observer.disconnect()
    }
    motion.addEventListener('change', revealAll)
    return () => {
      mutations.disconnect()
      observer.disconnect()
      motion.removeEventListener('change', revealAll)
      pending.forEach((element) => element.removeAttribute('data-pending'))
    }
  }, [])
}
