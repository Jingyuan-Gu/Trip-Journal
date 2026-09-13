import { storyPhotos, capacityIssue, sceneKey, missingStoryPhotos } from '../services/journalSceneService';
import { emptySceneEdits } from '../types/scene';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { PageFrame } from '../components/PageFrame';
import { JournalPreview } from '../components/JournalPreview';
import { useTrip } from '../context/TripContext';
import { getTemplateById } from '../templates';
import { renderJournal } from '../services/renderService';
import { downloadBlob } from '../utils/download';
import { buildJournalScene, updateJournalText } from '../services/journalSceneService';

export default function EditorPage() {
  const {state,setState}=useTrip(); const [selected,setSelected]=useState(''),[exporting,setExporting]=useState(false),[error,setError]=useState('');
  const story=state.selectedDate?state.dayItineraries[state.selectedDate]:undefined;
  const missing=missingStoryPhotos(story,state.photos),photos=missing?[]:storyPhotos(story,state.photos,state.selectedPhotoIds),issue=missing?'有行程照片已不可用，请返回今日行程重新确认。':capacityIssue(story);
  const key=sceneKey(state.selectedDate,state.selectedTemplateId),edits=state.sceneEdits?.[key]??emptySceneEdits;
  if(!state.selectedDate||!photos.length||!!issue)return <PageFrame title="还没有生成手账" description={issue||'先完成今日行程，再记录今天。'} back="/template" placeholder={false}><Link to="/itinerary" className="primary-button empty-state-action">返回今日行程</Link></PageFrame>;
  const template=getTemplateById(state.selectedTemplateId);
  const scene=buildJournalScene(template,photos,state.journalContent,state.textStyleOverrides,story,edits);
  const active=scene.texts.find(t=>t.id===selected&&!['city','intro','closing'].includes(t.id));
  const updateStyle=(patch:{fontSize?:number;align?:'left'|'center'|'right'})=>setState(p=>({...p,textStyleOverrides:{...p.textStyleOverrides,[selected]:{...p.textStyleOverrides[selected],...patch}}}));
  const exportPng=async()=>{if(exporting)return;setExporting(true);setError('');try{const blob=await renderJournal({photos,template,content:state.journalContent,overrides:state.textStyleOverrides,story,edits});const name=((story?.title||state.journalContent.title).trim()||'TripJournal').replace(/[\\/:*?"<>|]/g,'').replace(/[. ]+$/,'')||'TripJournal';downloadBlob(blob,`${name}-${state.selectedDate}.png`);}catch{setError('高清图片生成失败，请重新尝试。');}finally{setExporting(false);}};
  return <PageFrame title="编辑你的旅行手账" description="点击文字直接修改，拖动照片调整版式，完成后即可导出高清图片。" back="/template" placeholder={false} className="editor-workbench-page">
    <div className="editor-workspace"><div className="editor-toolbar"><div className="editor-toolbar-context"><strong>{template.name}</strong><small>{state.selectedDate}</small></div><div className="editor-toolbar-actions"><Link to="/itinerary" className="secondary-button">调整照片与行程</Link><Link to="/template" className="secondary-button">更换风格</Link><button className="primary-button" disabled={exporting} onClick={exportPng}>{exporting?'正在生成高清图片…':'下载高清图片'}</button></div></div>
    {error&&<p role="alert">{error}</p>}
    {active&&<div className="inline-tools"><span>{active.label}</span><label>字号<input type="number" min={14} max={80} value={active.fontSize} onChange={e=>updateStyle({fontSize:Math.max(14,Math.min(80,Number(e.target.value)||14))})}/></label><label>对齐<select value={active.align} onChange={e=>updateStyle({align:e.target.value as 'left'|'center'|'right'})}><option value="left">左对齐</option><option value="center">居中</option><option value="right">右对齐</option></select></label><button className="text-link" onClick={()=>setSelected('')}>完成编辑</button></div>}
    <div className="story-editor"><section className="preview-surface"><JournalPreview template={template} photos={photos} content={state.journalContent} story={story} edits={edits} onEdits={edits=>setState(p=>({...p,sceneEdits:{...p.sceneEdits,[key]:edits}}))} overrides={state.textStyleOverrides} editable selectedTextId={selected} onSelectText={setSelected} onTextChange={(id,value)=>setState(p=>updateJournalText(p,id,value))}/></section></div></div>
  </PageFrame>;
}
