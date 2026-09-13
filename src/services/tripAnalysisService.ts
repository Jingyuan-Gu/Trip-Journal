import type { Photo } from '../types/photo';
import type { DayItinerary, PhotoCluster } from '../types/story';
import { clusterCandidateStops, gpsDistanceMeters } from './stopClusteringService';
export const distanceMeters = gpsDistanceMeters;
export const photoSignature = (photos: Photo[]) => photos.map(p => `${p.id}:${p.timestamp ?? ''}:${p.location?.latitude?.toFixed(5) ?? ''},${p.location?.longitude?.toFixed(5) ?? ''}`).sort().join('|');
export function clusterPhotos(photos: Photo[], visualDistance?: (a:string,b:string)=>number|undefined): PhotoCluster[] {
  return clusterCandidateStops(photos, visualDistance).map((candidate) => {
    const batch = candidate.photoIds.map(id => photos.find(p => p.id === id)!).filter(Boolean);
    const representativePhotoIds = [...new Set([0, Math.floor((batch.length - 1) / 2), batch.length - 1])].map(i => batch[i].id);
    return { id: candidate.id, startTime: candidate.startTime, endTime: candidate.endTime, photoIds: candidate.photoIds, representativePhotoIds, centerLocation: candidate.centroidGps, confidence: candidate.confidence, boundaryReasons: candidate.boundaryReasons };
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
