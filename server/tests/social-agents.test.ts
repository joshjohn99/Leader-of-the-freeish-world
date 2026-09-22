import test from 'node:test';
import assert from 'node:assert/strict';
import { socialAgents,validateInteractions,validateSocialPosts } from '../../shared/schemas/social.ts';
import { createWorld,replyToPetrov } from '../src/world/oil-crisis.ts';
import { petrovTurn } from '../src/diplomacy/petrov.ts';
import { socialContext,generateSocial } from '../src/ai/social.ts';
import { createSocialSession } from '../../web/social-session.ts';
import { feedMarkup } from '../../web/feed.ts';
const posts=socialAgents.map(a=>({agent:a.id,text:`A distinct response from ${a.name}.`,tone:'neutral' as const,visual:''}));
const result=()=>new Response(JSON.stringify({mode:'claude',posts}));
test('social agents receive public history, never private dialogue or offers',()=>{
 const start=createWorld();const world=replyToPetrov(start,'counter',petrovTurn(start).id,'default','Secret private conversation');
 const context=JSON.stringify(socialContext(world,[]));
 assert.doesNotMatch(context,/Secret private|Lower the price|unitPrice|supplierTreasury/);
 assert.match(context,/Diplomatic talks without a shipment/);
});
test('social schema rejects unknown actors, duplicate cast, oversized or future interactions',()=>{
 assert.equal(validateSocialPosts(posts).length,7);
 assert.throws(()=>validateSocialPosts([...posts.slice(0,6),posts[0]]));
 assert.throws(()=>validateInteractions([{postId:'x',agent:'troll',postText:'text',action:'roast',day:99}],1));
 assert.throws(()=>validateInteractions([{postId:'x',agent:'troll',postText:'text',action:'__proto__',day:1}],1));
});
test('social generation authenticates and validates the complete cast',async()=>{
 const fetcher=async(url:any,options:any)=>{
  assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(options.headers['anthropic-workspace-id'],'workspace');
  assert.equal(JSON.parse(options.body).output_config.format.type,'json_schema');
  return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({posts})}]}));
 };
 assert.deepEqual(await generateSocial(createWorld(),[],'key','model','workspace',fetcher as typeof fetch),posts);
});
test('late social responses are ignored after a reset',async()=>{
 let resolve!:(response:Response)=>void;
 const session=createSocialSession(createWorld,()=>{},()=>new Promise(r=>{resolve=r;}));
 const pending=session.refresh();session.worldChanged(true);resolve(result());await pending;
 assert.ok(session.view().posts.every(p=>!p.generated));assert.equal(session.view().busy,false);
});
test('social interactions trigger one response batch and thread the target actor',async()=>{
 const bodies:any[]=[];
 const session=createSocialSession(createWorld,()=>{},async(_url,options)=>{bodies.push(JSON.parse(String(options?.body)));return result();});
 await session.refresh();await session.refresh();assert.equal(bodies.length,1);
 await session.refresh(true);assert.equal(session.view().posts.length,7);
 const target=session.view().posts.find(p=>p.agent==='troll')!;session.interact(target.id,'roast');
 await new Promise(r=>setTimeout(r,0));
 assert.equal(bodies.length,3);assert.equal(bodies[2].interactions[0].action,'roast');
 assert.equal(session.view().posts.find(p=>p.agent==='troll')?.replyTo,target.id);
 const html=feedMarkup(createWorld(),session.view().posts,session.view().interactions,'all','j',false,'Ready');
 assert.match(html,/Roast back/);assert.match(html,/J.com/);assert.match(html,/class="post-thread"/);assert.match(html,/nested-post/);
 const reply=session.view().posts.find(p=>p.replyTo===target.id)!;
 assert.equal(reply.replyToInteraction,session.view().interactions[0].id);
 assert.ok(html.indexOf(`data-feed-id="${target.id}"`)<html.indexOf(`data-feed-id="${reply.id}"`));
 assert.equal(html.split(`data-feed-id="${reply.id}"`).length-1,1);
 assert.doesNotMatch(html,/post-avatar[^]*Blair With a Ring Light/);
});
test('social posts escape text and platform filters preserve sentiment filters',()=>{
 const rendered=posts.map((p,i)=>({...p,id:String(i),text:'<script>bad</script>',day:1,generated:true}));
 const html=feedMarkup(createWorld(),rendered,[],'all','pictogram',false,'Ready');
 assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/Blair With a Ring Light/);assert.doesNotMatch(html,/Reply Goblin/);
});

test('ordinary Pictogram descriptions do not discard the entire valid cast',()=>{
 const longer=posts.map(p=>({...p,visual:p.agent==='influencer'?'x'.repeat(130):''}));
 assert.equal(validateSocialPosts(longer).length,7);
 assert.throws(()=>validateSocialPosts(longer.map(p=>({...p,visual:'x'.repeat(241)}))));
});

test('likes and subsequent world refreshes do not create spurious threaded replies',async()=>{
 let world=createWorld();const session=createSocialSession(()=>world,()=>{},async()=>result());
 await session.refresh();const target=session.view().posts[0];session.interact(target.id,'like');await new Promise(r=>setTimeout(r,0));
 assert.ok(session.view().posts.every(p=>!p.replyTo));
 session.interact(target.id,'roast');await new Promise(r=>setTimeout(r,0));assert.equal(session.view().posts.filter(p=>p.replyTo).length,1);
 world={...world,state:{...world.state,day:2}};session.worldChanged();await session.refresh();assert.equal(session.view().posts.filter(p=>p.replyTo).length,1);
});
