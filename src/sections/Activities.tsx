import { SectionIntro } from '../components/SectionIntro'
import { activities } from '../data/activities'

export function Activities() {
  return (
    <section className="section activities-section" id="activities" aria-labelledby="activities-title">
      <SectionIntro id="activities-title" index="04" eyebrow="ACTIVITIES / EXPERIENCE" title="작게 시작해도 직접 해본 경험" description="교과, 동아리, 대회와 개인 활동을 통해 배운 내용을 실제 문제와 결과물에 연결하고 있습니다." />
      <div className="activity-list">
        {activities.map((activity, index) => (
          <article key={`${activity.type}-${activity.title}`} data-reveal style={{ '--delay': `${index * 55}ms` } as React.CSSProperties}>
            <span>{String(index + 1).padStart(2, '0')}</span><p>{activity.type}</p><h3>{activity.title}</h3><p>{activity.description}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
