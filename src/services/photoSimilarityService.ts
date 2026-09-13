import type { Photo } from '../types/photo';
import type { SimilarityGroup } from '../types/story';
import { scorePixels,type VisualFeatures } from './photoQualityService';
const cache=new WeakMap<File,VisualFeatures>();
export const SIMILARITY_OPTIONS={nearPixelDistance:.065,nearHistogramDistance:.12,sameSceneDistance:.18};
export async function describePhotos(photos:Photo[],progress:(message:string)=>void,signal?:AbortSignal){
  const result=new Map<string,VisualFeatures>();
  for(const [i,p] of photos.entries()){
    signal?.throwIfAborted();let feature=cache.get(p.file);
    if(!feature){const image=new Image();const canvas=document.createElement('canvas');
      try{image.src=p.thumbnailUrl;await image.decode();signal?.throwIfAborted();canvas.width=64;canvas.height=64;const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('无法读取照片像素');ctx.fillStyle='#fff';ctx.fillRect(0,0,64,64);ctx.drawImage(image,0,0,64,64);feature=scorePixels(ctx.getImageData(0,0,64,64).data,64,64,p.width*p.height);cache.set(p.file,feature);}
      catch(e){if(signal?.aborted)throw e;}
      finally{image.src='';canvas.width=canvas.height=0;}
    }
    if(feature)result.set(p.id,feature);progress(`正在比较照片 ${i+1} / ${photos.length}`);await new Promise(resolve=>setTimeout(resolve,0));
  }return result;
}
export function visualDistance(a:VisualFeatures,b:VisualFeatures){return a.histogram.reduce((sum,v,i)=>sum+Math.abs(v-b.histogram[i]),0)/6;}
function pixelDistance(a:VisualFeatures,b:VisualFeatures){return Math.sqrt(a.pixels.reduce((sum,v,i)=>sum+(v-b.pixels[i])**2,0)/a.pixels.length);}
export function groupSimilar(stopId:string,photos:Photo[],features:Map<string,VisualFeatures>):SimilarityGroup[]{
  const groups:SimilarityGroup[]=[];
  for(const photo of photos){const a=features.get(photo.id);
    const group=a?groups.find(g=>g.photoIds.every(id=>{const b=features.get(id),other=photos.find(p=>p.id===id)!;return b&&Math.abs(photo.width/photo.height-other.width/other.height)<.05&&pixelDistance(a,b)<SIMILARITY_OPTIONS.nearPixelDistance&&visualDistance(a,b)<SIMILARITY_OPTIONS.nearHistogramDistance;})):undefined;
    if(group){group.photoIds.push(photo.id);group.similarityType='near_duplicate';if((features.get(photo.id)?.score??0)>(features.get(group.representativePhotoId)?.score??0))group.representativePhotoId=photo.id;}
    else groups.push({id:`${stopId}-group-${groups.length}`,stopId,photoIds:[photo.id],representativePhotoId:photo.id,similarityType:'unique'});
  }
  for(const group of groups)if(group.similarityType==='unique'){const a=features.get(group.representativePhotoId);if(a&&groups.some(other=>{const b=features.get(other.representativePhotoId);return other!==group&&b&&visualDistance(a,b)<SIMILARITY_OPTIONS.sameSceneDistance;}))group.similarityType='same_scene';}
  return groups;
}
export function chooseRepresentatives(groups:SimilarityGroup[],features:Map<string,VisualFeatures>,limit=3){
  const candidates=groups.map(g=>g.representativePhotoId),selected:string[]=[];
  while(selected.length<limit&&candidates.length){let best=0,score=-Infinity;for(const [i,id] of candidates.entries()){const f=features.get(id);const diversity=selected.length&&f?Math.min(...selected.map(other=>{const b=features.get(other);return b?visualDistance(f,b):.5;})):1;const value=.6*(f?.score??0)+.4*diversity;if(value>score){score=value;best=i;}}selected.push(candidates.splice(best,1)[0]);}return selected;
}
