import { loadEnv } from 'vite';
import { handleApi } from './api.mjs';

// Local development adapter only. Vercel functions import server/api.mjs directly,
// so their runtime never needs to load Vite.
export const apiPlugin = {
  name: 'trip-ai-api',
  configResolved(config) {
    const env=loadEnv(config.mode,config.root,'');
    for(const key of ['AI_MODE','AI_BASE_URL','AI_MODEL','AI_API_KEY','AGNES_API_KEY','AGNES_BASE_URL','AGNES_MODEL','GEOCODING_PROVIDER_URL','GEOCODING_API_KEY'])if(env[key]!==undefined)process.env[key]=env[key];
  },
  configureServer(server) {
    server.middlewares.use((req,res,next)=>req.url?.startsWith('/api/')?void handleApi(req,res):next());
  }
};
