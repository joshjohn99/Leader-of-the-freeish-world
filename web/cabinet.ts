import type {World} from '../shared/schemas/oil-crisis.ts';
import {cabinetMembers,cabinetMember,offlineCabinet,validateCabinetMessages,validateCabinetVoice} from '../server/src/agents/cabinet.ts';
import type {CabinetMessage,CabinetVoice} from '../server/src/agents/cabinet.ts';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function createCabinet(getWorld:()=>World,onPromises:()=>void){
 const key='freedoma-cabinet-v1';let histories:Record<string,CabinetMessage[]>={};
 try{const saved=JSON.parse(localStorage.getItem(key)??'{}');for(const m of cabinetMembers)histories[m.id]=validateCabinetMessages(saved[m.id]??[]);}catch{histories={};}
 let selected='state',epoch=0,busy=false,status='Choose a secretary to consult.',voice:CabinetVoice|undefined,storageWarning='';
 const drawer=document.createElement('dialog');drawer.className='cabinet-drawer';drawer.setAttribute('aria-label','Your cabinet');document.body.append(drawer);
 function save(){try{localStorage.setItem(key,JSON.stringify(histories));}catch{storageWarning='Conversation storage unavailable; this chat lasts only this session.';}}
 function render(){const m=cabinetMember(selected),fallback=offlineCabinet(getWorld(),selected),history=histories[selected]??[];
 drawer.innerHTML=`<header class="cabinet-header"><div><small>THE PEOPLE WHO HELP YOU GOVERN</small><h2>Your cabinet</h2></div><button id="close-cabinet" aria-label="Close cabinet">✕</button></header><div class="cabinet-layout"><nav aria-label="Department executives">${cabinetMembers.map(person=>`<button data-secretary="${person.id}" aria-pressed="${selected===person.id}"><span class="cabinet-avatar">${person.initials}</span><span><b>${person.name}</b><small>${person.title}</small></span></button>`).join('')}</nav><section class="cabinet-chat"><h3>${m.name}</h3><p>${m.title} · ${m.focus}</p><p class="cabinet-status" role="status">${esc(status)} ${esc(storageWarning)}</p><div class="cabinet-messages" aria-label="Conversation with ${m.name}">${history.length?history.map(message=>`<div class="chat-bubble ${message.role==='user'?'player':''}"><small>${message.role==='user'?'YOU':m.name.toUpperCase()}</small><p>${esc(message.text)}</p></div>`).join(''):`<div class="chat-bubble"><p>${esc(m.greeting)}</p></div>`}</div><div class="cabinet-followups">${(voice?.replies??fallback.replies).map((reply,i)=>`<button data-cabinet-reply="${i}" ${busy?'disabled':''}>${esc(reply)}</button>`).join('')}</div><form id="cabinet-question"><label for="cabinet-input">Ask ${m.name.split(' ')[0]} about your promises or a decision</label><textarea id="cabinet-input" maxlength="600" required placeholder="How can your department help with my promises?" ${busy?'disabled':''}></textarea><button class="reply-button" ${busy?'disabled':''}>${busy?'Secretary is considering…':'Send question →'}</button></form><button id="cabinet-promises" class="text-button">Go to press briefing to act on a promise →</button><p class="aside-bottom">Private advice · No days or funds spent. Advice is not an enacted policy. The latest 20 messages per secretary are remembered.</p></section></div>`;
 drawer.querySelector<HTMLButtonElement>('#close-cabinet')!.onclick=()=>drawer.close();
 drawer.querySelectorAll<HTMLButtonElement>('[data-secretary]').forEach(button=>button.onclick=()=>{epoch++;busy=false;selected=button.dataset.secretary!;voice=undefined;status='Ready to advise · Ask a question.';render();});
 drawer.querySelectorAll<HTMLButtonElement>('[data-cabinet-reply]').forEach(button=>button.onclick=()=>void send((voice?.replies??fallback.replies)[Number(button.dataset.cabinetReply)]));
 drawer.querySelector<HTMLFormElement>('#cabinet-question')!.onsubmit=e=>{e.preventDefault();void send(drawer.querySelector<HTMLTextAreaElement>('#cabinet-input')!.value);};
 drawer.querySelector<HTMLButtonElement>('#cabinet-promises')!.onclick=()=>{drawer.close();onPromises();};
 const log=drawer.querySelector('.cabinet-messages')!;log.scrollTop=log.scrollHeight;
 }
 async function send(text:string){text=text.trim();if(!text||text.length>600||busy)return;const memberId=selected,world=getWorld(),context=JSON.stringify(world.events),request=++epoch;
 histories[memberId]=[...(histories[memberId]??[]),{role:'user',text}].slice(-19);save();busy=true;status='Consulting your secretary…';render();
 try{const response=await fetch(`/api/cabinet/${memberId}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({events:world.events,messages:histories[memberId]}),signal:AbortSignal.timeout(48000)});const data=await response.json();if(request!==epoch)return;
 if(context!==JSON.stringify(getWorld().events)){busy=false;status='Your game changed while the reply was being prepared. Ask again for current advice.';render();return;}
 if(data.mode!=='claude')throw Error(data.reason??data.error??'Cabinet unavailable');voice=validateCabinetVoice(data.voice);status='Claude · Private cabinet conversation';
 }catch{if(request!==epoch)return;voice=offlineCabinet(getWorld(),memberId);status='Offline briefing · Claude unavailable. Your question is saved; try again shortly.';}
 if(request!==epoch)return;histories[memberId]=[...(histories[memberId]??[]),{role:'assistant',text:voice!.line}].slice(-20);save();busy=false;render();
 }
 drawer.addEventListener('close',()=>{epoch++;busy=false;});
 return {open(){voice=undefined;status='Ready to advise · Ask a question.';render();drawer.showModal();},reset(){epoch++;busy=false;histories={};voice=undefined;save();if(drawer.open)drawer.close();}};
}
