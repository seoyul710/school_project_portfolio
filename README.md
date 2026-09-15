# 진로 포트폴리오

정보보안과 프로그래밍에 관심을 갖고 성장하는 과정을 기록하는 React 기반 Single Page Portfolio입니다. 학교 진로 과목의 평가 항목을 담으면서, 프로젝트와 활동을 계속 추가해 장기간 사용할 수 있도록 구성했습니다.

## 기술 스택

- React 19 + TypeScript
- Vite 8
- CSS 기반 반응형 레이아웃·스크롤 reveal·추상 gradient 배경
- PDF.js + `@napi-rs/canvas` 기반 PDF 첫 페이지 thumbnail 생성
- GitHub Actions + GitHub Pages

Node.js `22.13.0` 이상이 필요합니다. PDF 처리는 npm 패키지만 사용하므로 Poppler, ImageMagick 같은 별도 시스템 프로그램은 필요하지 않습니다.

## 설치와 실행

```bash
npm install
npm run dev
```

터미널에 표시된 로컬 주소를 브라우저에서 엽니다.

Production build와 미리보기:

```bash
npm run build
npm run preview
```

`npm run build`는 프로젝트 데이터와 asset 존재 여부를 먼저 검사하고, TypeScript 검사 후 `dist/`를 생성합니다.

검증 명령:

```bash
npm run test
npm run lint
```

## 자주 수정하는 파일

| 수정 내용 | 파일 |
| --- | --- |
| 이름, 소개, 강점, 흥미, 가치관, 외부 링크 | `src/data/profile.ts` |
| 관심 분야·직업·학과와 진로 흐름 | `src/data/career.ts` |
| 기술, 설명, 숙련 단계 | `src/data/skills.ts` |
| 교과·동아리·대회·개인 활동 | `src/data/activities.ts` |
| 앞으로의 목표 | `src/data/goals.ts` |
| 프로젝트 metadata | `src/data/projects.json` (웹 등록·CLI가 자동 관리) |

이름은 `profile.name`, GitHub 등의 링크는 `profile.links`에 추가합니다. 값이 비어 있으면 해당 UI는 표시되지 않습니다.

```ts
name: '이름',
links: [
  { label: 'GitHub', url: 'https://github.com/실제-계정' },
],
```

공개 사이트이므로 전화번호, 집 주소, 생년월일처럼 불필요한 개인정보는 넣지 않는 것을 권장합니다.

## 새 프로젝트 추가

프로젝트를 추가할 때 React, JSX, JSON을 직접 수정할 필요가 없습니다.

### 웹 화면에서 등록 (로컬 전용)

1. 프로젝트 폴더에서 `npm run dev`를 실행하고 표시된 `http://127.0.0.1:...` 주소를 엽니다.
2. **05 Projects → 프로젝트 추가**를 누릅니다.
3. 제목·요약·상세 설명, Category(개인 프로젝트 / 팀 프로젝트 / 학교 프로젝트), 날짜, 쉼표로 구분한 기술 Tags를 입력합니다.
4. 파일 선택으로 PDF를 첨부합니다. GitHub URL과 외부 URL은 선택 사항입니다.
5. **프로젝트 저장**을 누르고 완료 안내를 기다립니다. 목록에 즉시 반영되며 개발 서버를 재시작해도 유지됩니다.

실제 파일로 저장되며 localStorage는 사용하지 않습니다. 원본 PDF는 공개 목록에서 **PDF 보기** 또는 **PDF 다운로드**로 열람할 수 있습니다. 공개할 권한이 있는 문서만 등록하고 PDF 안의 개인정보도 확인해 주세요.

`npm run preview`와 GitHub Pages에서는 등록 API가 없으므로 로컬 실행 안내만 표시합니다. 주소에 localhost가 있는지만 판단하지 않고 개발 API의 응답도 확인합니다. 개발 서버는 기본적으로 `127.0.0.1`에만 연결되며, API는 루프백 연결·정확한 Host/Origin·요청 헤더·세션 토큰을 검사합니다. LAN 주소, 외부 사이트, 프록시를 통한 등록은 지원하지 않습니다. API는 `dev`에서만 불러오며 서버 모듈과 세션 비밀값은 `dist/`에 포함되지 않습니다.

### 터미널에서 등록

```bash
npm run add-project
```

명령을 실행하면 다음 정보를 차례로 입력합니다.

1. 프로젝트 제목
2. 한 줄 요약
3. 상세 설명
4. Category 번호 선택(개인 / 팀 / 학교 프로젝트) 또는 직접 입력
5. 날짜 (`YYYY`, `YYYY-MM`, `YYYY-MM-DD`)
6. 쉼표로 구분한 기술 Tags
7. 로컬 PDF 경로
8. 선택적인 GitHub URL
9. 선택적인 외부 URL

PDF 경로에는 공백과 한글이 포함되어도 됩니다. 경로가 길다면 터미널에 파일을 끌어다 놓아 입력할 수 있습니다.

등록 과정은 다음 작업을 자동으로 수행합니다.

- 파일 존재 여부, `.pdf` 확장자, PDF header, 최대 100MB 크기 검사
- PDF.js로 실제 첫 페이지를 읽고 렌더링할 수 있는지 검사(손상·암호화된 문서는 거부)
- 제목 기반의 안전한 slug 생성
- 기존 slug·asset 충돌 검사(기존 파일을 덮어쓰지 않음)
- PDF를 `public/projects/pdfs/`로 복사
- 첫 페이지를 가로 최대 1100px·세로 최대 1400px의 WebP thumbnail로 변환
- thumbnail을 `public/projects/thumbnails/`에 저장
- `src/data/projects.json`에 metadata 추가 및 날짜순 정렬

