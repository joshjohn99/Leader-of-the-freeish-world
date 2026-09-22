import type {World} from '../shared/schemas/oil-crisis.ts';
import type {Chamber} from '../server/src/congress/congress.ts';
import {cabinetMembers,cabinetMember,offlineCabinet,validateCabinetMessages,validateCabinetVoice} from '../server/src/agents/cabinet.ts';
import type {CabinetMessage,CabinetVoice} from '../server/src/agents/cabinet.ts';
import {cabinetPromiseOverview,promiseOwner,validatePromiseIndex} from '../server/src/cabinet/promises.ts';
import {cabinetOverviewMarkup,cabinetGuidanceMarkup} from './cabinet-promises.ts';
import {escapeHtml as esc} from './conversation.ts';
import './cabinet-promises.css';

interface CabinetActions {
 assign(index:number,secretaryId:string):void;
 congress(index:number,chamber:Chamber):void;
 promises():void;
}
export function createCabinet(getWorld:()=>World,actions:CabinetActions){
 const key='freedoma-cabinet-v2';let histories:Record<string,CabinetMessage[]>={};
 try{
  const saved=JSON.parse(localStorage.getItem(key)??'null');
  if(saved){for(const m of cabinetMembers)for(const topic of ['general','0','1','2'])histories[m.id+':'+topic]=validateCabinetMessages(saved[m.id+':'+topic]??[]);}
  else{const legacy=JSON.parse(localStorage.getItem('freedoma-cabinet-v1')??'{}');for(const m of cabinetMembers)histories[m.id+':general']=validateCabinetMessages(legacy[m.id]??[]);}
 }catch{histories={};}
 let selected='state',promiseIndex:number|undefined,section:'promises'|'chat'='promises';
 let epoch=0,busy=false,status='Assign a secretary to each promise.',voice:CabinetVoice|undefined,storageWarning='',draft='';
 let worldContext=JSON.stringify(getWorld().events);
 const drawer=document.createElement('dialog');drawer.className='cabinet-drawer';drawer.setAttribute('aria-label','Your cabinet');document.body.append(drawer);
 const historyKey=()=>selected+':'+(promiseIndex??'general');
 function save(){try{localStorage.setItem(key,JSON.stringify(histories));}catch{storageWarning='Conversation storage unavailable; this chat lasts only this session.';}}
 function selectChat(id:string,index?:number){
  cabinetMember(id);if(index!==undefined)validatePromiseIndex(getWorld(),index);
  epoch++;busy=false;selected=id;promiseIndex=index;voice=undefined;draft='';section='chat';status='Ready to advise · Current progress is shown below.';render();
 }
 function render(){
  const world=getWorld(),m=cabinetMember(selected),fallback=offlineCabinet(world,selected,promiseIndex),history=histories[historyKey()]??[];
  const promises=cabinetPromiseOverview(world);
  drawer.innerHTML=`<header class="cabinet-header"><div><small>THE PEOPLE WHO HELP YOU GOVERN</small><h2>Your cabinet</h2></div><button id="close-cabinet" aria-label="Close cabinet">✕</button></header>
   <nav class="cabinet-section-tabs" aria-label="Cabinet sections"><button data-cabinet-section="promises" aria-pressed="${section==='promises'}">Your Promises</button><button data-cabinet-section="chat" aria-pressed="${section==='chat'}">Consult a secretary</button></nav>
   <p class="cabinet-status" role="status">${esc(status)} ${esc(storageWarning)}</p>
   ${section==='promises'?cabinetOverviewMarkup(world):`<div class="cabinet-layout"><nav aria-label="Department executives">${cabinetMembers.map(person=>`<button data-secretary="${person.id}" aria-pressed="${selected===person.id}"><span class="cabinet-avatar">${person.initials}</span><span><b>${person.name}</b><small>${person.title}</small></span></button>`).join('')}</nav>
    <section class="cabinet-chat"><h3>${m.name}</h3><p>${m.title} · ${m.focus}</p>
     <label for="cabinet-topic">Discuss a promise</label><select id="cabinet-topic"><option value="" ${promiseIndex===undefined?'selected':''}>General advice</option>${promises.map(p=>`<option value="${p.index}" ${promiseIndex===p.index?'selected':''}>${p.index+1}. ${esc(p.promise)}${p.owner?.id===selected?' · Your assignment':''}</option>`).join('')}</select>
     ${promiseIndex!==undefined?`<p>Lead: <b>${esc(promiseOwner(world,promiseIndex)?.name??'Unassigned')}</b> · <button class="text-button" data-cabinet-section="promises">Manage assignments</button></p>${cabinetGuidanceMarkup(world,promiseIndex)}`:''}
     <p class="speech">${esc(voice?.line??fallback.line)}</p>
     ${history.length?`<details><summary>Conversation history · ${history.length} messages</summary><p class="fineprint">Earlier advice reflects earlier circumstances. Current progress and costs are shown above.</p><div class="cabinet-messages" aria-label="Conversation with ${m.name}">${history.map(message=>`<div class="chat-bubble ${message.role==='user'?'player':''}"><small>${message.role==='user'?'YOU':m.name.toUpperCase()}</small><p>${esc(message.text)}</p></div>`).join('')}</div></details>`:''}
     <div class="cabinet-followups">${(voice?.replies??fallback.replies).map((reply,i)=>`<button data-cabinet-reply="${i}" ${busy?'disabled':''}>${esc(reply)}</button>`).join('')}</div>
     <form id="cabinet-question"><label for="cabinet-input">Ask ${m.name.split(' ')[0]} about ${promiseIndex===undefined?'your promises or a decision':'this promise'}</label><textarea id="cabinet-input" maxlength="600" required placeholder="What is the next realistic step?" ${busy?'disabled':''}>${esc(draft)}</textarea><button class="reply-button" ${busy?'disabled':''}>${busy?'Secretary is considering…':'Send question →'}</button></form>
     <button id="cabinet-promises" class="text-button">Go to On the Record →</button><p class="aside-bottom">Private advice · No days or funds spent. You approve every action. Each secretary remembers 20 messages per promise and a separate general conversation.</p>
    </section></div>`}`;
  drawer.querySelector<HTMLButtonElement>('#close-cabinet')!.onclick=()=>drawer.close();
  drawer.querySelectorAll<HTMLButtonElement>('[data-cabinet-section]').forEach(button=>button.onclick=()=>{epoch++;busy=false;voice=undefined;section=button.dataset.cabinetSection as 'promises'|'chat';status=section==='promises'?'Assignments are optional. One secretary can lead several promises.':'Ready to advise · Choose a promise or ask a general question.';render();});
  drawer.querySelectorAll<HTMLSelectElement>('[data-cabinet-owner]').forEach(select=>select.onchange=()=>{
   try{const index=Number(select.dataset.cabinetOwner);actions.assign(index,select.value);worldContext=JSON.stringify(getWorld().events);epoch++;busy=false;voice=undefined;status=`${cabinetMember(select.value).name} now leads promise ${index+1}. No time or funds spent.`;render();drawer.querySelector<HTMLElement>('#'+select.id)?.focus();}
   catch(error){status=error instanceof Error?error.message:'Assignment unavailable.';render();}
  });
  drawer.querySelectorAll<HTMLButtonElement>('[data-cabinet-consult]').forEach(button=>button.onclick=()=>{const index=Number(button.dataset.cabinetConsult),owner=promiseOwner(getWorld(),index);if(owner)selectChat(owner.id,index);});
  drawer.querySelectorAll<HTMLButtonElement>('[data-cabinet-congress]').forEach(button=>button.onclick=()=>{drawer.close();actions.congress(Number(button.dataset.cabinetCongress),button.dataset.cabinetChamber as Chamber);});
  drawer.querySelectorAll<HTMLButtonElement>('[data-secretary]').forEach(button=>button.onclick=()=>selectChat(button.dataset.secretary!,promiseIndex));
  const topic=drawer.querySelector<HTMLSelectElement>('#cabinet-topic');if(topic)topic.onchange=()=>selectChat(selected,topic.value===''?undefined:Number(topic.value));
  drawer.querySelectorAll<HTMLButtonElement>('[data-cabinet-reply]').forEach(button=>button.onclick=()=>void send((voice?.replies??fallback.replies)[Number(button.dataset.cabinetReply)]));
  const form=drawer.querySelector<HTMLFormElement>('#cabinet-question');
  if(form){const input=drawer.querySelector<HTMLTextAreaElement>('#cabinet-input')!;input.oninput=()=>{draft=input.value;};form.onsubmit=e=>{e.preventDefault();void send(input.value);};}
  const press=drawer.querySelector<HTMLButtonElement>('#cabinet-promises');if(press)press.onclick=()=>{drawer.close();actions.promises();};
 }
 async function send(text:string){
  text=text.trim();if(!text||text.length>600||busy)return;
  const memberId=selected,topic=promiseIndex,thread=historyKey(),world=getWorld(),context=JSON.stringify(world.events),request=++epoch;
  histories[thread]=[...(histories[thread]??[]),{role:'user',text}].slice(-19);draft='';save();busy=true;status='Consulting your secretary…';render();
  try{
   const response=await fetch(`/api/cabinet/${memberId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:world.events,messages:histories[thread],...(topic===undefined?{}:{promise:topic})}),signal:AbortSignal.timeout(48000)});
   const data=await response.json();if(request!==epoch)return;
   if(context!==JSON.stringify(getWorld().events)){worldChanged();return;}
   if(data.mode!=='claude')throw Error(data.reason??data.error??'Cabinet unavailable');
   voice=validateCabinetVoice(data.voice);status='Claude · Private cabinet advice';
  }catch{
   if(request!==epoch)return;
   if(context!==JSON.stringify(getWorld().events)){worldChanged();return;}
   voice=offlineCabinet(getWorld(),memberId,topic);status='Offline briefing · Current progress is available. Try your question again when Claude reconnects.';
  }
  if(request!==epoch)return;
  histories[thread]=[...(histories[thread]??[]),{role:'assistant',text:voice!.line}].slice(-20);save();busy=false;render();
 }
 function worldChanged(){
  const current=JSON.stringify(getWorld().events);if(current===worldContext)return;
  worldContext=current;epoch++;busy=false;voice=undefined;
  if(promiseIndex!==undefined&&!cabinetPromiseOverview(getWorld())[promiseIndex])promiseIndex=undefined;
  status='Progress updated. Ask for fresh advice about the latest decisions.';
  if(drawer.open)render();
 }
 drawer.addEventListener('close',()=>{epoch++;busy=false;});
 return {
  open(index?:number){
   worldContext=JSON.stringify(getWorld().events);epoch++;busy=false;voice=undefined;draft='';
   if(index!==undefined){validatePromiseIndex(getWorld(),index);const owner=promiseOwner(getWorld(),index);promiseIndex=index;if(owner){selected=owner.id;section='chat';}else section='promises';}
   else section='promises';
   status=section==='promises'?'Assignments are optional. One secretary can lead several promises.':'Ready to discuss this promise.';render();
   if(!drawer.open)drawer.showModal();
   if(index!==undefined&&section==='promises')drawer.querySelector<HTMLElement>('#cabinet-owner-'+index)?.focus();
  },
  consult(id:string){worldContext=JSON.stringify(getWorld().events);selectChat(id);if(!drawer.open)drawer.showModal();},
  worldChanged,
  reset(){epoch++;busy=false;histories={};voice=undefined;promiseIndex=undefined;section='promises';draft='';save();if(drawer.open)drawer.close();}
 };
}
