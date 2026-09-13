import type { Photo } from './photo';
import type { DayItinerary } from './story';
import type { TemplateId } from './template';
import type { JournalContent, TextStyleOverride } from './journal';
export interface TripState {
  sceneEdits?: Record<string, import('./scene').SceneEdits>;
  dayItineraries: Record<string, DayItinerary>;
  photos: Photo[];
  selectedDate: string | null;
  selectedPhotoIds: string[];
  selectedTemplateId: TemplateId;
  journalContent: JournalContent;
  generatedPreviewUrl: string | null;
  textStyleOverrides: Record<string, TextStyleOverride>;
}
