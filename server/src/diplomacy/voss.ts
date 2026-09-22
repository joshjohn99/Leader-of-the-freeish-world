import type { World, Decision } from '../../../shared/schemas/oil-crisis.ts';

export type VossReplyId = 'reject_attack'|'humanitarian_corridor'|'international_monitor'|'limited_defense'|'ask_evidence'|'decline_call';
export interface VossOffer { readonly strategy:'urgent'|'reassuring'|'pressuring'; readonly id:string; readonly mood:string; readonly line:string; readonly motive:string; }
export interface VossRecord { readonly offer:VossOffer; readonly reply:VossReplyId; readonly playerLine:string; readonly spokenLine?:string; }
export interface VossReply { id:VossReplyId; title:string; line:string; hint:string; blocked:string|null; decision:Decision; }

function base(world:World):VossOffer {
  const last=world.events.findLast(e=>e.security)?.security?.reply;
  const strategy:VossOffer['strategy']=last==='humanitarian_corridor'||last==='international_monitor'?'reassuring':last==='reject_attack'?'pressuring':'urgent';
  const line=strategy==='pressuring'
    ? 'President, you called for restraint. Meanwhile the Lydian Strip remains a launch point for people who want Karmenia frightened forever. Will Freedoma help us stop waiting?'
    : strategy==='reassuring'
      ? 'Your proposal for monitors and a protected aid route is politically tidy. I can work with it, but I still need you to recognize Karmenia’s security fear in public.'
      : 'I am asking Freedoma to join Karmenia in a military response against the Lydian Strip. If we do nothing, the next attack will be presented as our fault for being patient.';
  return Object.freeze({strategy,id:`voss-${world.events.length}-${world.state.day}-${strategy}`,mood:strategy==='urgent'?'Urgent and accusatory':strategy==='pressuring'?'Testing your resolve':'Looking for a face-saving exit',motive:'Voss wants security support while preserving Karmenia’s domestic standing.',line});
}
export function vossTurn(world:World,strategy:unknown='urgent'):VossOffer { const offer=base(world); if(strategy!==offer.strategy) throw Error('Adrian Voss strategy is not legal in this situation.'); return offer; }
export function vossReplies(world:World,offer=vossTurn(world)):readonly VossReply[] {
  const options:VossReply[]=[
    {id:'reject_attack',title:'Reject the attack request',line:'Freedoma will not join an attack. We can protect civilians and prevent escalation without turning your crisis into ours.',hint:'No military support. Public approval +2; Voss is furious.',blocked:null,decision:'wait'},
    {id:'humanitarian_corridor',title:'Offer a protected aid corridor',line:'We will push for a monitored corridor and civilian protection. Security cannot be an excuse to erase the people you claim to protect.',hint:'Uses 4 treasury. Approval +2; creates a humanitarian commitment.',blocked:world.state.treasury<4?'Needs 4 treasury.':null,decision:'wait'},
    {id:'international_monitor',title:'Call for international monitors',line:'Bring in neutral monitors and publish the evidence. If your case is strong, sunlight should be your ally.',hint:'Uses 2 treasury. Approval +1; lowers escalation.',blocked:world.state.treasury<2?'Needs 2 treasury.':null,decision:'wait'},
    {id:'limited_defense',title:'Consider limited defensive support',line:'Freedoma may support defensive protection under public oversight, with no open-ended attack mandate.',hint:'Uses 8 treasury. Approval −4; Karmenia relations improve, but critics call it a blank check.',blocked:world.state.treasury<8?'Needs 8 treasury.':null,decision:'wait'},
    {id:'ask_evidence',title:'Ask for evidence before committing',line:'Show me the evidence, the civilian safeguards, and the exit plan before you ask for a war-sized headline.',hint:'Conversation only. Voss must answer before you choose a policy.',blocked:null,decision:'wait'},
    {id:'decline_call',title:'End the call for now',line:'I will not make a decision under a deadline you invented. Send a written request through diplomatic channels.',hint:'Conversation only. The request remains unresolved.',blocked:null,decision:'wait'},
  ];
  return Object.freeze(options);
}
