import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,startPresidency,seatCongress,actInCongress,decide,replay,beginDay,endDay,replyToPetrov,replyToMax,respondToNews} from '../src/world/oil-crisis.ts';
import {congressRules} from '../src/congress/congress.ts';
import {electionRules} from '../src/election/election.ts';
import {agendaEngine} from '../src/agenda/agenda.ts';
import {petrovTurn} from '../src/diplomacy/petrov.ts';import {maxTurn} from '../src/billionaires/sterling.ts';
import {generateCongress,validateCongressVoice} from '../src/ai/congress.ts';
const start=(seed=123)=>seatCongress(startPresidency(createWorld(),['Affordable buses for everyone','Repair roads in rural areas','Unicorns at every school']),seed);
function tomorrow(world:ReturnType<typeof start>){world=decide(world,'wait');for(const task of agendaEngine.tasks(world)){if(task.done)continue;if(task.id==='petrov')world=replyToPetrov(world,'decline',petrovTurn(world).id);if(task.id==='max'){const offer=maxTurn(world);world=replyToMax(world,'decline',offer.id,offer.strategy);}if(task.id==='news')world=respondToNews(world,task.subject!,'monitor');}return beginDay(endDay(world));}
test('seeded Congress has two independent multi-voice chambers and survives replay',()=>{
 const world=start();assert.deepEqual(replay(world.events),world);assert.deepEqual(congressRules.tally(world,0,'house'),congressRules.tally(start(),0,'house'));
 assert.notDeepEqual(congressRules.tally(world,0,'house').voices.map(v=>v.support),congressRules.tally(start(987),0,'house').voices.map(v=>v.support));
 for(const chamber of ['house','senate'] as const){const t=congressRules.tally(world,0,chamber);assert.equal(t.voices.length,3);assert.equal(t.voices.reduce((n,v)=>n+v.seats,0),t.seats);assert.equal(t.canPass,t.yes>=t.needed);}
 assert.throws(()=>seatCongress(world,2),/already/);assert.throws(()=>seatCongress(createWorld(),-1),/Invalid/);
});
test('both chambers must approve; all three promises can be fulfilled in the daily loop before election',()=>{
 let world=beginDay(start());
 for(let index=0;index<3;index++){
  world=actInCongress(world,index,'house','draft','A practical publicly reviewed pilot with a feasible scope and measurable goals.');world=tomorrow(world);
  for(const action of ['costing','benefits','oversight'] as const){const day=world.state.day;world=actInCongress(world,index,'house',action);assert.equal(world.state.day,day);world=tomorrow(world);}
  world=actInCongress(world,index,'house','vote');assert.equal(congressRules.bill(world,index).authorized,false);world=tomorrow(world);
  world=actInCongress(world,index,'senate','vote');assert.equal(congressRules.bill(world,index).authorized,true);assert.match(electionRules.scorecard(world)[index].status,/Fulfilled/);world=tomorrow(world);
 }
 assert.ok(world.state.day<30);assert.deepEqual(replay(world.events),world);assert.ok(electionRules.scorecard(world).every(p=>p.credibility===6));
});
test('amendments reopen previously passed chamber approvals',()=>{
 let world=start();let seed=0;while(!congressRules.tally(world,0,'house').canPass)world=start(++seed);
 world=actInCongress(world,0,'house','draft','A cost-conscious practical transport pilot.');world=decide(world,'wait');world=actInCongress(world,0,'house','vote');assert.deepEqual(congressRules.bill(world,0).passed,['house']);
 world=decide(world,'wait');world=actInCongress(world,0,'senate','oversight');assert.deepEqual(congressRules.bill(world,0).passed,[]);assert.deepEqual(replay(world.events),world);
});
test('Congress rejects repeated daily actions, invalid drafts and unfunded concessions',()=>{
 let world=start();assert.throws(()=>actInCongress(world,0,'house','draft','tiny'));assert.throws(()=>actInCongress(world,7,'house','draft','A reasonable proposal'));assert.throws(()=>actInCongress(world,0,'house','vote'));
 world=actInCongress(world,0,'house','draft','A practical and measurable regional pilot.');assert.throws(()=>actInCongress(world,1,'senate','draft','Another practical regional pilot'),/Today/);
 world=decide(world,'wait');assert.throws(()=>actInCongress({...world,state:{...world.state,treasury:0}},0,'house','costing'),/treasury/);assert.throws(()=>actInCongress({...world,state:{...world.state,day:31}},0,'house','vote'),/ended/);
 const before=JSON.stringify(world);assert.throws(()=>actInCongress(world,0,'house','benefits','Invented extra text'));assert.equal(JSON.stringify(world),before);
});
test('congressional actions do not complete the public briefing or count as domestic policy',()=>{
 let world=beginDay(start());world=actInCongress(world,0,'house','draft','A practical program with public review.');assert.equal(agendaEngine.tasks(world).find(t=>t.id==='public')?.done,false);world=decide(world,'ration');assert.equal(world.state.day,1);assert.deepEqual(replay(world.events),world);
});
test('AI debate has three distinct voices and only legal response tactics',async()=>{
 const world=start(),voice={voices:['banner','workbench','free'].map(id=>({id,line:'President, we want practical details before a vote.'})),replies:[{id:'draft',title:'Put our practical proposal on the table'}]};
 assert.deepEqual(validateCongressVoice(voice,world,0,'house'),voice);assert.throws(()=>validateCongressVoice({...voice,voices:[voice.voices[0],voice.voices[0],voice.voices[2]]},world,0,'house'));assert.throws(()=>validateCongressVoice({...voice,replies:[{id:'invent',title:'Make it happen'}]},world,0,'house'));
 const result=await generateCongress(world,0,'house','test-key','model','',async(_url,options)=>{const body=JSON.parse(String(options?.body));assert.equal(JSON.parse(body.messages[0].content).tally.voices.length,3);return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(voice)}]}));});assert.deepEqual(result,voice);
});

test('forged congressional vote outcomes fail replay validation',()=>{
 let world=start();world=actInCongress(world,0,'house','draft','A practical publicly reviewed proposal.');world=decide(world,'wait');world=actInCongress(world,0,'house','vote');
 const events=JSON.parse(JSON.stringify(world.events));events.at(-1).congress.passed=!events.at(-1).congress.passed;assert.throws(()=>replay(events),/does not match/);
});
