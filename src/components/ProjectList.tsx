import { useMemo, useState } from 'react'
import type { Project } from '../types/content'
import { assetPath } from '../utils/assets'

function formatDate(value: string) {
  const parts = value.split('-')
  if (parts.length === 1) return `${parts[0]}년`
  if (parts.length === 2) return `${parts[0]}.${parts[1]}`
  return `${parts[0]}.${parts[1]}.${parts[2]}`
}

export function ProjectList({ projects }: { projects: Project[] }) {
  const [category, setCategory] = useState('전체')
  const categories = useMemo(() => ['전체', ...new Set(projects.map((project) => project.category))], [projects])
  const visible = category === '전체' ? projects : projects.filter((project) => project.category === category)

  if (!projects.length) {
    return (
      <div className="project-empty" data-reveal>
        <p className="project-empty-mark" aria-hidden="true">＋</p>
        <div>
          <h3>첫 기록을 준비하고 있습니다.</h3>
          <p>완성한 프로젝트는 PDF와 함께 이곳에 쌓입니다. 결과뿐 아니라 배우고 고민한 과정도 차분히 기록해 나갑니다.</p>
        </div>
        <p className="project-command"><code>npm run add-project</code>로 새 프로젝트를 등록할 수 있습니다.</p>
      </div>
    )
  }

  return (
    <div>
      {categories.length > 2 && (
        <div className="project-filters" role="group" aria-label="프로젝트 분야 필터">
          {categories.map((item) => <button key={item} type="button" aria-pressed={category === item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}
        </div>
      )}
      <div className="project-grid">
        {visible.map((project) => (
          <article className="project-card" key={project.id} data-reveal>
            <a href={assetPath(project.pdf)} target="_blank" rel="noreferrer" aria-label={`${project.title} PDF 열기`}>
              <div className="project-image-wrap">
                <img src={assetPath(project.thumbnail)} alt={`${project.title} PDF 첫 페이지`} loading="lazy" width="800" height="600" />
                <span>PDF 보기 ↗</span>
              </div>
            </a>
            <div className="project-meta"><span>{project.category}</span><time dateTime={project.date}>{formatDate(project.date)}</time></div>
            <h3>{project.title}</h3>
            <p>{project.summary}</p>
            <ul className="tag-list" aria-label="사용 기술">{project.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
              <div className="project-links">
                <a href={assetPath(project.pdf)} download={`${project.slug}.pdf`} aria-label={`${project.title} PDF 다운로드`}>PDF 다운로드 ↓</a>
                {project.links?.github && <a href={project.links.github} target="_blank" rel="noreferrer">GitHub ↗</a>}
                {project.links?.external && <a href={project.links.external} target="_blank" rel="noreferrer">External ↗</a>}
              </div>
          </article>
        ))}
      </div>
    </div>
  )
}
