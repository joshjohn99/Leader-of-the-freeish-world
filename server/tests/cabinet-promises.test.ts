import test from 'node:test';
import assert from 'node:assert/strict';
import {assignCabinetPromise,createWorld,startPresidency,seatCongress,beginDay,actInCongress,decide,decidePromise,replay} from '../src/world/oil-crisis.ts';
import {cabinetPromiseOverview,promiseGuidance,promiseOwner} from '../src/cabinet/promises.ts';
import {cabinetContext,offlineCabinet} from '../src/agents/cabinet.ts';
import {generateCabinet} from '../src/ai/cabinet.ts';
import {agendaEngine} from '../src/agenda/agenda.ts';
import {congressRules} from '../src/congress/congress.ts';
import {electionRules} from '../src/election/election.ts';
import {worldEventEngine} from '../src/events/world-news.ts';
import {localNewsEngine} from '../src/events/local-news.ts';
import {socialContext} from '../src/ai/social.ts';
import {socialFeed} from '../../web/social.ts';
import {chartSeries} from '../../web/charts.ts';
import {cabinetOverviewMarkup,promiseOwnerMarkup} from '../../web/cabinet-promises.ts';
const start=()=>startPresidency(createWorld(),['Bring local jobs back','Affordable healthcare','Unicorns at every school']);

