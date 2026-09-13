import type { DayItinerary,TripStop } from '../types/story';
export function movePhoto(day:DayItinerary,photoId:string,targetId:string):DayItinerary{
  return {...day,stops:day.stops.map(stop=>{
    const photoIds=stop.photoIds.filter(id=>id!==photoId);if(stop.id===targetId)photoIds.push(photoId);
    const groups=(stop.similarityGroups??[]).map(g=>{const ids=g.photoIds.filter(id=>id!==photoId);return {...g,photoIds:ids,representativePhotoId:ids.includes(g.representativePhotoId)?g.representativePhotoId:ids[0]};}).filter(g=>g.photoIds.length);
    if(stop.id===targetId)groups.push({id:`${stop.id}-${photoId}`,stopId:stop.id,photoIds:[photoId],representativePhotoId:photoId,similarityType:'unique'});
    const representatives=stop.representativePhotoIds.filter(id=>id!==photoId);
    if(!representatives.length&&photoIds.length)representatives.push(photoIds[0]);
    return {...stop,photoIds,similarityGroups:groups,representativePhotoIds:representatives,manuallyEdited:true};
  })};
}
export function setRepresentative(stop:TripStop,id:string):TripStop{
  if(!stop.photoIds.includes(id))return stop;
  const group=stop.similarityGroups?.find(g=>g.photoIds.includes(id));
  let ids=stop.representativePhotoIds.filter(other=>!group?.photoIds.includes(other));
  if(ids.length>=3)ids=ids.slice(0,2);ids.push(id);
  return {...stop,manuallyEdited:true,representativePhotoIds:ids,similarityGroups:stop.similarityGroups?.map(g=>g===group?{...g,representativePhotoId:id}:g)};
}
export function newStop(name:string,time:string):TripStop{return {id:crypto.randomUUID(),placeName:name.trim(),startTime:time,placeSource:'manual',manuallyEdited:true,placeType:'other',confidence:1,locationSource:'inferred',photoIds:[],representativePhotoIds:[],similarityGroups:[],caption:'',shortCaption:''};}
