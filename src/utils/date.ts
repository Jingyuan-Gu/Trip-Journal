const pad = (value: number) => String(value).padStart(2, '0');
export function formatDateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
/** Parse wall-clock EXIF fields, never convert through UTC or an offset suffix. */
export function parseExifDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?\s*$/.exec(value.replace(/\0/g, '').trim());
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1, 7).map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (year < 100 || month < 1 || month > 12 || check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return null;
  const date = new Date(year, month - 1, day, hour, minute, second);
  return Number.isFinite(date.getTime()) ? date : null;
}
export function isDateKey(key: string): boolean {
  const date = parseExifDate(`${key} 12:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(key) && !!date && formatDateKey(date) === key;
}
export function formatDateDisplay(key: string): string {
  return isDateKey(key) ? `${Number(key.slice(5, 7))}月${Number(key.slice(8, 10))}日` : '未知日期';
}
export function formatWeekday(key: string): string {
  return isDateKey(key) ? `星期${'日一二三四五六'[new Date(`${key}T12:00:00`).getDay()]}` : '无法读取拍摄日期';
}
export function formatMonthShort(key: string): string {
  return isDateKey(key) ? ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][Number(key.slice(5,7)) - 1] : 'DATE';
}
