import type { Photo } from '../types/photo';
import type { DayItinerary } from '../types/story';
import type { JournalContent, TextStyleOverride } from '../types/journal';
import type { JournalTemplate } from '../types/template';
import type { TripState } from '../types/trip';
import type { SceneEdits } from '../types/scene';
import { emptySceneEdits } from '../types/scene';
import { STICKER_LIBRARY, stickerSize } from '../assets/journal/stickers';
import { normalizeJournalBodyText } from '../utils/textLayout';

export interface SceneText { id:string;label:string;text:string;x:number;y:number;width:number;fontSize:number;fontFamily:string;fontWeight:number|string;color:string;align:'left'|'center'|'right';lineHeight:number;letterSpacing:number;rotation:number;maxLines:number;maxLength:number }
export interface ScenePhoto { photo:Photo;stopId:string;x:number;y:number;width:number;height:number;rotation:number;borderRadius:number;frame:string;padding:number;bottom:number;fit:'contain'|'cover';cropX:number;cropY:number;tape:string;zIndex:number;overflow?:number }
export interface SceneSticker { id:string;stickerId:string;x:number;y:number;width:number;height:number;rotation:number;zIndex:number;locked:boolean }
export interface SceneShape { kind:'rect'|'line'|'circle'|'text';x:number;y:number;width:number;height:number;color:string;rotation?:number;dashed?:boolean;text?:string;fontSize?:number }
export interface RouteNode { stopId:string;x:number;y:number }
export interface StopLayoutBlock { stopId:string;x:number;y:number;width:number;height:number;nodeX:number;nodeY:number;photoRects:Array<{x:number;y:number;width:number;height:number}>;textX:number;textWidth:number }
export interface JournalScene { background:string;paperUrl:string;grid:boolean;photos:ScenePhoto[];texts:SceneText[];stickers:SceneSticker[];decorations:SceneShape[];nodes:RouteNode[];stopBlocks:StopLayoutBlock[];style:JournalTemplate['id'] }
export const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function ensureDecorationInsideCanvas(element:{x:number;y:number;width:number;height:number;rotation:number},margin=12){
 const radians=Math.abs(element.rotation)*Math.PI/180,cos=Math.abs(Math.cos(radians)),sin=Math.abs(Math.sin(radians));
 const boundWidth=element.width*cos+element.height*sin,boundHeight=element.width*sin+element.height*cos;
 if(boundWidth>1080-margin*2||boundHeight>1440-margin*2)return null;
 const centerX=clamp(element.x+element.width/2,margin+boundWidth/2,1080-margin-boundWidth/2);
 const centerY=clamp(element.y+element.height/2,margin+boundHeight/2,1440-margin-boundHeight/2);
 return {...element,x:centerX-element.width/2,y:centerY-element.height/2};
}
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

function photoRectsInside(x:number,y:number,width:number,height:number,count:number,heroOnLeft:boolean){
 if(count<=0)return [];
 if(count===1)return [{x,y,width,height}];
 const gap=10,heroWidth=Math.round(width*.64),detailWidth=width-heroWidth-gap;
 const heroX=heroOnLeft?x:x+detailWidth+gap,detailX=heroOnLeft?x+heroWidth+gap:x;
 if(count===2)return [{x:heroX,y,width:heroWidth,height},{x:detailX,y:y+height*.18,width:detailWidth,height:height*.64}];
 const detailHeight=(height-gap)/2;
 return [{x:heroX,y,width:heroWidth,height},{x:detailX,y,width:detailWidth,height:detailHeight},{x:detailX,y:y+detailHeight+gap,width:detailWidth,height:detailHeight}];
}

