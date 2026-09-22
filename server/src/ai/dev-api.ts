import {generateCongress} from './congress.ts';
import {cabinetMembers,validateCabinetMessages} from '../agents/cabinet.ts';
import {generateCabinet} from './cabinet.ts';
import {AgentRegistry,CharacterAgent} from '../agents/registry.ts';
import {generateStaff} from './staff.ts';
import { readFile, writeFile, chmod } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { replay } from '../world/oil-crisis.ts';
import { generateVoice, ClaudeRequestError } from './claude.ts';
import { generateMax } from './sterling.ts';
import { generateSocial } from './social.ts';
import { validateInteractions } from '../../../shared/schemas/social.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Loopback-only development middleware. This is not a deployed public API.
export function createAgentMiddleware(root:string) {
  const agents=new AgentRegistry()
   .register(new CharacterAgent('/api/agent',async({world},c)=>({voice:await generateVoice(world,c.key,c.model,fetch,c.workspaceId)})))
   .register(new CharacterAgent('/api/max',async({world},c)=>({voice:await generateMax(world,c.key,c.model,c.workspaceId)})))
   .register(new CharacterAgent('/api/social',async({world,interactions,cabinetMessages,congressPromise},c)=>({posts:await generateSocial(world,interactions,c.key,c.model,c.workspaceId)})))
   .register(new CharacterAgent('/api/staff',async({world},c)=>({brief:await generateStaff(world,c.key,c.model,c.workspaceId)})));
  for(const member of cabinetMembers)agents.register(new CharacterAgent(`/api/cabinet/${member.id}`,async({world,cabinetMessages},c)=>({voice:await generateCabinet(world,member.id,cabinetMessages??[],c.key,c.model,c.workspaceId)})));
  for(const chamber of ['house','senate'] as const)agents.register(new CharacterAgent(`/api/congress/${chamber}`,async({world,congressPromise},c)=>({voice:await generateCongress(world,congressPromise!,chamber,c.key,c.model,c.workspaceId)})));
  const configPath=resolve(root,'.env.local');
  const cache=new Map<string,Promise<unknown>>();let lastWindow=Date.now(),requestCount=0;
  async function config(){
    let content='';try{content=await readFile(configPath,'utf8');}catch{}
    const fileKey=content.match(/^ANTHROPIC_API_KEY=(.*)$/m)?.[1]?.trim()??'';
    return {key:process.env.ANTHROPIC_API_KEY||fileKey,model:process.env.ANTHROPIC_MODEL||'claude-haiku-4-5',workspaceId:process.env.ANTHROPIC_WORKSPACE_ID||content.match(/^ANTHROPIC_WORKSPACE_ID=(.*)$/m)?.[1]?.trim()||''};
  }
  return async (req:IncomingMessage,res:ServerResponse,next:()=>void)=>{
    if(!req.url?.startsWith('/api/'))return next();
    const json=(status:number,data:unknown)=>{res.statusCode=status;res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(data));};
    const host=req.headers.host??'';const origin=req.headers.origin;
    if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)|| (origin&&origin!==`http://${host}`))return json(403,{error:'Local same-origin requests only.'});
    if(req.method==='GET'&&req.url==='/api/ai/status'){const c=await config();return json(200,{configured:!!c.key,model:c.model,workspaceId:c.workspaceId});}
    if(req.method!=='POST'||!(req.url==='/api/ai/configure'||agents.has(req.url)))return json(404,{error:'Not found'});
    if(origin!==`http://${host}` || !req.headers['content-type']?.startsWith('application/json'))return json(403,{error:'Open this action from the local game.'});
    try{
      let raw='';for await(const part of req){raw+=part.toString();if(Buffer.byteLength(raw)>500_000)return json(413,{error:'Playtest history is too large.'});}
      const body=JSON.parse(raw);
      if(req.url==='/api/ai/configure'){
        const current=await config();
        if(typeof body.key!=='string'||(body.key.trim()?!/^sk-ant-[A-Za-z0-9_-]{20,300}$/.test(body.key.trim()):!current.key))return json(400,{error:'Enter a valid Claude API key.'});
        if(typeof body.workspaceId!=='string'||(body.workspaceId&&!/^[A-Za-z0-9_-]{5,100}$/.test(body.workspaceId)))return json(400,{error:'Enter a valid Claude workspace ID.'});
        let existing='';try{existing=await readFile(configPath,'utf8');}catch{}
        const lines=existing.split('\n').filter(line=>!line.startsWith('ANTHROPIC_API_KEY=')&&!line.startsWith('ANTHROPIC_WORKSPACE_ID=')).join('\n').trim();
        await writeFile(configPath,`${lines?lines+'\n':''}ANTHROPIC_API_KEY=${body.key.trim()||current.key}\nANTHROPIC_WORKSPACE_ID=${body.workspaceId}\n`,{mode:0o600});await chmod(configPath,0o600);cache.clear();return json(200,{configured:true});
      }
      if(!Array.isArray(body.events)||body.events.length>1500)return json(400,{error:'Invalid or oversized history.'});
      const congressPromise=req.url.startsWith('/api/congress/')?body.promise:undefined;
      if(req.url.startsWith('/api/congress/')&&(!Number.isInteger(congressPromise)||congressPromise<0||congressPromise>2))return json(400,{error:'Choose a campaign promise.'});
      const cabinetMessages=req.url.startsWith('/api/cabinet/')?validateCabinetMessages(body.messages??[]):[];
      const world=replay(body.events);const social=req.url==='/api/social';const interactions=social?validateInteractions(body.interactions??[],world.state.day):[];const c=await config();
      if(!c.key)return json(200,{mode:'offline',reason:'Connect Claude to enable generated dialogue and model-selected strategies.'});
      const digest=createHash('sha256').update(req.url+JSON.stringify(body.events)+JSON.stringify(interactions)+JSON.stringify(cabinetMessages)+String(congressPromise)+c.model+c.workspaceId).digest('hex');
      if(!cache.has(digest)){
        if(Date.now()-lastWindow>60000){lastWindow=Date.now();requestCount=0;}
        if(requestCount++>=12)return json(429,{mode:'offline',reason:'Local request limit reached. Using the offline opponent for now.'});
        const pending=agents.respond(req.url,{world,interactions,cabinetMessages,congressPromise},c).then(result=>({mode:'claude',...result})).catch((error)=>{cache.delete(digest);return {mode:'offline',reason:error instanceof ClaudeRequestError ? error.reason : 'Claude could not complete this turn. Using the offline opponent; check the API key, billing, or connection.'};});
        cache.set(digest,pending);if(cache.size>100)cache.delete(cache.keys().next().value!);
      }
      return json(200,await cache.get(digest));
    }catch{return json(400,{error:'Could not validate this request. Your current game state was not changed.'});}
  };
}
