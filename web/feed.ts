import type { World } from '../shared/schemas/oil-crisis.ts';
import { socialAgents, socialActions } from '../shared/schemas/social.ts';
import type { FeedPost, Platform, SocialInteraction } from '../shared/schemas/social.ts';
import { socialFeed } from './social.ts';
import { escapeHtml as e } from './conversation.ts';
export type FeedFilter='all'|'supportive'|'critical';
export type FeedPlatform='all'|Platform;
export const platformNames={j:'J.com',feedbox:'Feedbox',pictogram:'Pictogram'};
export function fallbackPosts(world:World):FeedPost[]{
 const roles:Record<string,FeedPost['agent']>={Commuter:'driver',Supporter:'supporter','News desk':'journalist','Satire account':'troll','Swing voter':'neighbor'};
 const posts=socialFeed(world).map(p=>({id:`local-${p.id}`,agent:roles[p.role],text:p.text,tone:p.tone,visual:'',day:p.day,generated:false}));
 const meeting=world.events.findLast(e=>e.sterling);posts.unshift({id:`local-max-${world.state.day}`,agent:'max',text:meeting?.sterling?.reply==='fund'?'Buses running. History made. Why is nobody photographing my good side?':meeting?.sterling?.reply==='decline'?'The president declined my proposal. I am choosing to interpret this as a soft launch for our feud.':'I have a plan for Freedoma. It has wheels, a launch event, and my name on both.',tone:meeting?.sterling?.reply==='decline'?'critical':'neutral',visual:'',day:world.state.day,generated:false});
 posts.unshift({id:`local-influencer-${world.state.day}`,agent:'influencer',text:'Today’s aesthetic: waiting for fuel, but make it aspirational. #StationaryEra',tone:'neutral',visual:'A ring light at an empty fuel pump',day:world.state.day,generated:false});
 if(!posts.some(p=>p.agent==='troll'))posts.push({id:'local-troll',agent:'troll',text:'New president just dropped. Does this one come with fuel or is that a subscription?',tone:'critical',visual:'',day:world.state.day,generated:false});
 if(!posts.some(p=>p.agent==='neighbor'))posts.push({id:'local-neighbor',agent:'neighbor',text:'ADMIN NOTICE: please stop reserving fuel queue spots with garden furniture.',tone:'critical',visual:'',day:world.state.day,generated:false});
 return posts;
}
export function feedMarkup(world:World,posts:FeedPost[],interactions:SocialInteraction[],filter:FeedFilter,platform:FeedPlatform,busy:boolean,status:string){
 const roots=posts.filter(p=>!p.replyTo||!posts.some(parent=>parent.id===p.replyTo));
 const shown=roots.filter(p=>(filter==='all'||p.tone===filter)&&(platform==='all'||socialAgents.find(a=>a.id===p.agent)!.platform===platform));
 const today=posts.filter(p=>p.day===world.state.day),support=today.filter(p=>p.tone==='supportive').length,critics=today.filter(p=>p.tone==='critical').length;
 return `<div class="feed-brand"><span class="network-mark">J</span><div><h2>The public square.</h2><p>Three platforms. Nobody logging off.</p></div></div>
 <div class="platform-tabs" role="group" aria-label="Social platform">${(['all','j','feedbox','pictogram'] as const).map(p=>`<button data-platform="${p}" aria-pressed="${platform===p}" class="${platform===p?'active':''}">${p==='all'?'All feeds':platformNames[p]}</button>`).join('')}</div>
 <div class="feed-summary"><span>THE CONVERSATION TODAY</span><div class="sentiment-bar" role="img" aria-label="${support} supportive and ${critics} critical posts"><i style="flex:${support};background:#597d65"></i><i style="flex:${today.length-support-critics};background:#b7ae95"></i><i style="flex:${critics};background:#b57461"></i></div><small>${support} supportive · ${critics} critical · sample, not a poll</small></div>
 <div class="social-live"><span role="status">${busy?'The cast is reacting…':e(status)}</span><button id="refresh-feed" ${busy?'disabled':''}>${busy?'Writing…':'Catch up ↻'}</button></div>
 <div class="feed-tabs" role="group" aria-label="Filter simulated posts">${(['all','supportive','critical'] as const).map(f=>`<button data-filter="${f}" aria-pressed="${filter===f}" class="${f===filter?'active':''}">${f==='all'?'For You':f==='supportive'?'Supporters':'Critics'}</button>`).join('')}</div>
 <div class="social-posts">${shown.map(post=>renderPost(post,posts,interactions,busy)).join('')||'<p class="note">No posts in this view yet. Try another platform or filter.</p>'}</div><p class="aside-bottom">Fictional accounts and reactions. Social replies shape the conversation, not national approval. New decisions and your replies prompt the cast; no background polling.</p>`;
}

function renderPost(post:FeedPost,posts:FeedPost[],interactions:SocialInteraction[],busy:boolean,depth=0):string{
 const agent=socialAgents.find(a=>a.id===post.agent)!;
 const own=interactions.filter(i=>i.postId===post.id),comments=own.filter(i=>i.action!=='like'),liked=own.some(i=>i.action==='like');
 const children=posts.filter(p=>p.replyTo===post.id).slice().reverse();
 const childMarkup=(child:FeedPost)=>depth<12?renderPost(child,posts,interactions,busy,depth+1):`<p>${e(child.text)}</p>`;
 const unpaired=children.filter(child=>!comments.some(i=>i.id&&i.id===child.replyToInteraction));
 return `<article class="social-post platform-${agent.platform} ${depth?'nested-post':''}" data-feed-id="${e(post.id)}"><div class="post-avatar ${post.tone}">${e(agent.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</div><div class="post-body"><div class="post-heading"><b>${e(agent.name)}</b><span>${platformNames[agent.platform]} · DAY ${post.day}</span></div><small>@${agent.handle} · ${agent.role}</small>
 ${agent.platform==='pictogram'&&!depth?`<div class="pictogram-card"><span>✦</span><b>${e(post.visual||'The presidential aesthetic')}</b></div>`:''}<p>${e(post.text)}</p><div class="post-meta"><span>${post.tone}</span><span>${post.generated?'Claude · in character':'Offline cast'}</span></div>
 <div class="post-actions"><button data-social-action="like" data-post="${e(post.id)}" aria-pressed="${liked}" ${busy||liked?'disabled':''}>${liked?'♥ Liked':'♡ Like'}</button>${(['reassure','receipts','roast'] as const).map(action=>`<button data-social-action="${action}" data-post="${e(post.id)}" ${busy?'disabled':''}>${action==='reassure'?'Reassure':action==='receipts'?'Show receipts':'Roast back'}</button>`).join('')}</div>
 ${comments.length||children.length?`<details class="post-thread" data-thread="${e(post.id)}"><summary>${comments.length+children.length} ${comments.length+children.length===1?'reply':'replies'} · View conversation</summary><div class="thread-replies">${comments.map(i=>`<div class="president-reply"><b>YOU · PRESIDENT</b><p>${e(socialActions[i.action])}</p>${children.filter(child=>i.id&&child.replyToInteraction===i.id).map(childMarkup).join('')}</div>`).join('')}${unpaired.map(childMarkup).join('')}</div></details>`:''}</div></article>`;
}
