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
  visualSimilar: 0.16,
  boundaryThreshold: 0.5,
  protectedBoundaryThreshold: 0.72,
  tinyGroupMaxPhotos: 2,
  mergeContinuityThreshold: 0.78,
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
  protected: boolean;
  reasons: string[];
}

interface WorkingStop {
  photos: Photo[];
  incomingBoundary?: BoundaryEvidence;
  confidence: number;
  mergeReasons: string[];
}

interface MergeDecision {
  shouldMerge: boolean;
  confidence: number;
  reasons: string[];
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
  const sameGpsArea = hasGps && distanceMeters <= options.gpsNearMeters;
  const protectedBoundary = (hasGps && distanceMeters >= options.gpsMoveMeters)
    || (!hasGps && gapMinutes >= options.timeNoGpsSplitMinutes)
    || (gapMinutes >= options.timeProtectedGapMinutes && !sameGpsArea)
    || score >= options.protectedBoundaryThreshold;

  return {
    score,
    timeScore,
    gpsScore,
    visualScore,
    gapMinutes,
    distanceMeters,
    visualDistance,
    protected: protectedBoundary,
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
    boundaryReasons: [
      ...(group.incomingBoundary?.reasons ?? []),
      ...(group.incomingBoundary?.protected ? ['protected-boundary'] : []),
      ...group.mergeReasons,
    ],
  };
}

function timeContinuity(gapMinutes: number) {
  if (gapMinutes <= 5) return 1;
  if (gapMinutes <= 12) return 1 - ((gapMinutes - 5) / 7) * 0.15;
  if (gapMinutes <= 20) return 0.85 - ((gapMinutes - 12) / 8) * 0.3;
  if (gapMinutes <= 30) return 0.55 - ((gapMinutes - 20) / 10) * 0.25;
  return 0;
}

function gpsContinuity(distanceMeters: number | undefined) {
  if (distanceMeters === undefined) return 0.35;
  if (distanceMeters <= STOP_CLUSTER_OPTIONS.gpsNearMeters) return 1;
  if (distanceMeters <= 300) return 1 - ((distanceMeters - STOP_CLUSTER_OPTIONS.gpsNearMeters) / (300 - STOP_CLUSTER_OPTIONS.gpsNearMeters)) * 0.45;
  if (distanceMeters <= STOP_CLUSTER_OPTIONS.gpsMoveMeters) return 0.55 - ((distanceMeters - 300) / 200) * 0.35;
  return 0;
}

function visualContinuity(visualDistance: number | undefined) {
  if (visualDistance === undefined) return 0.35;
  if (visualDistance <= STOP_CLUSTER_OPTIONS.visualSimilar) return 1;
  if (visualDistance >= STOP_CLUSTER_OPTIONS.visualChange) return 0;
  return 1 - ((visualDistance - STOP_CLUSTER_OPTIONS.visualSimilar) / (STOP_CLUSTER_OPTIONS.visualChange - STOP_CLUSTER_OPTIONS.visualSimilar));
}

