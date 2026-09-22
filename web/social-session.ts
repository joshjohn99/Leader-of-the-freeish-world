import type { World } from '../shared/schemas/oil-crisis.ts';
import { validateSocialPosts } from '../shared/schemas/social.ts';
import type { FeedPost, SocialInteraction, SocialAction } from '../shared/schemas/social.ts';
import { fallbackPosts } from './feed.ts';
export function createSocialSession(getWorld:()=>World,onUpdate:()=>void,fetcher:typeof fetch=fetch){
 let posts:FeedPost[]=[],interactions:SocialInteraction[]=[],busy=false,status='Ready to hear from the cast.',epoch=0,requested='',completed='',batch=0,interactionSequence=0,respondedTo='';
 const view=()=>({posts:posts.length?posts:fallbackPosts(getWorld()),interactions,busy,status});
 async function refresh(force=false){
  const world=getWorld();const context=JSON.stringify([world.events,interactions]);if(busy||(!force&&context===requested))return;
  requested=context;busy=true;const token=++epoch;onUpdate();
  try{
   const response=await fetcher('/api/social',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:world.events,interactions:interactions.slice(-16)}),signal:AbortSignal.timeout(48000)});
   const result=await response.json();if(token!==epoch)return;
   if(result.mode!=='claude')throw new Error(result.reason??result.error??'The feed could not refresh.');
   const generated=validateSocialPosts(result.posts),last=interactions.at(-1);const replying=last&&last.id!==respondedTo&&last.action!=='like'&&posts.some(p=>p.id===last.postId)?last:undefined;
   if(context===completed){status='Claude cast · caught up';return;}
   completed=context;batch++;
   const next=generated.map((p,index)=>({...p,id:`social-${world.state.day}-${batch}-${index}`,day:world.state.day,generated:true,...(replying&&p.agent===replying.agent?{replyTo:replying.postId,replyToInteraction:replying.id}:{})}));
   respondedTo=last?.id??respondedTo;posts=[...next,...posts].slice(0,72);status='Claude cast · caught up';
  }catch(error){if(token!==epoch)return;status=error instanceof Error?error.message:'Feed unavailable. Try Catch up.';if(!posts.length)posts=fallbackPosts(world);}
  finally{if(token===epoch){busy=false;onUpdate();}}
 }
 function interact(id:string,action:SocialAction){
  if(busy)return;const post=view().posts.find(p=>p.id===id);if(!post)return;
  if(action==='like'&&interactions.some(i=>i.postId===id&&i.action===action))return;
  interactions=[...interactions,{id:`interaction-${++interactionSequence}`,postId:id,agent:post.agent,postText:post.text,action,day:getWorld().state.day}].slice(-16);
  if(!posts.length)posts=fallbackPosts(getWorld());void refresh();
 }
 function worldChanged(reset=false){epoch++;busy=false;requested='';if(reset){completed='';respondedTo='';posts=[];interactions=[];status='A new presidency. A fresh replies tab.';}onUpdate();}
 return {view,refresh,interact,worldChanged};
}
