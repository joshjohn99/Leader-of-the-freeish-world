import type {World} from '../../../shared/schemas/oil-crisis.ts';
import {cabinetMember} from '../agents/cabinet-members.ts';
import {campaignRules} from '../campaign/campaign.ts';
import {congressRules,chambers} from '../congress/congress.ts';
import type {Chamber,CongressAction} from '../congress/congress.ts';

export interface CabinetAssignment {readonly index:number;readonly secretaryId:string}
export function validatePromiseIndex(world:World,index:unknown):number {
 if(!Number.isInteger(index)||typeof index!=='number'||!campaignRules.promises(world)?.promises[index])throw Error('Choose a recorded campaign promise.');
 return index;
}
export function validateAssignment(world:World,index:unknown,secretaryId:unknown):CabinetAssignment {
 const validIndex=validatePromiseIndex(world,index);
 if(typeof secretaryId!=='string')throw Error('Choose a cabinet secretary.');
 return {index:validIndex,secretaryId:cabinetMember(secretaryId).id};
}
export function promiseOwner(world:World,index:number){
 const assignment=world.events.findLast(e=>e.cabinetAssignment?.index===index)?.cabinetAssignment;
 return assignment?cabinetMember(assignment.secretaryId):undefined;
}
export interface PromiseNextStep {title:string;action?:CongressAction;chamber:Chamber;cost:number;blocked:string|null}
export function promiseGuidance(world:World,index:number){
 validatePromiseIndex(world,index);
 const bill=congressRules.bill(world,index),seated=!!congressRules.seed(world);
 const last=world.events.findLast(e=>e.campaign?.kind==='decision'&&e.campaign.index===index)?.campaign;
 const withdrawn=last?.kind==='decision'&&last.action==='withdraw';
 const introduced=congressRules.records(world,index).length>0;
 const status=bill.authorized?'Fulfilled':withdrawn?'Withdrawn':bill.passed.length?'One chamber approved':introduced?'Negotiating':'No bill yet';
 const votes=seated?chambers.map(c=>({chamber:c.id,name:c.name,...congressRules.tally(world,index,c.id),passed:bill.passed.includes(c.id),lastVote:congressRules.voteReport(world,index,c.id)})):[];
 const remaining=votes.filter(v=>!v.passed);
 const ready=remaining.find(v=>v.canPass);
 const chamber=ready?.chamber??remaining[0]?.chamber??'house';
 const options=seated?congressRules.options(world,index,chamber).filter(o=>o.id!=='draft'):[];
 const dailyBlocked=world.state.day>30?'Your term has ended.':world.events.some(e=>e.congress?.kind==='action'&&e.after.day===world.state.day)?'Today’s congressional action is complete. Continue tomorrow.':null;
 let blocker=bill.authorized?'Both chambers approved this promise.':withdrawn?'You publicly withdrew this promise. Reconsider that commitment before pursuing it.':!introduced?'This promise has not been introduced as a bill.':remaining.map(v=>v.canPass?`${v.name} has a projected majority; a recorded vote is still needed.`:`${v.name} needs ${v.needed-v.yes} more projected yes votes.`).join(' ');
 let next:PromiseNextStep;
 if(bill.authorized||withdrawn)next={title:bill.authorized?'Review approved bill':'Review withdrawn promise',chamber,cost:0,blocked:null};
 else if(!introduced)next={title:'Introduce this promise as a bill',action:'introduce',chamber:'house',cost:0,blocked:dailyBlocked};
 else {
  const concessions=options.filter(o=>['costing','benefits','oversight'].includes(o.id));
  const option=ready?options.find(o=>o.id==='vote'):concessions.find(o=>o.cost<=world.state.treasury)??concessions[0]??options.find(o=>o.id==='vote');
  next=option?{title:option.title,action:option.id,chamber,cost:option.cost,blocked:option.blocked}:{title:'Review congressional record',chamber,cost:0,blocked:dailyBlocked};
 }
 if(next.blocked)blocker+=` ${next.blocked}`;
 if(bill.passed.length&&!bill.authorized&&next.action&&['costing','benefits','oversight'].includes(next.action))blocker+=' Changing conditions reopens the earlier approval.';
 return {index,promise:bill.promise,owner:promiseOwner(world,index),status,withdrawn,fulfilled:bill.authorized,blocker,next,votes,amendments:bill.amendments,options};
}
export function cabinetPromiseOverview(world:World){
 return (campaignRules.promises(world)?.promises??[]).map((_,index)=>promiseGuidance(world,index));
}