웹과 CLI는 동일한 검증·저장 코드를 사용합니다. 제목·날짜·태그·URL도 검사하고, 동시 등록은 잠금으로 제한합니다. 임시 파일에 준비한 다음 기존 파일을 덮어쓰지 않고 저장하며, 정상적인 오류 발생 시 새 파일을 정리하고 기존 데이터를 유지합니다. PDF 처리는 별도 Node.js 프로세스에서 40초 제한으로 실행합니다. 이미지 라이브러리가 충돌해도 등록 서버는 유지되며, 오류를 응답하고 임시 파일과 잠금을 정리합니다.

업로드 용량은 `scripts/project-store.mjs`의 `MAX_PDF_BYTES`에서 설정합니다(현재 100 × 1024 × 1024바이트). 웹 폼은 서버가 응답한 제한으로 표시·검증하며, 서버 코드가 바뀌면 Vite가 자동으로 재시작해 새 설정을 적용합니다. 검증에는 임시 개발 서버에서 100MB PDF를 실제 전송·저장하고 썸네일을 생성하는 테스트가 포함됩니다.

등록이 끝나면 `npm run build`로 확인하고 아래 파일을 **함께 commit/push**해야 GitHub Pages에 반영됩니다. 로컬에서 저장한 것만으로 공개 사이트가 변경되지는 않습니다.

- `src/data/projects.json`
- `public/projects/pdfs/` 안의 새 PDF
- `public/projects/thumbnails/` 안의 새 WebP

Category가 여러 개 쌓이면 필터가 자동으로 나타납니다. 같은 제목이나 파일명이 이미 있으면 덮어쓰지 않으므로 구분되는 제목을 사용하세요. 연결이 끊긴 경우 다시 등록하기 전에 새로고침해 저장 여부를 확인하세요.

강제 종료·정전은 일반적인 오류와 다릅니다. 등록이 진행 중이지 않은데 계속 잠금 오류가 나면 모든 등록 프로세스를 종료하고 `.project-registration.lock`의 PID를 확인한 뒤 해당 잠금만 제거하세요. `.project-registration-*` 임시 폴더와 `src/data/.projects-*.tmp`도 중단된 작업인지 확인 후 정리할 수 있습니다. 공개 PDF·썸네일은 metadata에서 참조되지 않는 파일인지 확인하기 전에는 삭제하지 마세요.

## GitHub Pages 배포

이 프로젝트는 Vite `base: './'`을 사용하므로 사용자 사이트와 repository subpath 사이트 모두에서 asset 경로가 동작합니다. Repository 이름을 코드에 하드코딩할 필요가 없습니다.

### 1. Git repository 연결

GitHub에서 빈 repository를 만든 뒤 아래 명령을 실행합니다. URL은 실제 repository 주소로 바꿉니다.

```bash
git init
git add .
git commit -m "Create career portfolio"
git branch -M main
git remote add origin https://github.com/ACCOUNT/REPOSITORY.git
git push -u origin main
```

### 2. Pages 설정

GitHub repository의 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.

### 3. 자동 배포

`.github/workflows/deploy.yml`은 `main` branch에 push될 때 다음 순서로 동작합니다.

1. Node.js 22 준비
2. `npm ci`
3. `npm run lint`와 `npm test` 검증
4. GitHub Pages URL 확인
5. `npm run build`
6. `dist/` artifact 업로드
7. GitHub Pages 배포

Pages URL을 build 환경에 전달하므로 `public/og.png`도 절대 URL의 Open Graph 이미지로 자동 연결됩니다. Actions의 **Deploy portfolio to GitHub Pages** workflow가 성공하면 repository의 Pages 화면에서 공개 URL을 확인할 수 있습니다.

기본 branch 이름이 `main`이 아니라면 `.github/workflows/deploy.yml`의 `branches: [main]`을 실제 branch 이름으로 바꿉니다.

## 프로젝트 구조

```text
.
├── .github/workflows/deploy.yml
├── public/
│   ├── og.png
│   └── projects/
├── scripts/
│   ├── add-project.mjs
│   ├── local-project-api.mjs
│   ├── project-store.mjs
│   ├── pdf-thumbnail-worker.mjs
│   ├── project-utils.mjs
│   └── validate-projects.mjs
├── src/
│   ├── components/
│   ├── data/
│   ├── hooks/
│   ├── sections/
│   ├── styles/
│   ├── types/
│   └── utils/
├── index.html
├── package.json
└── vite.config.ts
```

## 접근성과 동작 원칙

- semantic heading과 section 구조
- 본문 건너뛰기 링크와 키보드 focus 표시
- 모바일 전용 navigation과 44px 이상의 touch target
- `prefers-reduced-motion`에서 애니메이션과 부드러운 자동 스크롤 해제
- 모바일 메뉴는 Escape로 닫을 수 있으며 메뉴 이동 후 해당 섹션으로 키보드 포커스 이동
- 프로젝트 필터의 선택 상태 제공, 필터 변경 후에도 reveal 정상 동작
- hash 직접 접근·새로고침 시 React와 글꼴 로딩 후 섹션 위치 정렬
- 프로젝트 thumbnail lazy loading
- hover 없이도 모든 프로젝트 정보와 링크에 접근 가능
- 개인정보나 존재하지 않는 성과를 기본값으로 표시하지 않음
