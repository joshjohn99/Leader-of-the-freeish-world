import type { World, Decision } from '../../../shared/schemas/oil-crisis.ts';

export type ReplyId = 'accept' | 'counter' | 'apologize' | 'reassure' | 'threaten' | 'decline' | 'challenge' | 'ask_needs' | 'give_credit';
export type PetrovMove = 'commercial' | 'pressure' | 'counteroffer' | 'partnership' | 'scarcity';
export interface PetrovOffer {
  readonly strategy: 'default' | 'conciliatory' | 'hardball';
  readonly id: string;
  readonly move: PetrovMove;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly mood: string;
  readonly motive: string;
  readonly line: string;
}
export interface DiplomacyRecord {
  readonly offer: PetrovOffer;
  readonly reply: ReplyId;
  readonly playerLine: string;
  readonly spokenLine?: string;
  readonly chosenLine?: string;
  readonly requestedQuantity?: number;
  readonly requestedUnitPrice?: number;
}
export interface ReplyOption {
  id: ReplyId;
  title: string;
  line: string;
  hint: string;
  blocked: string | null;
  decision: Decision;
}

/** A bounded, deterministic utility agent. Goals and memory select the move;
 * dialogue is an offline realization of that move, not a language-model call. */
function baseTurn(world: World): PetrovOffer {
  const s = world.state;
  const last = world.events.at(-1);
  const latestTalk = world.events.findLast(event => event.diplomacy)?.diplomacy;
  const recentThreats = world.events.slice(-4).filter(event => event.decision === 'threaten').length;
  const lastReply = last?.diplomacy?.reply;
  const available = Math.max(0, s.supplierOil - 12); // Petrov protects a domestic reserve.
  const scored: { move: PetrovMove; score: number }[] = [
    { move: 'scarcity', score: available < 10 ? 120 : -1 },
    { move: 'counteroffer', score: lastReply === 'counter' || lastReply === 'challenge' ? 110 : -1 },
    { move: 'pressure', score: s.relations <= -15 || last?.decision === 'threaten' ? 85 + recentThreats * 5 : -1 },
    { move: 'partnership', score: s.relations >= 10 || lastReply === 'apologize' || lastReply === 'reassure' || lastReply === 'give_credit' ? 70 : -1 },
    { move: 'commercial', score: 40 + (s.supplierTreasury < 45 ? 20 : 0) },
  ];
  const move = scored.sort((a,b)=>b.score-a.score)[0].move;
  let quantity = Math.min(10, available);
  let unitPrice = s.price;
  let mood = 'Open for business';
  let motive = 'Petrov wants export income without looking like he needs your business.';
  let line = '';
  if (move === 'scarcity') {
    unitPrice = Math.min(6, s.price + 1); mood = 'Protecting his own supply';
    motive = 'Petrov will not sell the final 12 oil reserved for his own country.';
    line = quantity ? `My own people have discovered cars. Inconvenient timing. I can release ${quantity} barrels at F$${unitPrice} per barrel. The rest stays here. Even I have a domestic audience.` : 'My domestic reserve is not for sale. My citizens also enjoy moving. Wait for production or make a diplomatic gesture; a threatening speech will not manufacture oil.';
  } else if (move === 'counteroffer') {
    const previous = latestTalk!.offer;
    quantity = Math.min(latestTalk!.requestedQuantity ?? previous.quantity, available);
    const flexible = s.supplierTreasury < 50 && s.relations > -15;
    unitPrice = flexible ? Math.max(1, (latestTalk!.requestedUnitPrice ?? previous.unitPrice) - 1) : (latestTalk!.requestedUnitPrice ?? previous.unitPrice);
    mood = flexible ? 'Making a concession' : 'Holding his price';
    motive = flexible ? 'Export revenue matters more than one point of margin today.' : 'His cash position or damaged relations lets him refuse your discount.';
    line = flexible ? `You asked for a discount. I can do ${quantity} barrels at F$${unitPrice} per barrel. In public, this is my generous initiative. In private, please pay before my finance department notices.` : `I heard your counteroffer. Then I heard my finance department laughing. ${quantity} barrels at F$${unitPrice} per barrel. That is my final price for this round.`;
  } else if (move === 'pressure') {
    unitPrice = Math.min(6, Math.max(3, s.price + recentThreats)); mood = 'Pride before discounts';
    motive = 'Threats make conceding publicly costly. Repeated threats increase his premium.';
    line = `I remember ${recentThreats > 1 ? 'the repeated threats' : 'that threat'}. Very cinematic. My offer is ${quantity} barrels at F$${unitPrice} per barrel. You can pay the pride premium or give me a reason to stop charging it.`;
  } else if (move === 'partnership') {
    unitPrice = Math.max(1, s.price - 1); mood = 'Cautiously cooperative';
    motive = 'A respectful, repeat customer is more valuable than a one-day diplomatic victory.';
    line = `${lastReply === 'apologize' ? 'Your apology has been accepted. My press office is having it framed.' : lastReply === 'reassure' ? 'You offered a calmer relationship. An unusually inexpensive concession.' : 'We have managed several conversations without an international incident.'} ${quantity} barrels at F$${unitPrice} per barrel. Let us call it friendship until the next invoice.`;
  } else {
    const opener = lastReply === 'ask_needs' ? 'You asked what I need. Export income, a domestic fuel reserve, and a photograph in which I look taller. The first two are negotiable subjects.' : lastReply === 'accept' ? 'The last payment arrived. Our relationship has never sounded more sincere.'
      : lastReply === 'decline' ? 'You walked away. I respect the drama. The oil is still here.'
      : last?.decision === 'subsidize' ? 'I saw the cheaper-gas announcement. More drivers, same oil. A beautiful advertisement for my business.'
      : last?.decision === 'ration' ? 'Fuel fasting? Excellent branding. Your people can still smell a shortage.'
      : last?.decision === 'wait' ? 'I enjoyed your podcast. Unlike a podcast, this offer contains oil.'
      : s.oil < 6 ? 'Your fuel reserve looks nervous. Mine has hired a publicist.'
      : 'President. I have oil. You have a campaign promise. Let us help each other with these unfortunate conditions.';
    line = `${opener} ${quantity} barrels at F$${unitPrice} per barrel. ${s.supplierTreasury < 45 ? 'I could be persuaded to discuss the price.' : 'My accountant is feeling unusually confident today.'}`;
  }
  if(lastReply==='ask_needs')line=`My priorities: keep twelve oil at home and earn export income. ${s.supplierTreasury<50?'My treasury would welcome a sale.':'My treasury can afford some patience.'} `+line;
  if(lastReply==='give_credit')line='You offered me the credit. My press office has already drafted the headline. Now we can discuss business without injuring the national ego. '+line;
  const id = `petrov-${world.events.length}-${s.day}-${move}-${quantity}-${unitPrice}`;
  return Object.freeze({ strategy: 'default', id, move, quantity, unitPrice, mood, motive, line });
}

