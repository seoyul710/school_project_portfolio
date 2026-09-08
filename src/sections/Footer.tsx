import { profile } from '../data/profile'

export function Footer() {
  return (
    <footer className="footer" id="contact">
      <p className="eyebrow">KEEP BUILDING</p>
      <h2>기록은 계속 이어집니다.</h2>
      {profile.links.length > 0 && <nav aria-label="외부 링크">{profile.links.map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.label} ↗</a>)}</nav>}
      <div className="footer-bottom"><p>Career Portfolio</p><p>© {new Date().getFullYear()}</p><a href="#home">맨 위로 ↑</a></div>
    </footer>
  )
}
