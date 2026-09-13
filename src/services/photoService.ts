import type { Photo } from '../types/photo';
import { createThumbnailWithDimensions } from '../utils/image';
import { getPhotoDateInfo, getPhotoLocation } from './exifService';
import { isDateKey } from '../utils/date';
export const MAX_PHOTOS = 100;
export const PHOTO_LIMIT_MESSAGE = '一次最多处理 100 张照片，请减少照片数量后重新选择。';
export function isSupportedImage(file: File): boolean {
  return /^image\/(jpeg|jpg|png|webp)$/i.test(file.type) || (!file.type && /\.(jpe?g|png|webp)$/i.test(file.name));
}
export function releasePhoto(photo: Photo) {
  for (const url of new Set([photo.objectUrl, photo.thumbnailUrl])) if (url.startsWith('blob:')) URL.revokeObjectURL(url);
}
interface ProcessOptions { existingCount?: number; signal?: AbortSignal; onProgress?: (completed: number, total: number) => void }
export interface ProcessResult { photos: Photo[]; unsupportedCount: number; failedCount: number; limitExceeded: boolean }
/** Shared picker/drop pipeline. Sequential decoding, no EXIF or network access. */
export async function processFiles(files: File[], options: ProcessOptions = {}): Promise<ProcessResult> {
  const supported = files.filter(isSupportedImage);
  const result: ProcessResult = { photos: [], unsupportedCount: files.length - supported.length, failedCount: 0, limitExceeded: false };
  if ((options.existingCount ?? 0) + supported.length > MAX_PHOTOS) { result.limitExceeded = true; return result; }
  options.onProgress?.(0, supported.length);
  try {
    for (const [index, file] of supported.entries()) {
      if (options.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      let objectUrl: string | undefined, thumbnailUrl: string | undefined;
      try {
        objectUrl = URL.createObjectURL(file);
        const thumbnail = await createThumbnailWithDimensions(file, objectUrl, options.signal);
        thumbnailUrl = thumbnail.thumbnailUrl;
        result.photos.push({ id: crypto.randomUUID(), file, fileName: file.name, objectUrl, thumbnailUrl,
          width: thumbnail.width, height: thumbnail.height, timestamp: null, date: 'pending', dateSource: 'Unknown', location: null, locationSource: 'Unknown', selected: false, order: null });
      } catch (error) {
        if (objectUrl) URL.revokeObjectURL(objectUrl);
        if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
        if (options.signal?.aborted) throw error;
        result.failedCount++;
      }
      options.onProgress?.(index + 1, supported.length);
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    if (options.signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    return result;
  } catch (error) { result.photos.forEach(releasePhoto); throw error; }
}

export async function resolvePhotoDates(photos: Photo[], onProgress?: (current: number, total: number) => void, signal?: AbortSignal): Promise<Photo[]> {
  const total = photos.filter(photo => photo.date === 'pending' || !photo.date).length;
  let completed = 0;
  const resolved: Photo[] = [];
  onProgress?.(0, total);
  for (const photo of photos) {
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    if (photo.date && photo.date !== 'pending') { resolved.push(photo); continue; }
    const info = await getPhotoDateInfo(photo.file);
    const location = await getPhotoLocation(photo.file);
    if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
    resolved.push({ ...photo, location, locationSource: location ? 'ExifGPS' : 'Unknown', timestamp: info.date?.getTime() ?? null, date: info.dateKey, dateSource: info.dateSource });
    onProgress?.(++completed, total);
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return resolved;
}
export interface PhotoDateGroup { date: string; photos: Photo[] }
export function groupPhotosByDate(photos: Photo[]): Record<string, Photo[]> {
  const groups: Record<string, Photo[]> = {};
  for (const photo of photos) {
    if (photo.date === 'pending' || !photo.date) continue;
    const date = isDateKey(photo.date) ? photo.date : 'unknown';
    (groups[date] ??= []).push(photo);
  }
  const sorted: Record<string, Photo[]> = {};
  for (const date of Object.keys(groups).sort((a,b) => a === 'unknown' ? 1 : b === 'unknown' ? -1 : a.localeCompare(b))) {
    // Undated items keep their original positions. Sort only the timestamped slots.
    const timed = groups[date].filter(p => p.timestamp !== null && Number.isFinite(p.timestamp)).sort((a,b) => a.timestamp! - b.timestamp!);
    let index = 0;
    sorted[date] = groups[date].map(p => p.timestamp !== null && Number.isFinite(p.timestamp) ? timed[index++] : p);
  }
  return sorted;
}
export function getPhotoDateGroups(photos: Photo[]): PhotoDateGroup[] {
  return Object.entries(groupPhotosByDate(photos)).map(([date, photos]) => ({ date, photos }));
}
export function autoSelectPhotos(photos: Photo[], count = 9): Photo[] {
  count = Math.max(0, Math.min(9, Math.floor(count)));
  if (photos.length <= count) return [...photos];
  const selected: Photo[] = [];
  const step = photos.length / count;
  for (let index = 0; index < count; index++) selected.push(photos[Math.min(photos.length - 1, Math.floor((index + 0.5) * step))]);
  return selected;
}
