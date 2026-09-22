import test from 'node:test';import assert from 'node:assert/strict';
import {electionRules} from '../src/election/election.ts';
import {createWorld,decide,startPresidency,decidePromise,replay} from '../src/world/oil-crisis.ts';
import {electionMarkup} from '../../web/election.ts';
test('three blocs contribute weighted support with bounded deterministic results',()=>{
 const world=createWorld(),e=electionRules.snapshot(world);
 assert.equal(e.blocs.length,3);assert.equal(e.blocs.reduce((n,b)=>n+b.share,0),100);
 assert.equal(e.vote,Math.round(e.blocs.reduce((n,b)=>n+b.support*b.share/100,0)*10)/10);
 assert.deepEqual(electionRules.snapshot(world),e);assert.equal(e.remaining,30);
 for(const approval of [0,100])for(const b of electionRules.snapshot({...world,state:{...world.state,approval}}).blocs)assert.ok(b.support>=0&&b.support<=100);
});
test('day 30 can be played, election locks after 30 days, replay remains exact',()=>{
 let world=createWorld();for(let i=0;i<29;i++)world=decide(world,'wait');
 assert.equal(world.state.day,30);assert.equal(electionRules.finished(world),false);
 world=decide(world,'wait');assert.equal(electionRules.finished(world),true);assert.equal(electionRules.snapshot(world).remaining,0);
 assert.throws(()=>decide(world,'wait'),/election has concluded/);assert.deepEqual(replay(world.events),world);
 // Historical saves beyond the deadline can still load.
 const legacy=decide(world,'wait',true,false);assert.deepEqual(replay(legacy.events),legacy);
});
test('promise follow-through changes credibility without claiming fulfillment',()=>{
 const world=startPresidency(createWorld(),['Unicorns at every school','Keep fuel affordable','Build better roads']);
 assert.equal(electionRules.scorecard(world)[0].status,'Unaddressed');
 const studied=decidePromise(world,0,'pilot');assert.equal(electionRules.scorecard(studied)[0].status,'Under study');
 const withdrawn=decidePromise(world,0,'withdraw');assert.equal(electionRules.scorecard(withdrawn)[0].status,'Withdrawn');
 assert.ok(electionRules.scorecard(studied)[0].credibility>electionRules.scorecard(withdrawn)[0].credibility);
 const html=electionMarkup(startPresidency(createWorld(),['<script>alert(1)</script>','Keep fuel affordable','Build better roads']));assert.ok(!html.includes('<script>'));assert.match(html,/role="meter"/);
});
test('only a majority earns a second term',()=>{
 const world=createWorld();const high=electionRules.snapshot({...world,state:{...world.state,day:31,approval:100}}),low=electionRules.snapshot({...world,state:{...world.state,day:31,approval:0}});
 assert.equal(high.won,true);assert.equal(low.won,false);assert.equal(electionRules.snapshot(world).won,false);
});
test('negotiation can continue without burning a day; committed deals still consume a day',async()=>{
 const {replyToPetrov,replyToMax}=await import('../src/world/oil-crisis.ts');const {petrovTurn}=await import('../src/diplomacy/petrov.ts');const {maxTurn}=await import('../src/billionaires/sterling.ts');
 const start=createWorld();let world=replyToPetrov(start,'counter',petrovTurn(start).id);assert.deepEqual(world.state,start.state);assert.deepEqual(replay(world.events),world);
 const offer=petrovTurn(world);world=replyToPetrov(world,'accept',offer.id);assert.equal(world.state.day,2);assert.deepEqual(replay(world.events),world);
 const max=maxTurn(world),before=world.state;world=replyToMax(world,'praise',max.id,max.strategy);assert.deepEqual(world.state,before);assert.deepEqual(replay(world.events),world);
 const old=replyToPetrov(start,'counter',petrovTurn(start).id,'default',undefined,undefined,true,false,false);assert.equal(old.state.day,2);assert.deepEqual(replay(old.events),old);
});
test('legacy post-election actions cannot change the final ballot',()=>{
 let world=createWorld();for(let i=0;i<30;i++)world=decide(world,'wait');
 const ballot=electionRules.snapshot(world);world=decide(world,'threaten',true,false);
 assert.deepEqual(electionRules.snapshot(world),ballot);
});
test('blocs value the same recorded policy differently',()=>{
 const start=createWorld(),threatened=decide(start,'threaten');
 const before=electionRules.snapshot(start),after=electionRules.snapshot({...threatened,state:start.state});
 assert.ok(after.blocs[0].support>before.blocs[0].support);assert.equal(after.blocs[1].support,before.blocs[1].support);
});
