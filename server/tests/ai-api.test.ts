import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createAgentMiddleware } from '../src/ai/dev-api.ts';

test('local key setup keeps secrets out of responses and rejects cross-origin writes',async()=>{
 const root=await mkdtemp(join(tmpdir(),'freedoma-api-'));
 const handler=createAgentMiddleware(root);
 const server=createServer((req,res)=>void handler(req,res,()=>{res.statusCode=404;res.end();}));
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();assert.ok(address&&typeof address!=='string');
 const origin=`http://127.0.0.1:${address.port}`;
 const post=(path:string,body:unknown,source=origin)=>fetch(origin+path,{method:'POST',headers:{Origin:source,'Content-Type':'application/json'},body:JSON.stringify(body)});
 try{
  assert.equal((await post('/api/ai/configure',{key:'invalid'},'https://example.com')).status,403);
  assert.equal((await post('/api/ai/configure',{key:'invalid'})).status,400);
  assert.equal((await post('/api/ai/configure',{key:'sk-old-provider-abcdefghijklmnop'})).status,400);
  assert.equal((await post('/api/agent',{events:[{invalid:true}]})).status,400);
  if(!process.env.ANTHROPIC_API_KEY)assert.equal((await (await post('/api/agent',{events:[]})).json()).mode,'offline');
  assert.equal((await post('/api/cabinet/state',{events:[],messages:[{role:'system',text:'bad'}]})).status,400);
  assert.equal((await post('/api/cabinet/unknown',{events:[],messages:[]})).status,404);
  if(!process.env.ANTHROPIC_API_KEY)for(const id of ['state','treasury','defense','commerce','labor','health'])assert.equal((await (await post(`/api/cabinet/${id}`,{events:[],messages:[]})).json()).mode,'offline');
  const saved=await post('/api/ai/configure',{key:'sk-ant-test-only-not-a-real-key-abcdefghijklmnop',workspaceId:'workspace-test'});
  assert.deepEqual(await saved.json(),{configured:true});
  assert.deepEqual(await (await fetch(origin+'/api/ai/status')).json(),{configured:true,model:process.env.ANTHROPIC_MODEL||'claude-haiku-4-5',workspaceId:process.env.ANTHROPIC_WORKSPACE_ID||'workspace-test'});
  assert.equal((await stat(join(root,'.env.local'))).mode&0o777,0o600);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(root,{recursive:true,force:true});}
});