function layoutStopBlocks(stops:DayItinerary['stops'],style:JournalTemplate['id']):StopLayoutBlock[]{
 const count=stops.length;if(!count)return [];
 const top=320,bottom=1260,gap=count<=4?22:count<=6?14:10,usable=bottom-top-gap*(count-1);
 const visibleLimit=count>=7?1:count>=5?2:3;
 const desired=stops.map(stop=>{
  const visible=Math.min(visibleLimit,stop.representativePhotoIds.length);
  const captionLines=stop.caption?.trim()?Math.min(count<=4?3:2,Math.max(1,Math.ceil(stop.caption.trim().length/(count<=4?16:22)))):0;
  const base=count<=3?238:count===4?202:count<=6?138:104;
  return base+Math.max(0,visible-1)*8+Math.max(0,captionLines-1)*12;
 });
 const total=desired.reduce((sum,value)=>sum+value,0),scale=Math.min(1,usable/Math.max(1,total));
 let cursor=top;
 return stops.map((stop,index)=>{
  const height=desired[index]*scale,left=index%2===0;
  const width=style==='route_journal'?448:style==='soft_scrapbook'?850:870;
  const x=style==='route_journal'?(left?70:562):style==='soft_scrapbook'?(left?92:138):(left?72:130);
  const nodeX=style==='route_journal'?540:style==='soft_scrapbook'?56:1022,nodeY=cursor+height/2;
  const photoWidth=width*(style==='urban_grunge' ? 0.6 : 0.57),textGap=18,textWidth=width-photoWidth-textGap;
  const heroOnLeft=style!=='route_journal'||left;
  const photoX=heroOnLeft?x:x+textWidth+textGap,textX=heroOnLeft?x+photoWidth+textGap:x;
  const photoY=cursor+6,photoHeight=Math.max(82,height-12);
  const visible=Math.min(visibleLimit,stop.representativePhotoIds.length,3);
  const block={stopId:stop.id,x,y:cursor,width,height,nodeX,nodeY,photoRects:photoRectsInside(photoX,photoY,photoWidth,photoHeight,visible,heroOnLeft),textX,textWidth};
  cursor+=height+gap;return block;
 });
}

