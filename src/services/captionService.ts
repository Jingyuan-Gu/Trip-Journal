import type { Photo } from '../types/photo';
export async function generateStopCaption(input:{placeName:string;startTime:string;photos:Photo[]}):Promise<string>{
  if(!input.photos.length)throw new Error('请先添加代表照片');
  const images=[] as {id:string;dataUrl:string}[];
  for(const p of input.photos.slice(0,4)){
    const url=URL.createObjectURL(p.file);try{const image=new Image();image.src=url;await image.decode();const ratio=Math.min(1,960/Math.max(image.naturalWidth,image.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image encoding failed');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);images.push({id:p.id,dataUrl:canvas.toDataURL('image/jpeg',.78)});canvas.width=canvas.height=0;}finally{URL.revokeObjectURL(url);}
  }
  const r=await fetch('/api/generate-stop-caption',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({placeName:input.placeName,startTime:input.startTime,images}),signal:AbortSignal.timeout(65000)});
  if(!r.ok)throw new Error('caption failed'); const data=await r.json(); if(typeof data.caption!=='string'||!data.caption.trim())throw new Error('caption failed'); return data.caption.trim();
}
