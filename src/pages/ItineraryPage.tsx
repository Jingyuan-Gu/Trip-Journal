import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageFrame } from '../components/PageFrame';
import { ItineraryStopCard } from '../components/ItineraryStopCard';
import { ItineraryConfirmation } from '../components/ItineraryConfirmation';
import { useTrip } from '../context/TripContext';
import { analyzeDayTrip, getAIMode } from '../services/aiService';
import { photoSignature, recommendPhotos } from '../services/tripAnalysisService';
import { presentStop } from '../utils/itineraryPresentation';
import type { TripStop } from '../types/story';
import { newStop } from '../services/itineraryEditingService';
import { Plus } from 'lucide-react';
import '../itinerary.css';

export default function ItineraryPage() {
  const { state, setState } = useTrip();
  const navigate = useNavigate();
  const [busy,setBusy] = useState(false), [progress,setProgress] = useState(''), [error,setError] = useState(''), [mode,setMode] = useState('checking');
  const [confirmation,setConfirmation] = useState<{kind:'remove';id:string}|{kind:'generate'}|null>(null);
  const [addingStop,setAddingStop] = useState(false), [newTime,setNewTime] = useState(''), [newPlace,setNewPlace] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(()=>{let active=true;void getAIMode().then(value=>{if(active)setMode(value);}).catch(()=>{if(active)setMode('unavailable');});return()=>{active=false;controller.current?.abort();};},[]);
  const date = state.selectedDate;
  const photos = state.photos.filter(p=>p.date===date);
  const day = date ? state.dayItineraries[date] : undefined;
  useEffect(()=>{
    if(!date||!day?.stops.some(stop=>stop.representativePhotoIds.length>3))return;
    setState(current=>{const itinerary=current.dayItineraries[date];if(!itinerary)return current;return {...current,dayItineraries:{...current.dayItineraries,[date]:{...itinerary,stops:itinerary.stops.map(stop=>stop.representativePhotoIds.length>3?{...stop,representativePhotoIds:stop.representativePhotoIds.slice(0,3)}:stop)}}};});
  },[date,day,setState]);
  if (!date || !photos.length) return <PageFrame title="先选择一天" description="上传照片后，再还原这一天的故事。" back="/dates" placeholder={false}><Link to="/upload" className="primary-button empty-state-action">返回上传照片</Link></PageFrame>;
  const updateStop = (id:string,patch:Partial<TripStop>) => setState(p=>{
    const current=p.dayItineraries[date];if(!current)return p;
    return {...p,dayItineraries:{...p.dayItineraries,[date]:{...current,stops:current.stops.map(s=>s.id===id?{...s,...patch,manuallyEdited:true}:s)}}};
  });
  const analyze = async () => {
    if(busy)return;if(day&&!window.confirm('重新分析会替换当前站点和手动修正，确定继续吗？'))return;const task=new AbortController();controller.current=task;setBusy(true);setError('');
    try{const result=await analyzeDayTrip(photos,date,setProgress,task.signal,day);if(!task.signal.aborted)setState(p=>({...p,dayItineraries:{...p.dayItineraries,[date]:result}}));}
    catch(e){if(!task.signal.aborted)setError(e instanceof Error?e.message:'分析失败，请重试');}
    finally{if(!task.signal.aborted)setBusy(false);}
  };
  const ids=day?recommendPhotos(day,photos):[];
  const unknownCount=day?.stops.filter(s=>presentStop(s).placeSource==='unknown').length??0;
  const generate=()=>{
    if(!day||ids.length<2||busy)return;
    setState(p=>({...p,selectedPhotoIds:ids,selectedTemplateId:'route_journal',journalContent:{...p.journalContent,title:day.title,subtitle:day.summary,note:day.closingText,dateText:date},photos:p.photos.map(photo=>({...photo,order:ids.includes(photo.id)?ids.indexOf(photo.id)+1:null}))}));
    navigate('/template');
  };
  const removeStop=(id:string)=>{
    setState(p=>({...p,dayItineraries:{...p.dayItineraries,[date]:{...p.dayItineraries[date],stops:p.dayItineraries[date].stops.filter(s=>s.id!==id)}}}));setConfirmation(null);
  };
  const createStop=()=>{if(!date||!newPlace.trim())return;const created=newStop(newPlace,newTime);setState(p=>({...p,dayItineraries:{...p.dayItineraries,[date]:{...p.dayItineraries[date],stops:[...p.dayItineraries[date].stops,created].sort((a,b)=>(a.startTime||'99:99').localeCompare(b.startTime||'99:99'))}}}));setNewPlace('');setNewTime('');setAddingStop(false);};
  return <PageFrame title="今日行程" description="把今天走过的地方整理成一条旅行路线，再确认每一站的照片与文字。" meta={`${date} · ${photos.length} 张照片`} back="/dates" placeholder={false}>
    <div className="itinerary-confirmation-page">
      <section className="itinerary-intro">
        <div><h2>把今天走过的地方整理成一条旅行路线。</h2>{!day&&<p>我们会根据照片时间和地点信息，自动整理可能的行程站点。</p>}</div>
        <div className="itinerary-tools"><button type="button" className={day?'secondary-button':'primary-button'} disabled={busy} onClick={analyze}>{busy?'正在整理今天的旅行…':day?'重新整理行程':'整理今日行程'}</button></div>
        {busy&&<p role="status">{progress}</p>}{error&&<p role="alert">{error}</p>}
        {mode==='unavailable'&&<p role="status">将使用本地照片整理，不进行在线地点识别。</p>}
        {day&&day.photoSignature!==photoSignature(photos)&&<p>照片已变化，当前保留的是上次行程。你可以重新分析。</p>}
      </section>
      {day&&<><div className="itinerary-timeline">{day.stops.map((stop,index)=><ItineraryStopCard key={stop.id} stop={stop} index={index} photos={photos} disabled={busy} onUpdate={patch=>updateStop(stop.id,patch)} onRemove={()=>setConfirmation({kind:'remove',id:stop.id})} onPhotoChange={ids=>updateStop(stop.id,{representativePhotoIds:ids})}/>)}</div>
      <div className="add-stop-area">{addingStop?<div className="add-stop-form"><label className="new-stop-time">时间<input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)}/></label><label className="new-stop-place">地点<input autoFocus placeholder="输入景点、餐厅或区域名称" value={newPlace} onChange={e=>setNewPlace(e.target.value)}/></label><div className="add-stop-actions"><button className="primary-button" onClick={createStop}>添加这一站</button><button className="secondary-button" onClick={()=>setAddingStop(false)}>取消</button></div></div>:<button className="add-stop-trigger" onClick={()=>setAddingStop(true)}><Plus size={16}/>新增一站</button>}</div>
      {!day.stops.length&&<p className="paper-panel">当前没有行程片段。你可以新增一站，或重新分析。</p>}
      <footer className="itinerary-next"><button type="button" className="primary-button" disabled={busy||ids.length<2} onClick={()=>unknownCount?setConfirmation({kind:'generate'}):generate()}>选择手账风格</button></footer></>}
    </div>
    {confirmation?.kind==='remove'&&<ItineraryConfirmation title="确定移除这一站吗？" description="照片不会被删除，只是不再出现在当前行程中。" confirmLabel="移除这一站" onConfirm={()=>removeStop(confirmation.id)} onCancel={()=>setConfirmation(null)}/>}
    {confirmation?.kind==='generate'&&<ItineraryConfirmation title={`还有 ${unknownCount} 个地点未填写，仍然继续生成吗？`} description="不知道具体地点也没关系，你可以稍后在手账中补充。" confirmLabel="继续生成" cancelLabel="返回补充" onConfirm={generate} onCancel={()=>setConfirmation(null)}/>}
  </PageFrame>;
}
