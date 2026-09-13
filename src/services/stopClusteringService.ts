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
  timeSoftGapMinutes: 30,
  timeNoGpsSplitMinutes: 45,
  timeProtectedGapMinutes: 60,
  timeHardGapMinutes: 90,
  gpsNearMeters: 120,
  gpsMoveMeters: 500,
  gpsFarMeters: 1000,
  visualChange: 0.34,
  boundaryThreshold: 0.5,
  weights: { time: 0.35, gps: 0.55, visual: 0.1 },
};

interface BoundaryEvidence {
  score: number;
  timeScore: number;
  gpsScore: number;
  visualScore: number;
  gapMinutes: number;
  distanceMeters?: number;
  visualDistance?: number;
  reasons: string[];
}

interface WorkingStop {
  photos: Photo[];
  incomingBoundary?: BoundaryEvidence;
  confidence: number;
}

export function gpsDistanceMeters(a: PhotoLocation, b: PhotoLocation) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

function getTimeScore(gapMinutes: number) {
  const { timeSoftGapMinutes, timeProtectedGapMinutes, timeHardGapMinutes } = STOP_CLUSTER_OPTIONS;
  if (gapMinutes <= 10) return 0;
  if (gapMinutes <= timeSoftGapMinutes) return ((gapMinutes - 10) / (timeSoftGapMinutes - 10)) * 0.35;
  if (gapMinutes <= timeProtectedGapMinutes) {
    return 0.35 + ((gapMinutes - timeSoftGapMinutes) / (timeProtectedGapMinutes - timeSoftGapMinutes)) * 0.4;
  }
  if (gapMinutes >= timeHardGapMinutes) return 1;
  return 0.75 + ((gapMinutes - timeProtectedGapMinutes) / (timeHardGapMinutes - timeProtectedGapMinutes)) * 0.25;
}

function getGpsScore(distanceMeters: number | undefined) {
  const { gpsNearMeters, gpsMoveMeters, gpsFarMeters } = STOP_CLUSTER_OPTIONS;
  if (distanceMeters === undefined || distanceMeters <= gpsNearMeters) return 0;
  if (distanceMeters <= gpsMoveMeters) {
    return ((distanceMeters - gpsNearMeters) / (gpsMoveMeters - gpsNearMeters)) * 0.65;
  }
  if (distanceMeters >= gpsFarMeters) return 1;
  return 0.65 + ((distanceMeters - gpsMoveMeters) / (gpsFarMeters - gpsMoveMeters)) * 0.35;
}

function describeBoundary(gapMinutes: number, distanceMeters: number | undefined, visualDistance: number | undefined, score: number) {
  const reasons: string[] = [];
  if (gapMinutes >= STOP_CLUSTER_OPTIONS.timeProtectedGapMinutes) reasons.push(`large-time-gap-${Math.round(gapMinutes)}m`);
  else if (gapMinutes >= STOP_CLUSTER_OPTIONS.timeSoftGapMinutes) reasons.push(`time-gap-${Math.round(gapMinutes)}m`);
  if (distanceMeters !== undefined && distanceMeters >= STOP_CLUSTER_OPTIONS.gpsMoveMeters) reasons.push(`gps-moved-${Math.round(distanceMeters)}m`);
  if (visualDistance !== undefined && visualDistance >= STOP_CLUSTER_OPTIONS.visualChange) reasons.push('strong-visual-change');
  if (score >= STOP_CLUSTER_OPTIONS.boundaryThreshold && reasons.length === 0) reasons.push('combined-boundary-signals');
  return reasons;
}

