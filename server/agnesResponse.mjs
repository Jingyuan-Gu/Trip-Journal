export function extractAssistantText(response) {
  const content=response?.choices?.[0]?.message?.content;
  if(typeof content==='string')return content.trim();
  if(!Array.isArray(content))return '';
  return content.map(block=>{
    if(typeof block==='string')return block;
    if(typeof block?.text==='string')return block.text;
    if(typeof block?.text?.value==='string')return block.text.value;
    if(typeof block?.content==='string')return block.content;
    return '';
  }).filter(Boolean).join('').trim();
}

export function stripMarkdownFence(text) {
  return text.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
}

export function agnesResponseMeta(response,assistantText,status) {
  const choice=response?.choices?.[0],content=choice?.message?.content;
  return {
    httpStatus:status,
    responseId:typeof response?.id==='string'?response.id:'',
    choicesLength:Array.isArray(response?.choices)?response.choices.length:0,
    finishReason:typeof choice?.finish_reason==='string'?choice.finish_reason:'',
    contentType:Array.isArray(content)?'array':typeof content,
    contentLength:assistantText.length,
  };
}
