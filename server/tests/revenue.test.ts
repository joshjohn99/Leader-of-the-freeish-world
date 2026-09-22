import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,beginDay,endDay,decide,replyToPetrov,replyToMax,respondToNews,replay,startPresidency} from '../src/world/oil-crisis.ts';
import {agendaEngine} from '../src/agenda/agenda.ts';
import {petrovTurn} from '../src/diplomacy/petrov.ts';
import {maxTurn} from '../src/billionaires/sterling.ts';
import {scheduledDeposit,revenueOutlook} from '../src/economy/revenue.ts';
import {applyStrategic,strategicKey,offlineStrategicVoice,strategicState} from '../src/diplomacy/strategic.ts';
import {revenueMarkup} from '../../web/revenue.ts';
import type {World} from '../../shared/schemas/oil-crisis.ts';

function complete(w:World){
 for(const t of agendaEngine.tasks(w).filter(t=>!t.done)){
  if(t.id==='public')w=decide(w,'wait');
  if(t.id==='petrov')w=strategicState(w)?applyStrategic(w,{kind:'end_call'}):replyToPetrov(w,'decline',petrovTurn(w).id);
  if(t.id==='max'){const offer=maxTurn(w);w=replyToMax(w,'decline',offer.id,offer.strategy);}
  if(t.id==='news')w=respondToNews(w,t.subject!,'monitor');
 }
 return w;
}
test('tax receipts arrive on days 3, 6 through 30, with no out-of-term payments',()=>{
 assert.deepEqual(Array.from({length:32},(_,i)=>i).filter(d=>scheduledDeposit(d)),[3,6,9,12,15,18,21,24,27,30]);
 for(const day of [-3,NaN,3.5,33])assert.equal(scheduledDeposit(day),undefined);
});
test('day transitions credit receipts once; reload and free actions cannot collect them again',()=>{
 let w=beginDay(createWorld());w=beginDay(endDay(complete(w)));assert.equal(w.state.treasury,83);
 const ready=complete(w),before=ready.state.treasury;w=endDay(ready);assert.equal(w.state.day,3);assert.equal(w.state.treasury,before+45+3);assert.deepEqual(w.events.at(-1)!.treasuryDeposit,{kind:'tax-receipts-v1',day:3,amount:45});
 assert.deepEqual(replay(w.events),w);assert.throws(()=>endDay(w),/No daily agenda/);assert.equal(beginDay(w).state.treasury,w.state.treasury);
 const tampered=structuredClone(w.events);tampered.at(-1)!.treasuryDeposit={kind:'tax-receipts-v1',day:3,amount:450};assert.throws(()=>replay(tampered),/does not match/);
});
test('old histories retain their balances; continuation receives only future deposits',()=>{
 let w=beginDay(createWorld());while(w.state.day<5)w=beginDay(endDay(complete(w),false));
 assert.equal(w.events.some(e=>e.treasuryDeposit),false);assert.deepEqual(replay(w.events),w);assert.equal(revenueOutlook(w).nextDay,6);
 const before=w.state.treasury;w=endDay(complete(w));assert.equal(w.state.treasury,before+48);assert.equal(w.events.filter(e=>e.treasuryDeposit).length,1);assert.deepEqual(replay(w.events),w);
});
test('receipts can fund the same transition’s oil delivery before domestic consumption',()=>{
 let w=beginDay(applyStrategic(startPresidency(createWorld(),['More jobs','Safer schools','Reliable services']),{kind:'init',seed:42}));
 w=applyStrategic(w,{kind:'turn',context:strategicKey(w),voice:offlineStrategicVoice(w)});w=applyStrategic(w,{kind:'sign',turnId:w.events.at(-1)!.id});w=beginDay(endDay(complete(w)));
 // A cash-constrained input isolates the ordering of receipts and contractual payments.
 const ready=complete({...w,state:{...w.state,treasury:0}}),paid=endDay(ready);
 assert.equal(paid.state.treasury,45-12+3);assert.equal(strategicState(paid)!.treaty!.delivered,12);assert.equal(strategicState(paid)!.treaty!.status,'active');
 assert.equal(strategicState(endDay(ready,false))!.treaty!.status,'suspended');
});
test('a complete term records ten deposits and replays exactly; a new game starts clean',()=>{
 let w=beginDay(createWorld());while(w.state.day<=30){w=endDay(complete(w));if(w.state.day<=30)w=beginDay(w);}
 assert.equal(w.events.filter(e=>e.treasuryDeposit).length,10);assert.equal(w.events.reduce((sum,e)=>sum+(e.treasuryDeposit?.amount??0),0),450);assert.deepEqual(replay(w.events),w);assert.equal(revenueOutlook(w).nextDay,null);assert.equal(revenueOutlook(createWorld()).last,undefined);
});
test('income display shows deposit amount, next day, latest receipt, and end-of-term status',()=>{
 let w=beginDay(createWorld());assert.match(revenueMarkup(w),/F\$45 arrives on day 3/);w=beginDay(endDay(complete(w)));w=endDay(complete(w));
 assert.match(revenueMarkup(w),/F\$45 arrives on day 6/);assert.match(revenueMarkup(w),/Last deposit: \+F\$45 on day 3/);assert.match(revenueMarkup({...w,state:{...w.state,day:30}}),/No further deposits this term/);
});