export function petrovCandidates(world: World): readonly PetrovOffer[] {
  const base=baseTurn(world);
  if(base.move==='scarcity' || base.move==='counteroffer')return Object.freeze([base]);
  const choices:PetrovOffer[]=[base];
  if(base.unitPrice>1)choices.push(Object.freeze({...base,strategy:'conciliatory',id:base.id+'-conciliatory',move:'partnership',unitPrice:base.unitPrice-1,mood:'Choosing a commercial compromise',motive:'He gives up some margin to keep an export customer.',line:'We could spend another day competing for applause. Or we could make a slightly less expensive deal. I choose the option that clears my invoices.'}));
  if(world.state.relations<10 && base.unitPrice<6)choices.push(Object.freeze({...base,strategy:'hardball',id:base.id+'-hardball',move:'pressure',unitPrice:base.unitPrice+1,mood:'Testing your resolve',motive:'He judges your need for oil as leverage and risks delaying the sale.',line:'Your fuel reserve gives this conversation a certain urgency. Mine does not. I have adjusted my offer to reflect this fascinating difference.'}));
  return Object.freeze(choices);
}
export function petrovTurn(world: World, strategy: unknown = 'default'): PetrovOffer {
  const offer=petrovCandidates(world).find(offer=>offer.strategy===strategy);
  if(!offer)throw new Error('Petrov strategy is not legal in this situation.');
  return offer;
}