function boundaryScore(gapMinutes: number, distanceMeters: number | undefined, visualDistance: number | undefined): BoundaryEvidence {
  const options = STOP_CLUSTER_OPTIONS;
  const timeScore = getTimeScore(gapMinutes);
  const gpsScore = getGpsScore(distanceMeters);
  const visualScore = visualDistance === undefined ? 0 : Math.min(1, visualDistance / options.visualChange);
  const hasGps = distanceMeters !== undefined;
  const score = hasGps
    ? timeScore * options.weights.time + gpsScore * options.weights.gps + visualScore * options.weights.visual
    : timeScore * 0.72 + visualScore * 0.28;
  return {
    score,
    timeScore,
    gpsScore,
    visualScore,
    gapMinutes,
    distanceMeters,
    visualDistance,
    reasons: describeBoundary(gapMinutes, distanceMeters, visualDistance, score),
  };
}

function centroid(batch: Photo[]) {
  const locations = batch.flatMap((photo) => (photo.location ? [photo.location] : []));
  if (!locations.length) return undefined;
  return {
    latitude: locations.reduce((sum, location) => sum + location.latitude, 0) / locations.length,
    longitude: locations.reduce((sum, location) => sum + location.longitude, 0) / locations.length,
  };
}

function build(group: WorkingStop, index: number): CandidateStop {
  const gpsCount = group.photos.filter((photo) => photo.location).length;
  const confidence = Math.max(0, Math.min(1,
    0.38 * Math.min(1, group.photos.length / 4)
    + 0.32 * (gpsCount ? Math.min(1, gpsCount / group.photos.length + 0.25) : 0.2)
    + 0.3 * group.confidence,
  ));
  return {
    id: `cluster-${index}`,
    photoIds: group.photos.map((photo) => photo.id),
    startTime: group.photos[0]?.timestamp ?? null,
    endTime: group.photos.at(-1)?.timestamp ?? null,
    centroidGps: centroid(group.photos),
    confidence,
    boundaryReasons: group.incomingBoundary?.reasons ?? [],
  };
}

export function clusterCandidateStops(input: Photo[], visualDistance?: (a: string, b: string) => number | undefined): CandidateStop[] {
  const sorted = [...input].sort((a, b) => (a.timestamp ?? Infinity) - (b.timestamp ?? Infinity));
  const groups: WorkingStop[] = [];

  for (const photo of sorted) {
    const current = groups.at(-1);
    const previous = current?.photos.at(-1);
    if (!current || !previous) {
      groups.push({ photos: [photo], confidence: 0.6 });
      continue;
    }

    const gapMinutes = previous.timestamp != null && photo.timestamp != null
      ? Math.max(0, (photo.timestamp - previous.timestamp) / 60000)
      : 0;
    const distanceMeters = previous.location && photo.location ? gpsDistanceMeters(previous.location, photo.location) : undefined;
    const visual = visualDistance?.(previous.id, photo.id);
    const boundary = boundaryScore(gapMinutes, distanceMeters, visual);
    const sameGpsArea = distanceMeters !== undefined && distanceMeters <= STOP_CLUSTER_OPTIONS.gpsNearMeters;
    const shouldSplit = boundary.score >= STOP_CLUSTER_OPTIONS.boundaryThreshold
      || (distanceMeters !== undefined && distanceMeters >= STOP_CLUSTER_OPTIONS.gpsFarMeters)
      || (distanceMeters !== undefined && distanceMeters >= STOP_CLUSTER_OPTIONS.gpsMoveMeters && gapMinutes >= 5)
      || (distanceMeters === undefined && gapMinutes >= STOP_CLUSTER_OPTIONS.timeNoGpsSplitMinutes)
      || (gapMinutes >= STOP_CLUSTER_OPTIONS.timeProtectedGapMinutes && !sameGpsArea)
      || gapMinutes >= STOP_CLUSTER_OPTIONS.timeHardGapMinutes;

    if (shouldSplit) {
      groups.push({ photos: [photo], incomingBoundary: boundary, confidence: Math.max(0.6, boundary.score) });
    } else {
      current.photos.push(photo);
      current.confidence = Math.min(current.confidence, 1 - boundary.score);
    }
  }

  return groups.map(build);
}
