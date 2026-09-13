import type { Photo, PhotoLocation } from '../types/photo';

export interface CandidateStop {
  id: string;
  photoIds: string[];
  startTime: number | null;
  endTime: number | null;
  centroidGps?: PhotoLocation;
  confidence: number;
  boundaryReasons: string[];
}

export const STOP_CLUSTER_OPTIONS = {
  timeSoftGapMinutes: 75,
  timeHardGapMinutes: 180,
  gpsNearMeters: 180,
  gpsMoveMeters: 650,
  gpsFarMeters: 1800,
  visualChange: .34,
  boundaryThreshold: .62,
  tinyGroupMaxPhotos: 2,
  tinyGroupMaxGapMinutes: 18,
  weights: { time: .38, gps: .48, visual: .14 },
};

export function gpsDistanceMeters(a: PhotoLocation, b: PhotoLocation) {
  const rad = Math.PI / 180, dLat = (b.latitude - a.latitude) * rad, dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function boundaryScore(gap: number, distance: number | undefined, visual: number | undefined) {
  const o = STOP_CLUSTER_OPTIONS;
  const timeScore = gap >= o.timeHardGapMinutes ? 1 : gap <= 15 ? 0 : (gap - 15) / (o.timeHardGapMinutes - 15);
  const gpsScore = distance === undefined ? 0 : distance <= o.gpsNearMeters ? 0 : distance >= o.gpsFarMeters ? 1 : (distance - o.gpsNearMeters) / (o.gpsFarMeters - o.gpsNearMeters);
  const visualScore = visual === undefined ? 0 : Math.min(1, visual / o.visualChange);
  const gpsWeight = distance === undefined ? .08 : o.weights.gps;
  const timeWeight = distance === undefined ? .68 : o.weights.time;
  const visualWeight = distance === undefined ? .24 : o.weights.visual;
  return { score: timeScore * timeWeight + gpsScore * gpsWeight + visualScore * visualWeight, timeScore, gpsScore };
}

function centroid(batch: Photo[]) {
  const points = batch.flatMap(p => p.location ? [p.location] : []);
  if (!points.length) return undefined;
  return { latitude: points.reduce((s, p) => s + p.latitude, 0) / points.length, longitude: points.reduce((s, p) => s + p.longitude, 0) / points.length };
}

function build(batch: Photo[], index: number, reasons: string[], confidenceHint: number): CandidateStop {
  const gpsCount = batch.filter(p => p.location).length;
  const confidence = Math.max(0, Math.min(1, .38 * Math.min(1, batch.length / 4) + .32 * (gpsCount ? Math.min(1, gpsCount / batch.length + .25) : .2) + .3 * confidenceHint));
  return { id: `cluster-${index}`, photoIds: batch.map(p => p.id), startTime: batch[0]?.timestamp ?? null, endTime: batch.at(-1)?.timestamp ?? null, centroidGps: centroid(batch), confidence, boundaryReasons: reasons };
}

export function clusterCandidateStops(input: Photo[], visualDistance?: (a: string, b: string) => number | undefined): CandidateStop[] {
  const sorted = [...input].sort((a, b) => (a.timestamp ?? Infinity) - (b.timestamp ?? Infinity));
  const groups: { photos: Photo[]; reasons: string[]; confidence: number }[] = [];
  for (const photo of sorted) {
    const current = groups.at(-1), previous = current?.photos.at(-1);
    if (!current || !previous) { groups.push({ photos: [photo], reasons: [], confidence: .6 }); continue; }
    const gap = previous.timestamp != null && photo.timestamp != null ? Math.max(0, (photo.timestamp - previous.timestamp) / 60000) : 0;
    const distance = previous.location && photo.location ? gpsDistanceMeters(previous.location, photo.location) : undefined;
    const visual = visualDistance?.(previous.id, photo.id);
    const result = boundaryScore(gap, distance, visual);
    const shouldSplit = result.score >= STOP_CLUSTER_OPTIONS.boundaryThreshold || (distance !== undefined && distance >= STOP_CLUSTER_OPTIONS.gpsFarMeters) || gap >= STOP_CLUSTER_OPTIONS.timeHardGapMinutes;
    if (shouldSplit) {
      const reasons = [result.timeScore > .55 ? '时间间隔' : '', result.gpsScore > .55 ? '位置移动' : '', visual !== undefined && visual > STOP_CLUSTER_OPTIONS.visualChange ? '场景变化' : ''].filter(Boolean);
      groups.push({ photos: [photo], reasons, confidence: 1 - result.score });
    } else {
      current.photos.push(photo); current.confidence = Math.min(current.confidence, 1 - result.score);
    }
  }
  // Merge tiny fragments into a neighboring group when evidence says they are one visit.
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i], prev = groups[i - 1], next = groups[i + 1];
    if (group.photos.length > STOP_CLUSTER_OPTIONS.tinyGroupMaxPhotos) continue;
    const anchor = prev?.photos.at(-1), tail = group.photos.at(-1);
    const gap = anchor?.timestamp != null && group.photos[0]?.timestamp != null ? (group.photos[0].timestamp - anchor.timestamp) / 60000 : 0;
    const near = anchor?.location && tail?.location && gpsDistanceMeters(anchor.location, tail.location) <= STOP_CLUSTER_OPTIONS.gpsNearMeters;
    if (prev && gap <= STOP_CLUSTER_OPTIONS.tinyGroupMaxGapMinutes && near) { prev.photos.push(...group.photos); prev.confidence = Math.max(prev.confidence, group.confidence); groups.splice(i, 1); i--; }
    else if (next && gap <= STOP_CLUSTER_OPTIONS.tinyGroupMaxGapMinutes && near) { group.photos.push(...next.photos); group.confidence = Math.max(group.confidence, next.confidence); groups.splice(i + 1, 1); }
  }
  return groups.map((g, i) => build(g.photos, i, g.reasons, g.confidence));
}
