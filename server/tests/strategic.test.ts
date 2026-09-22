import {scheduledDeposit} from '../src/economy/revenue.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,startPresidency,beginDay,endDay,decide,replyToMax,respondToNews,replay,assignCabinetPromise} from '../src/world/oil-crisis.ts';
import {agendaEngine,activeDay} from '../src/agenda/agenda.ts';
import {maxTurn} from '../src/billionaires/sterling.ts';
import {electionRules} from '../src/election/election.ts';
import {applyStrategic,strategicState,strategicKey,currentStrategicTurn,strategicChoices,strategicCandidates,offlineStrategicVoice,settleStrategic,signingBlocker,securityOptions,activeSupply,seededPercent,strategicPublicContext,strategicPrivateContext,validateStrategicVoice} from '../src/diplomacy/strategic.ts';
import {socialContext} from '../src/ai/social.ts';
import {socialFeed} from '../../web/social.ts';
import {worldMapProjection} from '../../web/world-map.ts';
import {cabinetContext,offlineCabinet} from '../src/agents/cabinet.ts';
import type {World} from '../../shared/schemas/oil-crisis.ts';
import type {StrategicState,TreatyTerms} from '../src/diplomacy/strategic-types.ts';

function launch(seed=42){return beginDay(applyStrategic(startPresidency(createWorld(),['More jobs','Safer schools','Affordable healthcare']),{kind:'init',seed}));}
function turn(w:World){return applyStrategic(w,{kind:'turn',context:strategicKey(w),voice:offlineStrategicVoice(w)});}
function reply(w:World,id:string){return applyStrategic(w,{kind:'reply',turnId:currentStrategicTurn(w)!.id,choiceId:id});}
function sign(w:World){return applyStrategic(w,{kind:'sign',turnId:currentStrategicTurn(w)!.id});}
function next(w:World){
 if(!activeDay(w))w=beginDay(w);
 for(const task of agendaEngine.tasks(w).filter(t=>!t.done)){
  if(task.id==='public')w=decide(w,'wait');
  if(task.id==='petrov')w=applyStrategic(w,{kind:'end_call'});
  if(task.id==='max'){const t=maxTurn(w);w=replyToMax(w,'decline',t.id,t.strategy);}
  if(task.id==='news')w=respondToNews(w,task.subject!,'monitor');
 }
 w=endDay(w);return w.state.day<=30?beginDay(w):w;
}
// Isolated rule fixtures change inputs, never saved replay histories.
function scenario(w:World,s:Partial<StrategicState>,state:Partial<World['state']>={}):World{
 const index=w.events.findLastIndex(e=>e.strategic);return {...w,state:{...w.state,...state},events:w.events.map((e,i)=>i===index?{...e,strategic:{...e.strategic!,snapshot:{...e.strategic!.snapshot,...s}}}:e)};
}
const terms:TreatyTerms={quantity:6,price:2,days:3,territory:'halt',observers:true,restraint:false,recognition:'summit',verifiedFirst:true};
function treaty(w:World,changes:Partial<TreatyTerms>={}){return scenario(w,{stage:'incursion',stageSince:1,tension:60,treaty:{serial:1,terms:{...terms,...changes},signedDay:w.state.day,throughDay:w.state.day+3,status:'active',reason:'Test agreement',delivered:0,paid:0},serial:1});}

