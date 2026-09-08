import { SectionIntro } from '../components/SectionIntro'
import { career } from '../data/career'

export function Career() {
  return (
    <section className="section career-section" id="career" aria-labelledby="career-title">
      <SectionIntro id="career-title" index="02" eyebrow="MY DIRECTION" title="관심은 경험을 따라 깊어집니다" description="프로그래밍에서 시작한 호기심은 정보보안으로 이어졌고, 지금은 직접 부딪히며 앞으로 오래 탐구할 방향을 찾고 있습니다." />
      <div className="career-path">
        <aside className="career-summary" data-reveal>
          <div><p>관심 분야</p><ul>{career.interests.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><p>관심 직업</p><ul>{career.jobs.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><p>관심 학과</p><ul>{career.majors.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </aside>
        <ol className="career-timeline">
          {career.journey.map((step, index) => (
            <li key={step.marker} data-reveal style={{ '--delay': `${index * 70}ms` } as React.CSSProperties}>
              <div className="timeline-marker"><span>{String(index + 1).padStart(2, '0')}</span><span>{step.marker}</span></div>
              <h3>{step.title}</h3><p>{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
