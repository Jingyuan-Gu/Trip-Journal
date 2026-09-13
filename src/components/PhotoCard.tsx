import { X } from 'lucide-react';
import type { Photo } from '../types/photo';
export function PhotoCard({ photo, disabled, onRemove }: { photo: Photo; disabled: boolean; onRemove: (id: string) => void }) {
  return <div className="upload-photo-card"><img src={photo.thumbnailUrl} alt={photo.fileName} loading="lazy" decoding="async" /><button type="button" className="photo-delete" disabled={disabled} onClick={() => onRemove(photo.id)} aria-label={`删除 ${photo.fileName}`}><X size={18} /></button></div>;
}
