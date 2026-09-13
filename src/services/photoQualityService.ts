export interface VisualFeatures { pixels:number[]; histogram:number[]; sharpness:number; exposure:number; resolution:number; score:number }
export function scorePixels(data:Uint8ClampedArray,width:number,height:number,originalPixels:number):VisualFeatures {
  const gray:number[]=[],histogram=Array<number>(24).fill(0);let clipped=0,sum=0;
  for(let i=0;i<data.length;i+=4){const v=(data[i]*.299+data[i+1]*.587+data[i+2]*.114)/255;gray.push(v);sum+=v;if(v<.04||v>.96)clipped++;for(let c=0;c<3;c++)histogram[c*8+Math.min(7,Math.floor(data[i+c]/32))]++;}
  let lap=0,lap2=0,n=0;
  for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x,v=4*gray[i]-gray[i-1]-gray[i+1]-gray[i-width]-gray[i+width];lap+=v;lap2+=v*v;n++;}
  const sharpness=Math.min(1,Math.sqrt(Math.max(0,lap2/n-(lap/n)**2))*5);
  const exposure=Math.max(0,1-clipped/gray.length-Math.abs(sum/gray.length-.5)*.5);
  const resolution=Math.min(1,Math.log2(1+originalPixels/1000000)/4);
  return {pixels:gray,histogram:histogram.map(v=>v/gray.length),sharpness,exposure,resolution,score:.6*sharpness+.3*exposure+.1*resolution};
}
