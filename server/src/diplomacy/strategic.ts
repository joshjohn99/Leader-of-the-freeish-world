import type {World,WorldEvent,CrisisState} from '../../../shared/schemas/oil-crisis.ts';
import {petrovTurn} from './petrov.ts';
import {STRATEGIC_BALANCE as B,SECURITY_ORDERS} from './strategic-types.ts';
import type {StrategicState,StrategicCommand,StrategicRecord,StrategicVoice,TreatyTerms,Posture,StrategicReport,CrisisStage} from './strategic-types.ts';
export {STRATEGIC_BALANCE,SECURITY_ORDERS} from './strategic-types.ts';
export type {StrategicCommand,StrategicVoice,TreatyTerms} from './strategic-types.ts';
const clamp=(value:number,min=0,max=100)=>Math.max(min,Math.min(max,value));
export const stageLabel:Record<CrisisStage,string>={quiet:'Diplomatic channel open',border_pressure:'Border pressure',incursion:'Incursion into Bellara',regional_war:'Regional war',ceasefire:'Ceasefire',withdrawal:'Withdrawal confirmed'};
function frozen<T>(value:T):T {if(value&&typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;}
export function strategicState(world:World):StrategicState|undefined {return world.events.findLast(e=>e.strategic)?.strategic?.snapshot;}
export function strategicKey(world:World){return JSON.stringify([world.state,world.events.filter(e=>!e.cabinetAssignment&&e.strategic?.command.kind!=='turn').map(e=>e.id)]);}
export function currentStrategicTurn(world:World){const e=world.events.findLast(e=>e.strategic?.command.kind==='turn');return e?.strategic?.command.kind==='turn'&&e.strategic.command.context===strategicKey(world)?e:undefined;}
export function diplomaticSettled(world:World){return world.events.some(e=>e.after.day===world.state.day&&(e.strategic&&['sign','end_call','spot','suspend'].includes(e.strategic.command.kind)||e.diplomacy&&!['counter','ask_needs','challenge'].includes(e.diplomacy.reply)));}
export function activeSupply(world:World){const s=strategicState(world),t=s?.treaty;return t?.status==='active'&&t.terms.quantity>=B.defaultQuantity&&t.throughDay>world.state.day&&s!.sanctionsUntil<world.state.day+1;}
export function strategicAgendaReason(world:World):string|undefined {
 const s=strategicState(world);if(!s)return;
 if(s.lastViolationDay===world.state.day)return 'A confirmed agreement violation needs your response.';
 if(s.suspectedBreachDay)return 'Unverified troop movements need clarification. Monitoring has not confirmed a breach.';
 if(s.treaty?.status==='suspended')return 'Standing supply is interrupted. Review the conditions or negotiate a new agreement.';
 if(s.treaty?.status==='active'&&s.treaty.throughDay-world.state.day<=1)return 'Your agreement is nearing its final scheduled delivery. Discuss the next arrangement.';
 if(['incursion','regional_war','border_pressure'].includes(s.stage)&&(!s.treaty||s.treaty.status!=='active'||s.treaty.terms.territory==='none'))return `${stageLabel[s.stage]}. Set a diplomatic position on the crisis.`;
 if(!activeSupply(world)&&world.state.oil<12)return 'Fuel reserves need attention. Negotiate standing supply or a one-time purchase.';
}
function defaultTerms(world:World):TreatyTerms {
 const s=strategicState(world)!;
 return {quantity:B.defaultQuantity,price:clamp(world.state.price,B.minPrice,B.maxPrice),days:B.contractDays,territory:s.stage==='quiet'?'none':['incursion','regional_war'].includes(s.stage)?'withdraw':'halt',observers:s.stage!=='quiet',restraint:false,recognition:'none',verifiedFirst:false};
}
export function treatySummary(t:TreatyTerms){return `${t.quantity?`${t.quantity} barrels per day at F$${t.price}/barrel (F$${t.quantity*t.price}/day)`:'No oil commitment'}; three days; ${t.territory==='none'?'no territorial commitment':t.territory==='halt'?'halt advances into Bellara':'withdraw from Bellara'}; ${t.observers?'independent observers':'no observers'}; ${t.restraint?'Freedoma pauses new Bellara support/deployments':'no defensive restraint'}; ${t.recognition==='none'?'no public credit':t.recognition==='summit'?'joint summit after first verified compliance':'joint statement'}; ${t.verifiedFirst?'verification before deliveries':'deliveries from next day transition'}.`;}
export function assessTerms(world:World,t:TreatyTerms){
 const s=strategicState(world)!;
 const leverage=Math.floor(s.trust/B.bargaining.trustDivisor)+Math.floor(world.state.relations/B.bargaining.relationsDivisor)+(world.state.supplierTreasury<B.bargaining.tightTreasury?B.bargaining.income:0)+(t.quantity?B.bargaining.supply:0)+(t.recognition==='summit'?B.bargaining.summit:t.recognition==='statement'?B.bargaining.statement:0)+(t.restraint?B.bargaining.restraint:0);
 const minPrice=clamp(world.state.price-(t.recognition!=='none'||s.trust>=B.trustEstablished?1:0),B.minPrice,B.maxPrice);
 return [
  {id:'supply',label:t.quantity?`${t.quantity} barrels daily · F$${t.price} per barrel · three days`:'No supply obligation',owner:'Both countries',accepted:!t.quantity||(t.price>=minPrice&&world.state.supplierOil-t.quantity>=B.reserve&&s.sanctionsUntil<world.state.day+1),reason:s.sanctionsUntil>=world.state.day+1?'Sanctions block trade.':world.state.supplierOil-t.quantity<B.reserve?'Petrovia protects its domestic reserve.':`Petrov currently requires at least F$${minPrice} per barrel.`},
  {id:'territory',label:t.territory==='none'?'No territorial commitment':t.territory==='halt'?'Halt further advances into Bellara':'Withdraw from Bellara',owner:'Petrovia',accepted:t.territory==='none'||leverage>=(t.territory==='halt'?B.bargaining.halt:s.stage==='regional_war'?B.bargaining.warWithdrawal:B.bargaining.withdrawal),reason:'Petrov wants a larger economic or face-saving concession before surrendering territorial leverage.'},
  {id:'observers',label:t.observers?'Allow independent observers':'No independent observers',owner:'Petrovia',accepted:!t.observers||leverage>=B.bargaining.observers,reason:'He objects to outside scrutiny without public recognition or defensive restraint.'},
  {id:'restraint',label:t.restraint?'No new Bellara aid or deployments during the agreement':'Freedoma keeps its defensive options',owner:'Freedoma',accepted:!t.restraint||s.deploymentUntil<world.state.day+1,reason:'An existing deployment must finish before you can credibly offer restraint.'},
  {id:'recognition',label:t.recognition==='summit'?'Summit after first verified compliance':t.recognition==='statement'?'Publish a joint statement':'No public recognition',owner:'Freedoma',accepted:t.recognition!=='summit'||t.territory!=='none',reason:'A conditional summit requires a territorial commitment.'},
  {id:'verification',label:t.verifiedFirst?'Verify compliance before the first shipment':'No verification condition on oil',owner:'Both countries',accepted:!t.verifiedFirst||(t.observers&&t.territory!=='none'),reason:'Conditional delivery requires observers and a territorial commitment.'},
 ];
}
export function strategicCandidates(world:World){
 const s=strategicState(world);if(!s)throw Error('Strategic diplomacy is not enabled.');
 const base={...(s.proposal??defaultTerms(world))};
 // Counterpackages keep the latest proposal visible; they do not commit concessions.
 const variants:{id:Posture;terms:TreatyTerms;motive:string}[]=[
  {id:'pragmatic',terms:base,motive:'Export income and a workable agreement matter more than a theatrical victory.'},
  {id:'prestige',terms:{...base,recognition:base.territory==='none'?'statement':'summit',price:Math.max(1,base.price-1)},motive:'He trades some revenue for public recognition, but still weighs security and territory.'},
  {id:'pressure',terms:{...base,territory:base.territory==='withdraw'?'halt':base.territory,restraint:s.deploymentUntil<world.state.day+1,price:Math.min(6,base.price+1)},motive:'He offers a narrower territorial concession and asks for defensive restraint and a higher price.'},
 ];
 return variants.map(c=>({...c,clauses:assessTerms(world,c.terms)}));
}
export function strategicChoices(world:World,candidate:Posture){
 const s=strategicState(world)!,c=strategicCandidates(world).find(c=>c.id===candidate);if(!c)throw Error('Invalid strategic candidate');
 const t=c.terms,ideas:{title:string;line:string;terms:TreatyTerms}[]=[];
 const add=(title:string,line:string,terms:Partial<TreatyTerms>)=>ideas.push({title,line,terms:{...t,...terms}});
 if(s.stage!=='quiet'){
  if(t.observers&&!c.clauses.find(x=>x.id==='observers')!.accepted)add('Offer a halt without outside observers','We can agree to halt advances without observers. Public reports will have to establish whether you comply.',{territory:'halt',observers:false,verifiedFirst:false});
  if(t.territory==='withdraw'&&!c.clauses.find(x=>x.id==='territory')!.accepted)add('Offer a monitored pause instead','A halt to further advances, with observers. We can discuss a withdrawal after that.',{territory:'halt',observers:true,verifiedFirst:true});
  if(!t.observers||!t.verifiedFirst)add('Make the supply deal conditional on verification','Observers first. The oil arrangement starts only once they verify your commitment.',{observers:true,verifiedFirst:true,territory:t.territory==='none'?'halt':t.territory});
  if(t.recognition!=='summit')add('Offer a summit for a stronger commitment','You can have a summit after the observers confirm compliance. Give me withdrawal in return.',{recognition:'summit',observers:true,territory:'withdraw'});
  if(!t.restraint&&s.deploymentUntil<world.state.day+1)add('Exchange defensive restraint for withdrawal','I can pause new support and deployments if your forces withdraw and observers verify it.',{restraint:true,territory:'withdraw',observers:true});
  if(t.quantity)add('Separate peace from the oil purchase','Let us settle the territorial issue without making an oil purchase part of it.',{quantity:0,territory:'halt',observers:true,recognition:'statement',verifiedFirst:false});
  else add('Add a supply contract to the bargain','A reliable export customer could make this agreement worthwhile for both of us.',{quantity:6,price:clamp(world.state.price,B.minPrice,B.maxPrice)});
 }
 if(t.price>1)add('Trade public credit for a lower price','A joint statement is available. In exchange, lower the daily price.',{price:t.price-1,recognition:'statement'});
 if(t.quantity!==4)add('Reduce the daily commitment','Start with a smaller daily shipment. I am not signing a bill my treasury cannot sustain.',{quantity:4});
 if(t.quantity!==8)add('Ask for a larger standing shipment','I want more reliable supply each day, with the same three-day limit.',{quantity:8});
 if(t.recognition!=='none')add('Keep public praise out of the agreement','I can agree to terms without endorsing your leadership. Remove the public ceremony.',{recognition:'none'});
 // Asking about priorities opens the economic side of a combined bargain.
 if(s.lastQuestion==='priorities')ideas.sort((a,b)=>Number(b.terms.quantity!==t.quantity||b.terms.price!==t.price)-Number(a.terms.quantity!==t.quantity||a.terms.price!==t.price));
 const unique=ideas.filter((v,i,a)=>JSON.stringify(v.terms)!==JSON.stringify(t)&&a.findIndex(x=>JSON.stringify(x.terms)===JSON.stringify(v.terms))===i).slice(0,3);
 const replies=unique.map((idea,i)=>({id:`proposal-${i}`,kind:'proposal' as const,...idea}));
 const question=s.lastQuestion==='priorities'?'evidence':'priorities';
 return [...replies,{id:`ask-${question}`,kind:'question' as const,title:question==='priorities'?'Ask which condition matters most':'Ask how compliance will be verified',line:question==='priorities'?'Which part of this agreement do you actually need, and what can you concede?':'What evidence would show that you kept your word? A press conference does not count.',question},{id:'end-call',kind:'end' as const,title:'End talks without signing',line:'There is no agreement today. We will review our position.'}];
}
export function validateStrategicVoice(value:unknown,world:World):StrategicVoice {
 if(!value||typeof value!=='object')throw Error('Invalid diplomatic response');const v=value as StrategicVoice;
 if(!strategicCandidates(world).some(c=>c.id===v.candidate)||typeof v.line!=='string'||v.line.trim().length<5||v.line.length>1400||!['claude','offline'].includes(v.source)||!Array.isArray(v.replies)||v.replies.length<3||v.replies.length>5)throw Error('Invalid diplomatic response');
 const legal=strategicChoices(world,v.candidate),seen=new Set();
 for(const reply of v.replies){if(!reply||!legal.some(c=>c.id===reply.id)||seen.has(reply.id)||typeof reply.title!=='string'||reply.title.length<3||reply.title.length>120||typeof reply.line!=='string'||reply.line.length<5||reply.line.length>450)throw Error('Illegal diplomatic suggestion');seen.add(reply.id);}
 if(!seen.has('end-call')||!v.replies.some(r=>r.id.startsWith('proposal-')))throw Error('Include a real proposal and an exit');
 return {candidate:v.candidate,line:v.line,replies:v.replies.map(r=>({id:r.id,title:r.title,line:r.line})),source:v.source};
}
export function offlineStrategicVoice(world:World):StrategicVoice {
 const s=strategicState(world)!,candidate:Posture=s.proposal?'pragmatic':s.trust<B.trustDamaged?'pressure':'pragmatic',c=strategicCandidates(world).find(c=>c.id===candidate)!;
 const objection=c.clauses.find(c=>!c.accepted);
 const question=s.lastQuestion==='evidence'?'Observers can confirm movements. My press office can confirm only its own excellence. ':s.lastQuestion==='priorities'?'I need export income, security, and a public result I can defend at home. The order depends on who is listening. ':'';
 const opening=s.suspectedBreachDay?'You have an allegation, President. Demand evidence before you call it a violation. ':s.treaty?.status==='breached'?'Yes, the agreement broke down. I assume you have come with conditions, not a commemorative pen. ':s.proposal?'I have considered your revised terms. ':s.stage==='quiet'?'Let us arrange reliable supply instead of phoning every time your fuel gauge gets nervous. ':`We need to discuss ${stageLabel[s.stage].toLowerCase()}, not just invoices. `;
 return {candidate,line:opening+question+(objection?`${objection.reason} Other accepted clauses are marked below; none is binding until we sign.`:'These terms are acceptable. Review the exact commitments before we sign. I would hate to discover what I promised by watching PNN.'),replies:strategicChoices(world,candidate).map(({id,title,line})=>({id,title,line})),source:'offline'};
}
export function securityOptions(world:World){
 const s=strategicState(world);if(!s)return [];
 const acted=world.events.some(e=>e.after.day===world.state.day&&e.strategic?.command.kind==='order');
 return SECURITY_ORDERS.map(o=>({...o,blocked:world.state.day>30?'The term has ended.':s.stage==='quiet'?'Available once the Bellara crisis is reported.':acted?'Today’s strategic security order is already recorded.':world.state.treasury<o.cost||world.state.oil<o.oil?'Insufficient treasury or oil.':o.id==='lift_sanctions'&&s.sanctionsUntil<world.state.day+1?'No sanctions are active.':o.id==='sanctions'&&s.sanctionsUntil>=world.state.day+1?'Sanctions are already active.':o.id==='readiness'&&s.readinessUntil>=world.state.day+1?'Readiness is already raised.':o.id==='aid'&&s.aidUntil>=world.state.day+1?'Bellara support is already active.':o.id==='deployment'&&s.deploymentUntil>=world.state.day+1?'A deployment is already active.':null}));
}
export function signingBlocker(world:World,candidate:Posture){
 const s=strategicState(world)!,c=strategicCandidates(world).find(c=>c.id===candidate)!;
 if(world.state.day>30)return 'Your term has ended.';
 if(diplomaticSettled(world))return 'Today’s diplomatic position is settled. Continue tomorrow.';
 if(s.treaty?.status==='active')return 'An agreement is active. Let it expire or explicitly suspend it before signing another.';
 if(c.clauses.some(c=>!c.accepted))return 'Disputed clauses must be resolved before signing.';
 if(s.suspectedBreachDay)return 'Wait for the pending compliance report before signing a replacement.';
 if(world.state.treasury<c.terms.quantity*c.terms.price+(c.terms.observers?B.observerCost:0))return 'You cannot afford monitoring plus the first scheduled shipment.';
 return null;
}
function append(world:World,command:StrategicRecord['command'],snapshot:StrategicState,state:CrisisState,messages:string[],reports:StrategicReport[]=[],dayAction=false):World {
 const event:WorldEvent=frozen({strategic:{command,snapshot,reports,...(command.kind==='turn'?{offer:strategicCandidates(world).find(c=>c.id===command.voice.candidate)!.terms}:{})},timing:dayAction?'day-action':'conversation',id:world.events.length+1,decision:'wait',messages,after:state});
 return frozen({state,events:[...world.events,event]});
}
const report=(headline:string,facts:string,source:'PNN'|'BULL'='PNN',certainty:'confirmed'|'unverified'='confirmed'):StrategicReport=>({source,headline,facts,certainty});
export function applyStrategic(world:World,input:StrategicCommand):World {
 if(world.state.day>30)throw Error('The election has concluded.');
 if(!input||typeof input!=='object')throw Error('Invalid strategic command');
 const existing=strategicState(world),state={...world.state};
 if(input.kind==='init'){
  if(existing||!world.events.length||!Number.isInteger(input.seed)||input.seed<0||input.seed>4294967295)throw Error('Invalid or duplicate diplomatic initialization');
  return append(world,{kind:'init',seed:input.seed},{seed:input.seed,stage:'quiet',stageSince:world.state.day,tension:B.quietTension,trust:B.initialTrust,breaches:0,disruption:0,homeland:'safe',lastAttackDay:0,sanctionsUntil:0,readinessUntil:0,aidUntil:0,deploymentUntil:0,serial:0,posture:'pragmatic',lastViolationDay:0,lastDelivery:'No standing supply agreement.'},state,['Strategic diplomacy enabled. Existing history is unchanged.']);
 }
 if(!existing)throw Error('Strategic diplomacy is not enabled');
 const s:StrategicState=structuredClone(existing);
 if(input.kind==='turn'){
  if(diplomaticSettled(world))throw Error('Today’s diplomatic position is settled.');
  if(input.context!==strategicKey(world)||currentStrategicTurn(world))throw Error('This diplomatic turn is stale or already recorded');
  const voice=validateStrategicVoice(input.voice,world);s.posture=voice.candidate;
  return append(world,{kind:'turn',context:input.context,voice},s,state,['Private diplomatic reply recorded. No agreement signed.']);
 }
 if(input.kind==='reply'||input.kind==='sign'){
  const turn=currentStrategicTurn(world);if(!turn||turn.id!==input.turnId||turn.strategic?.command.kind!=='turn')throw Error('This reply is out of date. Reopen the call.');
  const voice=turn.strategic.command.voice;
  if(input.kind==='reply'){
   const written=voice.replies.find(r=>r.id===input.choiceId),choice=strategicChoices(world,voice.candidate).find(c=>c.id===input.choiceId);if(!written||!choice)throw Error('That reply was not offered');
   if(diplomaticSettled(world))throw Error('Today’s diplomatic position is settled.');
   if(choice.kind==='end')return applyStrategic(world,{kind:'end_call'});
   if(choice.kind==='proposal'){s.proposal=choice.terms;delete s.lastQuestion;}else{s.lastQuestion=choice.question;s.proposal=strategicCandidates(world).find(c=>c.id===voice.candidate)!.terms;}
   return append(world,{kind:'reply',turnId:input.turnId,choiceId:input.choiceId},s,state,['Private proposal or question recorded. No costs or commitments incurred.']);
  }
  const blocked=signingBlocker(world,voice.candidate);if(blocked)throw Error(blocked);
  const terms=strategicCandidates(world).find(c=>c.id===voice.candidate)!.terms;
  state.treasury-=terms.observers?B.observerCost:0;s.serial++;s.trust=clamp(s.trust+B.trustChanges.signature);
  s.treaty={serial:s.serial,terms,signedDay:state.day,throughDay:state.day+terms.days,status:'active',reason:'Signed; obligations begin at the next day transition.',delivered:0,paid:0};delete s.proposal;delete s.lastQuestion;
  const facts=`Freedoma and Petrovia signed: ${treatySummary(terms)} Monitoring setup costs F$${terms.observers?B.observerCost:0}. No shipment or territorial change has occurred yet.`;
  return append(world,{kind:'sign',turnId:input.turnId},s,state,[facts],[report('FREEDOMA AND PETROVIA SIGN CONDITIONAL AGREEMENT',facts)],true);
 }
 if(input.kind==='end_call'){
  if(diplomaticSettled(world))throw Error('Today’s diplomatic position is settled.');
  delete s.proposal;delete s.lastQuestion;
  return append(world,{kind:'end_call'},s,state,['Talks ended without a new agreement. Existing obligations remain.']);
 }
 if(input.kind==='suspend'){
  if(diplomaticSettled(world)||s.treaty?.status!=='active')throw Error('No agreement can be suspended now.');
  s.treaty.status='suspended';s.treaty.reason='Freedoma suspended future obligations.';s.trust=clamp(s.trust-B.trustChanges.suspension);state.relations=clamp(state.relations+B.relationsChanges.suspend,-100,100);
  const facts='Freedoma suspended future obligations. Completed shipments and payments are unchanged. Petrovia questions Freedoma’s reliability.';
  return append(world,{kind:'suspend'},s,state,[facts],[report('FREEDOMA SUSPENDS ITS AGREEMENT',facts)],true);
 }
 if(input.kind==='spot'){
  const quote=petrovTurn(world);if(diplomaticSettled(world)||s.sanctionsUntil>=state.day+1||quote.quantity<=0||state.treasury<quote.quantity*quote.unitPrice||state.supplierOil-quote.quantity<B.reserve)throw Error('This one-time purchase is unavailable.');
  const cost=quote.quantity*quote.unitPrice;state.treasury-=cost;state.supplierTreasury+=cost;state.oil+=quote.quantity;state.supplierOil-=quote.quantity;state.relations=clamp(state.relations+B.relationsChanges.purchase,-100,100);
  const facts=`Freedoma bought ${quote.quantity} barrels for F$${cost}. No territorial agreement was made.`;
  return append(world,{kind:'spot'},s,state,[facts],[report('ONE-TIME OIL SHIPMENT COMPLETED',facts)],true);
 }
 if(input.kind==='order'){
  const order=securityOptions(world).find(o=>o.id===input.order);if(!order||order.blocked)throw Error(order?.blocked??'Unknown security order');
  state.treasury-=order.cost;state.oil-=order.oil;const until=state.day+B.orderDuration;
  const facts=[`${order.title}. Authorized cost F$${order.cost}${order.oil?` and ${order.oil} barrels`:''}. ${order.hint}`];
  if(order.id==='sanctions'){s.sanctionsUntil=until;s.tension=clamp(s.tension+B.pressure.imposeSanctions);state.relations=clamp(state.relations+B.relationsChanges.sanctions,-100,100);}
  if(order.id==='lift_sanctions'){s.sanctionsUntil=0;s.tension=clamp(s.tension-B.pressure.liftSanctions);}
  if(order.id==='readiness')s.readinessUntil=until;
  if(order.id==='aid'){s.aidUntil=until;state.relations=clamp(state.relations+B.relationsChanges.aid,-100,100);}
  if(order.id==='deployment'){s.deploymentUntil=until;state.relations=clamp(state.relations+B.relationsChanges.deployment,-100,100);}
  if(order.id==='humanitarian')s.disruption=clamp(s.disruption-B.disruption.humanitarian);
  if(order.id==='peace_talks'){s.tension=clamp(s.tension-B.pressure.peaceTalks);state.relations=clamp(state.relations+B.relationsChanges.peace,-100,100);}
  if(s.treaty?.status==='active'&&((s.treaty.terms.restraint&&['aid','deployment'].includes(order.id))||(order.id==='sanctions'&&s.treaty.terms.quantity>0))){s.treaty.status='suspended';s.treaty.reason='Freedoma issued an order incompatible with its commitments.';s.trust=clamp(s.trust-B.trustChanges.incompatible);facts.push('This order suspends the incompatible treaty. Past transfers are not reversed.');}
  return append(world,{kind:'order',order:order.id},s,state,facts,[report('FREEDOMA ANNOUNCES A STRATEGIC SECURITY ORDER',facts.join(' '))],true);
 }
 throw Error('Unknown strategic command');
}
export function seededPercent(seed:number,day:number,tag:string){let n=seed>>>0;for(const c of `${day}:${tag}`)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n%100;}
export function complianceRisk(world:World){const s=strategicState(world);if(!s?.treaty||s.treaty.status!=='active'||s.treaty.terms.territory==='none')return {level:'No territorial guarantee',chance:0};const t=s.treaty.terms;const chance=clamp(Math.round(B.compliance.base+s.tension/B.compliance.tensionDivisor+s.breaches*B.compliance.priorBreach-s.trust/B.compliance.trustDivisor-(t.observers?B.compliance.observers:0)-(t.recognition==='none'?0:B.compliance.recognition)+(s.posture==='pressure'?B.compliance.pressure:0)),B.breachMin,B.breachMax);return {level:chance>=B.compliance.highRisk?'High risk':chance>=B.compliance.watchRisk?'Watch closely':'Cautiously stable',chance};}
export function settleStrategic(world:World){
 const previous=strategicState(world);if(!previous)return undefined;
 const s:StrategicState=structuredClone(previous),state={...world.state},day=state.day+1,reports:StrategicReport[]=[],messages:string[]=[];
 const emit=(headline:string,facts:string,source:'PNN'|'BULL'='PNN',certainty:'confirmed'|'unverified'='confirmed')=>{reports.push(report(headline,facts,source,certainty));messages.push(`${source}: ${headline}. ${facts}`);};
 const stage=(next:CrisisStage)=>{if(s.stage!==next){s.stage=next;s.stageSince=day;}};
 if(s.stage==='quiet'&&day>=B.crisisStartDay){stage('border_pressure');s.tension=B.initialTension;emit('PETROVIA MASSES FORCES NEAR BELLARA','PNN confirms border pressure. No incursion or attack on Freedoma has occurred. The strategic security channel is now available.');}
 if(s.sanctionsUntil>=day){const loss=Math.min(B.sanctionsDailyLoss,state.supplierTreasury);state.supplierTreasury-=loss;messages.push(`Sanctions restrict Petrovia’s export income by F$${loss}.`);}
 let deployed=s.deploymentUntil>=day;
 if(deployed){if(state.treasury<B.deploymentDailyTreasury||state.oil<B.deploymentDailyOil){s.deploymentUntil=0;deployed=false;emit('DEFENSIVE DEPLOYMENT ENDS EARLY','Freedoma could not fund the deployment’s overnight upkeep. No unpaid resources were spent.');}else{state.treasury-=B.deploymentDailyTreasury;state.oil-=B.deploymentDailyOil;messages.push('Deployment upkeep: F$2 and one barrel.');}}
 let confirmedBreach=false;
 const breach=()=>{
  confirmedBreach=true;s.breaches++;s.lastViolationDay=day;s.trust=clamp(s.trust-B.trustChanges.breach);s.tension=clamp(s.tension+B.pressure.breach);s.disruption=clamp(s.disruption+B.disruption.breach);state.relations=clamp(state.relations+B.relationsChanges.breach,-100,100);
  if(s.treaty){s.treaty.status='breached';s.treaty.reason='Confirmed territorial violation; future obligations suspended.';}
  stage(s.stage==='regional_war'?'regional_war':'incursion');delete s.suspectedBreachDay;
  emit('PETROVIA BREAKS ITS TERRITORIAL AGREEMENT','Troop movements into Bellara are confirmed. Future contractual shipments and payments are suspended. Previous transfers stand.');
 };
 if(s.suspectedBreachDay&&s.suspectedBreachDay<day)breach();
 const t=s.treaty;
 if(t?.status==='active'&&day<=t.throughDay&&!confirmedBreach){
  if(t.terms.territory!=='none'&&s.stage!=='quiet'){
   if(seededPercent(s.seed,day,`compliance-${t.serial}`)<complianceRisk(world).chance){
    if(t.terms.observers)breach();
    else {s.suspectedBreachDay=day;emit('REPORTS OF TROOP MOVEMENTS REMAIN UNVERIFIED','PNN has an allegation, not a confirmed breach. Without observers, independent confirmation will arrive at the next day transition.','PNN','unverified');}
   }
   if(!confirmedBreach&&!s.suspectedBreachDay){const target=t.terms.territory==='withdraw'?'withdrawal':'ceasefire';const changed=s.stage!==target;stage(target);s.tension=clamp(s.tension-B.pressure.compliance);s.trust=clamp(s.trust+B.trustChanges.compliance);if(changed)emit(target==='withdrawal'?'WITHDRAWAL FROM BELLARA CONFIRMED':'ADVANCES INTO BELLARA HALT',`${t.terms.observers?'Independent observers':'Public reports'} confirm the territorial commitment is being honored. ${t.terms.recognition==='summit'?'The promised joint summit is held.':''}`);}
  }
  if(t.status==='active'&&t.terms.quantity){
   const cost=t.terms.quantity*t.terms.price;
   const problem=s.sanctionsUntil>=day?'Sanctions block the shipment.':state.treasury<cost?'Freedoma cannot fund the scheduled payment.':state.supplierOil-t.terms.quantity<B.reserve?'Petrovia cannot ship without breaching its protected domestic reserve.':t.terms.verifiedFirst&&(s.suspectedBreachDay||!['ceasefire','withdrawal'].includes(s.stage))?'Compliance has not been verified.':null;
   if(problem){t.status='suspended';t.reason=problem;s.lastDelivery=problem;if(state.treasury<cost)s.trust=clamp(s.trust-B.trustChanges.missedPayment);emit('STANDING OIL DELIVERY INTERRUPTED',`${problem} No barrels or payment were transferred. Renegotiation is available.`);}
   else{state.treasury-=cost;state.supplierTreasury+=cost;state.oil+=t.terms.quantity;state.supplierOil-=t.terms.quantity;t.delivered+=t.terms.quantity;t.paid+=cost;s.lastDelivery=`Day ${day}: ${t.terms.quantity} barrels delivered for F$${cost}.`;messages.push(s.lastDelivery);}
  }
  if(t.status==='active'&&day===t.throughDay){t.status='expired';t.reason='All three scheduled days have elapsed.';emit('THREE-DAY AGREEMENT EXPIRES',`The agreement’s obligations end after today’s scheduled delivery. Recorded totals: ${t.delivered} barrels and F$${t.paid}. Renewal requires a new signature.`);}
 }
 const protectedToday=t&&['active','expired'].includes(t.status)&&day<=t.throughDay&&t.terms.territory!=='none'&&!confirmedBreach;
 if(s.stage!=='quiet'&&!protectedToday&&!confirmedBreach){
  const pressure=B.pressure[s.posture];
  const deterrence=(s.readinessUntil>=day?B.pressure.readiness:0)+(s.aidUntil>=day?B.pressure.aid:0)+(deployed?B.pressure.deployment:0);
  s.tension=clamp(s.tension+pressure+(s.sanctionsUntil>=day?B.pressure.sanctions:0)-deterrence);
  if((s.stage==='withdrawal'||s.stage==='ceasefire')&&s.tension>=B.incursionThreshold){stage('border_pressure');emit('BORDER PRESSURE RETURNS','With no active territorial guarantee, Petrovia renews pressure near Bellara. No new incursion has yet been confirmed.');}
  else if(s.stage==='border_pressure'&&s.tension>=B.incursionThreshold&&day-s.stageSince>=B.stageMinimumDays){stage('incursion');emit('PETROVIAN FORCES ENTER A DISPUTED AREA','PNN confirms an incursion into Bellara. This is a recorded escalation, not a declaration of an attack on Freedoma.');}
  else if(s.stage==='incursion'&&s.tension>=B.warThreshold&&day-s.stageSince>=B.stageMinimumDays){stage('regional_war');emit('BELLARA CONFLICT WIDENS INTO REGIONAL WAR','Fighting has spread within the region. Freedoma faces emergency costs and rising civilian disruption; the election timetable is unchanged.');}
 }
 if(s.stage==='regional_war'){
  const cost=Math.min(B.regionalWarDailyCost,state.treasury);state.treasury-=cost;state.approval=clamp(state.approval-B.regionalWarDailyApproval);s.disruption=clamp(s.disruption+B.disruption.war);
  messages.push(`Regional disruption costs Freedoma F$${cost}; approval -1.`);
  if(s.tension>=B.homelandThreshold&&day-s.stageSince>=B.stageMinimumDays){
   if(s.homeland==='safe'){s.homeland='threatened';emit('PETROVIA THREATENS FREEDOMA DIRECTLY','An explicit threat against Freedoma is recorded. No attack has occurred. Defensive readiness and negotiations can reduce risk.');}
   else if(day-s.lastAttackDay>=B.homelandRisk.cooldown&&seededPercent(s.seed,day,'homeland')<(s.readinessUntil>=day?B.homelandRisk.readiness:B.homelandRisk.normal)){
    s.homeland='attacked';s.lastAttackDay=day;state.treasury-=Math.min(B.attackCost,state.treasury);state.oil-=Math.min(B.attackOil,state.oil);state.approval=clamp(state.approval-B.attackApproval);s.disruption=clamp(s.disruption+B.disruption.attack);
    emit('ATTACK ON FREEDOMAN INFRASTRUCTURE CONFIRMED','Following the recorded threat and regional escalation, an attack disrupts infrastructure. Repairs use up to F$5 and two barrels; approval falls four. The presidency continues.');
   }
  }
 }else if(s.stage==='incursion')s.disruption=clamp(s.disruption+B.disruption.incursion);
 else if(['ceasefire','withdrawal'].includes(s.stage)){s.disruption=clamp(s.disruption-B.disruption.recovery);s.homeland='safe';}
 if(s.disruption!==previous.disruption&&s.disruption>0)emit('LOCAL FAMILIES FEEL THE COST OF THE CONFLICT',`BULL reports ${s.disruption>previous.disruption?'growing':'easing'} civilian disruption. Local communities want reliable services and an explanation of emergency spending. No casualty numbers are asserted.`,'BULL');
 const record:StrategicRecord=frozen({command:{kind:'overnight',day},snapshot:s,reports});
 return {state,record,messages};
}
export function strategicPublicContext(world:World){
 const s=strategicState(world);if(!s)return undefined;
 return {stage:stageLabel[s.stage],homeland:s.homeland,civilianDisruption:s.disruption,monitoring:s.treaty?.status==='active'&&s.treaty.terms.observers?'Independent observers active':s.suspectedBreachDay?'Independent confirmation pending':s.treaty?.terms.observers?'Observer mandate ended':'No independent observers',warning:s.suspectedBreachDay?'Unverified movement report; confirmation pending':complianceRisk(world).level,agreement:s.treaty?{terms:s.treaty.terms,status:s.treaty.status,throughDay:s.treaty.throughDay,delivered:s.treaty.delivered,paid:s.treaty.paid,reason:s.treaty.reason}:undefined,reports:world.events.flatMap(e=>(e.strategic?.reports??[]).map(r=>({day:e.after.day,...r}))).slice(-8),rule:'Only signed agreements, public orders and confirmed reports are public. Negotiating proposals, private dialogue, and internal random seeds are not public. Unverified reports are not confirmed attacks.'};
}
export function strategicPrivateContext(world:World){const s=strategicState(world);if(!s)return undefined;return {public:strategicPublicContext(world),trust:s.trust<B.trustDamaged?'Damaged':s.trust>=B.trustEstablished?'Established':'Cautious',lastQuestion:s.lastQuestion,latestPlayerProposal:s.proposal,goals:['Export income','Territorial influence','Security','Public prestige'],legacyMemory:world.events.filter(e=>e.diplomacy).slice(-4).map(e=>({day:e.after.day,reply:e.diplomacy!.reply,spoken:e.diplomacy!.spokenLine,player:e.diplomacy!.chosenLine,terms:e.diplomacy!.offer})),memory:world.events.filter(e=>e.strategic?.command.kind==='turn'||e.strategic?.command.kind==='reply').slice(-10).map(e=>{const command=e.strategic!.command;if(command.kind==='turn')return {speaker:'Petrov',line:command.voice.line,terms:e.strategic!.offer};if(command.kind==='reply'){const original=world.events.find(x=>x.id===command.turnId)?.strategic?.command;return {speaker:'President',line:original?.kind==='turn'?original.voice.replies.find(r=>r.id===command.choiceId)?.line:'',proposal:e.strategic!.snapshot.proposal};}return {};})};}
