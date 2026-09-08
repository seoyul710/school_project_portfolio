import { SectionIntro } from '../components/SectionIntro'
import { skillLevels, skills } from '../data/skills'

const groups = ['Languages', 'Development', 'Security & Tools'] as const

export function Skills() {
  return (
    <section className="section skills-section" id="skills" aria-labelledby="skills-title">
      <SectionIntro id="skills-title" index="03" eyebrow="SKILLS" title="현재 할 수 있는 것, 그리고 배우는 것" description="숫자 대신 실제로 어느 정도 활용하는지 네 단계의 같은 기준으로 표시했습니다." />
      <div className="level-legend" data-reveal>
        {skillLevels.map((item, index) => <div key={item.level}><span>{index + 1}</span><p><strong>{item.level}</strong>{item.description}</p></div>)}
      </div>
      <div className="skills-groups">
        {groups.map((group) => (
          <div className="skill-group" key={group}>
            <h3>{group}</h3>
            <div>
              {skills.filter((skill) => skill.group === group).map((skill, index) => {
                const level = skillLevels.findIndex((item) => item.level === skill.level) + 1
                return (
                  <article className="skill-row" key={skill.name} data-reveal style={{ '--delay': `${index * 65}ms` } as React.CSSProperties}>
                    <div><h4>{skill.name}</h4><p>{skill.note}</p></div>
                    <div className="skill-level"><span>{skill.level}</span><div className="level-steps" aria-hidden="true">{[1, 2, 3, 4].map((step) => <i key={step} className={step <= level ? 'is-filled' : ''} />)}</div></div>
                  </article>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
