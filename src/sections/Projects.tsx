import { ProjectList } from '../components/ProjectList'
import { SectionIntro } from '../components/SectionIntro'
import { ProjectRegistration } from '../components/ProjectRegistration'
import { useState } from 'react'
import projectsJson from '../data/projects.json'
import type { Project } from '../types/content'

export function Projects() {
  const [added, setAdded] = useState<Project[]>([])
  const projects = [...new Map([...(projectsJson as Project[]), ...added].map(project => [project.id, project])).values()].sort((a, b) => b.date.localeCompare(a.date))
  return (
    <section className="section projects-section" id="projects" aria-labelledby="projects-title">
      <SectionIntro id="projects-title" index="05" eyebrow="PROJECT ARCHIVE" title="배움이 기록으로 남는 곳" description="앞으로 진행하는 프로젝트와 보고서를 PDF 원본과 함께 계속 추가하는 공간입니다." />
      <ProjectRegistration onRegistered={project => setAdded(current => [...current, project])} />
      <ProjectList key={added.length} projects={projects} />
    </section>
  )
}
