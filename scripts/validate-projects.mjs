import { readProjects, validateProject } from './project-utils.mjs'

try {
  const projects = await readProjects()
  const ids = new Set()
  const slugs = new Set()
  for (let index = 0; index < projects.length; index += 1) {
    const project = projects[index]
    await validateProject(project, index)
    if (ids.has(project.id)) throw new Error(`중복 id가 있습니다: ${project.id}`)
    if (slugs.has(project.slug)) throw new Error(`중복 slug가 있습니다: ${project.slug}`)
    ids.add(project.id)
    slugs.add(project.slug)
  }
  console.log(`✓ 프로젝트 데이터 검증 완료 (${projects.length}개)`)
} catch (error) {
  console.error(`✗ 프로젝트 데이터 오류: ${error.message}`)
  process.exitCode = 1
}
