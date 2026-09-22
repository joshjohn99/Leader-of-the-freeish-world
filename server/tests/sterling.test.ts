import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,decide,replyToMax,replay} from '../src/world/oil-crisis.ts';
import {maxTurn,maxReplies,pilotDaysLeft} from '../src/billionaires/sterling.ts';
import {generateMax,validateMaxVoice} from '../src/ai/sterling.ts';
import {socialContext} from '../src/ai/social.ts';
import {broadcastFor} from '../../web/broadcasts.ts';
const respond=(world:any,id:string)=>{const o=maxTurn(world);return replyToMax(world,id,o.id,o.strategy);};
test('bus pilot charges once, saves two oil per day for three days, then expires',()=>{
 let w=respond(createWorld(),'fund');assert.equal(w.state.treasury,65);assert.equal(w.state.oil,4);assert.equal(pilotDaysLeft(w),2);
 assert.ok(!maxReplies(w).some(r=>r.id==='fund'));
 w=decide(w,'buy');assert.equal(w.state.oil,10);assert.equal(pilotDaysLeft(w),1);
 w=decide(w,'wait');assert.equal(w.state.oil,6);assert.equal(pilotDaysLeft(w),0);
 w=decide(w,'wait');assert.equal(w.state.oil,0);
 assert.deepEqual(replay(w.events),w);
});
test('Max remembers praise, safeguards, humiliation and exact dialogue separately',()=>{
 const w=createWorld();assert.equal(maxTurn(respond(w,'praise')).strategy,'discount');
 const guaranteed=respond(w,'guarantees');assert.equal(maxTurn(guaranteed).strategy,'guarded');assert.equal(maxTurn(guaranteed).cost,20);
 assert.ok(!maxReplies(guaranteed).some(r=>r.id==='guarantees'));
 const insulted=respond(w,'humiliate');assert.throws(()=>maxTurn(insulted,'discount'));
 const o=maxTurn(w);const said=replyToMax(w,'praise',o.id,o.strategy,'My camera is ready.','Your ego could power the entire fleet.');
 assert.equal(said.events[0].sterling?.playerLine,'Your ego could power the entire fleet.');assert.equal(said.events[0].diplomacy,undefined);assert.deepEqual(replay(said.events),said);
});
test('stale, unaffordable and repeated pilot commitments are rejected atomically',()=>{
 const start=createWorld(),o=maxTurn(start),funded=respond(start,'fund');
 assert.throws(()=>replyToMax(funded,'fund',o.id,o.strategy));
 const active=maxTurn(funded);assert.throws(()=>replyToMax(funded,'fund',active.id,active.strategy));
 let poor=start;for(let i=0;i<5;i++)poor=decide(poor,'buy');assert.ok(poor.state.treasury<18);
 assert.throws(()=>respond(poor,'fund'));assert.deepEqual(replay(poor.events),poor);
});
test('Max public consequences exclude his private text and have truthful history',()=>{
 const w=createWorld(),o=maxTurn(w),funded=replyToMax(w,'fund',o.id,o.strategy,'secret Max plans','Private player statement');
 const context=JSON.stringify(socialContext(funded,[]));assert.match(context,/bus pilot funded/);assert.doesNotMatch(context,/secret Max|Private player/);
 assert.equal(broadcastFor(funded.events[0]).format,'VOLT MOTORS MEETING');
});
test('Max has his own validated Claude request and rejects Viktor tactics',async()=>{
 const voice={strategy:'hype',line:'President, the cameras are here before the buses.',replies:[{id:'fund',title:'Fund the pilot',line:'I want real buses, Max.'},{id:'decline',title:'No launch today',line:'Please take the cameras home.'}]};
 const fetcher=async(_url:any,options:any)=>{const body=JSON.parse(options.body);assert.match(body.system,/Max Sterling/);assert.equal(options.headers['anthropic-workspace-id'],'workspace');return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(voice)}]}));};
 assert.deepEqual(await generateMax(createWorld(),'key','model','workspace',fetcher as typeof fetch),voice);
 assert.throws(()=>validateMaxVoice({...voice,replies:[{...voice.replies[0],id:'counter'},voice.replies[1]]},createWorld()));
});
