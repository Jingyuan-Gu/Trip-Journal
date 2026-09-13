import type { TripStop } from '../types/story';
const placeholderPlaces = /^(第\s*\d+\s*段\s*·\s*待确认地点|待确认地点|GPS 拍摄地点(?:（待确认）)?)$/;
const placeholderCaptions = new Set(['在这里留下一段照片，具体的故事由我补上。','这段照片的故事，留给我慢慢写。']);
/** Compatibility for existing session/API data; does not change analysis evidence. */
export function presentStop(stop: TripStop): TripStop {
  const name=stop.placeName.trim();
  const unknown=stop.placeSource==='unknown'||!name||(stop.placeSource!=='manual'&&placeholderPlaces.test(name));
  return {...stop,placeName:unknown?'':name,placeSource:unknown?'unknown':stop.placeSource??(stop.locationSource==='gps'?'gps':stop.locationSource==='visual'?'ai':'unknown'),placeConfidence:stop.placeConfidence??stop.confidence,caption:placeholderCaptions.has(stop.caption.trim())?'':stop.caption};
}
export function manualPlace(value:string):Pick<TripStop,'placeName'|'placeSource'|'placeConfidence'> {
  return {placeName:value,placeSource:value.trim()?'manual':'unknown',placeConfidence:undefined};
}
