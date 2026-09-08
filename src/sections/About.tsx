import { SectionIntro } from '../components/SectionIntro'
import { profile } from '../data/profile'

export function About() {
  return (
    <section className="section about-section" id="about" aria-labelledby="about-title">
      <SectionIntro id="about-title" index="01" eyebrow="ABOUT ME" title="성장을 만드는 태도" />
      <div className="about-statement" data-reveal>
        <p>{profile.introduction}</p>
      </div>
      <div className="strength-layout">
        <p className="vertical-label">MY STRENGTHS</p>
        <div>
          {profile.strengths.map((strength, index) => (
            <article className="strength-row" key={strength.title} data-reveal style={{ '--delay': `${index * 90}ms` } as React.CSSProperties}>
              <span>{String(index + 1).padStart(2, '0')}</span><h3>{strength.title}</h3><p>{strength.description}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="about-notes">
        <article data-reveal><p className="eyebrow">INTEREST</p><h3>직접 이해하고 구현하기</h3><p>{profile.interests}</p></article>
        <article data-reveal><p className="eyebrow">VALUE</p><h3>과정을 제대로 쌓기</h3><p>{profile.values}</p></article>
        <article className="growth-note" data-reveal><p className="eyebrow">GROWTH POINT</p><h3>꾸준함을 훈련하는 중</h3><p>{profile.growthPoint}</p></article>
      </div>
    </section>
  )
}
