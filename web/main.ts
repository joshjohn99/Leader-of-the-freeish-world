import {congressRules} from '../server/src/congress/congress.ts';
import {createCongressPanel} from './congress.ts';
import {createFeedPresentation} from './feed-presentation.ts';
import {activeDay,agendaEngine} from '../server/src/agenda/agenda.ts';
import {createDayTransition} from './day-transition.ts';
import {pressSecretaryMarkup} from './press-secretary.ts';
import {mountOfficeTabs} from './office-tabs.ts';
import {createCabinet} from './cabinet.ts';
import {electionRules} from '../server/src/election/election.ts';
import {electionMarkup} from './election.ts';
import {officeHub} from './office-hub.ts';
import {newsMarkup} from './world-news.ts';
import {campaignOpening,campaignPanel} from './campaign.ts';
import {campaignRules} from '../server/src/campaign/campaign.ts';
import {validateStaff} from '../server/src/ai/staff.ts';
import type {StaffBrief} from '../server/src/ai/staff.ts';
import {maxTurn} from '../server/src/billionaires/sterling.ts';
import {validateMaxVoice} from '../server/src/ai/sterling.ts';
import type {MaxVoice} from '../server/src/ai/sterling.ts';
import {maxMarkup,maxLane} from './sterling.ts';
import { seatCongress, beginDay, endDay, publishAnnouncement, createWorld, replay, replyToPetrov, replyToMax, startPresidency, decidePromise, respondToNews } from '../server/src/world/oil-crisis.ts';
import type { Decision, WorldEvent } from '../shared/schemas/oil-crisis.ts';
import { portrait } from './portraits.ts';
import { createOffice } from './office.ts';
import { actionArtworkFor, broadcastFor } from './broadcasts.ts';
import { chartMarkup, chartsPanel } from './charts.ts';
import { petrovTurn } from '../server/src/diplomacy/petrov.ts';
import { validateVoice } from '../server/src/ai/claude.ts';
import type { AgentVoice } from '../server/src/ai/claude.ts';
import { conversationMarkup } from './conversation.ts';
import { feedMarkup } from './feed.ts';
import { createSocialSession } from './social-session.ts';
import { diplomacyLane } from './diplomacy-lane.ts';
import type { SocialAction } from '../shared/schemas/social.ts';
import type { FeedPlatform, FeedFilter } from './feed.ts';

