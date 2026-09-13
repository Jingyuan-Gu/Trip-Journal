export function PageHeader({ title, description, meta }: { title: string; description: string; meta?: string }) {
  return <div className="page-heading"><span className="eyebrow">A LITTLE JOURNAL, A BIG MEMORY</span><h1>{title}</h1><p>{description}</p>{meta && <small className="page-heading-meta">{meta}</small>}</div>;
}
