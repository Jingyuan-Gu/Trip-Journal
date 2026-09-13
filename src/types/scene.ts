export interface PhotoEdit { x?:number; y?:number; width?:number; height?:number; rotation?:number; fit?:'contain'|'cover'; cropX?:number; cropY?:number }
export interface TextEdit { x?:number; y?:number; width?:number }
export interface SceneEdits { photos:Record<string,PhotoEdit>; texts:Record<string,TextEdit> }
export const emptySceneEdits:SceneEdits={photos:{},texts:{}};
