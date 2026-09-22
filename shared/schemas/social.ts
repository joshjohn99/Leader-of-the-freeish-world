export const socialAgents = [
 {id:'max',name:'Max Sterling',handle:'maxactually',role:'Owner · Volt Motors & J.com',platform:'j',persona:'Openly chaotic billionaire attention seeker. Craves praise, reacts dramatically to rejection, exaggerates his own importance. Do not fabricate a signed deal or reveal private dialogue.'},
 {id:'troll',name:'Reply Goblin',handle:'definitelynotabot',role:'Professional nuisance',platform:'j',persona:'Chronically online troll. Wants attention, screenshots and the last word. Mock presidential spin, never protected traits. Sometimes grudgingly respects a good comeback.'},
 {id:'supporter',name:'Team Freedoma',handle:'freedomaforever',role:'Loyal supporter',platform:'j',persona:'Defends the president with increasingly elaborate spin. Wants a victory to celebrate. Earnest enough to be funny.'},
 {id:'driver',name:'Nina at the Pump',handle:'ninaneedsfuel',role:'Commuter',platform:'feedbox',persona:'Wants to get to work. Dry, practical humor. Responds to useful answers but hates slogans.'},
 {id:'neighbor',name:'Patricia from the Group',handle:'patricia_admin',role:'Neighborhood group admin',platform:'feedbox',persona:'Overconfident neighborhood gossip. Turns every policy into a local parking dispute. Wants her community heard. Clearly frame rumors as speculation.'},
 {id:'journalist',name:'PNN',handle:'pnn',role:'News network',platform:'j',persona:'Deadpan journalist. Wants verifiable public facts. Punctures exaggeration with understated questions.'},
 {id:'influencer',name:'Blair With a Ring Light',handle:'blairactually',role:'Lifestyle influencer',platform:'pictogram',persona:'Turns the fuel crisis into a lifestyle aesthetic. Wants attention and brand deals. Aspirational captions, absurd hashtags, accidentally revealing privilege.'},
] as const;
export type AgentId=typeof socialAgents[number]['id'];
export type Platform='j'|'feedbox'|'pictogram';
export type Tone='supportive'|'critical'|'neutral';
export type SocialAction='like'|'reassure'|'receipts'|'roast';
export const socialActions:Record<SocialAction,string>={like:'Liked this post',reassure:'I hear you. You deserve a useful answer, not another slogan.',receipts:'Let’s check the actual public record before we write the victory speech.',roast:'Bold analysis from someone whose cabinet is a replies tab.'};
export interface AgentPost {agent:AgentId;text:string;tone:Tone;visual:string}
export interface FeedPost extends AgentPost {id:string;day:number;replyTo?:string;replyToInteraction?:string;generated:boolean}
export interface SocialInteraction {id?:string;postId:string;agent:AgentId;postText:string;action:SocialAction;day:number}
export function validateInteractions(value:unknown,day:number):SocialInteraction[]{
 if(!Array.isArray(value)||value.length>16)throw new Error('Invalid social context');
 return value.map(v=>{
  if(!v||typeof v!=='object'||!socialAgents.some(a=>a.id===v.agent)||!Object.hasOwn(socialActions,v.action)||typeof v.postId!=='string'||v.postId.length>100||typeof v.postText!=='string'||v.postText.length>600||!Number.isInteger(v.day)||v.day<1||v.day>day)throw new Error('Invalid social interaction');
  return {postId:v.postId,agent:v.agent,postText:v.postText,action:v.action,day:v.day};
 });
}
export function validateSocialPosts(value:unknown):AgentPost[]{
 if(!Array.isArray(value)||value.length!==socialAgents.length)throw new Error('Invalid social cast');
 const seen=new Set();
 return value.map(v=>{
  if(!v||!socialAgents.some(a=>a.id===v.agent)||seen.has(v.agent)||typeof v.text!=='string'||v.text.length<5||v.text.length>600||!['supportive','critical','neutral'].includes(v.tone)||typeof v.visual!=='string'||v.visual.length>240)throw new Error('Invalid social post');
  seen.add(v.agent);return {agent:v.agent,text:v.text,tone:v.tone,visual:v.visual};
 });
}
