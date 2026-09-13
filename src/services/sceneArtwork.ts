import type { JournalScene,ScenePhoto } from './journalSceneService';
export function sceneArtwork(scene:JournalScene):string {
 const color=scene.style==='urban_grunge'?'#655342':scene.style==='soft_scrapbook'?'#8ba5a0':'#b06442';
 const nodes=scene.nodes;
 const route=nodes.map((n,i)=>i?`C ${n.x+22} ${nodes[i-1].y+40}, ${n.x-22} ${n.y-40}, ${n.x} ${n.y}`:`M ${n.x} ${n.y}`).join(' ');
 const shapes=scene.decorations.map(s=>s.kind==='rect'?`<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${s.color}" rx="2"/>`:s.kind==='line'?`<path d="M${s.x} ${s.y}l${s.width} ${s.height}" fill="none" stroke="${s.color}" stroke-width="3"/>`:'').join('');
 return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">${shapes}<path d="${route}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="8 6 3 6" stroke-linecap="round"/>${nodes.map((n,i)=>`<circle cx="${n.x}" cy="${n.y}" r="${i%2?7:9}" fill="#fcf7e8" stroke="${color}" stroke-width="3"/>`).join('')}</svg>`;
}
export function tapeArtwork(photo:ScenePhoto):string {
 const w=Math.min(90,photo.width*.36),x=(photo.width-w)/2;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${photo.width}" height="${photo.height}" viewBox="0 0 ${photo.width} ${photo.height}"><path d="M${x} 0l${w} 0 -3 6 4 6 -4 6 -${w-4} 0 2 -6 -3 -6z" fill="${photo.tape}" opacity=".70"/><path d="M${x+6} 4h${w-12}m-${w-12} 7h${w-12}" stroke="#ffffff" opacity=".22" stroke-width="2"/></svg>`;
}
export const svgUrl=(svg:string)=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
