import {congressRules} from '../congress/congress.ts';
import type {World} from '../../../shared/schemas/oil-crisis.ts';
import {campaignRules} from '../campaign/campaign.ts';
export const TERM_DAYS=30;
const clamp=(v:number)=>Math.max(0,Math.min(100,v));
export class ElectionRules {
 finished(world:World){return world.state.day>TERM_DAYS;}
 scorecard(world:World){return (campaignRules.promises(world)?.promises??[]).map((text,index)=>{
  const records=world.events.flatMap(e=>e.campaign?.kind==='decision'&&e.campaign.index===index?[e.campaign]:[]);
  const last=records.at(-1);
  const fulfilled=!!congressRules.seed(world)&&congressRules.bill(world,index).authorized;
  const status=fulfilled?'Fulfilled · approved by Congress':last?.action==='withdraw'?'Withdrawn':last?.action==='pilot'?'Under study':last?.action==='clarify'?'Clarified':last?.action==='double_down'?'Repeated, not delivered':'Unaddressed';
  const credibility=fulfilled?6:last?.action==='withdraw'?-5:last?.action==='pilot'?2:last?.action==='clarify'?1:last?.action==='double_down'?-3:world.state.day>10?-2:0;
  return {text,status,credibility};
 });}
 snapshot(world:World){
  // Older saves may contain later days; freeze their ballot at the first deadline.
  const cutoff=world.events.findIndex(e=>e.after.day>TERM_DAYS);
  if(cutoff>=0)world={state:world.events[cutoff].after,events:world.events.slice(0,cutoff+1)};
  const promises=this.scorecard(world),credibility=promises.reduce((sum,p)=>sum+p.credibility,0);
  // Bounded record effects prevent farming one tactic for unlimited votes.
  const count=(test:(e:World['events'][number])=>boolean)=>Math.min(4,world.events.filter(test).length);
  const approval=world.state.approval;
  const threat=count(e=>e.decision==='threaten');
  const studies=count(e=>e.campaign?.kind==='decision'&&e.campaign.action==='pilot');
  const deals=count(e=>e.diplomacy?.reply==='accept');
  const buses=count(e=>e.sterling?.reply==='fund');
  const mediation=count(e=>e.newsResponse?.action==='mediate');
  const fiscal=world.state.treasury<15?-5:world.state.treasury>=40?2:0;
  const blocs=[
   {id:'banner',name:'Banner Party',share:35,color:'#a35d42',priority:'Strength, national pride, and a president who looks in charge.',support:clamp(Math.round(18+approval*.66+threat*2+credibility*.5))},
   {id:'workbench',name:'Workbench Party',share:35,color:'#397f83',priority:'Working services, practical investment, and fewer empty promises.',support:clamp(Math.round(12+approval*.72+studies+buses*2+deals+credibility))},
   {id:'free',name:'Free Agents',share:30,color:'#82709e',priority:'Results, credibility, and whether life is getting easier.',support:clamp(Math.round(8+approval*.78+mediation+fiscal+credibility*1.5))},
  ];
  const vote=Math.round(blocs.reduce((sum,b)=>sum+b.support*b.share/100,0)*10)/10;
  const finished=this.finished(world);
  return {blocs,promises,vote,finished,won:finished&&vote>50,remaining:Math.max(0,TERM_DAYS-world.state.day+1),phase:finished?'Election night':world.state.day<=10?'The honeymoon':world.state.day<=20?'The receipts':'Election season'};
 }
}
export const electionRules=new ElectionRules();
