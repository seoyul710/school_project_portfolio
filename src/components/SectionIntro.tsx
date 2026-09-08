interface Props { id: string; index: string; eyebrow: string; title: string; description?: string }

export function SectionIntro({ id, index, eyebrow, title, description }: Props) {
  return (
    <header className="section-intro" data-reveal>
      <p className="section-index">{index}</p>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id}>{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
    </header>
  )
}
