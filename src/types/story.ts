import type { PhotoLocation } from './photo';
export interface PhotoCluster {
  id: string; startTime: number | null; endTime: number | null;
  photoIds: string[]; representativePhotoIds: string[]; centerLocation?: PhotoLocation;
}
export interface TripStop {
  similarityGroups?: SimilarityGroup[];
  manuallyEdited?: boolean;
  placeSource?: 'gps' | 'ai' | 'manual' | 'unknown';
  placeConfidence?: number;
  id: string; startTime: string; endTime?: string; placeName: string; placeType: string;
  confidence: number; locationSource: 'gps' | 'visual' | 'inferred';
  photoIds: string[]; representativePhotoIds: string[]; caption: string; shortCaption: string; captionSource?: 'ai'|'manual'|'mock'|null;
}
export interface SimilarityGroup {
  id: string; stopId: string; photoIds: string[]; representativePhotoId: string;
  similarityType: 'near_duplicate' | 'same_scene' | 'unique';
}
export interface DayItinerary {
  date: string; city?: string; title: string; summary: string; stops: TripStop[];
  closingText: string; mode: 'mock' | 'live'; photoSignature: string;
}
// The itinerary is the single editable story source, rather than a second copy.
export type JournalStory = DayItinerary;
export interface StoryBlock { stopId: string; time: string; placeName: string; caption: string; photoIds: string[]; layoutVariant: 'hero' | 'double' | 'stack' | 'polaroid' }
