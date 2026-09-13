import { caption } from '../server/caption.mjs';

async function readJson(req){
  if(req.body&&typeof req.body==='object')return req.body;
  if(typeof req.body==='string')return JSON.parse(req.body);
  let body='',bytes=0;
  for await(const chunk of req){bytes+=chunk.length;if(bytes>9*1024*1024)throw new Error('PAYLOAD_TOO_LARGE');body+=chunk;}
  return JSON.parse(body||'{}');
}

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed'});
  }
  try{
    const result=await caption(await readJson(req));
    res.setHeader('Cache-Control','no-store');
    return res.status(200).json(result);
  }catch(error){
    const code=error instanceof Error&&/^[A-Z_0-9]+$/.test(error.message)?error.message:'AGNES_NETWORK_ERROR';
    console.error('[generate-stop-caption]',error instanceof Error?error.name:'Error',code);
    return res.status(502).json({error:'这次没写出来，再试一次吧。',code});
  }
}