export function petrovReplies(world: World, offer = petrovTurn(world)): readonly ReplyOption[] {
  const cost = offer.quantity * offer.unitPrice;
  const options: ReplyOption[] = [];
  if (offer.quantity > 0) options.push({ id:'accept', title:`Accept ${offer.quantity} barrels for F$${cost}`, line:'We have a deal. Please describe it as a strategic triumph for both of us.', hint:'Pays and delivers today. Normal daily oil consumption still applies.', blocked:world.state.treasury < cost ? `Needs F$${cost}; you have F$${world.state.treasury}.` : null, decision:'buy' });
  if (offer.quantity > 0 && offer.move !== 'counteroffer' && offer.move !== 'scarcity') options.push({ id:'counter',title:'Ask him to sharpen his pencil',line:'Lower the price and I will let you call this your idea. That should be worth something.',hint:'No shipment today. Petrov weighs his cash needs against his pride.',blocked:null,decision:'wait' });
  if (offer.move === 'pressure') options.push({ id:'apologize', title:'Give him a way to save face', line:'My speech was aimed at the situation. Your magnificent leadership was merely standing nearby.',hint:'Relations +10, approval -2. No shipment today; he reconsiders tomorrow.',blocked:null,decision:'wait' });
  else options.push({id:'reassure',title:'Offer a less dramatic relationship',line:'Let’s try being reliable neighbors. Our speechwriters can recover on their own time.',hint:'Relations +5. No shipment today; future cooperation may be cheaper.',blocked:null,decision:'wait'});
  if (offer.move !== 'pressure' && offer.move !== 'scarcity') options.push({id:'threaten',title:'Tell him Freedoma has other options',line:'Keep pushing and we will take our business elsewhere. The elsewhere is being finalized.',hint:'Relations -15. Risks a pride premium on his next offer.',blocked:null,decision:'threaten'});
  if(offer.move==='pressure' || (offer.move==='counteroffer' && offer.unitPrice>1))options.push({id:'challenge',title:'Challenge the pride premium',line:'Is this an oil price or a fee for bruising your ego? Let your accountant answer.',hint:'Relations -3. No shipment today; forces a price review, which he may refuse.',blocked:null,decision:'wait'});
  if(world.events.at(-1)?.diplomacy?.reply!=='ask_needs')options.push({id:'ask_needs',title:offer.move==='scarcity'?'Ask what he can release later':'Ask what he actually needs',line:'Forget the podium for a moment. What is stopping us from making a useful deal?',hint:'No shipment today. He explains his priorities before your next reply.',blocked:null,decision:'wait'});
  if(offer.move==='partnership'||offer.move==='counteroffer')options.push({id:'give_credit',title:'Let him claim the diplomatic victory',line:'You can take the headline. I would prefer to take the oil eventually.',hint:'Relations +8, approval -1. No shipment today; opens a more cooperative round.',blocked:null,decision:'wait'});
  options.push({id:'decline',title:'End the call without a deal',line:'We’ll handle this ourselves. Please disregard any frantic callback from my staff.',hint:'No purchase today. Normal consumption continues; return to domestic choices.',blocked:null,decision:'wait'});
  return Object.freeze(options.map(option=>Object.freeze(option)));
}
