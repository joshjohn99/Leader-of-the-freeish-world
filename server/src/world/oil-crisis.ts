import {scheduledDeposit} from '../economy/revenue.ts';
import {applyStrategic,settleStrategic} from '../diplomacy/strategic.ts';
import {congressRules,chambers} from '../congress/congress.ts';
import {validateAssignment} from '../cabinet/promises.ts';
import type {Chamber,CongressAction} from '../congress/congress.ts';
import {activeDay,agendaEngine} from '../agenda/agenda.ts';
import {electionRules} from '../election/election.ts';
import {worldEventEngine,newsOptions} from '../events/world-news.ts';
import {localNewsEngine} from '../events/local-news.ts';
import type {NewsResponse} from '../events/world-news.ts';
import {campaignRules} from '../campaign/campaign.ts';
import {validatePresident} from '../campaign/president.ts';
import type {CampaignRecord,PromiseAction} from '../campaign/campaign.ts';
import { maxTurn, maxReplies, pilotDaysLeft } from '../billionaires/sterling.ts';
import type { MaxRecord } from '../billionaires/sterling.ts';
import { petrovTurn, petrovReplies } from '../diplomacy/petrov.ts';
import type { DiplomacyRecord } from '../diplomacy/petrov.ts';
import { vossTurn, vossReplies } from '../diplomacy/voss.ts';
import type { VossRecord } from '../diplomacy/voss.ts';
import type { CrisisState, Decision, World, WorldEvent } from '../../../shared/schemas/oil-crisis.ts';

