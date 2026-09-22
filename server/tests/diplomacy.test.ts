import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, decide, replay, replyToPetrov } from '../src/world/oil-crisis.ts';
import { petrovTurn, petrovReplies, petrovCandidates } from '../src/diplomacy/petrov.ts';
import { socialFeed } from '../../web/social.ts';
import { generateVoice, validateVoice } from '../src/ai/claude.ts';

test('counteroffer changes price and available replies, then settles and replays',()=>{
 const start=createWorld(), offer=petrovTurn(start);
 const counter=replyToPetrov(start,'counter',offer.id);
 const revised=petrovTurn(counter);
 assert.equal(revised.move,'counteroffer');assert.equal(revised.unitPrice,offer.unitPrice-1);
 assert.ok(!petrovReplies(counter).some(r=>r.id==='counter'));
 const settled=replyToPetrov(counter,'accept',revised.id);
 assert.equal(settled.state.treasury,counter.state.treasury-revised.quantity*revised.unitPrice+3);
 assert.equal(settled.state.supplierOil,counter.state.supplierOil-revised.quantity+4);
 assert.equal(settled.state.oil,counter.state.oil+revised.quantity-6);
 assert.deepEqual(replay(settled.events),settled);
 assert.equal(start.events.length,0);
});
test('pressure offers change replies; rejected and stale choices never mutate state',()=>{
 const start=createWorld(), old=petrovTurn(start), threatened=decide(start,'threaten');
 const offer=petrovTurn(threatened), before=JSON.stringify(threatened);
 assert.equal(offer.move,'pressure');assert.ok(offer.unitPrice>old.unitPrice);
 assert.ok(petrovReplies(threatened).some(r=>r.id==='apologize'));
 assert.throws(()=>replyToPetrov(threatened,'accept',old.id));
 assert.throws(()=>replyToPetrov(threatened,'threaten',offer.id));
 assert.equal(JSON.stringify(threatened),before);
 const apology=replyToPetrov(threatened,'apologize',offer.id);
 assert.equal(apology.state.relations,threatened.state.relations+10);
 assert.equal(petrovTurn(apology).move,'partnership');
});
test('every legal model strategy settles at its recorded terms and replays',()=>{
 const world=createWorld();
 for(const offer of petrovCandidates(world)){
  const result=replyToPetrov(world,'accept',offer.id,offer.strategy,'A deal fit for our magnificent accountants.');
  assert.equal(result.state.supplierTreasury,world.state.supplierTreasury+offer.quantity*offer.unitPrice);
  assert.deepEqual(replay(result.events),result);
 }
 assert.throws(()=>petrovTurn(world,'invented'));
});
test('social feed reflects public outcomes without changing the world',()=>{
 const w=replyToPetrov(createWorld(),'counter',petrovTurn(createWorld()).id), before=JSON.stringify(w);
 const posts=socialFeed(w);
 assert.ok(posts.some(p=>p.tone==='critical'));assert.ok(posts.some(p=>p.tone==='supportive'));
 assert.ok(posts.some(p=>p.text.includes('without a shipment')));
 assert.ok(!posts.some(p=>p.text.includes('Lower the price')));
 assert.equal(JSON.stringify(w),before);
});
const voice={replies:[{id:'accept',title:'Send the invoice',line:'Your accountants have won this round.'},{id:'ask_needs',title:'What do you need?',line:'Let us discuss your actual priorities.'},{id:'decline',title:'End the call',line:'I will call when my cabinet finds its wallet.'}],strategy:'default',line:'Your campaign promises have become my export strategy.',posts:[{author:'driver',text:'My car is waiting for a policy with wheels.',tone:'critical'},{author:'supporter',text:'Our president is working the phones!',tone:'supportive'},{author:'journalist',text:'The Department of Energy awaits supplies.',tone:'neutral'}]};
test('Claude adapter requests structured output and validates it before use',async()=>{
 const fetcher=async(url:any,options:any)=>{
  assert.equal(url,'https://api.anthropic.com/v1/messages');
  const body=JSON.parse(options.body);assert.equal(body.output_config.format.type,'json_schema');assert.equal(options.headers['anthropic-version'],'2023-06-01');assert.equal(options.headers['x-api-key'],'test-key');assert.equal(body.messages[0].role,'user');
  return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(voice)}]}));
 };
 assert.deepEqual(await generateVoice(createWorld(),'test-key','claude-haiku-4-5',fetcher as typeof fetch),voice);
 assert.throws(()=>validateVoice({...voice,strategy:'invented'},createWorld()));
 assert.throws(()=>validateVoice({...voice,line:'I promise 900 oil'},createWorld()));
 await assert.rejects(generateVoice(createWorld(),'test-key','test',async()=>new Response('{}',{status:401})));
});