const $ = (selector:string) => document.querySelector<HTMLElement>(selector)!;
const escape = (text:string) => text.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]!));
const saveKey='freedoma-office-v1';
let world=createWorld(); let saveWarning='';
try { const saved=localStorage.getItem(saveKey);if(saved)world=replay(JSON.parse(saved)); }
catch { saveWarning='The previous local session could not be restored. A fresh presidency has begun.'; }
const dayTransition=createDayTransition();let transitionDay=world.state.day,transitionStarting=false;
let panel:'briefing'|'phone'|'social'|'action'|'reaction'|'max'|'news'|'press'|'secretary'|'congress'='briefing';
let feedPlatform:FeedPlatform='all';
const feedPresentation=createFeedPresentation();
const social=createSocialSession(()=>world,()=>{updateChrome();if(panel==='social')render();});
let viewingEvent: WorldEvent | undefined;
let maxVoice:MaxVoice|undefined,maxBusy=false,maxEpoch=0,maxContext='',maxStatus='Offline Max · ready';
let staffBrief:StaffBrief|undefined,staffBusy=false,staffEpoch=0,staffContext='',staffStatus='Offline staff briefing';
let lastAiStatus='';let petrovStatus='';
let voice:AgentVoice|undefined;let voiceMode='offline';let generationBusy=false;let generationEpoch=0;let feedFilter:FeedFilter='all';let requestedContext='';
function saveWorld(){try{localStorage.setItem(saveKey,JSON.stringify(world.events));}catch{saveWarning='Browser storage unavailable. Progress lasts only for this session.';}}
function updateDayTransition(){if(transitionStarting)return;dayTransition.update([...(generationBusy?['Petrov']:[]),...(maxBusy?['Max']:[]),...(staffBusy?['your staff']:[]),...(social.view().busy?['social feeds']:[])]);}
function invalidateVoice(){
 const dayAdvanced=world.state.day>transitionDay;
 if(world.state.day>transitionDay){transitionStarting=true;dayTransition.begin(world.state.day);}else if(world.state.day<transitionDay){dayTransition.close();transitionStarting=false;}transitionDay=world.state.day;
staffBrief=undefined;staffBusy=false;staffEpoch++;staffContext='';queueMicrotask(()=>{if(dayAdvanced||panel==='press')void ensureStaff();if(dayAdvanced&&world.events.length){void ensureVoice();void ensureMax();void social.refresh();}transitionStarting=false;updateDayTransition();});maxVoice=undefined;maxBusy=false;maxEpoch++;maxContext='';voice=undefined;voiceMode='offline';petrovStatus='';generationBusy=false;generationEpoch++;requestedContext='';social.worldChanged();}
async function ensureVoice(force=false){
 if(agendaEngine.tasks(world).some(t=>t.id==='petrov'&&t.done))return;
 if(electionRules.finished(world))return;
  const context=JSON.stringify(world.events);
  if(!force&&requestedContext===context)return;
  requestedContext=context;const epoch=++generationEpoch;generationBusy=true;
  updateChrome();if(panel==='phone')render();
  try{
    const response=await fetch('/api/agent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:world.events}),signal:AbortSignal.timeout(48000)});
    const result=await response.json();
    if(epoch!==generationEpoch)return;
    if(result.mode==='claude'){voice=validateVoice(result.voice,world);voiceMode='claude';$('#ai-status').textContent='Claude responded successfully. Petrov is ready.';}
    else {voice=undefined;voiceMode='offline';$('#ai-status').textContent=result.reason??result.error??'Using the offline opponent.';}
  }catch{if(epoch!==generationEpoch)return;voice=undefined;voiceMode='offline';$('#ai-status').textContent='Claude is unavailable. The offline opponent is ready; check the local server and API settings.';}
  if(epoch!==generationEpoch)return;
  generationBusy=false;updateChrome();lastAiStatus=$('#ai-status').textContent??'';petrovStatus=lastAiStatus;if(panel==='phone'||panel==='social')render();
}
async function ensureMax(force=false){
 if(agendaEngine.tasks(world).some(t=>t.id==='max'&&t.done))return;
 if(electionRules.finished(world))return;
 const context=JSON.stringify(world.events);if(!force&&maxContext===context)return;
 maxContext=context;const epoch=++maxEpoch;maxBusy=true;updateChrome();if(panel==='max')render();
 try{const response=await fetch('/api/max',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:world.events}),signal:AbortSignal.timeout(48000)});const result=await response.json();if(epoch!==maxEpoch)return;
 if(result.mode!=='claude')throw Error(result.reason??result.error??'Max could not connect.');maxVoice=validateMaxVoice(result.voice,world);maxStatus='Claude · Max Sterling';
 }catch(error){if(epoch!==maxEpoch)return;maxVoice=undefined;maxStatus=error instanceof Error?error.message:'Offline Max available.';}
 if(epoch!==maxEpoch)return;maxBusy=false;updateChrome();if(panel==='max')render();
}
async function ensureStaff(force=false){
 if(electionRules.finished(world))return;
 if(!campaignRules.promises(world))return;const context=JSON.stringify(world.events);if(!force&&staffContext===context)return;
 staffContext=context;const epoch=++staffEpoch;staffBusy=true;if(panel==='press')render();
 try{const r=await fetch('/api/staff',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:world.events}),signal:AbortSignal.timeout(48000)});const result=await r.json();if(epoch!==staffEpoch)return;if(result.mode!=='claude')throw Error(result.reason??'Staff unavailable');staffBrief=validateStaff(result.brief,world);staffStatus='Mara + PNN · Claude reactions';}
 catch(error){if(epoch!==staffEpoch)return;staffBrief=undefined;staffStatus=error instanceof Error?error.message:'Offline briefing available';}
 if(epoch!==staffEpoch)return;staffBusy=false;updateDayTransition();if(panel==='press')render();
}
function openAiSettings(){($('#ai-settings') as HTMLDialogElement).showModal();fetch('/api/ai/status').then(response=>response.json()).then(status=>{(document.querySelector<HTMLInputElement>('#workspace-id')!).value=status.workspaceId??'';$('#ai-status').textContent=status.configured?(lastAiStatus||'A key is saved. Generate a turn to check the connection.'):'No API key saved yet. You can play with the offline opponent while setting this up.';}).catch(()=>{$('#ai-status').textContent='Start npm run dev to enable the local AI connection.';});}

