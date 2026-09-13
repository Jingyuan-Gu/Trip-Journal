export function normalizeJournalBodyText(value:string):string {
  return String(value||'')
    .replace(/\r\n?/g,'\n')
    .replace(/\n+/g,' ')
    .replace(/[\t\f\v ]+/g,' ')
    .replace(/([\p{Script=Han}，。！？；：、“”‘’])\s+(?=[\p{Script=Han}，。！？；：、“”‘’])/gu,'$1')
    .replace(/\s+([，。！？；：])/g,'$1')
    .trim();
}

function avoidSingleCharacterLines(lines:string[],measure:(text:string)=>number,width:number){
  for(let index=0;index<lines.length;index+=1){
    const chars=Array.from(lines[index].trim());
    if(chars.length!==1||!/[\p{Script=Han}]/u.test(chars[0]))continue;
    const next=lines[index+1];
    if(next){
      const nextChars=Array.from(next);
      if(nextChars.length>1&&measure(chars[0]+nextChars[0])<=width){lines[index]=chars[0]+nextChars.shift();lines[index+1]=nextChars.join('');continue;}
    }
    const previous=lines[index-1];
    if(previous){const previousChars=Array.from(previous);if(previousChars.length>1){lines[index]=previousChars.pop()+chars[0];lines[index-1]=previousChars.join('');}}
  }
  return lines.filter(Boolean);
}

/** Preserve intentional paragraphs; keep Latin words together and measure Chinese by rendered width. */
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
  const balanced=avoidSingleCharacterLines(lines,measure,width);
  if(balanced.length>maxLines){balanced.length=maxLines;let last=Array.from(balanced[maxLines-1]??'');while(last.length&&measure(last.join('')+'…')>width)last.pop();balanced[maxLines-1]=last.join('')+'…';}
  return balanced;
}
