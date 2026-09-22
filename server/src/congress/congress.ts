import type {World} from '../../../shared/schemas/oil-crisis.ts';
export const chambers=[{id:'house',name:'People’s House',description:'Freedoma’s House of Representatives',seats:100},{id:'senate',name:'Council of States',description:'Freedoma’s Senate',seats:20}] as const;
export type Chamber='house'|'senate';
export type CongressAction='introduce'|'draft'|'costing'|'benefits'|'oversight'|'vote';
export type CongressRecord={kind:'founding';seed:number}|{kind:'action';index:number;chamber:Chamber;action:CongressAction;text?:string;passed?:boolean};
export const caucuses=[
 {id:'banner',party:'Banner Party',house:'Gwen Holt',senate:'Arthur Pike',priority:'National pride, local benefits and visible results'},
 {id:'workbench',party:'Workbench Party',house:'Milo Grant',senate:'June Ellis',priority:'Practical delivery, credible funding and useful services'},
 {id:'free',party:'Free Agents',house:'Tess Quinn',senate:'Sam Mercer',priority:'Evidence, oversight and a plan that survives basic questions'},
] as const;
const hash=(s:string)=>{let n=2166136261;for(const c of s)n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;};
export class CongressRules {
 seed(world:World){return world.events.find(e=>e.congress?.kind==='founding')?.congress as Extract<CongressRecord,{kind:'founding'}>|undefined;}
 promises(world:World){const event=world.events.find(e=>e.campaign?.kind==='launch');return event?.campaign?.kind==='launch'?event.campaign.promises:[];}
 records(world:World,index:number){return world.events.flatMap(e=>e.congress?.kind==='action'&&e.congress.index===index?[e.congress]:[]);}
 bill(world:World,index:number){const promise=this.promises(world)[index];if(promise===undefined)throw Error('Unknown campaign promise');const records=this.records(world,index);const lastAmendment=records.findLastIndex(r=>['costing','benefits','oversight'].includes(r.action));const votes=records.slice(lastAmendment+1);return {index,promise,proposal:records.find(r=>r.action==='draft')?.text,amendments:records.filter(r=>['costing','benefits','oversight'].includes(r.action)).map(r=>r.action),passed:chambers.filter(c=>votes.some(r=>r.chamber===c.id&&r.action==='vote'&&r.passed)).map(c=>c.id),authorized:chambers.every(c=>votes.some(r=>r.chamber===c.id&&r.action==='vote'&&r.passed))};}
 tally(world:World,index:number,chamber:Chamber){if(!chambers.some(c=>c.id===chamber))throw Error('Unknown chamber');const seed=this.seed(world);if(!seed)throw Error('Congress is not seated');const bill=this.bill(world,index),orientation=hash(`${seed.seed}:${index}:tilt`)%2?1:-1,tilt=(chamber==='house'?1:-1)*orientation*10;
 const voices=caucuses.map((c,i)=>{let support=35+hash(`${seed.seed}:${index}:${chamber}:${c.id}`)%21+tilt;
 if(bill.amendments.includes('costing'))support+=[8,12,10][i];if(bill.amendments.includes('benefits'))support+=[14,10,6][i];if(bill.amendments.includes('oversight'))support+=[8,8,16][i];support=Math.min(95,support);
 const seats=(chamber==='house'?[40,35,25]:[8,7,5])[i];return {...c,name:c[chamber],support,seats,yes:Math.round(seats*support/100)};});
 const seats=chamber==='house'?100:20,yes=voices.reduce((n,v)=>n+v.yes,0);return {voices,yes,seats,needed:Math.floor(seats/2)+1,canPass:yes>seats/2};
 }
 options(world:World,index:number,chamber:Chamber){const bill=this.bill(world,index);this.tally(world,index,chamber);const acted=world.events.some(e=>e.after.day===world.state.day&&e.congress?.kind==='action');const options=[
 {id:'costing' as const,title:'Add a costed implementation plan',hint:'Pay 4 treasury for budget and feasibility work. Wins practical and fiscal support. Amendments reopen prior votes.',cost:4},
 {id:'benefits' as const,title:'Add local benefit requirements',hint:'Pay 3 treasury for a regional impact assessment. Wins local and national-interest support. Amendments reopen prior votes.',cost:3},
 {id:'oversight' as const,title:'Accept independent oversight',hint:'Pay 2 treasury to design reporting and accountability. Reassures skeptical members. Amendments reopen prior votes.',cost:2},
 {id:'vote' as const,title:'Call this chamber’s vote',hint:'No direct cost. A recorded majority passes this chamber; both chambers must approve.',cost:0},
 ] .filter(o=>!bill.amendments.includes(o.id)&&!(o.id==='vote'&&bill.passed.includes(chamber)));
 // Retain the old draft action for saved-history replay; the UI negotiates the promise directly.
 const legacyDraft={id:'draft' as const,title:'Submit a practical proposal',hint:'Describe a feasible plan connected to this promise. Submission does not fulfill it.',cost:0};
 const allOptions=[...(this.records(world,index).length?[]:[{id:'introduce' as const,title:'Introduce this promise as a bill',hint:'Put this campaign promise before both chambers. No treasury cost; uses today’s congressional action.',cost:0}]),...(bill.proposal?options:[...options,legacyDraft])];
 return allOptions.map(o=>({...o,blocked:world.state.day>30?'Your term has ended.':bill.authorized?'Both chambers approved this promise.':acted?'Today’s congressional action is complete. Continue tomorrow.':world.state.treasury<o.cost?'Not enough treasury.':null}));
 }
 voteReport(world:World,index:number,chamber:Chamber){
  const eventIndex=world.events.findLastIndex(e=>e.congress?.kind==='action'&&e.congress.index===index&&e.congress.chamber===chamber&&e.congress.action==='vote');
  if(eventIndex<0)return undefined;
  const event=world.events[eventIndex];const before={state:world.events[eventIndex-1].after,events:world.events.slice(0,eventIndex)};
  const tally=this.tally(before,index,chamber),bill=this.bill(before,index);
  const preferred={banner:'benefits',workbench:'costing',free:'oversight'} as const;
  const concerns={benefits:'local benefits and a clear return for their districts',costing:'credible costs and a delivery budget',oversight:'independent oversight and public accountability'};
  const voices=tally.voices.map(v=>({...v,no:v.seats-v.yes,reason:!bill.amendments.includes(preferred[v.id])?`Members are still seeking ${concerns[preferred[v.id]]}.`:'Some members remain unconvinced by the overall package; other concessions can help.'}));
  return {day:event.after.day,passed:event.congress?.kind==='action'&&event.congress.passed===true,...tally,voices,shortfall:Math.max(0,tally.needed-tally.yes),changedSinceVote:this.bill(world,index).amendments.length!==bill.amendments.length};
 }
 context(world:World){if(!this.seed(world))return {seated:false};return {seated:true,bills:this.promises(world).map((_,i)=>this.bill(world,i)),rule:'Bills are proposals. Both chambers approve the SAME plan. Both chambers passing the same practical plan counts as promise fulfillment on the game scorecard. It does not create resources or make magic real. Impossible original promises remain impossible. Prep costs do not implement the proposal.'};}
}
export const congressRules=new CongressRules();
