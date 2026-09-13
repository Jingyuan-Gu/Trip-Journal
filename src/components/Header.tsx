import { BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PRODUCT } from '../config';
export function Header() {
  return <header className="site-header"><Link to="/" className="brand" aria-label={`${PRODUCT.name}首页`}><span className="brand-icon"><BookOpen size={23} /></span><strong>{PRODUCT.name}</strong><span className="brand-english">{PRODUCT.englishName}</span></Link><span className="header-note">只属于你的旅行记忆</span></header>;
}

