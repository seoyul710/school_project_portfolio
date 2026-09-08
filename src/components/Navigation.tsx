import { useEffect, useMemo, useRef, useState } from 'react'
import { useActiveSection } from '../hooks/useActiveSection'

const navigation = [
  ['home', 'Home'], ['about', 'About'], ['career', 'Career'], ['skills', 'Skills'],
  ['activities', 'Activities'], ['projects', 'Projects'], ['goals', 'Goals'],
]

export function Navigation() {
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const ids = useMemo(() => navigation.map(([id]) => id), [])
  const active = useActiveSection(ids)

  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [])

  useEffect(() => {
    if (!open) return
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        menuButton.current?.focus()
      }
    }
    document.addEventListener('keydown', escape)
    return () => document.removeEventListener('keydown', escape)
  }, [open])

  const navigate = (id: string) => {
    setOpen(false)
    // Keep keyboard focus out of the now-hidden mobile menu.
    const section = document.getElementById(id)
    section?.setAttribute('tabindex', '-1')
    section?.focus({ preventScroll: true })
  }

  return (
    <header className="site-header" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }}>
      <div className="header-inner">
      <a href="#home" className="brand" aria-label="Portfolio · 처음으로" onClick={() => navigate('home')}>Portfolio</a>
      <button ref={menuButton} className="menu-button" type="button" aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}>
        <span>{open ? '닫기' : '메뉴'}</span><span aria-hidden="true">{open ? '×' : '＋'}</span>
      </button>
      <nav id="site-navigation" className={open ? 'navigation is-open' : 'navigation'} aria-label="주요 메뉴">
        {navigation.map(([id, label], index) => (
          <a key={id} href={`#${id}`} aria-current={active === id ? 'location' : undefined} onClick={() => navigate(id)}>
            <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{label}
          </a>
        ))}
      </nav>
      </div>
    </header>
  )
}
