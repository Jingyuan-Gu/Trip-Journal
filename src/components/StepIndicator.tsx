import { NavLink } from 'react-router-dom';
import { STEPS } from '../config';
export function StepIndicator() {
  return <nav className="step-nav" aria-label="制作步骤（Phase 1 页面预览）"><ol>{STEPS.map((step, index) => <li key={step.path}><NavLink to={step.path} className={({ isActive }) => isActive ? 'step active' : 'step'}><span>{String(index + 1).padStart(2, '0')}</span><span>{step.label}</span></NavLink></li>)}</ol></nav>;
}
