import { ArrowRight } from 'lucide-react';
import type { PhotoDateGroup } from '../services/photoService';
import { formatDateDisplay, formatMonthShort, formatWeekday } from '../utils/date';
export function DateGroupCard({ group, onSelect }: { group: PhotoDateGroup; onSelect: (date: string) => void }) {
  const unknown = group.date === 'unknown';
  return <button className="date-group-card" onClick={() => onSelect(group.date)} aria-label={`${unknown ? '未知日期' : group.date}，${group.photos.length} 张照片`}>
    <span className="date-stamp"><span>{formatMonthShort(group.date)}</span><strong>{unknown ? '?' : group.date.slice(8,10)}</strong><small>{unknown ? '—' : group.date.slice(0,4)}</small></span>
    <span className="date-card-body"><span className="date-card-title">{formatDateDisplay(group.date)} · {formatWeekday(group.date)}</span><span className="date-card-count">{group.photos.length} 张照片</span><span className="date-thumbnails">{group.photos.slice(0,5).map(photo => <img key={photo.id} src={photo.thumbnailUrl} alt={photo.fileName} loading="lazy" />)}</span></span><ArrowRight className="date-card-arrow" size={20} />
  </button>;
}
