import {congressRules} from '../congress/congress.ts';
import type {World,WorldEvent} from '../../../shared/schemas/oil-crisis.ts';
export interface AgendaTask {id:string;title:string;reason:string;panel:string;subject?:string}
export type AgendaRecord={kind:'start';tasks:readonly AgendaTask[]}|{kind:'end'};
export interface AgendaRule {id:string;task(world:World):AgendaTask|undefined;completed(task:AgendaTask,events:readonly WorldEvent[]):boolean}
export function activeDay(world:World){const index=world.events.findLastIndex(e=>e.agenda?.kind==='start');if(index<0||world.events.slice(index+1).some(e=>e.agenda?.kind==='end'))return undefined;const record=world.events[index].agenda as Extract<AgendaRecord,{kind:'start'}>;return {record,index,events:world.events.slice(index+1)};}
export class AgendaEngine {
 private rules=new Map<string,AgendaRule>();
 register(rule:AgendaRule){if(this.rules.has(rule.id))throw Error('Duplicate agenda rule');this.rules.set(rule.id,rule);return this;}
 plan(world:World){return [...this.rules.values()].flatMap(rule=>{const task=rule.task(world);return task?[Object.freeze({...task,id:rule.id})]:[];});}
 tasks(world:World){const day=activeDay(world);return day?day.record.tasks.map(task=>({...task,done:this.rules.get(task.id)?.completed(task,day.events)??false})):[];}
}
const pilotActive=(world:World)=>{const event=world.events.findLast(e=>e.sterling?.reply==='fund');return !!event&&world.state.day-(event.after.day-(event.timing==='day-action'?0:1))<3;};
export const agendaEngine=new AgendaEngine()
 .register({id:'public',task:world=>({id:'public',title:'Attend the press briefing',reason:world.state.approval<40?'Voters need an answer. Address a promise, announce a decision, or release a statement.':'Set today’s public direction: address a promise, choose a policy, or release an announcement.',panel:'press'}),completed:(_task,events)=>events.some(e=>e.announcement||e.campaign?.kind==='decision'||(!e.diplomacy&&!e.sterling&&!e.newsResponse&&!e.agenda&&!e.congress&&e.timing==='day-action'))})
 .register({id:'petrov',task:world=>world.state.oil<12||world.state.relations<0||world.state.day%3===0?{id:'petrov',title:'Work with Petrov',reason:world.state.oil<12?'Fuel reserves need attention. Negotiate a shipment or explicitly decide how to leave the talks.':'Diplomatic tensions need a response. Settle on a position or decline the deal.',panel:'phone'}:undefined,completed:(_task,events)=>events.some(e=>e.diplomacy&&!['counter','ask_needs','challenge'].includes(e.diplomacy.reply))})
 .register({id:'max',task:world=>!pilotActive(world)&&(world.state.day===1||world.state.day%5===0||(world.state.oil<12&&world.state.treasury>=12))?{id:'max',title:'Call Max Sterling',reason:'Consider his bus proposal. Ask questions, then fund it, reject it, or call out his publicity stunt.',panel:'max'}:undefined,completed:(_task,events)=>events.some(e=>e.sterling&&['fund','decline','humiliate'].includes(e.sterling.reply))})
 .register({id:'news',task:world=>{const bulletin=world.events.findLast(e=>e.news&&!world.events.some(r=>r.newsResponse?.newsId===e.news!.id))?.news;return bulletin?{id:'news',title:'Respond to the PNN briefing',reason:bulletin.headline,panel:'news',subject:bulletin.id}:undefined;},completed:(task,events)=>events.some(e=>e.newsResponse?.newsId===task.subject)});

agendaEngine.register({id:'congress',task:world=>congressRules.seed(world)&&world.state.day%3===0&&congressRules.promises(world).some((_,i)=>!congressRules.bill(world,i).authorized)?{id:'congress',title:'Work with Congress',reason:'Move a campaign promise forward: submit a proposal, improve it, or call a chamber’s vote.',panel:'congress'}:undefined,completed:(_task,events)=>events.some(e=>e.congress?.kind==='action')});
