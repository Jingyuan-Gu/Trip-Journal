export interface PhotoEdit { x?:number; y?:number; width?:number; height?:number; rotation?:number; fit?:'contain'|'cover'; cropX?:number; cropY?:number; zIndex?:number; hidden?:boolean }
export interface TextEdit { x?:number; y?:number; width?:number }
export interface StickerEdit { stickerId?:string; templateType?:string; x?:number; y?:number; width?:number; height?:number; rotation?:number; zIndex?:number; hidden?:boolean; deletable?:boolean; locked?:boolean }
export interface SceneEdits { photos:Record<string,PhotoEdit>; texts:Record<string,TextEdit>; stickers:Record<string,StickerEdit> }
export const emptySceneEdits:SceneEdits={photos:{},texts:{},stickers:{}};
