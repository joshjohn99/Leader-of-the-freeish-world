import type {World} from '../shared/schemas/oil-crisis.ts';
import type {MaxVoice} from '../server/src/ai/sterling.ts';
import {maxTurn,maxReplies,pilotDaysLeft} from '../server/src/billionaires/sterling.ts';
import {escapeHtml as e} from './conversation.ts';
export function maxLane(world:World,voice:MaxVoice|undefined,busy:boolean){
 const count=world.events.filter(e=>e.sterling).length;
 return `<button id="resume-max" class="diplomat-thread max-thread"><span class="diplomat-avatar">MS</span><span><b>Max Sterling <small>Volt Motors · J.com</small></b><em>${busy?'Max is typing. Probably posting too…':voice?'Max has replied · your turn':pilotDaysLeft(world)?`Bus pilot active · ${pilotDaysLeft(world)} days left`:'An unsolicited opportunity awaits'}</em><p>${e((voice?.line??'“I have already announced our partnership.”').slice(0,110))}</p></span><span class="lane-arrow">↗</span></button><div class="lane-footer"><span>${count} exchanges · private chat</span><span>Open Max →</span></div>`;
}
export function maxMarkup(world:World,voice:MaxVoice|undefined,busy:boolean,status:string){
 const offer=maxTurn(world,voice?.strategy),legal=maxReplies(world,offer),replies=voice?voice.replies.map(r=>({...legal.find(o=>o.id===r.id)!,...r})):legal;
 const history=world.events.filter(e=>e.sterling).slice(-4);
 return `<div class="call-heading"><div class="max-portrait" role="img" aria-label="Max Sterling, billionaire"><svg viewBox="0 0 70 80"><rect width="70" height="80" fill="#b39779"/><path d="M3 80Q5 54 35 54Q65 54 68 80" fill="#293541"/><ellipse cx="35" cy="32" rx="20" ry="26" fill="#d5a17a"/><path d="M15 25Q10 1 36 3Q60 4 56 24L42 14L18 24" fill="#5d4739"/><path d="M25 33h5m11 0h5" stroke="#302d2a" stroke-width="3"/><path d="M28 44q8 8 16-2" fill="none" stroke="#fff0d6" stroke-width="3"/></svg></div><div><p class="speaker-name">Max Sterling</p><span class="speaker-role">VOLT MOTORS · OWNER OF J.COM</span><span class="call-status">Openly chaotic. Permanently online.</span></div></div>
 <div class="connection-strip"><span>${busy?'Writing his next big idea…':e(status)}</span><button id="max-retry" ${busy?'disabled':''}>Retry connection ↻</button></div><h2>The pitch arrived.<br>Before the plan.</h2>
 ${history.length?`<details class="call-history"><summary>Your history with Max · ${world.events.filter(e=>e.sterling).length} exchanges</summary>${history.map(event=>`<div class="chat-bubble"><small>MAX · DAY ${event.after.day-(event.timing==='conversation'||event.timing==='day-action'?0:1)}</small><p>${e(event.sterling!.spokenLine??event.sterling!.offer.line)}</p></div><div class="chat-bubble player"><small>YOU</small><p>${e(event.sterling!.playerLine)}</p></div>`).join('')}</details>`:''}
 <div class="chat-bubble current"><small>MAX · PRIVATE MESSAGE</small><p>${e(voice?.line??offer.line)}</p></div>
 <div class="offer-slip"><span>VOLT MOTORS ELECTRIC-BUS PILOT</span><b>${pilotDaysLeft(world)?`Running · ${pilotDaysLeft(world)} days remaining`:`F$${offer.cost} · 3 days · oil demand −2 per day`}</b><small>No permanent upgrade. Discuss terms within today. Fund, decline or call out the pitch to complete the meeting. Freedoma dollars available: F$${world.state.treasury}.</small></div>
 <div class="choices">${replies.map(r=>`<button class="choice" data-max-reply="${r.id}" ${busy||r.blocked?'disabled':''}><span>↗</span><span><strong>${e(r.title)}</strong><span class="reply-preview">“${e(r.line)}”</span><small>${e(r.blocked??r.hint)}</small></span></button>`).join('')}</div>
 ${busy?'<button class="text-button" id="max-offline">Continue with offline Max</button>':''}<button class="text-button" id="leave-max">Back to briefing ↗</button>`;
}