const reactions:Record<Decision,{person:'mara'|'petrov'|'press';name:string;role:string;title:string;speech:string;headline:string}>={
  buy:{person:'petrov',name:'Viktor Petrov',role:'President of Petrovia',title:'A beautiful friendship. Invoiced.',speech:'“A pleasure doing business, President. I have marked the shipment ‘humanitarian assistance’ for our cameras and ‘full price’ for your accountant.”',headline:'PETROVIA ANNOUNCES HISTORIC FRIENDSHIP • Payment cleared moments earlier.'},
  subsidize:{person:'mara',name:'Mara Bell',role:'Chief of staff',title:'The good news: they love it.',speech:'“The bad news: everyone is driving to celebrate. One man filled his swimming pool. The Department of Energy would like you to stop saying ‘infinite gas’ on television.”',headline:'CHEAPER GAS INSPIRES NATIONAL ROAD TRIP • Department of Energy requests a chair.'},
  ration:{person:'press',name:'Jules Reed',role:'Press secretary',title:'The rebrand has left the building.',speech:'“We announced Freedom Fuel Fasting. Reporters asked whether your eight-car motorcade would participate. I said you were fasting emotionally. They wrote that down.”',headline:'GOVERNMENT UNVEILS FREEDOM FUEL FASTING • Motorcade reportedly not hungry.'},
  threaten:{person:'petrov',name:'Viktor Petrov',role:'President of Petrovia',title:'He has options too.',speech:'“I saw your speech. Very strong. Very loud. Our pricing department enjoyed it so much that it has prepared a response. Do have your accountant sit down.”',headline:'PRESIDENT SAYS “WE HAVE OPTIONS” • Petrovia submits a revised price list.'},
  wait:{person:'mara',name:'Mara Bell',role:'Chief of staff',title:'Excellent. The crisis has initiative.',speech:'“While we waited, the gas queues organized themselves. They have a logo now. The Department of Energy says the situation is ‘developing,’ which I believe means getting worse with stationery.”',headline:'CABINET MONITORS SITUATION • Situation declines to be intimidated.'},
};
function speaker(person:'mara'|'petrov'|'press',name:string,role:string,status:string){return `<div class="speaker"><div class="portrait">${portrait(person)}</div><div><p class="speaker-name">${name}</p><div class="speaker-role">${role}</div><span class="speaker-status">${status}</span></div></div>`;}
function updateChrome(){
  updateDayTransition();
  $('#day').textContent=electionRules.finished(world)?'ELECTION NIGHT':`DAY ${String(world.state.day).padStart(2,'0')} / 30`;
  $('#phone-count').textContent='1';$('#social-count').textContent=String(social.view().posts.filter(post=>post.day===world.state.day).length);
  $('#diplomacy-lane').innerHTML=diplomacyLane(world,voice,generationBusy,panel==='phone')+maxLane(world,maxVoice,maxBusy);$('#resume-max').onclick=()=>openPanel('max');$('#resume-diplomacy').onclick=()=>openPanel('phone');
  for(const id of ['resume-max','resume-diplomacy','social-button','phone-button','pnn-button','press-button']) (document.getElementById(id) as HTMLButtonElement).disabled=world.events.length===0;
  $('#pnn-count').textContent=String(world.events.filter(e=>e.news&&!world.events.some(r=>r.newsResponse?.newsId===e.news!.id)).length);
  const last=world.events.at(-1);$('#headline').textContent=last?(last.congress?'CONGRESS • The president’s platform meets the floor':last.agenda?(last.agenda.kind==='start'?'A NEW DAILY AGENDA • Your desk is ready.':'DAY COMPLETE • The country reacts.'):last.announcement?'PRESS OFFICE • New presidential announcement released':last.news?`PNN BREAKING • ${last.news.headline}`:last.newsResponse?'PNN • PRESIDENT RESPONDS TO WORLD EVENT':last.campaign?(last.campaign.kind==='launch'?'THREE PROMISES, ONE PRESIDENT • PNN begins keeping receipts.':'CAMPAIGN PROMISE UPDATE • PNN checks what actually changed.'):last.sterling?(last.sterling.reply==='fund'?'VOLT MOTORS PILOT STARTS • Max requests a larger ribbon.':'MAX STERLING LEAVES MEETING • J.com braces for impact.'):last.diplomacy?(last.diplomacy.reply==='accept'?'OIL DEAL SIGNED • Both sides claim to have invented diplomacy.':'TALKS CONTINUE • Fuel gauge requests a seat at the negotiating table.'):reactions[last.decision].headline):'PRESIDENT ARRIVES AT WORK • Nation cautiously surprised.';
}
const congressPanel=createCongressPanel(()=>world,next=>{world=next;saveWorld();invalidateVoice();render();},()=>panel==='congress');
const officeTabNavigation=mountOfficeTabs(document.getElementById('office-tabs')!,openPanel);
function markSettled(id:string,selector:string){if(agendaEngine.tasks(world).some(t=>t.id===id&&t.done)){$('#dialogue').insertAdjacentHTML('afterbegin','<p class="note">Today’s meeting is complete. Return to your desk for the next task.</p>');document.querySelectorAll<HTMLButtonElement>(selector).forEach(b=>b.disabled=true);}}
function render(){
  if(world.events.length&&!activeDay(world)&&!electionRules.finished(world)){world=beginDay(world);saveWorld();}

  officeTabNavigation.update(panel,world.events.length>0&&!electionRules.finished(world));
  updateChrome();const todayTasks=agendaEngine.tasks(world);$('#agenda-strip').textContent=`Today: ${todayTasks.filter(t=>t.done).length}/${todayTasks.length} tasks complete · Back to desk →`;$('#panel-label').textContent=panel==='congress'?'CONGRESS · YOUR CAMPAIGN PLATFORM':panel==='secretary'?'PRESS SECRETARY · ANNOUNCEMENTS':panel==='press'?'PRESS BRIEFING · ON THE RECORD':panel==='news'?'PNN · WORLD DESK':panel==='max'?'THE BILLIONAIRE IS TYPING':panel==='phone'?'THE PRESIDENTIAL LINE':panel==='social'?'THE PUBLIC SQUARE':panel==='action'?'YOUR PRESIDENTIAL APPEARANCE':panel==='reaction'?'THE CONSEQUENCES HAVE ARRIVED':'PRESIDENTIAL OFFICE';
  if(!world.events.length){$('#broadcast-stage').hidden=true;document.querySelector('.office')!.classList.remove('is-broadcast');$('#dialogue').innerHTML=campaignOpening();$('#campaign-form').onsubmit=event=>{event.preventDefault();try{world=startPresidency(world,[0,1,2].map(i=>(document.getElementById(`promise-${i}`) as HTMLTextAreaElement).value));saveWorld();invalidateVoice();panel='briefing';render();void ensureVoice();void ensureMax();}catch(error){$('#campaign-error').textContent=error instanceof Error?error.message:'Check your promises.';}};return;}
  document.querySelector('.confidential')!.textContent=panel==='press'||panel==='action'?'ON THE RECORD':panel==='phone'||panel==='max'?'PRIVATE CONVERSATION':'OFFICE OF THE PRESIDENT';
  const last=viewingEvent??world.events.at(-1);
  if(panel!=='social')document.querySelector('.briefing')!.scrollTop=0;
  const stage=$('#broadcast-stage');
  stage.hidden=panel!=='action';
  document.querySelector('.office')!.classList.toggle('is-broadcast',panel==='action');
  if(panel==='action' && last&&!electionRules.finished(world)){
    const broadcast=broadcastFor(last);
    stage.innerHTML=`<div class="broadcast-header"><span><i></i> FREEDOMA NOW <b>/ DAY ${broadcast.day} RECORDING</b></span><button id="leave-broadcast">Back to office ↗</button></div><div class="broadcast-art">${actionArtworkFor(last)}</div><div class="broadcast-lower"><span class="broadcast-format">${broadcast.format}</span><h2>${broadcast.title}</h2><p>${escape(broadcast.caption)}</p><span class="broadcast-venue">${broadcast.venue}</span></div>`;
    $('#dialogue').innerHTML=`<div class="president-id"><span class="seal">✦</span><div><p class="speaker-name">You, Mr. President.</p><span class="speaker-role">FREEDOMA / ON THE RECORD</span></div></div><span class="case-tag">${broadcast.format} · DAY ${broadcast.day}</span><h2>The cameras<br>are rolling.</h2><blockquote class="presidential-speech">“${escape(broadcast.speech)}”</blockquote><div class="note">${broadcast.outcome}</div><button class="reply-button" id="hear-response">See how that went over →</button><p class="aside-bottom">${viewingEvent?'Replaying a recorded appearance.':'Your decision is already recorded.'} Watching or replaying a scene never advances time.</p>`;
    const finish=()=>{panel='reaction';render();};$('#hear-response').onclick=finish;$('#leave-broadcast').onclick=finish;
    return;
  }
  stage.innerHTML='';
  if(electionRules.finished(world)){$('#panel-label').textContent='PNN · ELECTION NIGHT';stage.hidden=true;document.querySelector('.office')!.classList.remove('is-broadcast');$('#dialogue').innerHTML=electionMarkup(world);return;}
  if(panel==='congress'){congressPanel.render($('#dialogue'));return;}
  if(panel==='secretary'){
    $('#dialogue').innerHTML=pressSecretaryMarkup(world);
    $('#announcement-form').onsubmit=event=>{event.preventDefault();try{world=publishAnnouncement(world,(document.getElementById('announcement-text') as HTMLTextAreaElement).value);saveWorld();invalidateVoice();render();}catch(error){$('#announcement-error').textContent=error instanceof Error?error.message:'Announcement unavailable';}};
    $('#announcement-feed').onclick=()=>openPanel('social');return;
  }
  if(panel==='briefing'){$('#dialogue').innerHTML=officeHub(world);$('#end-day').onclick=()=>{try{world=endDay(world);if(!electionRules.finished(world))world=beginDay(world);saveWorld();invalidateVoice();render();}catch(error){$('#agenda-error').textContent=error instanceof Error?error.message:'Could not end the day.';}};document.querySelectorAll<HTMLButtonElement>('[data-activity]').forEach(button=>button.onclick=()=>openPanel(button.dataset.activity!));return;}
  if(panel==='reaction' && last){
    const reaction=last.sterling?{person:'mara' as const,name:'Mara Bell',role:'Chief of staff',title:last.sterling.reply==='fund'?'The buses actually arrived.':'Max has opened J.com.',speech:last.sterling.reply==='fund'?'“The pilot is running. Three days of reduced fuel demand. Max has requested naming rights to Tuesday.”':'“The meeting is recorded. His publicity department is apparently just him with a phone.”'}:last.diplomacy ? {person:'mara' as const,name:'Mara Bell',role:'Chief of staff',title:last.diplomacy.reply==='accept'?'An actual shipment. How novel.':'He’s considering his next move.',speech:last.diplomacy.reply==='accept'?'“The payment cleared and the oil arrived. We are calling this diplomacy because procurement sounds less presidential.”':'“You have given Petrov something to think about. Unfortunately, the fuel gauge is not waiting for his reply.”'} : reactions[last.decision];
    $('#dialogue').innerHTML=`${speaker(reaction.person,reaction.name,reaction.role,'Just after your decision')}<span class="case-tag">DAY ${last.after.day} / THE FALLOUT</span><h2>${reaction.title}</h2><p class="speech">${reaction.speech}</p><div class="reaction-trends">${chartMarkup({state:last.after,events:world.events.slice(0,last.id)},'approval',true)}${chartMarkup({state:last.after,events:world.events.slice(0,last.id)},'oil',true)}</div><button class="text-button" id="all-trends">Explore all national trends ↗</button><details class="rule-details"><summary>What happened behind the headlines</summary><ul class="consequences">${last.messages.map(message=>`<li>${escape(message)}</li>`).join('')}</ul></details><button class="reply-button" id="call-petrov">Hear Petrov’s next move →</button><button class="text-button" id="see-posts">See what Freedoma is posting ↗</button><button class="reply-button" id="continue">Right. What’s on my desk now? →</button><p class="aside-bottom">Your decision is recorded. The country carries on.</p>`;
    $('#continue').onclick=()=>{viewingEvent=undefined;panel='briefing';render();}; $('#all-trends').onclick=openLedger;$('#call-petrov').onclick=()=>openPanel('phone');$('#see-posts').onclick=()=>openPanel('social'); return;
  }
  if(panel==='news'){
   $('#dialogue').innerHTML=newsMarkup(world);$('#leave-news').onclick=()=>openPanel('briefing');
   document.querySelectorAll<HTMLButtonElement>('[data-news-action]').forEach(button=>button.onclick=()=>{try{world=respondToNews(world,button.dataset.newsId!,button.dataset.newsAction);saveWorld();invalidateVoice();render();void ensureVoice();void ensureMax();}catch(error){$('#headline').textContent=error instanceof Error?error.message:'Response unavailable';}});return;
  }
  if(panel==='max'){
   const offer=maxTurn(world,maxVoice?.strategy);$('#dialogue').innerHTML=maxMarkup(world,maxVoice,maxBusy,maxStatus);markSettled('max','[data-max-reply]');
   $('#leave-max').onclick=()=>openPanel('briefing');$('#max-retry').onclick=()=>void ensureMax(true);
   const offline=document.querySelector<HTMLButtonElement>('#max-offline');if(offline)offline.onclick=()=>{maxEpoch++;maxBusy=false;maxVoice=undefined;maxStatus='Offline Max';render();};
   document.querySelectorAll<HTMLButtonElement>('[data-max-reply]').forEach(button=>button.onclick=()=>{
    try{world=replyToMax(world,button.dataset.maxReply,offer.id,offer.strategy,maxVoice?.line,maxVoice?.replies.find(r=>r.id===button.dataset.maxReply)?.line);saveWorld();invalidateVoice();viewingEvent=undefined;render();void ensureMax();void ensureVoice();}
    catch(error){$('#headline').textContent=error instanceof Error?error.message:'Max reply unavailable.';}
   });return;
  }
  if(panel==='phone'){
    const offer=petrovTurn(world,voice?.strategy??'default');
    $('#dialogue').innerHTML=conversationMarkup(world,voice,voiceMode,generationBusy,petrovStatus);markSettled('petrov','[data-reply]');$('#petrov-retry').onclick=()=>void ensureVoice(true);
    document.querySelectorAll<HTMLButtonElement>('[data-connect-ai]').forEach(button=>button.onclick=openAiSettings);
    $('#leave-call').onclick=()=>openPanel('briefing');
    const offline=document.querySelector<HTMLButtonElement>('#use-offline');if(offline)offline.onclick=()=>{generationEpoch++;generationBusy=false;voice=undefined;voiceMode='offline';render();};
    document.querySelectorAll<HTMLButtonElement>('[data-reply]').forEach(button=>button.onclick=()=>{
      try{world=replyToPetrov(world,button.dataset.reply,offer.id,offer.strategy,voice?.line,voice?.replies.find(reply=>reply.id===button.dataset.reply)?.line);saveWorld();invalidateVoice();viewingEvent=undefined;
        panel=button.dataset.reply==='decline'?'briefing':'phone';render();
        void ensureVoice();
      }catch(error){$('#headline').textContent=error instanceof Error?error.message:'Reply could not be accepted.';}
    });
    return;
  }
  if(panel==='social'){
    const feed=social.view();const feedHost=document.querySelector<HTMLElement>('.briefing')!;const readingPosition=feedHost.scrollTop;feedHost.querySelector('.feed-new-posts')?.remove();$('#dialogue').innerHTML=feedMarkup(world,feed.posts,feed.interactions,feedFilter,feedPlatform,feed.busy,feed.status);feedHost.scrollTop=readingPosition;feedPresentation.apply(feedHost);
    $('#refresh-feed').onclick=()=>void social.refresh(true);
    document.querySelectorAll<HTMLButtonElement>('[data-platform]').forEach(button=>button.onclick=()=>{feedPlatform=button.dataset.platform as FeedPlatform;render();});
    document.querySelectorAll<HTMLButtonElement>('[data-social-action]').forEach(button=>button.onclick=()=>{feedPresentation.openThread(button.dataset.post!);social.interact(button.dataset.post!,button.dataset.socialAction as SocialAction);});
    document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach(button=>button.onclick=()=>{feedFilter=button.dataset.filter as FeedFilter;render();});
    return;
  }
  $('#dialogue').innerHTML=campaignPanel(world,staffBrief,staffBusy,staffStatus);
  if(!campaignRules.promises(world))$('#dialogue').innerHTML='<p class="speech">This presidency has no recorded campaign promises. Use the Press Secretary to release today’s public statement.</p>';
  $('#dialogue').insertAdjacentHTML('beforeend','<button class="text-button" id="open-announcements">Release a statement with the Press Secretary →</button>');$('#open-announcements').onclick=()=>openPanel('secretary');
  $('#dialogue').insertAdjacentHTML('beforeend','<button class="text-button" id="leave-press">Leave press briefing →</button>');$('#leave-press').onclick=()=>openPanel('briefing');
  const refreshStaff=document.getElementById('refresh-staff');if(refreshStaff)refreshStaff.onclick=()=>void ensureStaff(true);
  document.querySelectorAll<HTMLButtonElement>('[data-promise-action]').forEach(button=>button.onclick=()=>{try{const index=Number(button.dataset.promise),action=button.dataset.promiseAction;const chosen=staffBrief?.choices.find(c=>c.index===index&&c.action===action);world=decidePromise(world,index,action,chosen?.line);saveWorld();invalidateVoice();viewingEvent=undefined;render();void ensureVoice();void ensureMax();}catch(error){$('#headline').textContent=error instanceof Error?error.message:'Promise decision unavailable';}});

}
function showAppearance(){if(matchMedia('(max-width:760px)').matches)document.querySelector('.office')!.scrollIntoView({behavior:'auto',block:'start'});}
function openPanel(name:string){if(name==='congress'&&!congressRules.seed(world)&&!electionRules.finished(world)&&world.events.length){world=seatCongress(world,crypto.getRandomValues(new Uint32Array(1))[0]);saveWorld();}if(!world.events.length){panel='briefing';render();return;}viewingEvent=undefined;panel=name==='congress'?'congress':name==='secretary'?'secretary':name==='press'?'press':name==='news'?'news':name==='max'?'max':name==='phone'?'phone':name==='social'?'social':'briefing';render();if(panel==='press')void ensureStaff();if(panel==='max')void ensureMax();if(panel==='phone')void ensureVoice();if(panel==='social')void social.refresh();if(matchMedia('(max-width:760px)').matches)document.querySelector('.briefing')!.scrollIntoView({behavior:'auto',block:'start'});}
$('#pnn-button').onclick=()=>openPanel('news');$('#headline').onclick=()=>openPanel('news');$('#headline').onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openPanel('news');}};
$('#agenda-strip').onclick=()=>openPanel('briefing');
$('#press-button').onclick=()=>openPanel('press');
$('#social-button').onclick=()=>openPanel('social');$('#phone-button').onclick=()=>openPanel('phone');$('#briefing-button').onclick=()=>openPanel('briefing');
const cabinet=createCabinet(()=>world,()=>openPanel('press'));
const cabinetButton=document.createElement('button');cabinetButton.id='cabinet-button';cabinetButton.className='quiet';cabinetButton.textContent='Cabinet';cabinetButton.setAttribute('aria-haspopup','dialog');$('#reset').before(cabinetButton);cabinetButton.onclick=()=>cabinet.open();
$('#reset').onclick=()=>{if(!confirm('Start a new presidency? This clears this browser’s current playtest.'))return;world=createWorld();congressPanel.reset();feedPresentation.reset();cabinet.reset();invalidateVoice();social.worldChanged(true);try{localStorage.removeItem(saveKey);}catch{}viewingEvent=undefined;panel='briefing';render();};
function openLedger(){
  $('#stats').innerHTML=chartsPanel(world);
  $('#history').innerHTML=world.events.length?`<strong>On the record</strong><p class="history-intro">Replay an appearance without changing the world.</p>${world.events.filter(event=>!event.diplomacy&&!event.sterling&&!event.agenda&&!event.congress).map(event=>`<button class="history-event" data-replay="${event.id}"><span>DAY ${event.after.day-(event.timing==='day-action'?0:1)}</span><b>${broadcastFor(event).format}</b><span>Watch ↗</span></button>`).join('')}`:'No appearances yet. Your first choice will create one.';
  document.querySelectorAll<HTMLButtonElement>('[data-replay]').forEach(button=>button.onclick=()=>{viewingEvent=world.events.find(event=>event.id===Number(button.dataset.replay));($('#ledger') as HTMLDialogElement).close();panel='action';render();showAppearance();});
  ($('#ledger') as HTMLDialogElement).showModal();$('#ledger-toggle').setAttribute('aria-expanded','true');
}
$('#ledger-toggle').onclick=openLedger;
$('#close-ledger').onclick=()=>($('#ledger') as HTMLDialogElement).close();
$('#ledger').addEventListener('close',()=>$('#ledger-toggle').setAttribute('aria-expanded','false'));
$('#connect-ai').onclick=openAiSettings;
$('#close-ai').onclick=()=>($('#ai-settings') as HTMLDialogElement).close();
$('#retry-ai').onclick=()=>{void ensureVoice(true);$('#ai-status').textContent='Checking this turn…';};
$('#ai-form').onsubmit=async event=>{
  event.preventDefault();const input=document.querySelector<HTMLInputElement>('#api-key')!;const key=input.value.trim();input.value='';
  const button=document.querySelector<HTMLButtonElement>('#save-ai')!;button.disabled=true;
  try{const response=await fetch('/api/ai/configure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,workspaceId:(document.querySelector<HTMLInputElement>('#workspace-id')!).value.trim()})});const result=await response.json();requestedContext='';lastAiStatus='';if(response.ok){$('#ai-status').textContent='Saved. Testing Claude now…';await ensureVoice(true);}else{$('#ai-status').textContent=result.error;}}
  catch{$('#ai-status').textContent='Could not save the key. Check that npm run dev is running.';}finally{button.disabled=false;}
};
render();void ensureStaff();
try{
 const office=createOffice($('#scene'),openPanel);
 document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>button.onclick=()=>{office.setView(button.dataset.view!);document.querySelectorAll('[data-view]').forEach(item=>item.classList.toggle('active',item===button));});
}catch(error){console.error('3D office unavailable',error);$('#scene-error').hidden=false;}
