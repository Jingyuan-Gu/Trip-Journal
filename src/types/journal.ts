export interface JournalContent {
  title: string;
  location: string;
  dateText: string;
  subtitle: string;
  note: string;
}

export interface JournalTextElement {
  id: string;
  key: 'title' | 'location' | 'date' | 'subtitle' | 'note';
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: number | string;
  align: 'left' | 'center' | 'right';
  rotation?: number;
  color: string;
}
export interface TextStyleOverride { fontSize?: number; align?: 'left' | 'center' | 'right'; fontWeight?: number | string }
