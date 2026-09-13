import type { Photo, PhotoLocation } from '../types/photo';
import type { DayItinerary, PhotoCluster } from '../types/story';
export const CLUSTER_OPTIONS = { distanceMeters:500, closeMeters:200, minimumTravelMinutes:2, longGapMinutes:180, visualGapMinutes:30, visualDistance:.3, missingVisualGapMinutes:90 };
export function distanceMeters(a: PhotoLocation, b: PhotoLocation) {
  const rad = Math.PI / 180, dLat = (b.latitude - a.latitude) * rad, dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export const photoSignature = (photos: Photo[]) => photos.map(p => p.id).sort().join('|');
export function clusterPhotos(photos: Photo[], visualDistance?: (a:string,b:string)=>number|undefined): PhotoCluster[] {
  const sorted = [...photos].sort((a,b) => (a.timestamp ?? Infinity) - (b.timestamp ?? Infinity));
  const batches: Photo[][] = [];
  for (const photo of sorted) {
    const batch = batches.at(-1), previous = batch?.at(-1);
    const gap = previous?.timestamp != null && photo.timestamp != null ? (photo.timestamp - previous.timestamp) / 60000 : 0;
    const moved = previous?.location && photo.location && distanceMeters(previous.location, photo.location) > CLUSTER_OPTIONS.distanceMeters;
    const visual=previous?visualDistance?.(previous.id,photo.id):undefined;
    const closeGPS=previous?.location&&photo.location&&distanceMeters(previous.location,photo.location)<CLUSTER_OPTIONS.closeMeters;
    const boundary=(moved&&gap>=CLUSTER_OPTIONS.minimumTravelMinutes)||(!closeGPS&&gap>CLUSTER_OPTIONS.longGapMinutes)||(!closeGPS&&gap>CLUSTER_OPTIONS.visualGapMinutes&&visual!==undefined&&visual>CLUSTER_OPTIONS.visualDistance)||(!closeGPS&&gap>CLUSTER_OPTIONS.missingVisualGapMinutes&&visual===undefined);
    if (!batch || boundary || (photo.timestamp === null && previous?.timestamp !== null)) batches.push([photo]);
    else batch.push(photo);
  }
  return batches.map((batch, index) => {
    const locations = batch.flatMap(p => p.location ? [p.location] : []);
    const representativePhotoIds = [...new Set([0, Math.floor((batch.length - 1) / 2), batch.length - 1])].map(i => batch[i].id);
    return { id: `cluster-${index}`, startTime: batch[0].timestamp, endTime: batch.at(-1)!.timestamp, photoIds: batch.map(p => p.id), representativePhotoIds,
      centerLocation: locations.length ? { latitude: locations.reduce((sum,p)=>sum+p.latitude,0)/locations.length, longitude: locations.reduce((sum,p)=>sum+p.longitude,0)/locations.length } : undefined };
  });
}
export function recommendPhotos(day: DayItinerary, available: Photo[], limit = 9): string[] {
  limit = Math.max(0, Math.min(12, Math.floor(limit)));
  const valid = new Set(available.map(p => p.id));
  const pools = day.stops.map(stop => [...new Set(stop.representativePhotoIds.length?stop.representativePhotoIds:stop.photoIds.slice(0,1))].filter(id => valid.has(id)));
  const selected: string[] = [];
  for (let round = 0; selected.length < limit && pools.some(pool => round < pool.length); round++) {
    for (const pool of pools) if (pool[round] && !selected.includes(pool[round]) && selected.length < limit) selected.push(pool[round]);
  }
  return selected;
}
