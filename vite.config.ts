import { defineConfig } from 'vite';
import { createAgentMiddleware } from './server/src/ai/dev-api.ts';
export default defineConfig({
  server:{host:'127.0.0.1',port:5173,strictPort:true,watch:{ignored:['**/.env.local']}},
  plugins:[{name:'freedoma-local-agent',configureServer(server){server.middlewares.use(createAgentMiddleware(process.cwd()));}}]
});
