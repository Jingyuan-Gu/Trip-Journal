import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StepIndicator } from './StepIndicator';
import { PageHeader } from './PageHeader';

export function PageFrame({ title, description, meta, children, back, next, placeholder = true, compact = false, className = '' }: { title: string; description: string; meta?: string; children: ReactNode; back: string; next?: string; placeholder?: boolean; compact?: boolean; className?: string }) {
  return <><StepIndicator /><main id="main-content" className={`page-content${compact?' compact-page':''}${className?' '+className:''}`}><PageHeader title={title} description={description} meta={meta} />{placeholder && <div className="phase-notice">页面结构预览 · 日期整理与成品编辑将在后续阶段开放。</div>}{children}<div className="page-navigation"><Link className="text-link" to={back}><ArrowLeft size={17} /> 返回上一步</Link>{next && <Link className="preview-link" to={next}>预览下一页 <ArrowRight size={17} /></Link>}</div></main></>;
}

