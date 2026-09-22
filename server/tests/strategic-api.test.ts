import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createAgentMiddleware} from '../src/ai/dev-api.ts';
import {generateStrategic} from '../src/ai/strategic.ts';
import {createWorld,startPresidency,beginDay,replay} from '../src/world/oil-crisis.ts';
import {applyStrategic,strategicKey,offlineStrategicVoice,currentStrategicTurn} from '../src/diplomacy/strategic.ts';

test('strategic endpoint validates and caches agent proposals without committing effects',async t=>{
 const oldKey=process.env.ANTHROPIC_API_KEY;process.env.ANTHROPIC_API_KEY='test-only-no-network';
 t.after(()=>{if(oldKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=oldKey;});
 const localFetch=globalThis.fetch;let calls=0;
 t.mock.method(globalThis,'fetch',async(_url,init)=>{calls++;const body=JSON.parse(String(init?.body)),context=JSON.parse(body.messages[0].content);assert.equal(context.candidates.length,3);assert.equal(context.diplomacy.goals.length,4);const c=context.candidates[0];return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({candidate:c.id,line:'I will consider these exact terms. The agreement is unsigned.',replies:c.legalChoices.map(({id,title,line})=>({id,title,line}))})}]}));});
 const middleware=createAgentMiddleware('/nonexistent-strategic-test-config');
 const server=createServer((req,res)=>{void middleware(req,res,()=>{res.statusCode=404;res.end();});});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())));
 const address=server.address();assert.ok(address&&typeof address!=='string');const origin=`http://127.0.0.1:${address.port}`;
 const w=beginDay(applyStrategic(startPresidency(createWorld(),['More jobs','Safer schools','Better healthcare']),{kind:'init',seed:19}));
 const ask=async(events=w.events)=>{const r=await localFetch(origin+'/api/strategic',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({events})});return {status:r.status,data:await r.json()};};
 const a=await ask(),b=await ask();assert.equal(a.status,200);assert.equal(a.data.mode,'claude');assert.deepEqual(a,b);assert.equal(calls,1);assert.equal(currentStrategicTurn(w),undefined);
 const saved=applyStrategic(w,{kind:'turn',context:strategicKey(w),voice:a.data.voice});assert.deepEqual(replay(saved.events),saved);
 assert.deepEqual((await ask(saved.events)).data.voice,a.data.voice);assert.equal(calls,1);
 const bad=structuredClone(saved.events);bad.at(-1)!.strategic!.command={kind:'sign',turnId:999};assert.equal((await ask(bad)).status,400);
});
test('AI failures and illegal candidates are rejected for deterministic client fallback',async()=>{
 const w=applyStrategic(startPresidency(createWorld(),['More jobs','Safer schools','Better healthcare']),{kind:'init',seed:11});
 for(const data of [{stop_reason:'max_tokens',content:[]},{stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({...offlineStrategicVoice(w),candidate:'invade'})}]}])await assert.rejects(()=>generateStrategic(w,'test','test','',async()=>new Response(JSON.stringify(data))));
});
