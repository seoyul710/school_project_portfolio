import type { Skill, SkillLevel } from '../types/content'

export const skillLevels: { level: SkillLevel; description: string }[] = [
  { level: '학습 중', description: '개념과 사용법을 익히는 단계' },
  { level: '기초', description: '기본 문법과 도구를 활용할 수 있는 단계' },
  { level: '활용 가능', description: '작은 문제와 프로젝트에 스스로 적용하는 단계' },
  { level: '익숙함', description: '여러 경험에서 반복해 사용한 단계' },
]

export const skills: Skill[] = [
  { name: 'Python', level: '익숙함', note: '개인 프로젝트와 문제 해결에 반복해서 사용', group: 'Languages' },
  { name: 'C', level: '활용 가능', note: '기본적인 프로그램을 작성하고 동작을 분석', group: 'Languages' },
  { name: 'C++', level: '기초', note: '기본 문법과 알고리즘 풀이를 학습', group: 'Languages' },
  { name: 'JavaScript', level: '익숙함', note: '웹 개발에서 직접 사용', group: 'Languages' },
  { name: '웹 개발', level: '활용 가능', note: '프론트엔드의 기본 구조를 이해하고 구현', group: 'Development' },
  { name: 'Linux', level: '활용 가능', note: 'Debian·Ubuntu 환경과 기본 명령 사용', group: 'Development' },
  { name: 'Git / GitHub', level: '익숙함', note: '버전 관리와 프로젝트 기록에 사용', group: 'Development' },
  { name: '해킹', level: '활용 가능', note: '기초부터 중급 내용을 계속 학습 중', group: 'Security & Tools' },
  { name: '네트워크', level: '기초', note: '통신 구조와 핵심 개념을 학습', group: 'Security & Tools' },
  { name: 'GDB', level: '기초', note: '프로그램 실행 흐름과 상태를 확인', group: 'Security & Tools' },
]
