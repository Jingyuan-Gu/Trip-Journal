export function imageGeometry(iw:number,ih:number,width:number,height:number,fit:'contain'|'cover',cropX=.5,cropY=.5){
 const scale=fit==='cover'?Math.max(width/iw,height/ih):Math.min(width/iw,height/ih);
 const w=iw*scale,h=ih*scale;
 return {width:w,height:h,x:(width-w)*(fit==='cover'?cropX:.5),y:(height-h)*(fit==='cover'?cropY:.5)};
}
