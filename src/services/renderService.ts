import type {Photo} from '../types/photo';
import type {JournalContent,TextStyleOverride} from '../types/journal';
import type {JournalTemplate} from '../types/template';
import type {DayItinerary} from '../types/story';
import type {SceneEdits} from '../types/scene';
import {buildJournalScene,capacityIssue} from './journalSceneService';
import {sceneArtwork,tapeArtwork,svgUrl} from './sceneArtwork';
import {imageGeometry} from './photoGeometry';
import {wrapText} from '../utils/textLayout';
import {stickerSvg} from '../assets/journal/stickers';
export {wrapText} from '../utils/textLayout';
async function loadImage(url:string){const img=new Image();img.src=url;await img.decode();return img;}
export function drawImageCover(ctx:CanvasRenderingContext2D,image:HTMLImageElement,x:number,y:number,width:number,height:number){const g=imageGeometry(image.naturalWidth,image.naturalHeight,width,height,'cover');ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();ctx.drawImage(image,x+g.x,y+g.y,g.width,g.height);ctx.restore();}
export async function renderJournal({photos,template,content,overrides={},story,edits}:{photos:Photo[];template:JournalTemplate;content:JournalContent;overrides?:Record<string,TextStyleOverride>;story?:DayItinerary;edits?:SceneEdits}):Promise<Blob>{
 if(!photos.length)throw new Error('请先确认代表照片');
 const issue=capacityIssue(story);if(issue)throw new Error(issue);
 await document.fonts.ready;
 const scene=buildJournalScene(template,photos,content,overrides,story,edits);
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1440;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas unavailable');
 try{
 ctx.fillStyle=scene.background;ctx.fillRect(0,0,1080,1440);
 ctx.drawImage(await loadImage(scene.paperUrl),0,0,1080,1440);
 ctx.drawImage(await loadImage(svgUrl(sceneArtwork(scene))),0,0,1080,1440);
 const drawSticker=async(s:typeof scene.stickers[number])=>{ctx.save();ctx.translate(s.x+s.width/2,s.y+s.height/2);ctx.rotate(s.rotation*Math.PI/180);ctx.drawImage(await loadImage(svgUrl(stickerSvg(s.stickerId,template.id==='urban_grunge'?'#40362d':template.id==='soft_scrapbook'?'#6f8d82':'#a85f38'))),-s.width/2,-s.height/2,s.width,s.height);ctx.restore();};
 for(const s of scene.stickers.filter(s=>s.zIndex<40).sort((a,b)=>a.zIndex-b.zIndex))await drawSticker(s);
 for(const p of scene.photos){
  const url=URL.createObjectURL(p.photo.file);
  try{
   const image=await loadImage(url),w=p.width,h=p.height;
   ctx.save();ctx.translate(p.x+w/2,p.y+h/2);ctx.rotate(p.rotation*Math.PI/180);
   ctx.fillStyle=p.frame;ctx.shadowColor='#58432528';ctx.shadowBlur=12;ctx.shadowOffsetY=6;
   ctx.beginPath();ctx.roundRect(-w/2,-h/2,w,h,p.borderRadius);ctx.fill();ctx.shadowColor='transparent';
   const x=-w/2+p.padding,y=-h/2+p.padding,iw=w-2*p.padding,ih=h-p.padding-p.bottom;
   ctx.save();ctx.beginPath();ctx.rect(x,y,iw,ih);ctx.clip();
   const g=imageGeometry(image.naturalWidth,image.naturalHeight,iw,ih,p.fit,p.cropX,p.cropY);
   ctx.drawImage(image,x+g.x,y+g.y,g.width,g.height);ctx.restore();
   ctx.drawImage(await loadImage(svgUrl(tapeArtwork(p))),-w/2,-h/2,w,h);
   if(p.overflow){const label=`+${p.overflow}`,badgeWidth=48,badgeHeight=34,badgeX=w/2-badgeWidth-12,badgeY=h/2-badgeHeight-12;ctx.fillStyle='#2f332de0';ctx.beginPath();ctx.roundRect(badgeX,badgeY,badgeWidth,badgeHeight,17);ctx.fill();ctx.fillStyle='#fffaf0';ctx.font='700 17px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,badgeX+badgeWidth/2,badgeY+badgeHeight/2);}
   ctx.restore();
  }finally{URL.revokeObjectURL(url);}
 }
 for(const s of scene.stickers.filter(s=>s.zIndex>=40).sort((a,b)=>a.zIndex-b.zIndex))await drawSticker(s);
 for(const t of scene.texts){
  if(!t.text)continue;ctx.save();const textHeight=t.height;ctx.translate(t.x+t.width/2,t.y+textHeight/2);ctx.rotate(t.rotation*Math.PI/180);ctx.font=t.fontWeight+' '+t.fontSize+'px '+t.fontFamily;ctx.fillStyle=t.color;ctx.textAlign=t.align;ctx.textBaseline='top';
  (ctx as CanvasRenderingContext2D&{letterSpacing?:string}).letterSpacing=t.letterSpacing+'px';
  const lines=wrapText(s=>ctx.measureText(s).width,t.text,t.width);
  const x=-t.width/2+(t.align==='center'?t.width/2:t.align==='right'?t.width:0),y=-textHeight/2;
  lines.forEach((line,i)=>ctx.fillText(line,x,y+i*t.lineHeight+(t.lineHeight-t.fontSize)/2));ctx.restore();
 }
 return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('PNG generation failed')),'image/png'));
 }finally{canvas.width=canvas.height=1;}
}
