import type { World } from '../../../shared/schemas/oil-crisis.ts';
export type MaxReply='fund'|'praise'|'guarantees'|'humiliate'|'decline';
export interface MaxOffer {id:string;strategy:'hype'|'discount'|'guarded';cost:number;line:string}
export interface MaxRecord {offer:MaxOffer;reply:MaxReply;playerLine:string;spokenLine?:string}
export function pilotDaysLeft(world:World){const deal=world.events.findLast(e=>e.sterling?.reply==='fund');return deal?Math.max(0,3-(world.state.day-(deal.after.day-(deal.timing==='day-action'?0:1)))):0;}
export function maxCandidates(world:World):MaxOffer[]{
 const last=world.events.findLast(e=>e.sterling)?.sterling;
 const strategies:MaxOffer['strategy'][]=last?.reply==='praise'?['discount']:last?.reply==='guarantees'?['guarded']:last?.reply==='humiliate'?['hype','guarded']:['hype','discount'];
 return strategies.map(strategy=>({id:`max-${world.events.length}-${strategy}`,strategy,cost:strategy==='discount'?12:strategy==='guarded'?20:18,line:pilotDaysLeft(world)>0?'The buses are running. I am calling this a mobility revolution. My photographer is calling it overtime.':strategy==='guarded'?'You asked for guarantees. Fine: a small working bus pilot, a real delivery schedule, and a very boring photo. Boring costs extra.':strategy==='discount'?'I can make the pilot cheaper if you stop looking at me like an audit. Think of the headlines. Mostly the ones with my name.':last?.reply==='humiliate'?'Your little joke is trending. So am I. We could turn this feud into a bus launch, if your ego fits through the doors.':'President! I announced we are fixing your fuel crisis together. Huge response. We should probably discuss what we are doing.'}));
}
export function maxTurn(world:World,strategy:unknown=maxCandidates(world)[0].strategy){const offer=maxCandidates(world).find(o=>o.strategy===strategy);if(!offer)throw Error('Invalid Max strategy');return Object.freeze(offer);}
export function maxReplies(world:World,offer=maxTurn(world)){
 const last=world.events.findLast(e=>e.sterling)?.sterling;
 const options:{id:MaxReply;title:string;line:string;hint:string;blocked:string|null}[]=[];
 if(!pilotDaysLeft(world))options.push({id:'fund',title:'Fund the electric-bus pilot',line:'You get your launch. I want actual buses at it.',hint:`Pay ${offer.cost} treasury. Reduce oil demand by 2 for 3 days, starting today.`,blocked:world.state.treasury<offer.cost?'Not enough treasury.':null});
 if(last?.reply!=='praise')options.push({id:'praise',title:'Feed his ego, not his invoice',line:'Max, this could be your finest contribution since inventing your own job title.',hint:'No payment. Opens another pitch; attention may buy a discount.',blocked:null});
 if(offer.strategy!=='guarded'&&!pilotDaysLeft(world))options.push({id:'guarantees',title:'Demand buses before the victory lap',line:'Show me a delivery plan. A trending topic cannot carry commuters.',hint:'No payment. Next pitch has firm terms, at a higher cost.',blocked:null});
 options.push({id:'humiliate',title:'Puncture the publicity balloon',line:'The only thing you have delivered so far is a press release.',hint:'Approval +2. He remembers the insult and loses interest in discounts.',blocked:null});
 options.push({id:'decline',title:'Decline the partnership',line:'No deal. Please stop describing us as co-founders.',hint:'No payment. Max takes the rejection to J.com.',blocked:null});
 return options;
}
