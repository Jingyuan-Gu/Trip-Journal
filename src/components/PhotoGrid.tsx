import { Image } from 'lucide-react';
export function PhotoGrid({ count = 6, selection = false }: { count?: number; selection?: boolean }) {
  return <div className={`photo-grid ${selection ? 'selection-grid' : ''}`} aria-label="照片网格占位">{Array.from({ length: count }, (_, i) => <div key={i} className="photo-placeholder"><Image size={24} strokeWidth={1} /><span>照片预览</span></div>)}</div>;
}