export function buildJournalScene(template:JournalTemplate,photos:Photo[],content:JournalContent,overrides:Record<string,TextStyleOverride>={},story?:DayItinerary,edits:SceneEdits=emptySceneEdits):JournalScene{
 const urban=template.id==='urban_grunge',soft=template.id==='soft_scrapbook';
 const ink=urban?'#292622':soft?'#315760':'#45553c';
 const scene:JournalScene={background:template.background,paperUrl:'/journal-paper/'+(urban?'urban':soft?'soft':'route')+'.png',grid:false,photos:[],texts:[],stickers:[],decorations:[],nodes:[],stopBlocks:[],style:template.id};
 const text=(id:string,label:string,value:string,x:number,y:number,w:number,size:number,lines:number,room:number)=>{
 const o=overrides[id]??{},move=edits.texts[id]??{};
  const role=id.includes(':')?id.split(':')[1]:id;
  const normalizedValue=role==='caption'||role==='intro'||role==='closing'?normalizeJournalBodyText(value):value;
  const scaleByRole=urban?(role==='title'?1.12:role==='place'?1.08:role==='caption'?0.88:(role==='time'||role==='date')?0.9:1):soft?(role==='title'?0.98:role==='caption'?0.94:(role==='time'||role==='date')?0.9:1):(role==='title'?1.08:role==='place'?1.1:(role==='intro'||role==='closing')?1.04:1);
  const fontSize=clamp(o.fontSize??size*scaleByRole,14,80);
  const lineFactor=soft?(role==='caption'||role==='intro'||role==='closing'?1.48:1.3):urban?(role==='caption'?1.34:1.2):(role==='caption'||role==='intro'||role==='closing'?1.42:1.24);
  const lineHeight=fontSize*lineFactor;
  const maxLines=Math.max(1,Math.min(lines,Math.floor(room/lineHeight)));
  const width=clamp(move.width??w,100,940);
  const fontFamily=urban?(role==='title'?'Impact, "Arial Black", "Microsoft YaHei", sans-serif':role==='date'||role==='time'?'"Courier New", "Songti SC", monospace':role==='place'?'"Arial Black", "Kaiti SC", sans-serif':'Georgia, "Songti SC", SimSun, serif'):soft?'"Kaiti SC", STKaiti, "Microsoft YaHei", sans-serif':'STKaiti, "Kaiti SC", KaiTi, "Songti SC", serif';
  const fontWeight=o.fontWeight??(role==='title'?(urban?800:600):role==='place'?(urban?700:600):urban&&(role==='date'||role==='time')?600:400);
  const letterSpacing=urban?(role==='title'?3.5:role==='date'||role==='time'?1.8:role==='place'?1.2:.35):soft?(role==='title'?1.6:role==='place'?1.1:.75):(role==='title'?2.2:role==='place'?1.3:.65);
  const rotation=urban?(role==='title'?-0.45:role==='caption'?(id.length%2?0.18:-0.18):0):soft?(role==='intro'?-0.22:role==='closing'?0.2:role==='caption'?(id.length%2?0.16:-0.16):0):(role==='intro'?-0.3:role==='closing'?0.28:role==='place'?(id.length%2?0.22:-0.22):0);
  scene.texts.push({id,label,text:normalizedValue||'',x:clamp(move.x??x,70,1010-width),y:clamp(move.y??y,70,1350-maxLines*lineHeight),width,fontSize,fontFamily,fontWeight,color:urban?(role==='date'||role==='time'?'#66594b':role==='title'?'#201f1c':'#39332c'):soft?(role==='date'||role==='time'?'#78918d':role==='title'?'#42645b':'#50665f'):role==='date'||role==='time'?'#9a6f4c':role==='title'?'#3f563b':ink,align:o.align??'left',lineHeight,letterSpacing,rotation,maxLines,maxLength:role==='title'?50:120});
 };
 const title=story?.title?.trim();
 text('title','标题',title&& !['一天的旅行','这一天的旅行'].includes(title)?title:story?.city?story.city+'旅行日记':'今天的旅行',80,76,850,urban?64:58,2,148);
 text('date','日期',content.dateText||story?.date||'',80,228,300,20,1,26);
 text('city','城市',story?.city||'',720,228,280,20,1,26);
 text('intro','开场',story?.summary||'',80,268,920,22,1,28);
 scene.decorations.push({kind:'line',x:80,y:216,width:urban?920:560,height:0,color:urban?'#292622':'#97a680'});
 const stops=story?.stops??[];
 scene.stopBlocks=layoutStopBlocks(stops,template.id);
 stops.forEach((stop,index)=>{
  const block=scene.stopBlocks[index],dense=stops.length>4;
  scene.nodes.push({stopId:stop.id,x:block.nodeX,y:block.nodeY});
  const headerY=block.y+8,placeSize=stops.length>6?18:stops.length>4?21:27;
  text(stop.id+':time','时间',stop.startTime,block.textX,headerY,block.textWidth,stops.length>6?14:17,1,22);
  text(stop.id+':place','地点',stop.placeName,block.textX,headerY+(stops.length>6?22:27),block.textWidth,placeSize,stops.length>4?1:2,stops.length>4?28:62);
  const captionY=headerY+(stops.length>6?48:stops.length>4?58:82);
  const captionRoom=Math.max(24,block.y+block.height-captionY-6);
  text(stop.id+':caption','配文',stop.caption,block.textX,captionY,block.textWidth,stops.length>6?15:stops.length>4?17:19,stops.length>6?2:stops.length>4?3:5,captionRoom);
  if(stop.caption?.trim())scene.decorations.push({kind:'rect',x:block.textX-7,y:captionY-5,width:block.textWidth+14,height:Math.min(captionRoom+6,dense?58:96),color:urban?'#e5dac3':soft?'#f9f3df':'#f8eed5',rotation:0});

  const allItems=stop.representativePhotoIds.map(id=>photos.find(photo=>photo.id===id));
  if(allItems.some(photo=>!photo))throw new Error('缺少行程照片');
  const items=allItems.slice(0,block.photoRects.length),overflow=Math.max(0,allItems.length-items.length);
  items.forEach((photo,photoIndex)=>{
   if(!photo)return;
   const cell=block.photoRects[photoIndex],pad=stops.length>6?4:urban?7:8,bottom=urban?pad:photoIndex===0?pad*2.2:pad;
   const edit=edits.photos[photo.id]??{},defaultWidth=cell.width,defaultHeight=cell.height;
   const width=clamp(edit.width??defaultWidth,72,940),height=clamp(edit.height??defaultHeight,72,1240);
   const rotation=clamp(edit.rotation??(urban?(photoIndex%2?1.6:-1.2):soft?((index+photoIndex)%2?1.2:-1.2):((index+photoIndex)%2 ? 0.8 : -0.8)),-15,15);
   if(!edit.hidden)scene.photos.push({photo,stopId:stop.id,x:clamp(edit.x??cell.x,0,1080-width),y:clamp(edit.y??cell.y,0,1440-height),width,height,rotation,padding:pad,bottom,frame:urban?'#eae4d6':'#fcf8ed',borderRadius:urban?0:2,fit:edit.fit??'cover',cropX:clamp(edit.cropX??.5,0,1),cropY:clamp(edit.cropY??.5,0,1),tape:['#acb9a0','#a9c4c7','#c9ac7e','#d3ca99','#d0baad'][(index+photoIndex)%5],zIndex:40+index*3+photoIndex,overflow:photoIndex===items.length-1?overflow:0});
  });
 });
 text('closing','结尾',story?.closingText||'',100,1290,840,24,2,60);
 const stickerIds=STICKER_LIBRARY[template.id];
 const stickerAnchors:Record<JournalTemplate['id'],Array<[number,number]>>={
  route_journal:[[770,1180],[24,1145],[855,142],[946,58],[18,520],[966,840],[20,760],[938,1280],[882,252],[470,1215],[24,1260],[448,1265],[930,690],[760,1320]],
  soft_scrapbook:[[118,246],[32,1138],[940,610],[18,890],[862,116],[780,1300],[30,1260],[932,330],[874,1050],[470,1230],[955,760],[160,1320],[835,245],[30,360]],
  urban_grunge:[[16,1118],[780,1182],[870,146],[28,760],[940,1020],[906,300],[180,246],[18,520],[850,1310],[442,1170],[900,620],[20,1300],[932,900],[420,1280]],
 };
 const contentBoxes=[...scene.photos.map(photo=>({x:photo.x,y:photo.y,width:photo.width,height:photo.height})),...scene.texts.filter(item=>item.text.trim()).map(item=>({x:item.x,y:item.y,width:item.width,height:item.lineHeight*item.maxLines}))];
 const obscuresContent=(item:{x:number;y:number;width:number;height:number})=>contentBoxes.some(box=>{const width=Math.max(0,Math.min(item.x+item.width,box.x+box.width)-Math.max(item.x,box.x)),height=Math.max(0,Math.min(item.y+item.height,box.y+box.height)-Math.max(item.y,box.y));return width*height>item.width*item.height*.18;});
 const initialPlacement=(x:number,y:number,width:number,height:number,rotation:number,locked:boolean)=>{
  const offsets:[[number,number],...Array<[number,number]>]=[[0,0],[0,-72],[0,72],[-76,0],[76,0],[-70,-62],[70,62]];
  for(const [dx,dy] of offsets){const placed=ensureDecorationInsideCanvas({x:x+dx,y:y+dy,width,height,rotation});if(placed&&(locked||!obscuresContent(placed)))return placed;}
  return null;
 };
 const baseStickerCount=template.id==='route_journal'?12:template.id==='soft_scrapbook'?14:12;
 const stickerCount=Math.max(4,baseStickerCount-Math.max(0,stops.length-2)*2);
 for(let i=0;i<stickerCount;i++){const id=`sticker-${template.id}-${i}`,edit=(edits.stickers??{})[id]??{},locked=edit.locked??i<2;if(edit.hidden)continue;const libraryIndex=i<2?i:2+((i-2+stops.length)%(stickerIds.length-2)),stickerId=edit.stickerId??stickerIds[libraryIndex],size=stickerSize(stickerId),anchor=stickerAnchors[template.id][i%stickerAnchors[template.id].length],width=clamp(edit.width??size.width,24,360),height=clamp(edit.height??size.height,24,260),rotation=edit.rotation??((i%5)-2)*2;const placed=edit.x!==undefined||edit.y!==undefined?ensureDecorationInsideCanvas({x:edit.x??anchor[0],y:edit.y??anchor[1],width,height,rotation}):initialPlacement(anchor[0],anchor[1],width,height,rotation,locked);if(!placed)continue;scene.stickers.push({id,stickerId,...placed,zIndex:edit.zIndex??(locked?2:55+i%8),locked});}
 for(const [id,edit] of Object.entries(edits.stickers??{})){if(id.startsWith('sticker-')||edit.hidden||!edit.stickerId)continue;const placed=ensureDecorationInsideCanvas({x:edit.x??120,y:edit.y??120,width:clamp(edit.width??64,24,300),height:clamp(edit.height??64,24,300),rotation:edit.rotation??0});if(placed)scene.stickers.push({id,stickerId:edit.stickerId,...placed,zIndex:edit.zIndex??60,locked:edit.locked??false});}
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