test('Claude refuses incomplete, refused, malformed and out-of-bounds turns',async()=>{
 for(const data of [
  {stop_reason:'max_tokens',content:[{type:'text',text:JSON.stringify(voice)}]},
  {stop_reason:'refusal',content:[]},
  {stop_reason:'end_turn',content:[{type:'text',text:'not json'}]},
  {stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({...voice,strategy:'invented'})}]}
 ])await assert.rejects(generateVoice(createWorld(),'test-key','test',async()=>new Response(JSON.stringify(data))));
 await assert.rejects(generateVoice(createWorld(),'test-key','test',async()=>new Response(JSON.stringify({error:{message:'Your credit balance is too low'}}),{status:400})),/credits are exhausted/);
});

test('Claude receives workspace scope and explains missing workspace errors',async()=>{
 const fetcher=async(url:any,options:any)=>{
  assert.equal(options.headers['anthropic-workspace-id'],'workspace-test');
  return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(voice)}]}));
 };
 assert.deepEqual(await generateVoice(createWorld(),'test-key','test',fetcher as typeof fetch,'workspace-test'),voice);
 await assert.rejects(generateVoice(createWorld(),'test-key','test',async()=>new Response(JSON.stringify({error:{message:'This API key is not scoped to a workspace; provide anthropic-workspace-id'}}),{status:400})),/needs a workspace ID/);
});

test('generated replies reject illegal or duplicate tactics and preserve essential choices',()=>{
 assert.throws(()=>validateVoice({...voice,replies:[...voice.replies,{id:'challenge',title:'Challenge',line:'I challenge your markup.'}]},createWorld()));
 assert.throws(()=>validateVoice({...voice,replies:[...voice.replies,voice.replies[0]]},createWorld()));
 assert.throws(()=>validateVoice({...voice,replies:voice.replies.map(r=>r.id==='accept'?{...r,id:'reassure'}:r)},createWorld()));
});
test('chosen AI player dialogue survives deterministic replay and cannot alter settlement',()=>{
 const world=createWorld(),offer=petrovTurn(world),line='Your accountant can frame the receipt, but I am taking the oil.';
 const result=replyToPetrov(world,'accept',offer.id,'default','My accountant awaits.',line);
 assert.equal(result.events[0].diplomacy?.playerLine,line);
 assert.deepEqual(replay(result.events),result);
 assert.deepEqual(result.state,replyToPetrov(world,'accept',offer.id).state);
 assert.throws(()=>replyToPetrov(world,'accept',offer.id,'default',undefined,'x'.repeat(401)));
});
test('new tactics change the next exchange and remain conditional',()=>{
 const start=createWorld(),offer=petrovTurn(start);
 const inquiry=replyToPetrov(start,'ask_needs',offer.id);
 assert.ok(!petrovReplies(inquiry).some(r=>r.id==='ask_needs'));
 assert.match(petrovTurn(inquiry).line,/My priorities/);
 const pressure=decide(start,'threaten');
 const challenged=replyToPetrov(pressure,'challenge',petrovTurn(pressure).id);
 assert.equal(challenged.state.relations,pressure.state.relations-3);
 assert.equal(petrovTurn(challenged).move,'counteroffer');
 assert.deepEqual(replay(challenged.events),challenged);
 const counter=replyToPetrov(start,'counter',offer.id);
 const credited=replyToPetrov(counter,'give_credit',petrovTurn(counter).id);
 assert.equal(credited.state.relations,counter.state.relations+8);
 assert.equal(petrovTurn(credited).move,'partnership');
 assert.deepEqual(replay(credited.events),credited);
});

test('negotiation response works without unrelated social output',()=>{
 const {posts,...negotiation}=voice;
 assert.deepEqual(validateVoice(negotiation,createWorld()).posts,[]);
});