function shouldMergeStops(right: WorkingStop): MergeDecision {
  const boundary = right.incomingBoundary;
  if (!boundary) return { shouldMerge: false, confidence: 0, reasons: ['missing-boundary-evidence'] };

  const { gapMinutes, distanceMeters, visualDistance } = boundary;
  const sameGpsArea = distanceMeters !== undefined && distanceMeters <= STOP_CLUSTER_OPTIONS.gpsNearMeters;
  const strongVisualContinuity = visualDistance !== undefined && visualDistance <= STOP_CLUSTER_OPTIONS.visualSimilar;

  if (boundary.protected) return { shouldMerge: false, confidence: 0, reasons: [...boundary.reasons, 'protected-boundary'] };
  if (distanceMeters !== undefined && distanceMeters >= STOP_CLUSTER_OPTIONS.gpsMoveMeters) {
    return { shouldMerge: false, confidence: 0, reasons: [`gps-moved-${Math.round(distanceMeters)}m`] };
  }
  if (gapMinutes >= STOP_CLUSTER_OPTIONS.timeProtectedGapMinutes && !(sameGpsArea && strongVisualContinuity)) {
    return { shouldMerge: false, confidence: 0, reasons: [`large-time-gap-${Math.round(gapMinutes)}m`] };
  }
  if (distanceMeters === undefined && gapMinutes >= STOP_CLUSTER_OPTIONS.timeSoftGapMinutes) {
    return { shouldMerge: false, confidence: 0, reasons: [`time-gap-${Math.round(gapMinutes)}m`, 'gps-unavailable'] };
  }

  const time = timeContinuity(gapMinutes);
  const gps = gpsContinuity(distanceMeters);
  const visual = visualContinuity(visualDistance);
  const inverseBoundary = 1 - boundary.score;
  const confidence = distanceMeters === undefined
    ? time * 0.45 + visual * 0.3 + inverseBoundary * 0.25
    : time * 0.25 + gps * 0.45 + visual * 0.15 + inverseBoundary * 0.15;
  const reasons = [
    gapMinutes <= 12 ? 'very-close-time' : gapMinutes <= 30 ? 'close-time' : '',
    sameGpsArea ? 'same-gps-area' : '',
    strongVisualContinuity ? 'visual-continuity' : '',
    boundary.score < 0.3 ? 'weak-boundary' : '',
  ].filter(Boolean);

  return { shouldMerge: confidence >= STOP_CLUSTER_OPTIONS.mergeContinuityThreshold, confidence, reasons };
}

function normalizeSmallStops(groups: WorkingStop[]) {
  if (groups.length < 2) return groups;

  const candidates: Array<{ left: number; right: number; decision: MergeDecision }> = [];
  for (let right = 1; right < groups.length; right += 1) {
    const left = right - 1;
    const hasSmallStop = groups[left].photos.length <= STOP_CLUSTER_OPTIONS.tinyGroupMaxPhotos
      || groups[right].photos.length <= STOP_CLUSTER_OPTIONS.tinyGroupMaxPhotos;
    if (!hasSmallStop) continue;
    const decision = shouldMergeStops(groups[right]);
    if (decision.shouldMerge) candidates.push({ left, right, decision });
  }

  // Evaluate original boundaries once. Each initial stop can participate in at most
  // one merge, so normalization cannot cascade several valid stops into one.
  candidates.sort((a, b) => b.decision.confidence - a.decision.confidence);
  const reserved = new Set<number>();
  const selected = new Map<number, { right: number; decision: MergeDecision }>();
  for (const candidate of candidates) {
    if (reserved.has(candidate.left) || reserved.has(candidate.right)) continue;
    reserved.add(candidate.left);
    reserved.add(candidate.right);
    selected.set(candidate.left, { right: candidate.right, decision: candidate.decision });
  }

  const normalized: WorkingStop[] = [];
  for (let index = 0; index < groups.length; index += 1) {
    const pair = selected.get(index);
    if (!pair) {
      normalized.push(groups[index]);
      continue;
    }
    const left = groups[index];
    const right = groups[pair.right];
    normalized.push({
      photos: [...left.photos, ...right.photos],
      incomingBoundary: left.incomingBoundary,
      confidence: Math.min(left.confidence, right.confidence, pair.decision.confidence),
      mergeReasons: [...left.mergeReasons, ...right.mergeReasons, `merged:${pair.decision.reasons.join('+') || 'strong-continuity'}`],
    });
    index = pair.right;
  }
  return normalized;
}

export function clusterCandidateStops(input: Photo[], visualDistance?: (a: string, b: string) => number | undefined): CandidateStop[] {
  const sorted = [...input].sort((a, b) => (a.timestamp ?? Infinity) - (b.timestamp ?? Infinity));
  const groups: WorkingStop[] = [];

  for (const photo of sorted) {
    const current = groups.at(-1);
    const previous = current?.photos.at(-1);
    if (!current || !previous) {
      groups.push({ photos: [photo], confidence: 0.6, mergeReasons: [] });
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
      groups.push({ photos: [photo], incomingBoundary: boundary, confidence: Math.max(0.6, boundary.score), mergeReasons: [] });
    } else {
      current.photos.push(photo);
      current.confidence = Math.min(current.confidence, 1 - boundary.score);
    }
  }

  return normalizeSmallStops(groups).map(build);
}
