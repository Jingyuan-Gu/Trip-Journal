import { useState } from 'react';
import type { Photo } from '../types/photo';
import type { DayItinerary } from '../types/story';
import { movePhoto,newStop,setRepresentative } from '../services/itineraryEditingService';
export function StopPhotoManager({day,photos,onChange}:{day:DayItinerary;photos:Photo[];onChange:(day:DayItinerary)=>void}){
  const [adding,setAdding]=useState(false),[name,setName]=useState(''),[time,setTime]=useState('');
  return <section className="stop-management"><button className="secondary-button" onClick={()=>setAdding(!adding)}>＋ 添加一站</button>
    {adding&&<form onSubmit={e=>{e.preventDefault();if(!name.trim())return;onChange({...day,stops:[...day.stops,newStop(name,time)].sort((a,b)=>(a.startTime||'99:99').localeCompare(b.startTime||'99:99'))});setName('');setTime('');setAdding(false);}}><label>地点名称<input value={name} onChange={e=>setName(e.target.value)} maxLength={40} required placeholder="景点、午餐或河边散步"/></label><label>时间<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><button className="primary-button">添加后分配照片</button></form>}
    <details><summary>管理各站照片 · 移动与更换代表照片</summary>
      {day.stops.map(stop=><section key={stop.id}><h3>{stop.placeName||'未命名站点'} · {stop.photoIds.length} 张</h3>
      <div className="managed-photos">{stop.photoIds.map(id=>{const p=photos.find(photo=>photo.id===id);if(!p)return null;const group=stop.similarityGroups?.find(g=>g.photoIds.includes(id));return <article key={id}><img src={p.thumbnailUrl} alt={p.fileName}/><button onClick={()=>onChange({...day,stops:day.stops.map(s=>s.id===stop.id?setRepresentative(s,id):s)})}>{stop.representativePhotoIds.includes(id)?'★ 代表照片':'设为代表照片'}</button>{group&&group.photoIds.length>1&&<small>{group.photoIds.length} 张近似照片 · 组 {stop.similarityGroups!.indexOf(group)+1}</small>}<select aria-label={`移动 ${p.fileName}`} value={stop.id} onChange={e=>onChange(movePhoto(day,id,e.target.value))}><option value="">暂不归站</option>{day.stops.map(s=><option key={s.id} value={s.id}>{s.placeName||'未命名站点'} {s.startTime}</option>)}</select></article>;})}</div></section>)}
      <h3>尚未归站的照片</h3><div className="managed-photos">{photos.filter(p=>!day.stops.some(s=>s.photoIds.includes(p.id))).map(p=><article key={p.id}><img src={p.thumbnailUrl} alt={p.fileName}/><select aria-label={`分配 ${p.fileName}`} value="" onChange={e=>onChange(movePhoto(day,p.id,e.target.value))}><option value="">加入一站</option>{day.stops.map(s=><option key={s.id} value={s.id}>{s.placeName||'未命名站点'} {s.startTime}</option>)}</select></article>)}</div>
    </details></section>;
}
