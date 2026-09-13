import { createContext, useContext, useState, useEffect, useRef, useCallback, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import type { TripState } from '../types/trip';
import type { Photo } from '../types/photo';

export const createInitialTripState = (): TripState => ({
  photos: [], selectedDate: null, selectedPhotoIds: [], selectedTemplateId: 'route_journal',
  journalContent: { title: 'Travel Journal', location: '', dateText: '', subtitle: '', note: '' }, textStyleOverrides: {},
  generatedPreviewUrl: null, dayItineraries: {},
});

const TripContext = createContext<{ state: TripState; setState: Dispatch<SetStateAction<TripState>>;
  addPhotos: (photos: Photo[]) => void; removePhoto: (id: string) => void; clearTrip: () => void;
  setSelectedPhotoIds: (ids: string[]) => void;
} | null>(null);
export function TripProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TripState>(createInitialTripState);
  const ownedUrls = useRef(new Set<string>());
  // Release removed URLs after commit, not inside React's replayable state updater.
  useEffect(() => {
    const current = new Set(state.photos.flatMap(photo => [photo.objectUrl, photo.thumbnailUrl]));
    if (state.generatedPreviewUrl) current.add(state.generatedPreviewUrl);
    for (const url of ownedUrls.current) if (!current.has(url) && url.startsWith('blob:')) URL.revokeObjectURL(url);
    ownedUrls.current = current;
  }, [state.photos, state.generatedPreviewUrl]);
  useEffect(() => () => {
    for (const url of ownedUrls.current) if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    ownedUrls.current.clear();
  }, []);
  useEffect(() => {
    if (!state.photos.length) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [state.photos.length]);
  const addPhotos = useCallback((photos: Photo[]) => setState(previous => ({ ...previous, photos: [...previous.photos, ...photos] })), []);
  const removePhoto = useCallback((id: string) => setState(previous => ({ ...previous,
    photos: previous.photos.filter(photo => photo.id !== id), selectedPhotoIds: previous.selectedPhotoIds.filter(photoId => photoId !== id),
  })), []);
  const clearTrip = useCallback(() => setState(createInitialTripState()), []);
  const setSelectedPhotoIds = useCallback((ids: string[]) => setState(previous => ({ ...previous, selectedPhotoIds: ids, photos: previous.photos.map(photo => ({ ...photo, order: ids.indexOf(photo.id) >= 0 ? ids.indexOf(photo.id) + 1 : null })) })), []);
  return <TripContext.Provider value={{ state, setState, addPhotos, removePhoto, clearTrip, setSelectedPhotoIds }}>{children}</TripContext.Provider>;
}
export function useTrip() {
  const context = useContext(TripContext);
  if (!context) throw new Error('useTrip must be used within TripProvider');
  return context;
}
