export type SkillLevel = '학습 중' | '기초' | '활용 가능' | '익숙함'

export interface Skill {
  name: string
  level: SkillLevel
  note: string
  group: 'Languages' | 'Development' | 'Security & Tools'
}

export interface Project {
  id: string
  slug: string
  title: string
  summary: string
  description: string
  category: string
  date: string
  tags: string[]
  pdf: string
  thumbnail: string
  links?: { github?: string; external?: string }
}
