/** Preserve paragraphs; keep Latin words together, break oversized tokens by Unicode character. */
export function wrapText(measure: (text:string)=>number, text:string, width:number, maxLines:number):string[] {
  const lines:string[]=[];
  for(const paragraph of text.replace(/\r\n?/g,'\n').split('\n')) {
    let line=''; const tokens=paragraph.match(/[\p{Script=Latin}\p{N}]+(?:['’-][\p{Script=Latin}\p{N}]+)*|[^\S\n]+|[^\p{Script=Latin}\p{N}]/gu)??[];
    for(const token of tokens){
      if(measure(line+token)<=width){line+=token;continue;}
      if(line){lines.push(line.trimEnd());line='';}
      for(const char of Array.from(token.trimStart())){if(line&&measure(line+char)>width){lines.push(line);line='';}line+=char;}
    }
    lines.push(line.trimEnd());
  }
  if(lines.length>maxLines){lines.length=maxLines;let last=Array.from(lines[maxLines-1]??'');while(last.length&&measure(last.join('')+'…')>width)last.pop();lines[maxLines-1]=last.join('')+'…';}
  return lines;
}
