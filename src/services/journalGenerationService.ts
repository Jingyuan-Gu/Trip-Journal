import type { DayItinerary } from '../types/story';
import type { Photo } from '../types/photo';
import { stylePrompts, type JournalStyleId } from '../config/stylePrompts';
export interface GeneratedJournalResult { previewImageUrl:string|null; generationMeta:{mode:'mock'|'live';prompt:string;photoIds:string[]}; styleId:JournalStyleId }
export function buildJournalGenerationInput(styleId:JournalStyleId,itinerary:DayItinerary,photos:Photo[]){
 const photoIds=itinerary.stops.flatMap(stop=>stop.representativePhotoIds).slice(0,10);return {style:stylePrompts[styleId].promptTemplate,date:itinerary.date,city:itinerary.city,title:itinerary.title,stops:itinerary.stops.map(stop=>({time:stop.startTime,placeName:stop.placeName,caption:stop.caption,representativePhotoIds:stop.representativePhotoIds.filter(id=>photoIds.includes(id))})),photoIds,photos:photos.filter(photo=>photoIds.includes(photo.id)).map(photo=>({id:photo.id,thumbnailUrl:photo.thumbnailUrl}))};
}
export async function generateJournalPage({styleId,itinerary,photos}:{styleId:JournalStyleId;itinerary:DayItinerary;photos:Photo[]}):Promise<GeneratedJournalResult>{
 const input=buildJournalGenerationInput(styleId,itinerary,photos);await new Promise(resolve=>setTimeout(resolve,260));return {previewImageUrl:null,generationMeta:{mode:'mock',prompt:input.style,photoIds:input.photoIds},styleId};
}