export const decisions = Object.freeze({
  buy: 'Buy 10 oil from Petrovia at its current price.',
  subsidize: 'Spend 8 treasury on fuel subsidies. Helps approval; adds 2 demand today.',
  ration: 'Reduce today’s oil demand from 6 to 3. Immediate approval cost: 4.',
  threaten: 'Threaten Petrovia. Gain 2 approval now; relations fall 15.',
  wait: 'Take no policy action. Normal consumption continues.',
});
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
function freezeWorld(state: CrisisState, events: readonly WorldEvent[]): World {
  return Object.freeze({ state: Object.freeze(state), events: Object.freeze([...events]) });
}
export function createWorld(): World {
  return freezeWorld({ day: 1, treasury: 80, oil: 8, approval: 55, relations: 0,
    supplierOil: 60, supplierTreasury: 20, price: 2, subsidyDays: 0 }, []);
}
export function beginDay(world:World):World {
 if(electionRules.finished(world))throw Error('The election has concluded.');
 if(activeDay(world))throw Error('Today’s agenda is already open.');
 const tasks=Object.freeze(agendaEngine.plan(world));
 const event:WorldEvent=Object.freeze({agenda:Object.freeze({kind:'start' as const,tasks}),id:world.events.length+1,decision:'wait',messages:Object.freeze(['The daily agenda is ready. Decisions stay in this day until End day.']),after:world.state});
 return freezeWorld({...world.state},[...world.events,event]);
}
export function assignCabinetPromise(world:World,index:unknown,secretaryId:unknown):World {
 const assignment=validateAssignment(world,index,secretaryId);
 if(electionRules.finished(world))throw Error('Your term has ended.');
 const event:WorldEvent=Object.freeze({cabinetAssignment:Object.freeze(assignment),timing:'conversation',id:world.events.length+1,decision:'wait',messages:Object.freeze(['Cabinet promise owner assigned. No policy enacted.']),after:world.state});
 return freezeWorld({...world.state},[...world.events,event]);
}
export function endDay(world:World,withScheduledRevenue=true):World {
 const day=activeDay(world);if(!day)throw Error('No daily agenda is open.');
 if(agendaEngine.tasks(world).some(task=>!task.done))throw Error('Complete today’s agenda before ending the day.');
 const treasuryDeposit=withScheduledRevenue?scheduledDeposit(world.state.day+1):undefined;
 // Credit receipts before contractual payments and deployment upkeep; history stays immutable.
 const fundedWorld=treasuryDeposit?{...world,state:{...world.state,treasury:world.state.treasury+treasuryDeposit.amount}}:world;
 const settlement=settleStrategic(fundedWorld);
 const s={...(settlement?.state??fundedWorld.state)},messages:string[]=[...(treasuryDeposit?[`Treasury deposit: +F$${treasuryDeposit.amount} in tax receipts for day ${treasuryDeposit.day}, credited before overnight bills.`]:[]),...(settlement?.messages??[])];
 const policy=day.events.find(e=>e.timing==='day-action'&&!e.strategic&&!e.diplomacy&&!e.sterling&&!e.security&&!e.campaign&&!e.newsResponse&&!e.announcement&&!e.congress);
 let demand=policy?.decision==='ration'?3:policy?.decision==='subsidize'?8:6;
 if(pilotDaysLeft(world)>0){demand=Math.max(0,demand-2);messages.push('Volt buses reduce today’s oil demand by 2.');}
 if(policy?.decision!=='subsidize')s.subsidyDays=0;
 const used=Math.min(s.oil,demand),shortage=demand-used;s.oil-=used;
 s.approval=clamp(s.approval+(shortage?-shortage*3:1),0,100);s.treasury+=3;s.supplierOil+=4;s.day++;
 messages.push(`Citizens consume ${used} oil against demand of ${demand}.`,shortage?`Shortage: ${shortage} oil. Approval -${shortage*3}.`:'Demand met. Approval +1.','Treasury receives 3 daily revenue. Petrovia produces 4 oil.');
 const news=worldEventEngine.next(world);const localNews=localNewsEngine.next(world);if(news)messages.push(`PNN: ${news.headline}`);if(localNews)messages.push(`BULL: ${localNews.headline}`);
 const event:WorldEvent=Object.freeze({agenda:Object.freeze({kind:'end' as const}),...(treasuryDeposit?{treasuryDeposit}:{}),...(settlement?{strategic:settlement.record}:{}),...(news?{news}:{}),...(localNews?{localNews}:{}),id:world.events.length+1,decision:'wait',messages:Object.freeze(messages),after:Object.freeze(s)});
 return freezeWorld(s,[...world.events,event]);
}
export function seatCongress(world:World,seed:unknown):World {
 if(congressRules.seed(world))throw Error('Congress is already seated.');
 if(!Number.isInteger(seed)||Number(seed)<0||Number(seed)>4294967295)throw Error('Invalid Congress seed');
 if(electionRules.finished(world))throw Error('Your term has ended.');
 const event:WorldEvent=Object.freeze({congress:Object.freeze({kind:'founding',seed:Number(seed)}),id:world.events.length+1,decision:'wait',messages:Object.freeze(['The People’s House and Council of States take their seats.']),after:world.state});
 return freezeWorld({...world.state},[...world.events,event]);
}
export function actInCongress(world:World,index:number,chamber:Chamber,action:CongressAction,text?:string):World {
 if(!Number.isInteger(index)||!chambers.some(c=>c.id===chamber))throw Error('Invalid congressional request');
 const option=congressRules.options(world,index,chamber).find(o=>o.id===action);if(!option||option.blocked)throw Error(option?.blocked??'This congressional action is unavailable.');
 if(action==='draft'&&(typeof text!=='string'||text.trim().length<15||text.trim().length>600))throw Error('Describe a practical proposal in 15–600 characters.');
 if(action!=='draft'&&text!==undefined)throw Error('Only draft submissions accept proposal text.');
 const passed=action==='vote'?congressRules.tally(world,index,chamber).canPass:undefined;
 const state={...world.state,treasury:world.state.treasury-option.cost};
 const event:WorldEvent=Object.freeze({timing:'day-action',congress:Object.freeze({kind:'action',index,chamber,action,...(action==='draft'?{text:text!.trim()}:{}),...(passed!==undefined?{passed}:{})}),id:world.events.length+1,decision:'wait',messages:Object.freeze([`${chamber==='house'?'People’s House':'Council of States'}: ${option.title}.${passed!==undefined?(passed?' Motion passed.':' Motion failed.'):''}`,`Preparation cost: ${option.cost} treasury. Both chambers approving the same plan fulfills the promise on the game scorecard.`]),after:Object.freeze(state)});
 return freezeWorld(state,[...world.events,event]);
}
export function availableDecisions(world: World): { decision: Decision; description: string; blocked: string | null }[] {
  return Object.entries(decisions).map(([key, description]) => {
    const decision = key as Decision;
    const s = world.state;
    const blocked = decision === 'buy' && s.treasury < 10 * s.price ? 'Not enough treasury.'
      : decision === 'buy' && s.supplierOil < 10 ? 'Petrovia has fewer than 10 oil available.'
      : decision === 'subsidize' && s.treasury < 8 ? 'Not enough treasury.' : null;
    return { decision, description, blocked };
  });
}
export function startPresidency(world:World,values:unknown,identity?:unknown):World {
 if(world.events.length)throw Error('A presidency is already underway.');const promises=campaignRules.validatePromises(values);const president=identity===undefined?undefined:validatePresident(identity);
 const event:WorldEvent=Object.freeze({campaign:Object.freeze({kind:'launch' as const,promises,...(president?{president}:{})}),id:1,decision:'wait',messages:Object.freeze(['Three campaign promises recorded. No policies enacted.']),after:world.state});return freezeWorld({...world.state},[event]);
}
export function decidePromise(world:World,index:number,action:unknown,line?:string,withNews=true,enforceTerm=true):World {
 const option=campaignRules.options(world,index).find(o=>o.id===action);if(!option||option.blocked)throw Error(option?.blocked??'That promise action is unavailable.');
 if(line!==undefined&&(typeof line!=='string'||line.length<3||line.length>400))throw Error('Invalid presidential statement');
 return advance(world,'wait',undefined,undefined,Object.freeze({kind:'decision',index,action:option.id,line:line??option.title}),withNews,undefined,enforceTerm);
}
export function decide(world: World, input: unknown,withNews=true,enforceTerm=true): World {
  return advance(world, input,undefined,undefined,undefined,withNews,undefined,enforceTerm);
}
export function replyToPetrov(world: World, input: unknown, offerId: unknown, strategy: unknown = 'default', spokenLine?: string, chosenLine?: string,withNews=true,enforceTerm=true,conversationOnly=['counter','ask_needs','decline'].includes(String(input)), requestedQuantity?: number, requestedUnitPrice?: number): World {
  if(chosenLine!==undefined&&(typeof chosenLine!=='string'||chosenLine.length<5||chosenLine.length>400))throw new Error('Invalid player dialogue.');
  const offer = petrovTurn(world, strategy);
  if (spokenLine !== undefined && (typeof spokenLine !== 'string' || spokenLine.length > 900)) throw new Error('Invalid dialogue.');
  if (offerId !== offer.id) throw new Error('This offer is out of date. Reopen the call.');
  const reply = petrovReplies(world, offer).find(reply=>reply.id===input);
  if (!reply) throw new Error('That reply is not available for this offer.');
  if (reply.blocked) throw new Error(reply.blocked);
  if (reply.id === 'counter' && (requestedQuantity !== undefined || requestedUnitPrice !== undefined)) {
    if (!Number.isInteger(requestedQuantity) || requestedQuantity! < 1 || requestedQuantity! > Math.min(offer.quantity, world.state.supplierOil - 12)) throw new Error('Choose a quantity Petrov can release while protecting Petrovia’s reserve.');
    if (!Number.isInteger(requestedUnitPrice) || requestedUnitPrice! < 1 || requestedUnitPrice! > 6) throw new Error('Choose a unit price between 1 and 6.');
  }
  const diplomacy = Object.freeze({ offer, reply: reply.id, playerLine: chosenLine??reply.line, ...(chosenLine?{chosenLine}:{}), ...(spokenLine ? { spokenLine } : {}), ...(requestedQuantity!==undefined?{requestedQuantity}:{}), ...(requestedUnitPrice!==undefined?{requestedUnitPrice}: {}) });
  return advance(world, reply.decision, diplomacy,undefined,undefined,withNews,undefined,enforceTerm,conversationOnly);
}
export function replyToMax(world:World,input:unknown,offerId:unknown,strategy:unknown,spokenLine?:string,playerLine?:string,withNews=true,enforceTerm=true,conversationOnly=['praise','guarantees','decline'].includes(String(input))):World {
 const offer=maxTurn(world,strategy),reply=maxReplies(world,offer).find(r=>r.id===input);
 if(offer.id!==offerId||!reply)throw Error('This Max reply is no longer available.');
 if(reply.blocked)throw Error(reply.blocked);
 if(spokenLine!==undefined&&(typeof spokenLine!=='string'||spokenLine.length>900))throw Error('Invalid Max dialogue');
 if(playerLine!==undefined&&(typeof playerLine!=='string'||playerLine.length<5||playerLine.length>400))throw Error('Invalid player dialogue');
 const sterling=Object.freeze({offer,reply:reply.id,playerLine:playerLine??reply.line,...(spokenLine?{spokenLine}:{})});
 return advance(world,'wait',undefined,sterling,undefined,withNews,undefined,enforceTerm,conversationOnly);
}
export function replyToVoss(world:World,input:unknown,offerId:unknown,strategy:unknown='urgent',spokenLine?:string,playerLine?:string,withNews=true,enforceTerm=true,conversationOnly=['ask_evidence','decline_call'].includes(String(input))):World {
 const offer=vossTurn(world,strategy),reply=vossReplies(world,offer).find(r=>r.id===input);
 if(offer.id!==offerId||!reply)throw Error('This Karmenia request is no longer available.');
 if(reply.blocked)throw Error(reply.blocked);
 if(spokenLine!==undefined&&(typeof spokenLine!=='string'||spokenLine.length>900))throw Error('Invalid Volkov dialogue');
 if(playerLine!==undefined&&(typeof playerLine!=='string'||playerLine.length<5||playerLine.length>500))throw Error('Invalid player dialogue');
 const security=Object.freeze({offer,reply:reply.id,playerLine:playerLine??reply.line,...(spokenLine?{spokenLine}:{})});
 return advance(world,'wait',undefined,undefined,undefined,withNews,undefined,enforceTerm,conversationOnly,undefined,security);
}
export function respondToNews(world:World,newsId:string,action:unknown,withNews=true,enforceTerm=true):World {
 const option=newsOptions(world,newsId).find(o=>o.id===action);if(!option||option.blocked)throw Error(option?.blocked??'This bulletin already has a response.');
 return advance(world,'wait',undefined,undefined,undefined,withNews,Object.freeze({newsId,action:option.id}),enforceTerm);
}
export function publishAnnouncement(world:World,text:unknown,withNews=true,enforceTerm=true):World {
 if(typeof text!=='string'||text.trim().length<10||text.trim().length>800)throw Error('Write an announcement between 10 and 800 characters.');
 return advance(world,'wait',undefined,undefined,undefined,withNews,undefined,enforceTerm,false,Object.freeze({text:text.trim()}));
}
function advance(world: World, input: unknown, diplomacy?: DiplomacyRecord, sterling?:MaxRecord,campaign?:CampaignRecord,withNews=true,newsResponse?:NewsResponse,enforceTerm=true,conversationOnly=false,announcement?:{readonly text:string},security?:VossRecord): World {
  if(enforceTerm&&electionRules.finished(world))throw Error("The election has concluded. Start a new presidency to play again.");
  const day=activeDay(world);
  if(day){
    const committed=day.events.filter(e=>e.timing==='day-action');
    if(diplomacy&&day.events.some(e=>e.diplomacy&&!['counter','ask_needs','challenge'].includes(e.diplomacy.reply)))throw Error('Your diplomatic position is settled for today.');
    if(sterling&&day.events.some(e=>e.sterling&&['fund','decline','humiliate'].includes(e.sterling.reply)))throw Error('Your Max meeting is settled for today.');
    if(announcement&&committed.some(e=>e.announcement))throw Error('An announcement has already been published today.');
    if(security&&day.events.some(e=>e.security&&!['ask_evidence','decline_call'].includes(e.security.reply)))throw Error('Your Karmenia position is settled for today.');
    if(campaign?.kind==='decision'&&committed.some(e=>e.campaign?.kind==='decision'&&e.campaign.index===campaign.index))throw Error('This promise has already been addressed today.');
    if(!diplomacy&&!sterling&&!campaign&&!announcement&&!newsResponse&&committed.some(e=>!e.strategic&&!e.diplomacy&&!e.sterling&&!e.campaign&&!e.announcement&&!e.newsResponse&&!e.congress))throw Error('Today’s domestic policy is already set.');
  }
  const option = availableDecisions(world).find(option => option.decision === input);
  if (!option) throw new Error('Unknown decision.');
  if (option.blocked && !(diplomacy?.reply === 'accept')) throw new Error(option.blocked);
  if(conversationOnly){
    if(!(diplomacy&&['counter','ask_needs','decline'].includes(diplomacy.reply))&&!(sterling&&['praise','guarantees','decline'].includes(sterling.reply))&&!(security&&['ask_evidence','decline_call'].includes(security.reply)))throw Error('This action requires a day.');
    const event:WorldEvent=Object.freeze({timing:'conversation',...(diplomacy?{diplomacy}:{}),...(sterling?{sterling}:{}),...(security?{security}:{}),id:world.events.length+1,decision:option.decision,messages:Object.freeze(['Conversation recorded. No day or resources spent.']),after:world.state});
    return freezeWorld({...world.state},[...world.events,event]);
  }
  const decision = option.decision;
  const s: CrisisState = { ...world.state };
  const messages: string[] = [];
  let demand = 6;
  if (decision === 'buy') {
    const quantity = diplomacy?.reply === 'accept' ? diplomacy.offer.quantity : 10;
    const price = diplomacy?.reply === 'accept' ? diplomacy.offer.unitPrice : s.price;
    const cost = quantity * price;
    if (quantity <= 0 || s.treasury < cost || s.supplierOil < quantity) throw new Error('The shipment cannot be settled.');
    s.treasury -= cost; s.supplierTreasury += cost;
    s.oil += quantity; s.supplierOil -= quantity; s.relations += 5;
    messages.push(`Purchased ${quantity} oil for ${cost} treasury. Petrovia warms to a paying customer.`);
  } else if (decision === 'subsidize') {
    s.treasury -= 8; s.approval += 5; demand += 2; s.subsidyDays += 1;
    messages.push('Fuel subsidy approved. Drivers celebrate cheap fuel by driving more.');
    if (s.subsidyDays >= 2 && s.oil < demand) {
      s.approval -= 3;
      messages.push('Repeated subsidies expose the supply problem. Queues become a nightly news fixture: approval -3.');
    }
  } else if (decision === 'ration') {
    demand = 3; s.approval -= 4;
    messages.push('Rationing cuts demand to 3. Your approval falls 4. The presidential limo exemption trends immediately.');
  } else if (decision === 'threaten') {
    s.approval += 2; s.relations -= 15;
    messages.push('Your tough speech wins 2 approval. Petrovia’s leader takes it personally: relations -15.');
  } else {
    messages.push(announcement?'A public announcement was released. Its claims do not enact policy.':campaign?'You address a campaign promise. No literal fulfillment is assumed.':sterling?'You meet Max Sterling of Volt Motors and J.com.':diplomacy ? 'Diplomatic talks conclude without a shipment today.' : 'The cabinet forms a committee to consider forming a committee.');
  }
  if (diplomacy?.reply === 'apologize') {
    s.relations += 10; s.approval -= 2;
    messages.push('You offer a face-saving apology. Relations +10; domestic approval -2.');
  } else if (diplomacy?.reply === 'reassure') {
    s.relations += 5;
    messages.push('You offer a calmer relationship. Relations +5.');
  }
  if(diplomacy?.reply==='challenge'){s.relations-=3;messages.push('You challenge the markup. Relations -3; Petrov will review the price.');}
  if(diplomacy?.reply==='give_credit'){s.relations+=8;s.approval-=1;messages.push('You give Petrov public credit. Relations +8; approval -1.');}
  if (!day && decision !== 'subsidize') s.subsidyDays = 0;
  s.relations = clamp(s.relations, -100, 100);
  const nextPrice = s.relations <= -15 ? 4 : s.relations >= 15 ? 1 : 2;
  if (nextPrice !== s.price) messages.push(`Petrovia sets tomorrow’s oil price to ${nextPrice} per unit in response to relations.`);
  s.price = nextPrice;
  if(sterling?.reply==='fund'){s.treasury-=sterling.offer.cost;messages.push(`Paid ${sterling.offer.cost} treasury for Max Sterling’s three-day electric-bus pilot.`);}
  if(sterling?.reply==='humiliate'){s.approval+=2;messages.push('You puncture Max’s publicity stunt. Approval +2; Max takes it personally.');}
  if(sterling?.reply==='fund'||pilotDaysLeft(world)>0){demand=Math.max(0,demand-2);messages.push('Volt Motors pilot buses reduce today’s oil demand by 2.');}
  if(campaign?.kind==='decision'){
    if(campaign.action==='pilot'){s.treasury-=6;messages.push('A feasibility study receives 6 treasury. No promised outcome has been delivered.');}
    if(campaign.action==='clarify'){s.approval-=1;messages.push('You clarify the claim. Approval -1.');}
    if(campaign.action==='withdraw'){s.approval-=3;messages.push('You withdraw the promise. Approval -3.');}
    if(campaign.action==='double_down'){const repeated=world.events.some(e=>e.campaign?.kind==='decision'&&e.campaign.index===campaign.index&&e.campaign.action==='double_down');s.approval+=repeated?-2:1;messages.push(repeated?'Repeated rhetoric without delivery costs 2 approval.':'The renewed promise wins 1 approval. It remains undelivered.');}
  }
  if(newsResponse){const option=newsOptions(world,newsResponse.newsId).find(o=>o.id===newsResponse.action)!;s.treasury-=option.cost;s.approval+=newsResponse.action==='relief'?2:newsResponse.action==='mediate'?1:0;messages.push(`PNN bulletin response: ${option.title}. ${option.hint}`);}
  if(security){
    if(security.reply==='humanitarian_corridor'){s.treasury-=4;s.approval+=2;messages.push('Freedoma funds a monitored humanitarian corridor for the Lydian Strip. Volkov wanted a strike; the cabinet chooses protection and oversight.');}
    if(security.reply==='international_monitor'){s.treasury-=2;s.approval+=1;messages.push('Freedoma calls for international monitors and published evidence before escalation.');}
    if(security.reply==='limited_defense'){s.treasury-=8;s.approval-=4;messages.push('Freedoma offers limited defensive support under public oversight. No attack or battlefield operation is simulated.');}
    if(security.reply==='reject_attack'){s.approval+=2;messages.push('Freedoma rejects the attack request and demands civilian protection. Volkov calls the decision cowardice on live television.');}
  }
  if(day){
    s.approval=clamp(s.approval,0,100);
    const event:WorldEvent=Object.freeze({timing:'day-action',...(announcement?{announcement}:{}),...(newsResponse?{newsResponse}:{}),...(campaign?{campaign}:{}),...(sterling?{sterling}:{}),...(diplomacy?{diplomacy}:{}),...(security?{security}:{}),id:world.events.length+1,decision,messages:Object.freeze([...messages,'Decision recorded. Daily consumption and revenue wait until End day.']),after:Object.freeze(s)});
    return freezeWorld(s,[...world.events,event]);
  }
  const news=withNews?worldEventEngine.next(world):undefined;
  if(news)messages.push(`PNN: ${news.headline}. No automatic resource change; a response is available.`);
  const used = Math.min(s.oil, demand);
  const shortage = demand - used;
  s.oil -= used;
  messages.push(`Citizens consume ${used} oil against demand of ${demand}.`);
  if (shortage > 0) {
    s.approval -= shortage * 3;
    messages.push(`Shortage: ${shortage} oil. Approval -${shortage * 3}. Protesters arrive carrying empty fuel cans.`);
  } else {
    s.approval += 1;
    messages.push('Demand is met. Approval +1. The Department of Energy takes full credit.');
  }
  s.supplierOil += 4;
  messages.push('Petrovia produces 4 oil. Your treasury receives 3 in daily revenue.');
  s.treasury += 3;
  s.approval = clamp(s.approval, 0, 100);
  s.day += 1;
  const event: WorldEvent = Object.freeze({ ...(announcement?{announcement}:{}), ...(news?{news}:{}), ...(newsResponse?{newsResponse}:{}), ...(campaign?{campaign}:{}), ...(sterling?{sterling}:{}), ...(diplomacy ? { diplomacy } : {}), ...(security?{security}:{}), id: world.events.length + 1, decision,
    messages: Object.freeze(messages), after: Object.freeze({ ...s }) });
  return freezeWorld(s, [...world.events, event]);
}
export function replay(events: readonly WorldEvent[]): World {
  let world = createWorld();
  for (const event of events) {
    world = event.strategic&&event.strategic.command.kind!=='overnight'?applyStrategic(world,event.strategic.command):event.cabinetAssignment?assignCabinetPromise(world,event.cabinetAssignment.index,event.cabinetAssignment.secretaryId):event.congress?(event.congress.kind==='founding'?seatCongress(world,event.congress.seed):actInCongress(world,event.congress.index,event.congress.chamber,event.congress.action,event.congress.text)):event.agenda?(event.agenda.kind==='start'?beginDay(world):endDay(world,!!event.treasuryDeposit)):event.announcement?publishAnnouncement(world,event.announcement.text,!!event.news,false):event.newsResponse?respondToNews(world,event.newsResponse.newsId,event.newsResponse.action,!!event.news,false):event.campaign?(event.campaign.kind==='launch'?startPresidency(world,event.campaign.promises,event.campaign.president):decidePromise(world,event.campaign.index,event.campaign.action,event.campaign.line,!!event.news,false)):event.sterling?replyToMax(world,event.sterling.reply,event.sterling.offer.id,event.sterling.offer.strategy,event.sterling.spokenLine,event.sterling.playerLine,!!event.news,false,event.timing==='conversation'):event.security?replyToVoss(world,event.security.reply,event.security.offer.id,event.security.offer.strategy,event.security.spokenLine,event.security.playerLine,!!event.news,false,event.timing==='conversation'):event.diplomacy ? replyToPetrov(world, event.diplomacy.reply, event.diplomacy.offer.id, event.diplomacy.offer.strategy, event.diplomacy.spokenLine, event.diplomacy.chosenLine,!!event.news,false,event.timing==='conversation',event.diplomacy.requestedQuantity,event.diplomacy.requestedUnitPrice) : decide(world, event.decision,!!event.news,false);
    if (JSON.stringify(world.events.at(-1)) !== JSON.stringify(event)) throw new Error('Event does not match the simulation rules.');
  }
  return world;
}
