import {congressRules} from '../congress/congress.ts';
import {presidentFor} from './president.ts';
import type {PresidentName} from './president.ts';
import type {World} from '../../../shared/schemas/oil-crisis.ts';
export type PromiseAction='clarify'|'pilot'|'withdraw'|'double_down';
export type CampaignRecord={kind:'launch';promises:readonly string[];president?:PresidentName}|{kind:'decision';index:number;action:PromiseAction;line:string};
export class CampaignRules {
 validatePromises(value:unknown):readonly string[]{if(!Array.isArray(value)||value.length!==3||value.some(p=>typeof p!=='string'||p.trim().length<5||p.trim().length>240)||new Set(value.map(p=>p.trim().toLowerCase())).size!==3)throw Error('Write three different promises, each between 5 and 240 characters.');return Object.freeze(value.map(p=>p.trim()));}
 promises(world:World){return world.events.find(e=>e.campaign?.kind==='launch')?.campaign as Extract<CampaignRecord,{kind:'launch'}>|undefined;}
 options(world:World,index:number){const promise=this.promises(world)?.promises[index];if(!promise)throw Error('Unknown campaign promise');const history=world.events.filter(e=>e.campaign?.kind==='decision'&&e.campaign.index===index);const last=history.at(-1)?.campaign as Extract<CampaignRecord,{kind:'decision'}>|undefined;
 return ([{id:'clarify',title:'Clarify what you meant',hint:'Approval -1. Commission a reality check, without funding delivery.',cost:0},{id:'pilot',title:'Fund a feasibility study',hint:'Pay 6 treasury. Study a realistic version; the promise is not fulfilled.',cost:6},{id:'withdraw',title:'Withdraw the promise',hint:'Approval -3. Admit it will not be delivered.',cost:0},{id:'double_down',title:'Repeat the promise publicly',hint:'Approval +1 initially; repeating it costs 2 approval. No delivery.',cost:0}] as const).filter(o=>o.id!==last?.action&&!(last?.action==='withdraw'&&o.id==='withdraw')).map(o=>({...o,blocked:world.state.treasury<o.cost?'Not enough treasury.':null}));
 }
 context(world:World){const launch=this.promises(world);return {president:presidentFor(world),congress:congressRules.context(world),announcements:world.events.filter(e=>e.announcement).slice(-8).map(e=>({day:e.after.day-(e.timing==='day-action'?0:1),text:e.announcement!.text})),dayLoop:'Decisions occur within a daily agenda. Only End day advances time and processes fuel consumption and daily revenue.',announcementRule:'Announcements are public claims, not enacted policy. React to the latest statement in character and contrast claims with actual outcomes.',promises:launch?.promises??[],history:world.events.filter(e=>e.campaign?.kind==='decision').map(e=>({day:e.after.day,...e.campaign})),reality:'Promises are campaign claims, never facts. Studies are not delivery. Magic/unicorns cannot literally exist. Separate feasible substitutes from promises.'};}
}
export const campaignRules=new CampaignRules();
