import type { JournalTemplate,LayoutGroup,TemplateId,PhotoSlot,TextSlotConfig } from '../types/template';
const counts:Record<LayoutGroup,number>={small:6,medium:9,large:12,xl:15,xxl:18};
const groups=Object.keys(counts) as LayoutGroup[];
function slots(id:TemplateId,count:number):PhotoSlot[]{
 if(id==='route_journal')return Array.from({length:count},(_,i)=>({x:i%2?560:95,y:280+Math.floor(i/2)*205,width:400,height:175,rotation:i%2?2:-2,borderRadius:10,variant:'story'}));
 if(id==='urban_grunge')return Array.from({length:count},(_,i)=>({x:i%3===0?70:350+(i%2)*300,y:285+Math.floor(i/3)*245,width:i%3===0?245:280,height:i%3===0?205:170,rotation:i%4===0?-2:0,borderRadius:2,variant:'street'}));
 const positions=[[70,285,520,370],[650,290,330,250],[90,720,300,190],[435,680,390,220],[850,650,180,220],[115,970,390,210],[570,960,360,190],[180,1220,280,130],[610,1190,330,150]];
 return Array.from({length:count},(_,i)=>{const p=positions[i%positions.length];return {x:p[0],y:p[1],width:p[2],height:p[3],rotation:[-3,2,1,-2][i%4],borderRadius:8,variant:'paper'};});
}
function textSlots(id:TemplateId):TextSlotConfig[]{const color=id==='urban_grunge'?'#171713':id==='route_journal'?'#59412e':'#315249';return [
 {id:'title',key:'title',x:70,y:62,width:760,fontSize:id==='urban_grunge'?82:64,fontFamily:id==='urban_grunge'?'Impact, Haettenschweiler, sans-serif':'KaiTi, STKaiti, Georgia, serif',fontWeight:700,lineHeight:78,maxLines:2,align:'left',color,editable:true},
 {id:'location',key:'location',x:70,y:158,width:500,fontSize:24,fontFamily:'system-ui',fontWeight:500,lineHeight:31,maxLines:2,align:'left',color,editable:true},
 {id:'date',key:'date',x:760,y:158,width:250,fontSize:20,fontFamily:id==='urban_grunge'?'monospace':'system-ui',fontWeight:600,lineHeight:26,maxLines:1,align:'right',color,editable:true},
 {id:'subtitle',key:'subtitle',x:70,y:1285,width:900,fontSize:28,fontFamily:'KaiTi, STKaiti, Georgia, serif',fontWeight:400,lineHeight:36,maxLines:3,align:'left',color,editable:true},
 ];}
export const templates:Record<TemplateId,JournalTemplate>= {
 soft_scrapbook:{id:'soft_scrapbook',name:'清新旅行手账',description:'奶油纸张、胶带与轻轻错落的照片',background:'#F4E9D2',layouts:Object.fromEntries(groups.map(g=>[g,slots('soft_scrapbook',counts[g])])) as Record<LayoutGroup,PhotoSlot[]>,textSlots:textSlots('soft_scrapbook')},
 urban_grunge:{id:'urban_grunge',name:'复古城市手账',description:'街头杂志、票根与胶片边框',background:'#E8DFC9',layouts:Object.fromEntries(groups.map(g=>[g,slots('urban_grunge',counts[g])])) as Record<LayoutGroup,PhotoSlot[]>,textSlots:textSlots('urban_grunge')},
 route_journal:{id:'route_journal',name:'手绘行程手账',description:'沿着时间线记录真实走过的每一站',background:'#F5E4B8',layouts:Object.fromEntries(groups.map(g=>[g,slots('route_journal',counts[g])])) as Record<LayoutGroup,PhotoSlot[]>,textSlots:textSlots('route_journal')},
};
export const getTemplateById=(id:TemplateId)=>templates[id]??templates.route_journal;
export const getLayoutGroup=(count:number):LayoutGroup=>count<=6?'small':count<=9?'medium':count<=12?'large':count<=15?'xl':'xxl';
export const getPhotoSlots=(id:TemplateId,count:number)=>getTemplateById(id).layouts[getLayoutGroup(count)].slice(0,count);
export const getTextSlots=(id:TemplateId)=>getTemplateById(id).textSlots;
