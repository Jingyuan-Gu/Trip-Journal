import type { Photo } from '../types/photo';
import type { DayItinerary } from '../types/story';
import type { JournalContent, TextStyleOverride } from '../types/journal';
import type { JournalTemplate } from '../types/template';
import type { TripState } from '../types/trip';
import type { SceneEdits } from '../types/scene';
import { emptySceneEdits } from '../types/scene';
import { STICKER_LIBRARY, stickerSize } from '../assets/journal/stickers';

export interface SceneText { id:string;label:string;text:string;x:number;y:number;width:number;fontSize:number;fontFamily:string;fontWeight:number|string;color:string;align:'left'|'center'|'right';lineHeight:number;maxLines:number;maxLength:number }
export interface ScenePhoto { photo:Photo;stopId:string;x:number;y:number;width:number;height:number;rotation:number;borderRadius:number;frame:string;padding:number;bottom:number;fit:'contain'|'cover';cropX:number;cropY:number;tape:string;zIndex:number }
export interface SceneSticker { id:string;stickerId:string;x:number;y:number;width:number;height:number;rotation:number;zIndex:number;locked:boolean }
export interface SceneShape { kind:'rect'|'line'|'circle'|'text';x:number;y:number;width:number;height:number;color:string;rotation?:number;dashed?:boolean;text?:string;fontSize?:number }
export interface RouteNode { stopId:string;x:number;y:number }
export interface JournalScene { background:string;paperUrl:string;grid:boolean;photos:ScenePhoto[];texts:SceneText[];stickers:SceneSticker[];decorations:SceneShape[];nodes:RouteNode[];style:JournalTemplate['id'] }
export const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export const sceneKey=(date:string|null,style:string)=>JSON.stringify([date,style]);
export function missingStoryPhotos(story:DayItinerary|undefined,photos:Photo[]){
 return !!story?.stops.some(s=>s.representativePhotoIds.some(id=>!photos.some(p=>p.id===id)));
}
export function storyPhotos(story:DayItinerary|undefined,photos:Photo[],fallback:string[]=[]):Photo[]{
 const ids=[...new Set(story?story.stops.flatMap(s=>s.representativePhotoIds):fallback)];
 return ids.map(id=>{const p=photos.find(p=>p.id===id);if(!p)throw new Error('行程中有照片已不可用，请返回今日行程重新确认。');return p;});
}
export function capacityIssue(story:DayItinerary|undefined){
 if(!story?.stops.length)return '请先整理今日行程。';
 if(story.stops.length>8)return '一页可清晰展示最多 8 站，请返回今日行程调整；当前行程不会被截断。';
 if(story.stops.some(s=>s.representativePhotoIds.length>4))return '每站最多展示 4 张代表照片，请返回今日行程调整。';
 const ids=story.stops.flatMap(s=>s.representativePhotoIds);
 if(new Set(ids).size!==ids.length)return '有照片被分配到了多个站点，请先确认照片归属。';
 return '';
}
export function validateJournalScene(scene:JournalScene):string[]{
 const issues:string[]=[];
 const box=(a:{x:number;y:number;width:number;height:number},b:{x:number;y:number;width:number;height:number})=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 scene.texts.forEach((t,i)=>{const height=t.lineHeight*t.maxLines;if(t.x<70||t.y<70||t.x+t.width>1010.01||t.y+height>1350.01)issues.push('文字越界:'+t.id);
 if(t.text){for(const p of scene.photos)if(box({...t,height},p))issues.push('文字与照片重叠:'+t.id);for(const o of scene.texts.slice(i+1))if(o.text&&box({...t,height},{...o,height:o.lineHeight*o.maxLines}))issues.push('文字重叠:'+t.id);}});
 return issues;
}
export function buildJournalScene(template:JournalTemplate,photos:Photo[],content:JournalContent,overrides:Record<string,TextStyleOverride>={},story?:DayItinerary,edits:SceneEdits=emptySceneEdits):JournalScene{
 const urban=template.id==='urban_grunge',soft=template.id==='soft_scrapbook';
 const ink=urban?'#292622':soft?'#315760':'#45553c';
 const scene:JournalScene={background:template.background,paperUrl:'/journal-paper/'+(urban?'urban':soft?'soft':'route')+'.png',grid:false,photos:[],texts:[],stickers:[],decorations:[],nodes:[],style:template.id};
 const text=(id:string,label:string,value:string,x:number,y:number,w:number,size:number,lines:number,room:number)=>{
  const o=overrides[id]??{},move=edits.texts[id]??{};
  const fontSize=clamp(o.fontSize??size,14,80),lineHeight=fontSize*1.25;
  const maxLines=Math.max(1,Math.min(lines,Math.floor(room/lineHeight)));
  const width=clamp(move.width??w,100,940);
  scene.texts.push({id,label,text:value||'',x:clamp(move.x??x,70,1010-width),y:clamp(move.y??y,70,1350-maxLines*lineHeight),width,fontSize,fontFamily:urban&&id==='title'?'Impact, "Arial Black", KaiTi, serif':'KaiTi, STKaiti, "Kaiti SC", Georgia, serif',fontWeight:o.fontWeight??(id==='title'?700:400),color:ink,align:o.align??'left',lineHeight,maxLines,maxLength:id==='title'?50:120});
 };
 const title=story?.title?.trim();
 text('title','标题',title&& !['一天的旅行','这一天的旅行'].includes(title)?title:story?.city?story.city+'旅行日记':'今天的旅行',80,76,850,urban?64:58,2,148);
 text('date','日期',content.dateText||story?.date||'',80,228,300,20,1,26);
 text('city','城市',story?.city||'',720,228,280,20,1,26);
 text('intro','开场',story?.summary||'',80,268,920,22,1,28);
 scene.decorations.push({kind:'line',x:80,y:216,width:urban?920:560,height:0,color:urban?'#292622':'#97a680'});
 const stops=story?.stops??[];
 const row=934/Math.max(1,stops.length);
 stops.forEach((stop,index)=>{
  const y=320+index*row,h=row-26;
  const left=urban?index%3!==1:index%2===0;
  const px=left?80:596,tx=left?620:80,pw=404,tw=380;
  scene.nodes.push({stopId:stop.id,x:540+(soft?(index%2?10:-10):0),y:y+22});
  const size=stops.length>5?21:27;
  text(stop.id+':time','时间',stop.startTime,tx,y,tw,18,1,24);
  text(stop.id+':place','地点',stop.placeName,tx,y+28,tw,size,stops.length>4?1:2,stops.length>4?30:68);
  const cy=y+(stops.length>4?60:103);
  const captionRoom=Math.max(25,h-(cy-y));
  text(stop.id+':caption','配文',stop.caption,tx,cy,tw,stops.length>5?18:23,stops.length>5?1:3,captionRoom);
  if(stop.caption?.trim())scene.decorations.push({kind:'rect',x:tx-8,y:cy-6,width:tw+16,height:Math.min(captionRoom+8,stops.length>5?34:100),color:urban?'#e5dac3':soft?'#f9f3df':'#f8eed5',rotation:0});
  const allItems=stop.representativePhotoIds.map(id=>photos.find(p=>p.id===id));
  const items=allItems.slice(0,3);
  const overflow=Math.max(0,allItems.length-items.length);
  if(items.some(p=>!p))throw new Error('缺少行程照片');
  const count=items.length;
  items.forEach((photo,i)=>{
   if(!photo)return;
   // Each actual photo gets its own region. No repeated or truncated slots.
   const bigW=count===1?pw:count===2?pw*.60:pw*.64;
   const smallW=pw-bigW-14;
   const cell=i===0?{x:px,y,w:bigW,h}:count===2?{x:px+bigW+14,y:y+h*.18,w:smallW,h:h*.70}:{x:px+bigW+14,y:y+(i-1)*(h/(count-1)),w:smallW,h:h/(count-1)-10};
   const pad=stops.length>5?5:9,bottom=urban?pad:i===0?pad*2.8:pad;
   const ratio=Math.min((cell.w-2*pad)/Math.max(1,photo.width),(cell.h-pad-bottom)/Math.max(1,photo.height));
   const w=Math.max(28,photo.width*ratio+pad*2),ph=Math.max(28,photo.height*ratio+pad+bottom),photoScale=count===1?1.14:1.1;
   const edit=edits.photos[photo.id]??{};
   const defaultWidth=clamp(w*photoScale,28,940),defaultHeight=clamp(ph*photoScale,28,1240);
   const width=clamp(edit.width??defaultWidth,28,940),height=clamp(edit.height??defaultHeight,28,1240);
   const rotation=clamp(edit.rotation??(urban?(i%2?1:-1):((index+i)%2?1.5:-1.5)),-15,15);
   if(!edit.hidden)scene.photos.push({photo,stopId:stop.id,x:clamp(edit.x??cell.x+(cell.w-defaultWidth)/2,0,1080-width),y:clamp(edit.y??cell.y+(cell.h-defaultHeight)/2,0,1440-height),width,height,rotation,padding:pad,bottom,frame:urban?'#eae4d6':'#fcf8ed',borderRadius:urban?0:2,fit:edit.fit??'contain',cropX:clamp(edit.cropX??.5,0,1),cropY:clamp(edit.cropY??.5,0,1),tape:['#acb9a0','#a9c4c7','#c9ac7e','#d3ca99','#d0baad'][(index+i)%5],zIndex:40+index*3+i});
  });
  if(overflow)scene.decorations.push({kind:'text',x:px+pw-72,y:y+h-34,width:60,height:26,color:urban?'#f5ecd9':soft?'#315249':'#59412e',text:`+${overflow}`,fontSize:20});
 });
 const stickerIds=STICKER_LIBRARY[template.id];
 const stickerAnchors:Record<JournalTemplate['id'],Array<[number,number]>>={
  route_journal:[[770,1180],[24,1145],[855,142],[946,58],[18,520],[966,840],[20,760],[938,1280],[882,252],[470,1215],[24,1260],[448,1265],[930,690],[760,1320]],
  soft_scrapbook:[[118,246],[32,1138],[940,610],[18,890],[862,116],[780,1300],[30,1260],[932,330],[874,1050],[470,1230],[955,760],[160,1320],[835,245],[30,360]],
  urban_grunge:[[16,1118],[780,1182],[870,146],[28,760],[940,1020],[906,300],[180,246],[18,520],[850,1310],[442,1170],[900,620],[20,1300],[932,900],[420,1280]],
 };
 const stickerCount=template.id==='route_journal'?12:template.id==='soft_scrapbook'?14:12;
 for(let i=0;i<stickerCount;i++){const id=`sticker-${template.id}-${i}`,edit=(edits.stickers??{})[id]??{},locked=edit.locked??i<2;if(edit.hidden)continue;const libraryIndex=i<2?i:2+((i-2+stops.length)%(stickerIds.length-2)),stickerId=edit.stickerId??stickerIds[libraryIndex],size=stickerSize(stickerId),anchor=stickerAnchors[template.id][i%stickerAnchors[template.id].length];const width=clamp(edit.width??size.width,24,360),height=clamp(edit.height??size.height,24,260);scene.stickers.push({id,stickerId,x:clamp(edit.x??anchor[0],0,1080-width),y:clamp(edit.y??anchor[1],0,1440-height),width,height,rotation:edit.rotation??((i%5)-2)*2,zIndex:edit.zIndex??(locked?18:55+i%8),locked});}
 for(const [id,edit] of Object.entries(edits.stickers??{})){if(id.startsWith('sticker-')||edit.hidden||!edit.stickerId)continue;scene.stickers.push({id,stickerId:edit.stickerId,x:clamp(edit.x??120,0,980),y:clamp(edit.y??120,0,1370),width:clamp(edit.width??64,24,180),height:clamp(edit.height??64,24,180),rotation:edit.rotation??0,zIndex:edit.zIndex??60,locked:edit.locked??false});}
 text('closing','结尾',story?.closingText||'',100,1290,840,24,2,60);
 return scene;
}
export function updateJournalText(state: TripState, id: string, value: string): TripState {
  const date=state.selectedDate, story=date?state.dayItineraries[date]:undefined;
  const contentKey=id==='date'?'dateText':id==='intro'?'subtitle':id==='closing'?'note':id;
  const journalContent=contentKey in state.journalContent?{...state.journalContent,[contentKey]:value}:state.journalContent;
  if(!story||!date)return {...state,journalContent};
  const [stopId,field]=id.split(':');
  const updated={...story, ...(id==='city'?{city:value}:{}), ...(id==='title'?{title:value}:{}), ...(id==='intro'||id==='subtitle'?{summary:value}:{}), ...(id==='closing'||id==='note'?{closingText:value}:{}), stops:story.stops.map(stop=>stop.id!==stopId?stop:{...stop,...(field==='time'?{startTime:value}:field==='place'?{placeName:value,placeSource:'manual' as const}:field==='caption'?{caption:value}:{})})};
  return {...state,journalContent,dayItineraries:{...state.dayItineraries,[date]:updated}};
}
