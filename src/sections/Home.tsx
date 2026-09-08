import { profile } from '../data/profile'

export function Home() {
  return (
    <section className="hero" id="home" aria-labelledby="hero-title">
      <div className="hero-orbit orbit-one" aria-hidden="true" />
      <div className="hero-orbit orbit-two" aria-hidden="true" />
      <div className="hero-topline"><p className="eyebrow">CAREER PORTFOLIO</p><p>SECURITY · DEVELOPMENT · GROWTH</p></div>
      {profile.name && <p className="hero-name">{profile.name}</p>}
      <h1 id="hero-title">{profile.heroLine.split('\n').map((line) => <span key={line}>{line}</span>)}</h1>
      <div className="hero-bottom">
        <p className="hero-role">{profile.role}</p>
        <p className="hero-copy">{profile.heroDescription}</p>
        <a className="scroll-cue" href="#about"><span>SCROLL</span><span aria-hidden="true">↓</span></a>
      </div>
    </section>
  )
}
