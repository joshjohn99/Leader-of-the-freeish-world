import type {World} from '../shared/schemas/oil-crisis.ts';
import {cabinetMembers} from '../server/src/agents/cabinet-members.ts';
import {cabinetPromiseOverview,promiseGuidance,promiseOwner} from '../server/src/cabinet/promises.ts';
import {escapeHtml as e} from './conversation.ts';

export function promiseOwnerMarkup(world:World,index:number){
 const owner=promiseOwner(world,index);
 return `<div class="promise-owner"><span>Cabinet lead · <b>${owner?e(owner.name):'Unassigned'}</b></span><button class="text-button" data-promise-owner="${index}">${owner?'Ask your secretary':'Assign a secretary'} →</button></div>`;
}
export function cabinetGuidanceMarkup(world:World,index:number){
 const p=promiseGuidance(world,index);
 return `<div class="cabinet-progress"><span class="cabinet-progress-status">${e(p.status)}</span><p>${e(p.blocker)}</p>${p.votes.length?`<div class="cabinet-vote-progress">${p.votes.map(v=>`<span>${e(v.name)}: <b>${v.passed?'Approved ✓':`${v.yes}/${v.seats} projected yes`}</b> · ${v.needed} needed</span>`).join('')}</div>`:''}<p><b>Next step:</b> ${e(p.next.title)}${p.next.action?` · F$${p.next.cost}`:''}</p>${p.next.blocked?`<p class="cabinet-blocker" role="status">${e(p.next.blocked)}</p>`:''}<button class="text-button" data-cabinet-congress="${index}" data-cabinet-chamber="${p.next.chamber}">${p.fulfilled?'Review approved bill':'Review next step in Congress'} →</button><small>Opening Congress does not spend funds or cast a vote.</small></div>`;
}
export function cabinetOverviewMarkup(world:World){
 const promises=cabinetPromiseOverview(world);
 return `<section class="cabinet-promises" aria-label="Your promises"><h3>Your promises</h3><p>Choose who helps you deliver. You make the decisions; they bring the advice.</p>${promises.length?promises.map(p=>`<article class="cabinet-promise-card"><small>PROMISE ${p.index+1}</small><h4>“${e(p.promise)}”</h4><label for="cabinet-owner-${p.index}">Lead secretary</label><select id="cabinet-owner-${p.index}" data-cabinet-owner="${p.index}" ${world.state.day>30?'disabled':''}><option value="" disabled ${!p.owner?'selected':''}>Choose a secretary</option>${cabinetMembers.map(m=>`<option value="${m.id}" ${p.owner?.id===m.id?'selected':''}>${e(m.name)} · ${e(m.title)}</option>`).join('')}</select>${cabinetGuidanceMarkup(world,p.index)}${p.owner?`<button class="reply-button" data-cabinet-consult="${p.index}">Ask ${e(p.owner.name)} →</button>`:''}</article>`).join(''):'<p>Record your three campaign promises to assign cabinet leads. Your secretaries are still available for general advice.</p>'}</section>`;
}
