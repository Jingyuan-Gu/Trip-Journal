import type { Photo } from '../types/photo';
import type { DayItinerary } from '../types/story';
import { clusterPhotos, photoSignature } from './tripAnalysisService';
import { describePhotos, visualDistance, groupSimilar, chooseRepresentatives } from './photoSimilarityService';
async function analysisImage(photo: Photo): Promise<string> {
  const image = new Image(); image.src = photo.objectUrl; await image.decode();
  const canvas = document.createElement('canvas'); const scale = Math.min(960 / Math.max(image.naturalWidth, image.naturalHeight), 1);
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.drawImage(image,0,0,canvas.width,canvas.height);
  return canvas.toDataURL('image/jpeg', .75);
}
function timeLabel(value: number | null) { if (value === null) return ''; const date = new Date(value); return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`; }
export async function getAIMode(): Promise<'mock' | 'live'> {
  const response = await fetch('/api/ai-status', { signal: AbortSignal.timeout(10000) }); if (!response.ok) throw new Error('AI 服务不可用');
  const data = await response.json(); return data.mode === 'live' ? 'live' : 'mock';
}
export async function analyzeDayTrip(photos: Photo[], date: string, onProgress: (message: string) => void, signal?: AbortSignal): Promise<DayItinerary> {
  const features=await describePhotos(photos,onProgress,signal);
  const mode = await getAIMode().catch(()=>'mock' as const); onProgress('已读取照片时间 · 正在整理时间与地点分段');
  const clusters = clusterPhotos(photos,(a,b)=>{const x=features.get(a),y=features.get(b);return x&&y?visualDistance(x,y):undefined;}); const payload = [];
  const stops=clusters.map(cluster=>{const items=photos.filter(p=>cluster.photoIds.includes(p.id));const groups=groupSimilar(cluster.id,items,features);return {id:cluster.id,startTime:timeLabel(cluster.startTime),endTime:timeLabel(cluster.endTime),placeName:'',placeSource:'unknown' as const,placeType:'other',confidence:0,locationSource:'inferred' as const,photoIds:cluster.photoIds,representativePhotoIds:chooseRepresentatives(groups,features),similarityGroups:groups,caption:'',shortCaption:''};});
  if(mode==='mock')return {date,title:'一天的旅行',summary:'',closingText:'',mode,photoSignature:photoSignature(photos),stops};
  for (const [index, cluster] of clusters.entries()) {
    if (signal?.aborted) throw new DOMException('Cancelled','AbortError');
    const images = [];
    if (mode === 'live') for (const id of cluster.representativePhotoIds) images.push({ id, dataUrl: await analysisImage(photos.find(p=>p.id===id)!) });
    payload.push({ ...cluster, images, metadata: photos.filter(p=>cluster.photoIds.includes(p.id)).map(p=>({id:p.id,timestamp:p.timestamp,dateSource:p.dateSource,location:p.location})), startLabel: timeLabel(cluster.startTime), endLabel: timeLabel(cluster.endTime) });
    onProgress(`准备分析片段 ${index + 1} / ${clusters.length}`);
  }
  onProgress('正在确认代表照片中的地点');
  const response = await fetch('/api/analyze-trip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ date, clusters: payload, photoSignature: photoSignature(photos) }), signal });
  if (!response.ok) throw new Error('AI 暂时没能还原这一天的行程。');
  const result: DayItinerary = await response.json();
  if (result.date !== date || !Array.isArray(result.stops) || result.stops.length !== clusters.length) throw new Error('行程数据格式不正确');
  return {...result,stops:stops.map((stop,index)=>({...result.stops[index],...stop,placeName:result.stops[index].placeName,placeSource:result.stops[index].locationSource==='gps'?'gps':'ai',confidence:result.stops[index].confidence,locationSource:result.stops[index].locationSource,caption:result.stops[index].caption}))};
}
