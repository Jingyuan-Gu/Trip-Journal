export type PhotoDateSource = 'DateTimeOriginal' | 'CreateDate' | 'ModifyDate' | 'FileLastModified' | 'Unknown';
export interface PhotoLocation { latitude: number; longitude: number }
export interface Photo {
  location: PhotoLocation | null;
  locationSource: 'ExifGPS' | 'AIVisual' | 'Inferred' | 'Unknown';
  id: string;
  file: File;
  fileName: string;
  objectUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  timestamp: number | null;
  date: string;
  dateSource: PhotoDateSource;
  selected: boolean;
  order: number | null;
}
