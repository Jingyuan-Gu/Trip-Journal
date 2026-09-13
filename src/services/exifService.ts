import exifr from 'exifr';
import type { PhotoLocation } from '../types/photo';
export async function getPhotoLocation(file: File): Promise<PhotoLocation | null> {
  try {
    const gps = await exifr.gps(file);
    if (gps && Number.isFinite(gps.latitude) && Number.isFinite(gps.longitude) && Math.abs(gps.latitude) <= 90 && Math.abs(gps.longitude) <= 180) return { latitude: gps.latitude, longitude: gps.longitude };
  } catch { /* GPS is optional; never invent coordinates. */ }
  return null;
}
import type { PhotoDateSource } from '../types/photo';
import { parseExifDate, formatDateKey } from '../utils/date';
const fields = ['DateTimeOriginal', 'CreateDate', 'ModifyDate'] as const;
export interface PhotoDateResult { date: Date | null; dateKey: string; dateSource: PhotoDateSource }
export async function getPhotoDateInfo(file: File): Promise<PhotoDateResult> {
  try {
    // exifr normally revives into browser-local Date. Keep raw text to retain the
    // recorded calendar day, including time-zone offset/DST boundary cases.
    const tags = await exifr.parse(file, { pick: [...fields], reviveValues: false, gps: false });
    for (const field of fields) {
      const date = parseExifDate(tags?.[field]);
      if (date) {
        const raw = String(tags[field]).trim();
        return { date, dateKey: `${raw.slice(0,4)}-${raw.slice(5,7)}-${raw.slice(8,10)}`, dateSource: field };
      }
    }
  } catch { /* Missing, unsupported or damaged metadata: continue to file time. */ }
  // Zero is a valid Unix timestamp. Missing/NaN/Infinity are not.
  const date = new Date(file.lastModified);
  if (Number.isFinite(file.lastModified) && Number.isFinite(date.getTime()) && date.getFullYear() >= 100 && date.getFullYear() <= 9999) {
    return { date, dateKey: formatDateKey(date), dateSource: 'FileLastModified' };
  }
  return { date: null, dateKey: 'unknown', dateSource: 'Unknown' };
}
export async function getPhotoDate(file: File): Promise<Date | null> {
  return (await getPhotoDateInfo(file)).date;
}
