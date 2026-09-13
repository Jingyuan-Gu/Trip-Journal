import type { JournalTextElement } from './journal';
export type TemplateId = 'soft_scrapbook' | 'urban_grunge' | 'route_journal';
export type LayoutGroup = 'small' | 'medium' | 'large' | 'xl' | 'xxl';
export interface PhotoSlot {
  x: number; y: number; width: number; height: number;
  rotation?: number; borderRadius?: number; zIndex?: number; variant?: string;
}
export interface TextSlotConfig extends Omit<JournalTextElement, 'text'> { editable: boolean; lineHeight?: number; maxLines?: number }
export interface JournalTemplate {
  id: TemplateId;
  name: string;
  description: string;
  preview?: string;
  background: string;
  layouts: Record<LayoutGroup, PhotoSlot[]>;
  textSlots: TextSlotConfig[];
}