test('explicit initialization preserves old history, rejects invalid seeds and completed presidencies',()=>{
 const legacy=beginDay(startPresidency(createWorld(),['More jobs','Schools','Healthcare']));
 assert.equal(strategicState(replay(legacy.events)),undefined);
 const w=applyStrategic(legacy,{kind:'init',seed:7});assert.deepEqual(w.state,legacy.state);assert.deepEqual(w.events.slice(0,-1),legacy.events);assert.deepEqual(replay(w.events),w);
 const tampered=structuredClone(w.events);tampered.at(-1)!.strategic!.snapshot.trust=99;assert.throws(()=>replay(tampered),/does not match/);
 assert.throws(()=>applyStrategic(w,{kind:'init',seed:8}),/duplicate/);
 for(const seed of [-1,NaN,1.2,2**32])assert.throws(()=>applyStrategic(legacy,{kind:'init',seed}),/Invalid/);
 assert.throws(()=>applyStrategic({...legacy,state:{...legacy.state,day:31}},{kind:'init',seed:8}),/election/);
});
test('questions and proposals are free, contextual, persistent and reject retries or stale replies',()=>{
 const base=launch();let w=turn(base);const first=currentStrategicTurn(w)!;
 assert.deepEqual(w.state,base.state);assert.equal(agendaEngine.tasks(w).find(t=>t.id==='petrov')!.done,false);
 assert.throws(()=>applyStrategic(w,{kind:'turn',context:strategicKey(w),voice:offlineStrategicVoice(w)}),/already/);
 const oldChoices=strategicChoices(w,'pragmatic');w=reply(w,'proposal-0');assert.equal(strategicState(w)!.treaty,undefined);assert.deepEqual(w.state,base.state);
 assert.throws(()=>applyStrategic(w,{kind:'reply',turnId:first.id,choiceId:'proposal-0'}),/out of date/);
 w=turn(w);assert.notDeepEqual(strategicChoices(w,'pragmatic'),oldChoices);assert.deepEqual(replay(w.events),w);
 const owner=assignCabinetPromise(w,0,'state');assert.equal(currentStrategicTurn(owner)!.id,currentStrategicTurn(w)!.id);
 assert.ok(strategicPrivateContext(w)!.memory.length>=3);
 w=applyStrategic(w,{kind:'end_call'});assert.equal(agendaEngine.tasks(w).find(t=>t.id==='petrov')!.done,true);assert.deepEqual(w.state,base.state);
 assert.throws(()=>turn(w),/settled/);assert.deepEqual(replay(w.events),w);
});
test('partial acceptance requires concessions and never signs itself',()=>{
 let w=launch();w=next(next(w));w=turn(w);
 const c=strategicCandidates(w)[0];assert.ok(c.clauses.some(c=>c.accepted));assert.ok(c.clauses.some(c=>!c.accepted));assert.throws(()=>sign(w),/Disputed/);
 const offer=strategicChoices(w,'pragmatic').find(c=>c.kind==='proposal'&&c.terms.recognition==='summit')!;w=turn(reply(w,offer.id));
 assert.equal(signingBlocker(w,'pragmatic'),null);assert.equal(strategicState(w)!.treaty,undefined);
 const before=w.state;w=sign(w);assert.equal(w.state.treasury,before.treasury-2);assert.equal(w.state.oil,before.oil);assert.equal(strategicState(w)!.treaty!.status,'active');assert.throws(()=>applyStrategic(w,{kind:'sign',turnId:w.events.at(-2)!.id}),/out of date/);assert.deepEqual(replay(w.events),w);
});
test('three daily deliveries precede consumption, conserve transfers, expire and renew',()=>{
 let w=sign(turn(launch()));assert.equal(activeSupply(w),true);assert.equal(strategicState(w)!.treaty!.delivered,0);
 for(let i=0;i<3;i++){const before=w.state;w=next(w);assert.equal(w.state.oil,before.oil);assert.equal(w.state.treasury,before.treasury-12+3+(scheduledDeposit(w.state.day)?.amount??0));assert.equal(w.state.supplierTreasury,before.supplierTreasury+12);assert.equal(w.state.supplierOil,before.supplierOil-6+4);}
 assert.equal(strategicState(w)!.treaty!.status,'expired');assert.equal(strategicState(w)!.treaty!.paid,36);assert.equal(strategicState(w)!.treaty!.delivered,18);assert.deepEqual(replay(w.events),w);
 // The crisis now requires a territorial bargain; renewal is a new explicit signature.
 w=turn(w);const offer=strategicChoices(w,'pragmatic').find(c=>c.kind==='proposal'&&c.terms.recognition==='summit')!;w=sign(turn(reply(w,offer.id)));assert.equal(strategicState(w)!.treaty!.serial,2);
});
test('missed payments and protected reserves interrupt without partial transfers',()=>{
 const w=sign(turn(launch()));
 for(const state of [{treasury:1},{supplierOil:17}]){const input={...w,state:{...w.state,...state}},out=settleStrategic(input)!;assert.equal(out.record.snapshot.treaty!.status,'suspended');for(const key of ['treasury','supplierTreasury','oil','supplierOil'] as const)assert.equal(out.state[key],input.state[key]);assert.match(out.messages.join(' '),/No barrels or payment/);}
 const input={...w,state:{...w.state,supplierOil:18}},out=settleStrategic(input)!;assert.equal(out.state.supplierOil,12);assert.equal(out.record.snapshot.treaty!.delivered,6);
});
test('active supply removes routine reminders and near expiry restores them',()=>{
 let w=next(sign(turn(launch())));assert.equal(agendaEngine.tasks(w).some(t=>t.id==='petrov'),false);
 w=next(w);assert.match(agendaEngine.tasks(w).find(t=>t.id==='petrov')!.reason,/final scheduled delivery/);
});
test('seeded compliance differentiates monitored violations, allegations, and verified withdrawal',()=>{
 const base=launch();let bad=0;while(seededPercent(bad,2,'compliance-1')>=5)bad++;
 const monitored=treaty(scenario(base,{seed:bad}));const a=settleStrategic(monitored)!,b=settleStrategic(monitored)!;assert.deepEqual(a,b);assert.equal(a.record.snapshot.treaty!.status,'breached');assert.equal(a.state.oil,base.state.oil);assert.equal(a.record.snapshot.stage,'incursion');assert.ok(a.record.reports.every(r=>r.certainty==='confirmed'));
 const hidden=treaty(scenario(base,{seed:bad}),{observers:false,verifiedFirst:false});const first=settleStrategic(hidden)!;assert.equal(first.record.snapshot.treaty!.status,'active');assert.equal(first.record.snapshot.suspectedBreachDay,2);assert.ok(first.record.reports.some(r=>r.certainty==='unverified'));assert.equal(first.record.snapshot.treaty!.delivered,6);
 const later=scenario(hidden,first.record.snapshot,{...first.state,day:2});const confirmed=settleStrategic(later)!;assert.equal(confirmed.record.snapshot.treaty!.status,'breached');assert.equal(confirmed.record.snapshot.treaty!.delivered,6);assert.equal(confirmed.state.oil,first.state.oil);assert.equal(confirmed.state.treasury,first.state.treasury);
 let good=0;while(seededPercent(good,2,'compliance-1')<65)good++;const verified=settleStrategic(treaty(scenario(base,{seed:good}),{territory:'withdraw'}))!;assert.equal(verified.record.snapshot.stage,'withdrawal');assert.equal(verified.record.snapshot.treaty!.delivered,6);
});
test('security orders require one explicit daily authorization with exact cost and sustained upkeep',()=>{
 assert.ok(securityOptions(launch()).every(o=>o.blocked));let w=next(next(sign(turn(launch()))));const before=w.state;w=applyStrategic(w,{kind:'order',order:'deployment'});assert.equal(w.state.treasury,before.treasury-10);assert.equal(w.state.oil,before.oil-2);assert.equal(agendaEngine.tasks(w).find(t=>t.id==='public')!.done,false);assert.ok(securityOptions(w).every(o=>o.blocked));assert.throws(()=>applyStrategic(w,{kind:'order',order:'readiness'}),/already/);
 const settlement=settleStrategic(w)!;assert.equal(settlement.state.treasury,w.state.treasury-2-12);assert.equal(settlement.state.oil,w.state.oil-1+6);assert.deepEqual(replay(w.events),w);
 const poor=settleStrategic({...w,state:{...w.state,treasury:0}})!;assert.equal(poor.record.snapshot.deploymentUntil,0);assert.equal(poor.state.treasury,0);
});
test('sanctions suspend incompatible future obligations without reversing prior shipments',()=>{
 let w=next(next(sign(turn(launch()))));const before=w.state,t=strategicState(w)!.treaty!;w=applyStrategic(w,{kind:'order',order:'sanctions'});assert.equal(strategicState(w)!.treaty!.status,'suspended');assert.equal(strategicState(w)!.treaty!.delivered,t.delivered);assert.equal(w.state.oil,before.oil);assert.equal(w.state.treasury,before.treasury-4);assert.deepEqual(replay(w.events),w);
});
test('recorded escalation precedes threats and attacks, map follows it, election always ends the run',()=>{
 let w=launch(8),threatened=false,war=false,attack=false;while(w.state.day<=30){w=next(w);const s=strategicState(w)!;if(s.stage==='regional_war')war=true;if(s.homeland==='threatened'){assert.equal(war,true);threatened=true;}if(s.homeland==='attacked'){assert.equal(threatened,true);attack=true;}if(s.stage==='incursion')assert.ok(worldMapProjection(w).countries.find(c=>c.id==='bellara')!.conflict);if(w.state.day<31)assert.equal(electionRules.finished(w),false);}
 assert.equal(war,true);assert.equal(threatened,true);assert.equal(attack,true);assert.equal(electionRules.finished(w),true);assert.deepEqual(replay(w.events),w);assert.throws(()=>applyStrategic(w,{kind:'order',order:'peace_talks'}),/election/);
});
test('public context and feeds exclude private dialogue; cabinet gets factual options',()=>{
 let w=launch();const voice=offlineStrategicVoice(w);voice.line='PRIVATE SECRET negotiated but unsigned';voice.replies[0].line='PRIVATE SECRET player proposal';w=applyStrategic(w,{kind:'turn',context:strategicKey(w),voice});w=reply(w,'proposal-0');
 const publicData=JSON.stringify([strategicPublicContext(w),socialContext(w,[]),socialFeed(w),cabinetContext(w,'state',[])]);assert.equal(publicData.includes('PRIVATE SECRET'),false);assert.ok(JSON.stringify(strategicPrivateContext(w)).includes('PRIVATE SECRET'));assert.match(offlineCabinet(w,'treasury').line,/Treasury: F\$/);
});
test('model reply validation cannot inject executable actions or unsupported candidates',()=>{
 const w=launch(),v=offlineStrategicVoice(w);assert.throws(()=>validateStrategicVoice({...v,candidate:'invade'},w),/Invalid/);assert.throws(()=>validateStrategicVoice({...v,replies:[...v.replies.slice(1),{id:'sign',title:'Sign now',line:'Automatically sign this treaty.'}]},w),/Illegal/);assert.throws(()=>validateStrategicVoice({...v,replies:v.replies.filter(r=>r.id!=='end-call')},w),/exit/);
});
