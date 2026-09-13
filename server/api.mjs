import { caption } from './caption.mjs';
// Server-only provider boundary. No secrets are exposed through VITE_ variables.
import { analyzeWithOpenAI } from './openaiProvider.mjs';
import { loadEnv } from 'vite';
export const COPY_INSTRUCTIONS = '你正在为私人旅行电子手账写一条短配文。输入包括当前时间、地点、代表照片、照片视觉描述以及相邻站点信息。请用简体中文输出1至2个短句，约20至45个汉字。结合地点、时间与照片整体氛围，挑选一两个有代表性的细节自然表达，不必机械罗列画面内容。文字要像本人随手写下的旅行感想，可以加入适度、克制的轻松、安静、惊喜、热闹或小满足，但不要虚构强烈情绪和具体经历。地点可以自然带入，不写百科介绍。严禁编造天气、同行者、排队、消费、历史知识或照片无法支持的活动。不写攻略或营销文案，禁止“把光影收进记忆”“感受城市魅力”“一切刚刚好”“浪漫邂逅”等空泛套话。直接输出文案，不解释过程。';

export const apiPlugin = { name: 'trip-ai-api', configResolved(config) { const env=loadEnv(config.mode,config.root,'');for(const key of ['AI_MODE','AI_BASE_URL','AI_MODEL','AI_API_KEY','AGNES_API_KEY','AGNES_BASE_URL','AGNES_MODEL','GEOCODING_PROVIDER_URL','GEOCODING_API_KEY'])if(env[key]!==undefined)process.env[key]=env[key];}, configureServer(server) { server.middlewares.use((req, res, next) => req.url?.startsWith('/api/') ? void handleApi(req, res) : next()); } };
function validateInput(input) {
  if (!input || typeof input.date !== 'string' || input.date.length > 20 || !Array.isArray(input.clusters) || !input.clusters.length || input.clusters.length > 5) throw new Error('Invalid analysis input');
  const seen=new Set();
  for (const cluster of input.clusters) {
    if (typeof cluster.id !== 'string' || !Array.isArray(cluster.photoIds) || !cluster.photoIds.length || cluster.photoIds.length > 100 || !cluster.photoIds.every(id => typeof id === 'string') || !Array.isArray(cluster.images) || cluster.images.length > 3) throw new Error('Invalid cluster');
    if(seen.has(cluster.id)||!Array.isArray(cluster.representativePhotoIds))throw new Error('Invalid cluster IDs');seen.add(cluster.id);
    if(cluster.centerLocation && (!Number.isFinite(cluster.centerLocation.latitude)||!Number.isFinite(cluster.centerLocation.longitude)||Math.abs(cluster.centerLocation.latitude)>90||Math.abs(cluster.centerLocation.longitude)>180))throw new Error('Invalid GPS');
    for (const image of cluster.images) if (!cluster.photoIds.includes(image.id) || typeof image.dataUrl !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image.dataUrl) || image.dataUrl.length > 1500000) throw new Error('Invalid analysis image');
  }
}
async function providerRequest(url, body, key) {
  if (!url.startsWith('https://')) throw new Error('Provider URL must use HTTPS');
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) }, body: JSON.stringify(body), signal: AbortSignal.timeout(60000), redirect: 'error' });
  if (!response.ok) throw new Error('Provider request failed');
  return response.json();
}
function clean(value, length) { return typeof value === 'string' ? value.trim().slice(0, length) : ''; }
export async function analyze(input, env = process.env) {
  validateInput(input);
  const live = env.AI_MODE === 'live';
  if (live && (!env.AI_API_KEY || !env.AI_MODEL)) throw new Error('AI provider is not configured');
  const places = {};
  if (live && env.GEOCODING_PROVIDER_URL) {
    for (const cluster of input.clusters) if (cluster.centerLocation) {
      try { const place = await providerRequest(env.GEOCODING_PROVIDER_URL, cluster.centerLocation, env.GEOCODING_API_KEY);places[cluster.id] = place; } catch { /* Keep coordinates when geocoding is unavailable. */ }
    }
  }
  const result = live ? await analyzeWithOpenAI(input, places, COPY_INSTRUCTIONS, env, providerRequest) : null;
  if (live && (!Array.isArray(result?.stops) || result.stops.length !== input.clusters.length || !input.clusters.every(c => result.stops.some(s => s.id === c.id)))) throw new Error('Invalid structured AI result');
  // Rebuild in input order. Provider cannot inject photo IDs or override times/GPS.
  const stops = input.clusters.map((cluster, index) => {
    const ai = result?.stops.find(stop => stop.id === cluster.id), gps = places[cluster.id];
    const confidence = Math.max(0, Math.min(1, Number(cluster.centerLocation ? gps?.confidence : ai?.confidence) || 0));
    const placeType = clean(ai?.placeType, 24) || 'other';
    const scenes = { museum: '博物馆', garden: '园林', street: '街边', restaurant: '餐厅', cafe: '咖啡馆', park: '公园', nature: '自然风景' };
    const placeName = gps ? (clean(gps.placeName, 40) || clean(gps.district, 40) || clean(gps.city, 40) || 'GPS 拍摄地点') : cluster.centerLocation ? 'GPS 拍摄地点（待确认）' : confidence >= .85 ? clean(ai?.placeName, 40) || '待确认地点' : scenes[placeType] || `第 ${index + 1} 段 · 待确认地点`;
    return { id: cluster.id, startTime: cluster.startLabel || '', endTime: cluster.endLabel || '', placeName, placeType, confidence,
      locationSource: cluster.centerLocation ? 'gps' : live ? 'visual' : 'inferred', location:cluster.centerLocation??null, city:clean(gps?.city,40), photoIds: cluster.photoIds,
      representativePhotoIds: cluster.representativePhotoIds.filter(id=>cluster.photoIds.includes(id)).slice(0,3),
      caption: confidence >= .85 ? clean(ai?.caption, 80) || '这段照片的故事，留给我慢慢写。' : '在这里留下一段照片，具体的故事由我补上。', shortCaption: confidence >= .85 ? clean(ai?.shortCaption, 40) : '' };
  });
  return { date: input.date, title: clean(result?.title, 40) || '这一天的旅行', summary: clean(result?.summary, 80) || '按照片的先后，留下这一天的片段。', closingText: clean(result?.closingText, 60) || '把今天留下，等以后再翻看。', stops, mode: live ? 'live' : 'mock', photoSignature: input.photoSignature };
}
export async function handleApi(req, res) {
  if (req.url?.split('?')[0] === '/api/ai-status' && req.method === 'GET') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ mode: process.env.AI_MODE === 'live' ? 'live' : 'mock' })); return; }
  if (req.method === 'POST' && req.url?.split('?')[0] === '/api/generate-stop-caption') {
    try { let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>9*1024*1024)throw new Error('PAYLOAD_TOO_LARGE');body+=chunk;}const result=await caption(JSON.parse(body));res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(result));return;}catch(e){const code=/^[A-Z_0-9]+$/.test(e.message)?e.message:'AGNES_CONNECTION_FAILED';console.error('[caption]',code);res.statusCode=502;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'这次没写出来，再试一次吧。',code}));return;}
  }
  if (req.method !== 'POST' || req.url?.split('?')[0] !== '/api/analyze-trip') { res.statusCode = 404; res.end(); return; }
  try {
    let body = '', bytes = 0;
    for await (const chunk of req) { bytes += chunk.length; if (bytes > 16 * 1024 * 1024) throw new Error('Payload too large'); body += chunk; }
    const result = await analyze(JSON.parse(body)); res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(result));
  } catch { res.statusCode = 502; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'AI 暂时没能还原这一天的行程。' })); }
}
