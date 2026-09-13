import { useMemo,useRef,useState,useEffect,type PointerEvent } from 'react';
import type { JournalContent,TextStyleOverride } from '../types/journal';
import type { JournalTemplate } from '../types/template';
import type { Photo } from '../types/photo';
import type { DayItinerary } from '../types/story';
import type { SceneEdits } from '../types/scene';
import { emptySceneEdits } from '../types/scene';
import { buildJournalScene,clamp } from '../services/journalSceneService';
import { sceneArtwork,tapeArtwork,svgUrl } from '../services/sceneArtwork';
import { stickerSvg } from '../assets/journal/stickers';
import { imageGeometry } from '../services/photoGeometry';
import { wrapText } from '../utils/textLayout';
import '../story.css';

interface Props {template:JournalTemplate;photos:Photo[];content:JournalContent;editable?:boolean;selectedTextId?:string|null;onSelectText?:(id:string)=>void;overrides?:Record<string,TextStyleOverride>;story?:DayItinerary;onTextChange?:(id:string,value:string)=>void;edits?:SceneEdits;onEdits?:(edits:SceneEdits)=>void}
export function JournalPreview({template,photos,content,editable=false,selectedTextId,onSelectText,overrides={},story,onTextChange,edits=emptySceneEdits,onEdits}:Props){
 const scene=useMemo(()=>buildJournalScene(template,photos,content,overrides,story,edits),[template,photos,content,overrides,story,edits]);
 const viewportRef=useRef<HTMLDivElement>(null),[scale,setScale]=useState(.5),[cropId,setCropId]=useState<string|null>(null);
 const drag=useRef<{id:string;kind:'photo'|'resize'|'crop'|'text'|'textResize'|'sticker'|'stickerResize';startX:number;startY:number;base:SceneEdits;x:number;y:number;width:number;height:number;rotation:number;cropX:number;cropY:number;overflowX:number;overflowY:number}|null>(null);
 useEffect(()=>{const node=viewportRef.current;if(!node)return;const update=()=>setScale(Math.min(node.clientWidth/1080,1));update();const ro=new ResizeObserver(update);ro.observe(node);return()=>ro.disconnect();},[]);
 const begin=(e:PointerEvent<HTMLElement>,id:string,kind:'photo'|'resize'|'crop'|'text'|'textResize'|'sticker'|'stickerResize')=>{
  if(!editable||!onEdits||e.button!==0)return;e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);
  const photo=scene.photos.find(p=>p.photo.id===id),text=scene.texts.find(t=>t.id===id),sticker=scene.stickers.find(s=>s.id===id);
  const item=kind==='text'||kind==='textResize'?text:kind==='sticker'||kind==='stickerResize'?sticker:photo;if(!item)return;
  onSelectText?.(photo&&kind!=='text'&&kind!=='textResize'?'photo:'+id:(kind==='sticker'||kind==='stickerResize')?'sticker:'+id:id);
  const height='height'in item?item.height:item.lineHeight*item.maxLines;
  const iw=photo?photo.width-photo.padding*2:0,ih=photo?photo.height-photo.padding-photo.bottom:0;
  const g=photo?imageGeometry(photo.photo.width,photo.photo.height,iw,ih,'cover'):null;
  drag.current={id,kind,startX:e.clientX,startY:e.clientY,base:edits,x:item.x,y:item.y,width:item.width,height,rotation:photo?.rotation??0,cropX:photo?.cropX??.5,cropY:photo?.cropY??.5,overflowX:g?g.width-iw:0,overflowY:g?g.height-ih:0};
 };
 const move=(e:PointerEvent<HTMLElement>)=>{
  const d=drag.current;if(!d||!onEdits)return;
  const dx=(e.clientX-d.startX)/scale,dy=(e.clientY-d.startY)/scale;
  const radians=d.rotation*Math.PI/180,lx=dx*Math.cos(radians)+dy*Math.sin(radians),ly=-dx*Math.sin(radians)+dy*Math.cos(radians);
  if(d.kind==='text'||d.kind==='textResize'){const patch=d.kind==='text'?{x:clamp(d.x+dx,70,1010-d.width),y:clamp(d.y+dy,70,1350-d.height)}:{width:clamp(d.width+dx,100,1010-d.x)};onEdits({...d.base,texts:{...d.base.texts,[d.id]:{...d.base.texts[d.id],...patch}}});return;}
  if(d.kind==='sticker'||d.kind==='stickerResize'){const patch=d.kind==='sticker'?{x:clamp(d.x+dx,0,1080-d.width),y:clamp(d.y+dy,0,1440-d.height)}:{width:clamp(d.width+dx,24,300),height:clamp(d.height+dy,24,300)};onEdits({...d.base,stickers:{...(d.base.stickers??{}),[d.id]:{...(d.base.stickers??{})[d.id],...patch}}});return;}
  const factor=clamp(1+lx/d.width,.3,Math.min(940/d.width,1240/d.height));
  const patch=d.kind==='crop'?{fit:'cover' as const,cropX:d.overflowX>1?clamp(d.cropX-lx/d.overflowX,0,1):.5,cropY:d.overflowY>1?clamp(d.cropY-ly/d.overflowY,0,1):.5}:d.kind==='resize'?{width:d.width*factor,height:d.height*factor}:{x:clamp(d.x+dx,0,1080-d.width),y:clamp(d.y+dy,0,1440-d.height)};
  onEdits({...d.base,photos:{...d.base.photos,[d.id]:{...d.base.photos[d.id],...patch}}});
 };
 const finish=()=>{drag.current=null;};
 const activePhoto=scene.photos.find(p=>'photo:'+p.photo.id===selectedTextId);
 const activeSticker=scene.stickers.find(s=>'sticker:'+s.id===selectedTextId&&!s.locked);
 const patchActive=(patch:Partial<SceneEdits['photos'][string]>)=>{if(activePhoto)onEdits?.({...edits,photos:{...edits.photos,[activePhoto.photo.id]:{...edits.photos[activePhoto.photo.id],...patch}}});};
 const layer=(kind:'photo'|'sticker',action:'up'|'down'|'front'|'back')=>{if(kind==='photo'){if(!activePhoto)return;const records=edits.photos??{},itemId=activePhoto.photo.id,current=activePhoto.zIndex,z=action==='up'?Math.min(89,current+1):action==='down'?Math.max(30,current-1):action==='front'?89:30;onEdits?.({...edits,photos:{...records,[itemId]:{...records[itemId],zIndex:z}}});}else{if(!activeSticker)return;const records=edits.stickers??{},itemId=activeSticker.id,current=activeSticker.zIndex,z=action==='up'?Math.min(89,current+1):action==='down'?Math.max(30,current-1):action==='front'?89:30;onEdits?.({...edits,stickers:{...records,[itemId]:{...records[itemId],zIndex:z}}});}};
 const measured=useMemo(()=>{const c=document.createElement('canvas').getContext('2d');return scene.texts.map(t=>{if(c)c.font=t.fontWeight+' '+t.fontSize+'px '+t.fontFamily;return {t,display:wrapText(s=>c?c.measureText(s).width:s.length*t.fontSize,t.text,t.width,t.maxLines).join('\n')};});},[scene]);
 return <div className="journal-layered-preview">
 {editable&&activePhoto&&<div className="photo-tools" aria-label="图片调整">
 {cropId&&<span>拖动照片内容调整取景</span>}
 <button type="button" onClick={()=>{setCropId(cropId?null:activePhoto.photo.id);if(!cropId)patchActive({fit:'cover'});}}>{cropId?'完成裁切':'调整裁切'}</button>
 <button type="button" onClick={()=>{patchActive({fit:'contain',cropX:.5,cropY:.5});setCropId(null);}}>完整原图</button>
 {cropId&&<label>取景比例<select aria-label="取景比例" defaultValue="" onChange={e=>{if(!e.target.value)return;const ratio=Number(e.target.value),innerWidth=Math.min(activePhoto.width-activePhoto.padding*2,(activePhoto.height-activePhoto.padding-activePhoto.bottom)*ratio);patchActive({width:innerWidth+activePhoto.padding*2,height:innerWidth/ratio+activePhoto.padding+activePhoto.bottom,fit:'cover',cropX:.5,cropY:.5});}}><option value="" disabled>选择比例</option><option value="1">方形 1:1</option><option value="1.5">横向 3:2</option><option value="0.6666666667">竖向 2:3</option></select></label>}
 <button type="button" onClick={()=>{const photos={...edits.photos};delete photos[activePhoto.photo.id];onEdits?.({...edits,photos});setCropId(null);}}>恢复布局</button>
 </div>}
 {editable&&activeSticker&&<div className="photo-tools sticker-tools" aria-label="贴纸调整"><span>贴纸</span><button type="button" onClick={()=>layer('sticker','up')}>图层上移</button><button type="button" onClick={()=>layer('sticker','down')}>图层下移</button><button type="button" onClick={()=>layer('sticker','front')}>置顶</button><button type="button" onClick={()=>layer('sticker','back')}>置底</button><button type="button" onClick={()=>{onEdits?.({...edits,stickers:{...(edits.stickers??{}),[activeSticker.id]:{...(edits.stickers??{})[activeSticker.id],hidden:true}}});onSelectText?.('');}}>删除贴纸</button></div>}
 <div ref={viewportRef} className="preview-viewport" style={{aspectRatio:'3 / 4',maxWidth:1080}}>
 <div className="design-canvas" data-style={template.id} style={{backgroundColor:scene.background,width:1080,height:1440,transform:'scale('+scale+')',transformOrigin:'top left'}} onClick={()=>{onSelectText?.('');setCropId(null);}}>
 <img className="scene-paper-layer" src={scene.paperUrl} alt="" draggable={false}/>
 <img className="scene-art-layer" src={svgUrl(sceneArtwork(scene))} alt="" draggable={false}/>
 {scene.photos.map(slot=>{const id=slot.photo.id,selected=selectedTextId==='photo:'+id;
 return <div key={id} data-photo-id={id} className={'scene-photo '+(editable?'is-photo-editable ':'')+(selected?'photo-selected ':'')+(cropId===id?'is-crop-mode':'')}
 style={{position:'absolute',left:slot.x,top:slot.y,width:slot.width,height:slot.height,padding:slot.padding,paddingBottom:slot.bottom,background:slot.frame,transform:'rotate('+slot.rotation+'deg)',borderRadius:slot.borderRadius,zIndex:slot.zIndex}}
 onClick={e=>{if(editable){e.stopPropagation();onSelectText?.('photo:'+id);}}}
 onDoubleClick={e=>{if(!editable)return;e.stopPropagation();setCropId(cropId===id?null:id);onSelectText?.('photo:'+id);if(cropId!==id)onEdits?.({...edits,photos:{...edits.photos,[id]:{...edits.photos[id],fit:'cover'}}});}}
 onPointerDown={e=>begin(e,id,cropId===id?'crop':'photo')} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}>
 <img src={slot.photo.thumbnailUrl} alt={slot.photo.fileName} draggable={false} style={{objectFit:slot.fit,objectPosition:(slot.cropX*100)+'% '+(slot.cropY*100)+'%'}}/>
 <img className="photo-tape" src={svgUrl(tapeArtwork(slot))} alt="" draggable={false}/>
 {editable&&selected&&<button aria-label="拖动缩放图片" className="element-resize" onClick={e=>e.stopPropagation()} onPointerDown={e=>begin(e,id,'resize')}/>}
 </div>;})}
 {scene.stickers.map(sticker=>{const selected=selectedTextId==='sticker:'+sticker.id;return <div key={sticker.id} className={'scene-sticker '+(selected?'sticker-selected':'')} style={{position:'absolute',left:sticker.x,top:sticker.y,width:sticker.width,height:sticker.height,transform:`rotate(${sticker.rotation}deg)`,zIndex:sticker.zIndex,pointerEvents:editable&&!sticker.locked?'auto':'none',cursor:editable&&!sticker.locked?'grab':undefined}} onClick={e=>{if(editable&&!sticker.locked){e.stopPropagation();onSelectText?.('sticker:'+sticker.id);}}} onPointerDown={e=>{if(editable&&!sticker.locked)begin(e,sticker.id,'sticker')}} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={finish}><img src={svgUrl(stickerSvg(sticker.stickerId,template.id==='urban_grunge'?'#40362d':template.id==='soft_scrapbook'?'#6f8d82':'#a85f38'))} alt="" draggable={false} style={{display:'block',width:'100%',height:'100%'}}/>{editable&&selected&&<button aria-label="调整贴纸大小" className="element-resize" onClick={e=>e.stopPropagation()} onPointerDown={e=>{e.stopPropagation();begin(e,sticker.id,'stickerResize')}} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}/>}</div>})}
 {measured.map(({t,display})=>{const canEdit=editable&&!['city','intro','closing'].includes(t.id),hasText=Boolean(display.trim()),isEmptyEditor=canEdit&&!hasText;return <div key={t.id} className={'text-element '+(isEmptyEditor?'scene-empty-field':'')} style={{position:'absolute',left:t.x,top:t.y,width:t.width,height:t.lineHeight*t.maxLines,zIndex:4}}>
 {canEdit&&selectedTextId===t.id&&<button className="text-move" aria-label={'移动'+t.label} onPointerDown={e=>begin(e,t.id,'text')} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onClick={e=>e.stopPropagation()}>⠿</button>}
 {canEdit&&selectedTextId===t.id?<textarea autoFocus aria-label={t.label} className="scene-inline is-text-selected" style={{width:'100%',height:'100%',fontFamily:t.fontFamily,fontSize:t.fontSize,fontWeight:t.fontWeight,color:t.color,lineHeight:t.lineHeight+'px',textAlign:t.align}} value={t.text} maxLength={t.maxLength} onClick={e=>e.stopPropagation()} onChange={e=>onTextChange?.(t.id,e.target.value)} onKeyDown={e=>{if(e.key==='Escape'||((e.ctrlKey||e.metaKey)&&e.key==='Enter')){e.currentTarget.blur();onSelectText?.('');}}}/>:<div role={canEdit?'button':undefined} tabIndex={canEdit?0:undefined} aria-label={t.label} className={'scene-text '+(isEmptyEditor?'scene-empty-text':'')} style={{width:'100%',height:'100%',fontFamily:t.fontFamily,fontSize:t.fontSize,fontWeight:t.fontWeight,color:t.color,lineHeight:t.lineHeight+'px',textAlign:t.align,cursor:canEdit?'text':undefined}} onClick={e=>{if(canEdit){e.stopPropagation();onSelectText?.(t.id);}}} onKeyDown={e=>{if(canEdit&&e.key==='Enter')onSelectText?.(t.id);}}>{hasText?display:(isEmptyEditor&&selectedTextId===t.id?'添加'+t.label:'')}</div>}
 {canEdit&&selectedTextId===t.id&&<button className="element-resize" aria-label={'调整'+t.label+'宽度'} onPointerDown={e=>begin(e,t.id,'textResize')} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onClick={e=>e.stopPropagation()}/>} 
 </div>})}
 </div></div></div>;
}
