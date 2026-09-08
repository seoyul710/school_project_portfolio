import { SectionIntro } from '../components/SectionIntro'
import { goals } from '../data/goals'

export function Goals() {
  return (
    <section className="section goals-section" id="goals" aria-labelledby="goals-title">
      <SectionIntro id="goals-title" index="06" eyebrow="NEXT STEPS" title="거창한 목표보다, 이어지는 다음 걸음" />
      <div className="goal-list">
        {goals.map((goal) => <article key={goal.number} data-reveal><span>{goal.number}</span><h3>{goal.title}</h3><p>{goal.description}</p></article>)}
      </div>
      <p className="goals-statement" data-reveal>경험을 더하고, 기록을 고치고, 방향을 조금씩 선명하게.<br />이 포트폴리오도 함께 성장합니다.</p>
    </section>
  )
}
