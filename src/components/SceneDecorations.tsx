import type { SceneShape } from '../services/journalSceneService';
export function SceneDecorations({ shapes }: { shapes: SceneShape[] }) {
  return <div className="scene-decorations" aria-hidden="true">{shapes.map((s,i)=><div key={i} style={{position:'absolute',left:s.x,top:s.y,width:s.width,height:s.height,transform:`rotate(${s.rotation??0}deg)`,background:s.kind==='rect'||s.kind==='circle'?s.color:undefined,borderRadius:s.kind==='circle'?'50%':undefined,borderLeft:s.kind==='line'&&!s.width?`3px ${s.dashed?'dashed':'solid'} ${s.color}`:undefined,borderTop:s.kind==='line'&&s.width?`2px ${s.dashed?'dashed':'solid'} ${s.color}`:undefined,color:s.color,fontSize:s.fontSize,fontFamily:'Georgia, serif'}}>{s.text}</div>)}</div>;
}
