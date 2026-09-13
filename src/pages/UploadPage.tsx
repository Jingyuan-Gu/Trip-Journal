import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, Plus } from 'lucide-react';
import { PageFrame } from '../components/PageFrame';
import { PhotoCard } from '../components/PhotoCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTrip } from '../context/TripContext';
import { processFiles, resolvePhotoDates, releasePhoto, PHOTO_LIMIT_MESSAGE } from '../services/photoService';

export default function UploadPage() {
  const { state, setState, addPhotos, removePhoto, clearTrip } = useTrip();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const job = useRef<AbortController | null>(null);
  const dragDepth = useRef(0);
  const [busy, setBusy] = useState(false);
  const [readingDates, setReadingDates] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [message, setMessage] = useState('');
  useEffect(() => {
    const preventFileOpen = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
    };
    window.addEventListener('dragover', preventFileOpen);
    window.addEventListener('drop', preventFileOpen);
    return () => {
      job.current?.abort();
      window.removeEventListener('dragover', preventFileOpen);
      window.removeEventListener('drop', preventFileOpen);
    };
  }, []);
  async function importFiles(files: File[]) {
    if (!files.length || job.current) return;
    const controller = new AbortController();
    job.current = controller;
    setBusy(true); setMessage(''); setProgress({ completed: 0, total: 0 });
    try {
      const result = await processFiles(files, {
        existingCount: state.photos.length, signal: controller.signal,
        onProgress: (completed, total) => setProgress({ completed, total }),
      });
      if (controller.signal.aborted) { result.photos.forEach(releasePhoto); return; }
      addPhotos(result.photos);
      setMessage([
        result.limitExceeded ? PHOTO_LIMIT_MESSAGE : '',
        result.unsupportedCount ? `有 ${result.unsupportedCount} 个文件不是支持的图片格式，已自动忽略。` : '',
        result.failedCount ? `有 ${result.failedCount} 张照片读取失败，已跳过。` : '',
        result.photos.length ? `已添加 ${result.photos.length} 张照片。` : '',
      ].filter(Boolean).join(' '));
    } catch {
      if (!controller.signal.aborted) setMessage('照片处理失败，请重新选择照片后再试。');
    } finally {
      if (job.current === controller) job.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  function drop(event: DragEvent<HTMLElement>) {
    event.preventDefault(); dragDepth.current = 0; setDragging(false);
    void importFiles(Array.from(event.dataTransfer.files));
  }
  async function organize() {
    if (job.current || !state.photos.length) return;
    const controller = new AbortController();
    job.current = controller;
    setBusy(true); setReadingDates(true); setMessage('');
    try {
      const photos = await resolvePhotoDates(state.photos, (completed, total) => setProgress({ completed, total }), controller.signal);
      if (controller.signal.aborted) return;
      setState(previous => ({ ...previous, photos }));
      navigate('/dates');
    } catch {
      if (!controller.signal.aborted) setMessage('日期整理未完成，请重试。已上传照片仍然保留。');
    } finally {
      if (job.current === controller) job.current = null;
      if (!controller.signal.aborted) { setBusy(false); setReadingDates(false); }
    }
  }
  return <PageFrame title="上传这次旅行的照片" description="不用提前整理，直接把照片全部放进来。我们会在下一步按照拍摄日期帮你分类。" back="/" placeholder={false}>
    <input ref={input} type="file" accept="image/*" multiple hidden disabled={busy} onChange={event => {
      const files = Array.from(event.currentTarget.files ?? []);
      event.currentTarget.value = ''; void importFiles(files);
    }} />
    <section className={`upload-zone upload-live ${dragging ? 'is-dragging' : ''}`} aria-label="照片上传区域" aria-busy={busy}
      onDragEnter={event => { event.preventDefault(); if (event.dataTransfer.types.includes('Files')) { dragDepth.current++; setDragging(true); } }}
      onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = busy ? 'none' : 'copy'; }}
      onDragLeave={event => { event.preventDefault(); dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }} onDrop={drop}>
      <span className="upload-icon"><UploadCloud size={35} strokeWidth={1.3} /></span><h2>{dragging ? '松开即可添加照片' : '把照片拖到这里'}</h2>
      <button className="secondary-button" disabled={busy} onClick={() => input.current?.click()}>或点击选择照片</button>
      <p>JPG / JPEG / PNG / WEBP · 最多 100 张</p>
    </section>
    <div role="status" aria-live="polite" className="upload-status">{busy ? <><p>{readingDates ? '正在读取照片日期' : '正在处理照片…'} {progress.completed} / {progress.total}</p><progress aria-label={readingDates ? '日期读取进度' : '照片处理进度'} value={progress.completed} max={progress.total || 1} /></> : message}</div>
    {state.photos.length > 0 && <><div className="section-heading"><h2>已选择 {state.photos.length} 张照片</h2><button className="text-link" disabled={busy} onClick={() => { clearTrip(); setMessage('已清空当前项目。'); }}>清空当前项目</button></div>
      <div className="photo-grid upload-photo-grid" aria-label="已上传照片">{state.photos.map(photo => <PhotoCard key={photo.id} photo={photo} disabled={busy} onRemove={removePhoto} />)}<button className="add-photo-card" disabled={busy} onClick={() => input.current?.click()}><Plus size={25} /><span>添加照片</span></button></div></>}
    <div className="action-row"><p className="muted">{state.photos.length ? '照片已保存在当前会话中，刷新页面会丢失。' : '选好照片，让这段旅程慢慢成页。'}</p><PrimaryButton disabled={busy || !state.photos.length} onClick={() => void organize()}>整理这些照片</PrimaryButton></div>
  </PageFrame>;
}
