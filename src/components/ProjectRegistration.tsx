import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Project } from '../types/content'

const localOnlyMessage = '프로젝트 등록은 로컬 개발 환경에서만 가능합니다. 프로젝트 폴더에서 npm run dev를 실행해 주세요.'
const api = '/__portfolio/projects'
const marker = { 'X-Portfolio-Request': 'local-registration' }
const maxPdfBytes = 20 * 1024 * 1024

export function ProjectRegistration({ onRegistered }: { onRegistered: (project: Project) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const token = useRef('')
  const submitting = useRef(false)
  const [mode, setMode] = useState<'closed' | 'form' | 'notice'>('closed')
  const [checking, setChecking] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (mode === 'closed') return
    const element = dialog.current!
    const returnFocus = trigger.current
    element.showModal()
    element.querySelector<HTMLInputElement>('input')?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      element.close()
      document.body.style.overflow = previous
      returnFocus?.focus({ preventScroll: true })
    }
  }, [mode])

  useEffect(() => {
    if (!busy) return
    const preventLeave = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', preventLeave)
    return () => window.removeEventListener('beforeunload', preventLeave)
  }, [busy])

  async function openForm() {
    setChecking(true)
    setMessage('')
    setSuccess('')
    try {
      if (!import.meta.env.DEV) throw new Error(localOnlyMessage)
      const response = await fetch(api, { headers: marker, cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(4000) })
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error(localOnlyMessage)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || localOnlyMessage)
      if (data.service !== 'portfolio-local-registration' || data.version !== 1 || typeof data.token !== 'string') throw new Error(localOnlyMessage)
      token.current = data.token
      setMode('form')
    } catch (error) {
      setMessage(error instanceof Error && error.message !== 'Failed to fetch' && error.name !== 'TimeoutError' ? error.message : localOnlyMessage)
      setMode('notice')
    } finally { setChecking(false) }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const form = new FormData(event.currentTarget)
    const pdf = form.get('pdf')
    if (!(pdf instanceof File) || !pdf.size || !/\.pdf$/i.test(pdf.name) || pdf.size > maxPdfBytes) {
      setMessage('0바이트보다 크고 20MB 이하인 PDF 파일(.pdf)을 선택해 주세요.')
      return
    }
    const text = (name: string) => String(form.get(name) || '').trim()
    const metadata = {
      title: text('title'), summary: text('summary'), description: text('description'), category: text('category'), date: text('date'),
      tags: text('tags').split(',').map(tag => tag.trim()).filter(Boolean),
      links: { github: text('github'), external: text('external') },
    }
    const body = new FormData()
    body.set('metadata', JSON.stringify(metadata))
    body.set('pdf', pdf)
    submitting.current = true
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch(api, { method: 'POST', headers: { ...marker, 'X-Portfolio-Token': token.current }, body, credentials: 'same-origin', signal: AbortSignal.timeout(75000) })
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('등록 서버에 연결할 수 없습니다. 로컬 개발 서버가 실행 중인지 확인해 주세요.')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '등록하지 못했습니다. 입력값을 확인해 주세요.')
      onRegistered(data.project as Project)
      setSuccess('프로젝트를 저장했습니다. PDF·썸네일·데이터를 commit/push하면 공개 사이트에도 반영됩니다.')
      setMode('closed')
    } catch (error) {
      const uncertain = !(error instanceof Error) || error.name === 'TimeoutError' || error.message === 'Failed to fetch'
      setMessage(uncertain ? '연결이 끊겨 저장 결과를 확인하지 못했습니다. 다시 등록하기 전에 페이지를 새로고침해 목록을 확인해 주세요.' : error.message)
    } finally { submitting.current = false; setBusy(false) }
  }

  return (
    <>
      <div className="project-toolbar">
        <p className="registration-success" role="status">{success}</p>
        <button className="project-add-button" ref={trigger} type="button" disabled={checking} onClick={() => void openForm()}>
          <span aria-hidden="true">＋</span> {checking ? '연결 확인 중…' : '프로젝트 추가'}
        </button>
      </div>
      {mode !== 'closed' && (
        <dialog className="registration-dialog" ref={dialog} aria-labelledby="registration-title" aria-describedby="registration-help" onCancel={event => {
          event.preventDefault()
          if (!busy) setMode('closed')
        }}>
          <div className="registration-heading">
            <div><p className="eyebrow">PROJECT ARCHIVE</p><h3 id="registration-title">{mode === 'form' ? '새 프로젝트 등록' : '로컬에서 기록을 추가하세요'}</h3></div>
            <button className="dialog-close" type="button" disabled={busy} aria-label="등록 창 닫기" onClick={() => setMode('closed')}>×</button>
          </div>
          {mode === 'notice' ? (
            <div className="registration-notice"><p id="registration-help">{message}</p><button type="button" className="form-submit" onClick={() => setMode('closed')}>확인</button></div>
          ) : (
            <form onSubmit={event => void submit(event)} aria-busy={busy}>
              <p id="registration-help">프로젝트 폴더에 PDF와 썸네일을 저장합니다. 링크를 제외한 모든 항목은 필수입니다.</p>
              <fieldset disabled={busy} className="registration-fields">
                <label className="field-wide">제목<input name="title" required maxLength={120} autoComplete="off" /></label>
                <label className="field-wide">한 줄 요약<input name="summary" required maxLength={250} /></label>
                <label className="field-wide">상세 설명<textarea name="description" required maxLength={10000} rows={4} /></label>
                <label>Category<select name="category" required defaultValue="개인 프로젝트">{['개인 프로젝트', '팀 프로젝트', '학교 프로젝트'].map(category => <option key={category} value={category}>{category}</option>)}</select></label>
                <label>날짜<input name="date" required maxLength={10} inputMode="numeric" aria-describedby="date-help" /><span id="date-help" className="field-help">YYYY / YYYY-MM / YYYY-MM-DD</span></label>
                <label className="field-wide">기술 Tags<input name="tags" required maxLength={1219} aria-describedby="tags-help" /><span id="tags-help" className="field-help">쉼표로 구분해 최대 20개 · 예: Python, Linux</span></label>
                <label className="field-wide file-field">PDF 파일<input name="pdf" type="file" accept=".pdf,application/pdf" required aria-describedby="pdf-help" /><span id="pdf-help" className="field-help">최대 20MB · 암호가 없는 PDF · 첫 페이지를 WebP로 변환</span></label>
                <label>GitHub URL <span className="optional">선택</span><input name="github" type="url" maxLength={2048} /></label>
                <label>외부 URL <span className="optional">선택</span><input name="external" type="url" maxLength={2048} /></label>
              </fieldset>
              <p className="registration-error" role="alert">{message}</p>
              <p className="registration-progress" role="status">{busy ? 'PDF 확인 및 썸네일 생성 중입니다. 저장이 끝날 때까지 창을 유지해 주세요.' : ''}</p>
              <div className="registration-actions"><button type="button" className="form-cancel" disabled={busy} onClick={() => setMode('closed')}>취소</button><button type="submit" className="form-submit" disabled={busy}>{busy ? '저장 중…' : '프로젝트 저장'}</button></div>
            </form>
          )}
        </dialog>
      )}
    </>
  )
}
