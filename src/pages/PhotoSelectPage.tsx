import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DndContext, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripHorizontal, ImageOff, X } from 'lucide-react';
import { PageFrame } from '../components/PageFrame';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTrip } from '../context/TripContext';
import { autoSelectPhotos } from '../services/photoService';
import { formatDateDisplay } from '../utils/date';
import type { Photo } from '../types/photo';

function SelectPhotoCard({ photo, order, onToggle }: { photo: Photo; order: number | null; onToggle: () => void }) {
  return <button type="button" className={`select-photo-card ${order ? 'is-selected' : ''}`} onClick={onToggle} aria-pressed={!!order} aria-label={`${photo.fileName}${order ? `，已选第 ${order} 张` : ''}`}>
    <img src={photo.thumbnailUrl} alt={photo.fileName} loading="lazy" /><span className="select-overlay" />{order && <span className="selection-badge">{order}</span>}
  </button>;
}
function SortableSelectedPhoto({ photo, order, onRemove }: { photo: Photo; order: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });
  return <div ref={setNodeRef} className={`selected-photo ${isDragging ? 'is-dragging' : ''}`} style={{ transform: CSS.Transform.toString(transform), transition }} {...attributes} {...listeners}>
    <img src={photo.thumbnailUrl} alt={photo.fileName} /><span className="selected-number">{order}</span><button type="button" className="selected-remove" onPointerDown={event => event.stopPropagation()} onClick={event => { event.stopPropagation(); onRemove(); }} aria-label={`取消第 ${order} 张`}><X size={14} /></button>
  </div>;
}
export default function PhotoSelectPage() {
  const { state, setSelectedPhotoIds } = useTrip();
  const navigate = useNavigate();
  const [toast, setToast] = useState('');
  const date = state.selectedDate;
  const dayPhotos = useMemo(() => state.photos.filter(photo => photo.date === date), [state.photos, date]);
  const selected = state.selectedPhotoIds.filter(id => dayPhotos.some(photo => photo.id === id));
  const selectedSet = new Set(selected);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }));
  const updateSelection = (ids: string[]) => setSelectedPhotoIds(ids);
  const toggle = (id: string) => {
    if (selectedSet.has(id)) return updateSelection(selected.filter(item => item !== id));
    if (selected.length >= 9) { setToast('一页最多放 9 张照片'); window.setTimeout(() => setToast(''), 2200); return; }
    updateSelection([...selected, id]);
  };
  const chooseAutomatically = () => updateSelection(autoSelectPhotos(dayPhotos).map(photo => photo.id));
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = selected.indexOf(String(active.id)); const newIndex = selected.indexOf(String(over.id));
    if (oldIndex >= 0 && newIndex >= 0) updateSelection(arrayMove(selected, oldIndex, newIndex));
  };
  if (!date || !state.photos.length || !dayPhotos.length) return <PageFrame title="还没有选择旅行日期" description="请先从日期整理中选择一天的照片。" back="/dates" placeholder={false}><section className="paper-panel empty-select-state"><ImageOff size={35} strokeWidth={1.2} /><h2>{!state.photos.length ? '还没有上传照片' : '还没有选择旅行日期'}</h2><p>{!state.photos.length ? '先上传照片，再开始选择这一页的内容。' : '返回日期整理，选择要制作的那一天。'}</p><Link className="primary-button" to={!state.photos.length ? '/upload' : '/dates'}>{!state.photos.length ? '返回上传照片' : '返回选择日期'}</Link></section></PageFrame>;
  return <PageFrame title={date === 'unknown' ? '未知日期' : formatDateDisplay(date)} description="选择你想放进手账的照片。" back="/dates" placeholder={false}>
    <div className="select-toolbar"><div><strong>已选 {selected.length} / 9</strong><span>每页选择 2～9 张照片</span></div><button className="secondary-button" onClick={chooseAutomatically}>帮我选 9 张</button></div>
    <div className="select-grid" aria-label="当天照片">{dayPhotos.map(photo => <SelectPhotoCard key={photo.id} photo={photo} order={selected.indexOf(photo.id) >= 0 ? selected.indexOf(photo.id) + 1 : null} onToggle={() => toggle(photo.id)} />)}</div>
    {selected.length > 0 && <section className="selected-bar real-selected-bar"><div className="selected-bar-heading"><h2>已选择</h2><span>{selected.length} 张 · 拖动缩略图调整顺序</span></div><DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}><SortableContext items={selected} strategy={horizontalListSortingStrategy}><div className="selected-photo-scroll">{selected.map((id, index) => { const photo = dayPhotos.find(item => item.id === id)!; return <SortableSelectedPhoto key={id} photo={photo} order={index + 1} onRemove={() => toggle(id)} />; })}</div></SortableContext></DndContext><div className="selected-hint"><GripHorizontal size={17} /> 触摸设备上按住缩略图后拖动</div></section>}
    <div className="action-row select-action"><p className="muted">{selected.length < 2 ? '至少选择 2 张照片' : '照片顺序会保留到下一步。'}{toast && <span className="selection-toast" role="status">{toast}</span>}</p><PrimaryButton disabled={selected.length < 2 || selected.length > 9} onClick={() => navigate('/template')}>下一步：选择风格</PrimaryButton></div>
  </PageFrame>;
}
