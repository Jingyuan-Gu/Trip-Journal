import { storyPhotos, capacityIssue, sceneKey, missingStoryPhotos } from '../services/journalSceneService';
import { emptySceneEdits } from '../types/scene';
import { PageFrame } from '../components/PageFrame';
import { PrimaryButton } from '../components/PrimaryButton';
import { useTrip } from '../context/TripContext';
import { JournalPreview } from '../components/JournalPreview';
import { getTemplateById } from '../templates';
import { useNavigate } from 'react-router-dom';
import type { TemplateId } from '../types/template';
export default function TemplatePage(){
 const {state,setState}=useTrip();const navigate=useNavigate();const story=state.selectedDate?state.dayItineraries[state.selectedDate]:undefined;
 const missing=missingStoryPhotos(story,state.photos);const selected=missing?[]:storyPhotos(story,state.photos,state.selectedPhotoIds);const issue=missing?'有行程照片已不可用，请返回今日行程重新确认。':capacityIssue(story);const edits=state.sceneEdits?.[sceneKey(state.selectedDate,state.selectedTemplateId)]??emptySceneEdits;
 if(!state.selectedDate||!story||!selected.length||!!issue)return <PageFrame title="还没有整理好的行程" description="先完成今日行程，再选择手账风格。" back="/itinerary" placeholder={false}><section className="paper-panel empty-select-state"><p>{issue||'请先确认代表照片。'}</p></section></PageFrame>;
 const template=getTemplateById(state.selectedTemplateId);const ids:TemplateId[]=['route_journal','soft_scrapbook','urban_grunge'];
 const create=()=>navigate('/editor');
 return <PageFrame title="选择手账风格" description="为今天的旅行选择一种喜欢的手账样式，之后还可以继续编辑照片与文字。" back="/itinerary" placeholder={false}><div className="template-layout"><section className="paper-panel template-controls"><h2>手账风格</h2><p className="template-prompt-hint">选择风格后，立即预览今天的旅行故事。</p><div className="template-choices">{ids.map(id=>{const t=getTemplateById(id);return <button type="button" key={id} onClick={()=>setState(p=>({...p,selectedTemplateId:id}))} className={`template-choice ${state.selectedTemplateId===id?'chosen':''}`}><span className={`style-swatch ${id}`} /><span><strong>{t.name}</strong><small>{t.description}</small></span><span className="radio-mark" /></button>})}</div><PrimaryButton className="w-full mt-6" onClick={create}>用这个风格生成手账</PrimaryButton></section><section className="preview-surface template-preview-wrap"><span className="preview-label">实时预览 · 今日行程 · {selected.length} 张代表照片 · 3:4</span><JournalPreview template={template} photos={selected} content={state.journalContent} overrides={state.textStyleOverrides} story={story} edits={edits}/></section></div></PageFrame>;
}
