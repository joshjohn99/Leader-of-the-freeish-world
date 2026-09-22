import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,beginDay,endDay,decide,replyToPetrov,replyToMax,replay,publishAnnouncement,respondToNews} from '../src/world/oil-crisis.ts';
import {agendaEngine,AgendaEngine} from '../src/agenda/agenda.ts';
import {petrovTurn} from '../src/diplomacy/petrov.ts';import {maxTurn,pilotDaysLeft} from '../src/billionaires/sterling.ts';
function declineMeetings(world:ReturnType<typeof createWorld>){if(agendaEngine.tasks(world).some(t=>t.id==='petrov'&&!t.done))world=replyToPetrov(world,'decline',petrovTurn(world).id);if(agendaEngine.tasks(world).some(t=>t.id==='max'&&!t.done)){const offer=maxTurn(world);world=replyToMax(world,'decline',offer.id,offer.strategy);}for(const task of agendaEngine.tasks(world))if(task.id==='news'&&!task.done)world=respondToNews(world,task.subject!,'monitor');return world;}
test('day one agenda has public, Petrov and Max tasks and rejects premature end',()=>{
 const world=beginDay(createWorld());assert.deepEqual(agendaEngine.tasks(world).map(t=>t.id),['public','petrov','max']);assert.throws(()=>endDay(world),/Complete today/);assert.throws(()=>beginDay(world),/already open/);assert.deepEqual(replay(world.events),world);
});
test('all decisions remain in day; settlement occurs exactly once after completing agenda',()=>{
 let world=beginDay(createWorld());world=decide(world,'ration');assert.equal(world.state.day,1);assert.equal(world.state.oil,8);assert.equal(world.state.treasury,80);
 world=declineMeetings(world);assert.ok(agendaEngine.tasks(world).every(t=>t.done));assert.deepEqual(replay(world.events),world);
 world=endDay(world);assert.equal(world.state.day,2);assert.equal(world.state.oil,5);assert.equal(world.state.treasury,83);assert.equal(world.state.supplierOil,64);assert.throws(()=>endDay(world),/No daily agenda/);assert.deepEqual(replay(world.events),world);
 const next=beginDay(world);assert.ok(agendaEngine.tasks(next).every(t=>!t.done));assert.ok(agendaEngine.tasks(next).some(t=>t.id==='news'));assert.deepEqual(replay(next.events),next);
});
test('negotiation questions do not complete a task, committed deals apply immediately without daily tick',()=>{
 let world=beginDay(createWorld());world=replyToPetrov(world,'counter',petrovTurn(world).id);assert.equal(agendaEngine.tasks(world).find(t=>t.id==='petrov')?.done,false);
 const offer=petrovTurn(world),before=world.state;world=replyToPetrov(world,'accept',offer.id);assert.equal(world.state.oil,before.oil+offer.quantity);assert.equal(world.state.treasury,before.treasury-offer.quantity*offer.unitPrice);assert.equal(world.state.day,1);
 assert.equal(agendaEngine.tasks(world).find(t=>t.id==='petrov')?.done,true);assert.throws(()=>replyToPetrov(world,'decline',petrovTurn(world).id),/settled/);assert.deepEqual(replay(world.events),world);
});
test('pilot lasts three actual days; announcement does not tick or repeat in a day',()=>{
 let world=beginDay(createWorld());const offer=maxTurn(world);world=replyToMax(world,'fund',offer.id,offer.strategy);assert.equal(pilotDaysLeft(world),3);assert.equal(world.state.oil,8);
 world=publishAnnouncement(world,'Today we are trying a bus pilot.');assert.equal(world.state.day,1);assert.throws(()=>publishAnnouncement(world,'Another public announcement.'),/already/);
 world=declineMeetings(world);world=endDay(world);assert.equal(pilotDaysLeft(world),2);assert.equal(world.state.oil,4);assert.deepEqual(replay(world.events),world);
});
test('agenda selection responds to state and stays stable throughout the day',()=>{
 const base=createWorld();const secure={...base,state:{...base.state,day:2,oil:40,relations:10}};assert.deepEqual(agendaEngine.plan(secure).map(t=>t.id),['public']);
 const world=beginDay(base),ids=agendaEngine.tasks(world).map(t=>t.id);const updated=decide(world,'threaten');assert.deepEqual(agendaEngine.tasks(updated).map(t=>t.id),ids);
 assert.throws(()=>decide(updated,'subsidize'),/already set/);
 const registry=new AgendaEngine().register({id:'new-person',task:()=>({id:'new-person',title:'Call new person',reason:'A new opportunity',panel:'new-person'}),completed:()=>false});assert.equal(registry.plan(base)[0].panel,'new-person');assert.throws(()=>registry.register({id:'new-person',task:()=>undefined,completed:()=>false}),/Duplicate/);
});
test('legacy saves migrate at current day and entire 30-day daily loop reaches election',()=>{
 let world=decide(createWorld(),'wait');world=beginDay(world);assert.equal(world.state.day,2);assert.deepEqual(replay(world.events),world);
 while(world.state.day<=30){world=decide(world,'wait');world=declineMeetings(world);world=endDay(world);if(world.state.day<=30)world=beginDay(world);}
 assert.equal(world.state.day,31);assert.throws(()=>beginDay(world),/election/);assert.deepEqual(replay(world.events),world);
});
