import { caption } from './caption.mjs';
// Server-only provider boundary. No secrets are exposed through VITE_ variables.
import { analyzeWithOpenAI } from './openaiProvider.mjs';
export const COPY_INSTRUCTIONS = '你正在为私人旅行电子手账写一条短配文。输入包括当前时间、地点、代表照片、照片视觉描述以及相邻站点信息。请用简体中文输出1至2个完整短句，约30至45个汉字，必须自然结束，宁可略短也不要在词语或句子中间停止。结合地点、时间与照片整体氛围，挑选一两个有代表性的细节自然表达，不必机械罗列画面内容。文字要像本人随手写下的旅行感想，可以加入适度、克制的轻松、安静、惊喜、热闹或小满足，但不要虚构强烈情绪和具体经历。地点可以自然带入，不写百科介绍。严禁编造天气、同行者、排队、消费、历史知识或照片无法支持的活动。不写攻略或营销文案，禁止“把光影收进记忆”“感受城市魅力”“一切刚刚好”“浪漫邂逅”等空泛套话。直接输出文案，不解释过程。';
function validateInput(input) {
  if (!input || typeof input.date !== 'string' || input.date.length > 20 || !Array.isArray(input.clusters) || !input.clusters.length || input.clusters.length > 100) throw new Error('Invalid analysis input');
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
function cleanCaption(value) { return typeof value === 'string' ? value.trim() : ''; }
export async function analyze(input, env = process.env) {
  validateInput(input);
  const live = env.AI_MODE === 'live';
  if (live && (!env.AI_API_KEY || !env.AI_MODEL)) throw new Error('AI provider is not configured');
  const places = {};
  const geocodeCache = analyze.geocodeCache || (analyze.geocodeCache = new Map());
  if (live && env.GEOCODING_PROVIDER_URL) {
    for (const cluster of input.clusters) if (cluster.centerLocation) {
      const key = `${cluster.centerLocation.latitude.toFixed(5)},${cluster.centerLocation.longitude.toFixed(5)}`;
      try { const place = geocodeCache.get(key) || await providerRequest(env.GEOCODING_PROVIDER_URL, cluster.centerLocation, env.GEOCODING_API_KEY);geocodeCache.set(key, place);places[cluster.id] = place; } catch { /* Keep coordinates when geocoding is unavailable. */ }
    }
  }
  const visionClusters = live ? input.clusters.filter(cluster => !cluster.centerLocation || !places[cluster.id] || Number(cluster.confidence) < .62).slice(0, 5) : [];
  const result = visionClusters.length ? await analyzeWithOpenAI({ ...input, clusters: visionClusters }, places, COPY_INSTRUCTIONS, env, providerRequest) : null;
  if (visionClusters.length && (!Array.isArray(result?.stops) || result.stops.length !== visionClusters.length || !visionClusters.every(c => result.stops.some(s => s.id === c.id)))) throw new Error('Invalid structured AI result');
  // Rebuild in input order. Provider cannot inject photo IDs or override times/GPS.
  const stops = input.clusters.map((cluster, index) => {
    const ai = result?.stops.find(stop => stop.id === cluster.id), gps = places[cluster.id];
    const confidence = Math.max(0, Math.min(1, Number(cluster.centerLocation ? (gps?.confidence ?? cluster.confidence) : (ai?.confidence ?? cluster.confidence)) || 0));
    const placeType = clean(ai?.placeType, 24) || 'other';
    const scenes = { museum: '博物馆', garden: '园林', street: '街边', restaurant: '餐厅', cafe: '咖啡馆', park: '公园', nature: '自然风景' };
    const placeName = gps ? (clean(gps.placeName, 40) || clean(gps.district, 40) || clean(gps.city, 40) || '') : cluster.centerLocation ? '' : confidence >= .85 ? clean(ai?.placeName, 40) : scenes[placeType] || '';
    return { id: cluster.id, startTime: cluster.startLabel || '', endTime: cluster.endLabel || '', placeName, placeType, confidence,
      placeSource: gps ? 'gps' : ai?.placeName ? 'ai' : 'unknown', placeConfidence: confidence, clusterConfidence: cluster.confidence, locationSource: cluster.centerLocation ? 'gps' : live ? 'visual' : 'inferred', location:cluster.centerLocation??null, city:clean(gps?.city,40), photoIds: cluster.photoIds,
      representativePhotoIds: cluster.representativePhotoIds.filter(id=>cluster.photoIds.includes(id)).slice(0,3),
      caption: confidence >= .85 ? cleanCaption(ai?.caption) || '这段照片的故事，留给我慢慢写。' : '在这里留下一段照片，具体的故事由我补上。', shortCaption: confidence >= .85 ? cleanCaption(ai?.shortCaption) : '' };
  });
  return { date: input.date, title: clean(result?.title, 40) || '这一天的旅行', summary: clean(result?.summary, 80) || '按照片的先后，留下这一天的片段。', closingText: clean(result?.closingText, 60) || '把今天留下，等以后再翻看。', stops, mode: live ? 'live' : 'mock', photoSignature: input.photoSignature };
}
export async function handleApi(req, res) {
  if (req.url?.split('?')[0] === '/api/ai-status' && req.method === 'GET') {
    const configured=Boolean(process.env.AI_API_KEY&&process.env.AI_MODEL);
    res.statusCode=200;res.setHeader('Content-Type', 'application/json');res.setHeader('Cache-Control','no-store');
    res.end(JSON.stringify({mode:process.env.AI_MODE==='live'&&configured?'live':'mock',configured,...(process.env.AI_MODEL?{model:process.env.AI_MODEL}:{})}));return;
  }
  if (req.method === 'POST' && req.url?.split('?')[0] === '/api/generate-stop-caption') {
    try { let body='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>9*1024*1024)throw new Error('PAYLOAD_TOO_LARGE');body+=chunk;}const result=await caption(JSON.parse(body));res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(result));return;}catch(e){const code=/^[A-Z_0-9]+$/.test(e.message)?e.message:'AGNES_CONNECTION_FAILED';console.error('[caption]',code);res.statusCode=502;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'这次没写出来，再试一次吧。',code}));return;}
  }
  if (req.method !== 'POST' || req.url?.split('?')[0] !== '/api/analyze-trip') { res.statusCode = 404; res.end(); return; }
  try {
    let body = '', bytes = 0;
    for await (const chunk of req) { bytes += chunk.length; if (bytes > 16 * 1024 * 1024) throw new Error('Payload too large'); body += chunk; }
    const result = await analyze(JSON.parse(body)); res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(result));
  } catch (error) { console.error('[analyze-trip]',error instanceof Error?error.name:'Error',error instanceof Error?error.message:'Unknown error');res.statusCode = 502; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'AI 暂时没能还原这一天的行程。' })); }
}
