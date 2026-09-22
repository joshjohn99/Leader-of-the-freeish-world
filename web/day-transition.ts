export function createDayTransition(){
 const dialog=document.createElement('dialog');dialog.className='day-transition';dialog.setAttribute('aria-labelledby','passing-title');
 dialog.innerHTML='<span class="case-tag">FREEDOMA KEEPS MOVING</span><h2 id="passing-title">A day is passing…</h2><p id="passing-day"></p><p>Your decision is recorded. Preparing reactions from your advisers, other leaders, and the public.</p><p id="passing-progress" role="status" aria-live="polite"></p><button class="text-button" id="passing-continue">Continue while reactions finish →</button>';
 document.body.append(dialog);let timer:ReturnType<typeof setTimeout>|undefined;
 const close=()=>{if(timer)clearTimeout(timer);timer=undefined;if(dialog.open)dialog.close();};
 dialog.querySelector<HTMLButtonElement>('#passing-continue')!.onclick=close;dialog.addEventListener('close',()=>{if(timer)clearTimeout(timer);timer=undefined;});
 return {begin(day:number){close();dialog.querySelector('#passing-day')!.textContent=day>30?'The polls have closed. Election night is here.':`Moving into day ${day} of 30`;dialog.querySelector('#passing-progress')!.textContent='Gathering reactions…';dialog.showModal();timer=setTimeout(close,52000);},update(pending:string[]){if(!dialog.open)return;if(!pending.length){close();return;}dialog.querySelector('#passing-progress')!.textContent=`Waiting for: ${pending.join(', ')}.`;},close};
}
