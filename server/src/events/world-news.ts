import {strategicPublicContext} from '../diplomacy/strategic.ts';
import type {World} from '../../../shared/schemas/oil-crisis.ts';
export interface NewsBulletin {id:string;kind:string;day:number;headline:string;facts:string;stakes:string}
export interface NewsResponse {newsId:string;action:'monitor'|'mediate'|'relief'}
export interface WorldEventDefinition {id:string;headline:string;facts:string;stakes:string}
export class WorldEventEngine {
 private definitions:WorldEventDefinition[]=[];
 register(definition:WorldEventDefinition){if(this.definitions.some(d=>d.id===definition.id))throw Error('Duplicate world event');this.definitions.push(Object.freeze({...definition}));return this;}
 next(world:World):NewsBulletin|undefined {
  const day=world.state.day+1;if(day<2||(day-2)%3!==0||!this.definitions.length)return;
  const seed=JSON.stringify(world.events.find(e=>e.campaign?.kind==='launch')?.campaign??'freedoma')+':'+day+':'+world.events.filter(e=>!e.cabinetAssignment&&(!e.strategic||e.strategic.reports.length)).length;
  let hash=2166136261;for(const char of seed){hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;}
  const last=world.events.findLast(e=>e.news)?.news;const pool=this.definitions.filter(d=>d.id!==last?.kind);const chosen=(pool.length?pool:this.definitions)[hash%(pool.length||this.definitions.length)];
  return Object.freeze({id:`pnn-${day}-${chosen.id}`,kind:chosen.id,day,headline:chosen.headline,facts:chosen.facts,stakes:chosen.stakes});
 }
 context(world:World){return {strategic:strategicPublicContext(world),bulletins:world.events.filter(e=>e.news).slice(-5).map(e=>e.news),responses:world.events.filter(e=>e.newsResponse).slice(-8).map(e=>({day:e.after.day,...e.newsResponse})),rule:'PNN reports recorded events only. Border disputes are not invasions. Risks are not completed outcomes. No automatic import loss or currency collapse. Responses are bounded actions, not guaranteed resolutions.'};}
}
export const worldEventEngine=new WorldEventEngine()
 .register({id:'trade_war',headline:'TARIFFS FLY AS TWO TRADING BLOCS ESCALATE DISPUTE',facts:'The fictional states of Bellara and Eastmere announce reciprocal tariffs on industrial goods. Freedoma is not a party to these tariffs.',stakes:'Infrastructure suppliers warn of possible delays. No Freedoman shipment has been canceled.'})
 .register({id:'border_dispute',headline:'NEIGHBORS CLOSE BORDER CROSSING AFTER TERRITORIAL DISPUTE',facts:'Bellara and Northhaven close one disputed border crossing. Talks have stalled. No invasion or attack on Freedoma has occurred.',stakes:'Petrov faces questions about regional security. Mediation may improve confidence, but cannot guarantee peace.'})
 .register({id:'shipping',headline:'PORT STRIKE HOLDS UP REGIONAL FREIGHT',facts:'Dockworkers in Eastmere announce a strike over wages. Regional cargo queues grow; Freedoma’s existing reserves remain available.',stakes:'Businesses seek contingency plans. Relief funding supports preparation, not instant cargo delivery.'})
 .register({id:'currency_talks',headline:'FOREIGN TRADE FORUM FLOATS ALTERNATIVE SETTLEMENT CURRENCY',facts:'Regional officials propose a pilot currency for cross-border trade. It is a proposal, not an implemented replacement or transfer of oil ownership.',stakes:'Petrov and Max may see leverage or business opportunities. Freedoma’s treasury and oil ownership are unchanged.'});
export function newsOptions(world:World,newsId:string){const bulletin=world.events.find(e=>e.news?.id===newsId)?.news;if(!bulletin)throw Error('Unknown PNN bulletin');if(world.events.some(e=>e.newsResponse?.newsId===newsId))return [];
 return [{id:'monitor' as const,title:'Request verified updates',hint:'No direct cost or diplomacy change. Normal daily consumption continues.',cost:0},{id:'mediate' as const,title:'Offer diplomatic coordination',hint:'Pay 2 treasury; approval +1. Opens talks, but does not resolve the dispute.',cost:2},{id:'relief' as const,title:'Fund domestic contingency planning',hint:'Pay 6 treasury; approval +2. Funds preparation, not guaranteed deliveries.',cost:6}].map(o=>({...o,blocked:world.state.treasury<o.cost?'Not enough treasury.':null}));
}