test('assignments are immutable, replayable, optional and permit one secretary to own multiple promises',()=>{
 const before=start();
 assert.ok(cabinetPromiseOverview(before).every(p=>p.owner===undefined));
 let world=assignCabinetPromise(before,0,'commerce');
 world=assignCabinetPromise(world,1,'commerce');
 world=assignCabinetPromise(world,0,'labor');
 assert.equal(promiseOwner(world,0)?.name,'Rosa Grant');
 assert.equal(promiseOwner(world,1)?.name,'Leo Brooks');
 assert.equal(promiseOwner(before,0),undefined);
 assert.ok(Object.isFrozen(world.events.at(-1)?.cabinetAssignment));
 assert.deepEqual(replay(JSON.parse(JSON.stringify(world.events))),world);
 assert.deepEqual(replay(before.events),before);
 assert.deepEqual(cabinetPromiseOverview(createWorld()),[]);
});
test('invalid assignments and forged saved assignments cannot alter the world',()=>{
 const world=start(),before=JSON.stringify(world);
 for(const index of [-1,3,0.5,'0',null])assert.throws(()=>assignCabinetPromise(world,index,'health'));
 for(const id of ['invented',null,0])assert.throws(()=>assignCabinetPromise(world,0,id));
 assert.throws(()=>assignCabinetPromise(createWorld(),0,'health'));
 assert.throws(()=>assignCabinetPromise({...world,state:{...world.state,day:31}},0,'health'),/ended/);
 assert.equal(JSON.stringify(world),before);
 const saved=assignCabinetPromise(world,0,'health');
 const events=JSON.parse(JSON.stringify(saved.events));events.at(-1).cabinetAssignment.index=2;
 events.at(-1).after.treasury=999;
 assert.throws(()=>replay(events),/rules/);
});
test('assignment has no economy, election, agenda, news, chart or public-feed effects',()=>{
 const before=beginDay(seatCongress(start(),42)),world=assignCabinetPromise(before,0,'commerce');
 assert.deepEqual(world.state,before.state);
 assert.deepEqual(agendaEngine.tasks(world),agendaEngine.tasks(before));
 assert.deepEqual(electionRules.snapshot(world),electionRules.snapshot(before));
 assert.deepEqual(worldEventEngine.next(world),worldEventEngine.next(before));
 assert.deepEqual(localNewsEngine.next(world),localNewsEngine.next(before));
 assert.deepEqual(socialContext(world,[]),socialContext(before,[]));
 assert.deepEqual(socialFeed(world),socialFeed(before));
 assert.deepEqual(chartSeries(world,'approval'),chartSeries(before,'approval'));
 assert.equal(actInCongress(world,0,'house','introduce').state.day,1);
});
test('guidance reflects introduction, daily limits, chamber approvals and fulfillment',()=>{
 let world=seatCongress(start(),42);
 assert.equal(promiseGuidance(world,0).next.action,'introduce');
 assert.equal(promiseGuidance(world,0).status,'No bill yet');
 world=actInCongress(world,0,'house','introduce');
 assert.match(promiseGuidance(world,0).blocker,/Today’s congressional action/);
 for(const action of ['costing','benefits','oversight'] as const){world=decide(world,'wait');world=actInCongress(world,0,'house',action);}
 world=decide(world,'wait');
 assert.equal(promiseGuidance(world,0).next.action,'vote');
 assert.equal(promiseGuidance(world,0).next.cost,0);
 world=actInCongress(world,0,'house','vote');
 assert.equal(promiseGuidance(world,0).status,'One chamber approved');
 assert.equal(promiseGuidance(world,0).next.chamber,'senate');
 world=decide(world,'wait');world=actInCongress(world,0,'senate','vote');
 assert.equal(promiseGuidance(world,0).status,'Fulfilled');
 assert.equal(promiseGuidance(world,0).next.action,undefined);
 assert.deepEqual(replay(world.events),world);
});
test('unfunded concessions, failed votes, withdrawn promises and old saves have honest guidance',()=>{
 let world=seatCongress(start(),42);
 const chamber=congressRules.tally(world,0,'house').canPass?'senate':'house';
 world=actInCongress(world,0,chamber,'vote');
 const report=promiseGuidance(world,0).votes.find(v=>v.chamber===chamber)!.lastVote;
 assert.ok(report);assert.equal(report.passed,false);assert.ok(report.shortfall>0);
 world=decide(world,'wait');
 // If another chamber can pass, record that approval before testing the blocked chamber's concessions.
 const other=chamber==='house'?'senate':'house';
 if(congressRules.tally(world,0,other).canPass){world=actInCongress(world,0,other,'vote');world=decide(world,'wait');}
 const poor={...world,state:{...world.state,treasury:0}};
 assert.match(promiseGuidance(poor,0).next.blocked!,/treasury/);
 const affordable=promiseGuidance({...world,state:{...world.state,treasury:2}},0);
 assert.equal(affordable.next.action,'oversight');assert.equal(affordable.next.cost,2);
 if(congressRules.bill(world,0).passed.length)assert.match(affordable.blocker,/reopens/);
 const withdrawn=decidePromise(start(),0,'withdraw');
 assert.equal(promiseGuidance(withdrawn,0).status,'Withdrawn');
 assert.equal(promiseGuidance(withdrawn,0).next.action,undefined);
 assert.equal(promiseGuidance(start(),0).votes.length,0);
 assert.match(offlineCabinet(withdrawn,'commerce',0).line,/Withdrawn/);
});
test('promise cards identify owners, escape custom promises, and offer navigation without committing',()=>{
 const world=assignCabinetPromise(startPresidency(createWorld(),['<script>jobs</script>','Better healthcare','Safer schools']),0,'commerce');
 const before=JSON.stringify(world),html=cabinetOverviewMarkup(world);
 assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
 assert.match(html,/data-cabinet-congress="0"/);assert.match(html,/data-cabinet-consult="0"/);
 assert.match(html,/label for="cabinet-owner-0"/);
 assert.match(promiseOwnerMarkup(world,0),/Leo Brooks/);
 assert.match(promiseOwnerMarkup(world,1),/Assign a secretary/);
 assert.equal(JSON.stringify(world),before);
});
test('cabinet AI is scoped to the exact promise, ownership, legal progress and local facts',async()=>{
 const world=assignCabinetPromise(beginDay(seatCongress(start(),42)),1,'defense');
 const context=cabinetContext(world,'defense',[],1);
 assert.equal(context.selectedPromise?.promise,'Affordable healthcare');
 assert.equal(context.selectedPromise?.owner?.name,'Dana Ward');
 assert.equal(context.promiseOwnership[1].owner?.id,'defense');
 assert.equal(context.selectedPromise?.next.action,'introduce');
 const voice={line:'President, healthcare is outside my core expertise. Maya can advise; we can review the bill first.',replies:['What would Maya need to know?','What happens in Congress?']};
 await generateCabinet(world,'defense',[{role:'user',text:'Can we actually do this?'}],'test','test','',async(_url,init)=>{
  const request=JSON.parse(init!.body as string),input=JSON.parse(request.messages[0].content);
  assert.equal(input.selectedPromise.index,1);
  assert.match(request.system,/Amendments reopen/);assert.match(request.system,/unusual assignment is valid/);
  assert.ok(input.localNews);
  return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify(voice)}]}));
 },1);
 await assert.rejects(generateCabinet(world,'defense',[],'test','test','',async()=>{throw Error('Should not fetch');},4),/recorded campaign promise/);
});
