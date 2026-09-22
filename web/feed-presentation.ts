/** Keeps thread expansion and reading position across the feed's DOM updates. */
export function createFeedPresentation(){
 const expanded=new Set<string>();let seen=new Set<string>(),initialized=false;
 return {openThread(id:string){expanded.add(id);},reset(){expanded.clear();seen.clear();initialized=false;},apply(host:HTMLElement){
  host.querySelectorAll<HTMLDetailsElement>('[data-thread]').forEach(details=>{details.open=expanded.has(details.dataset.thread!);details.ontoggle=()=>{if(details.open)expanded.add(details.dataset.thread!);else expanded.delete(details.dataset.thread!);};});
  const cards=[...host.querySelectorAll<HTMLElement>('[data-feed-id]')],fresh=cards.filter(card=>!seen.has(card.dataset.feedId!));
  if(initialized&&!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const card of fresh)card.animate([{opacity:0,transform:'translateY(-14px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'ease-out'});
  const newRoots=fresh.filter(card=>!card.classList.contains('nested-post'));
  if(initialized&&newRoots.length){
   if(host.scrollTop<240)host.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
   else {const button=document.createElement('button');button.className='feed-new-posts';button.textContent='New posts ↑';button.onclick=()=>{host.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});button.remove();};host.prepend(button);}
  }
  for(const card of cards)seen.add(card.dataset.feedId!);if(seen.size>500)seen=new Set(cards.map(c=>c.dataset.feedId!));initialized=true;
 }};
}
