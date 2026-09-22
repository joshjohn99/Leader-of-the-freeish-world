import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createAgentMiddleware} from '../src/ai/dev-api.ts';
import {createWorld,startPresidency,assignCabinetPromise} from '../src/world/oil-crisis.ts';

test('cabinet endpoint carries the selected promise through dispatch and separates cached topics',async t=>{
 const oldKey=process.env.ANTHROPIC_API_KEY;
 process.env.ANTHROPIC_API_KEY='test-only-no-network';
 t.after(()=>{if(oldKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=oldKey;});
 const localFetch=globalThis.fetch,seen:number[]=[];
 t.mock.method(globalThis,'fetch',async(_url,init)=>{
  const body=JSON.parse(String(init?.body)),context=JSON.parse(body.messages[0].content);
  seen.push(context.selectedPromise.index);
  return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({line:`Advice for promise ${context.selectedPromise.index}`,replies:['What next?','What will it cost?']})}]}));
 });
 const middleware=createAgentMiddleware('/nonexistent-cabinet-test-config');
 const server=createServer((req,res)=>{void middleware(req,res,()=>{res.statusCode=404;res.end();});});
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 t.after(()=>new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve())));
 const address=server.address();assert.ok(address&&typeof address!=='string');
 const origin=`http://127.0.0.1:${address.port}`;
 const world=assignCabinetPromise(startPresidency(createWorld(),['More local jobs','Affordable healthcare','Safer schools']),1,'commerce');
 const ask=async(promise:unknown)=>{
  const response=await localFetch(origin+'/api/cabinet/commerce',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({events:world.events,promise,messages:[{role:'user',text:'What is my next step?'}]})});
  return {status:response.status,data:await response.json()};
 };
 assert.equal((await ask(1)).data.voice.line,'Advice for promise 1');
 assert.equal((await ask(0)).data.voice.line,'Advice for promise 0');
 assert.equal((await ask(1)).data.voice.line,'Advice for promise 1');
 assert.deepEqual(seen,[1,0]);
 assert.equal((await ask(5)).status,400);
 assert.deepEqual(seen,[1,0]);
});
