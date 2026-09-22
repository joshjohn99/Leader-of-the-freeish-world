import type { World } from '../shared/schemas/oil-crisis.ts';
export type SocialPost = { id:string; author:string; handle:string; role:string; text:string; tone:'supportive'|'critical'|'neutral'; day:number; likes:number };
export function socialFeed(world:World): SocialPost[] {
  const posts:SocialPost[]=[];
  const add=(day:number,slot:number,author:string,handle:string,role:string,text:string,tone:SocialPost['tone'])=>posts.push({id:`${day}-${slot}`,author,handle,role,text,tone,day,likes:17+((day*97+slot*53)%790)});
  if(!world.events.length){
    add(1,0,'Nina at the Pump','ninaneedsfuel','Commuter','New president. Same car. Cautiously optimistic that one of them will get me to work.','neutral');
    add(1,1,'Team Freedoma','freedomaforever','Supporter','Finally a president who understands the people. Specifically the people who heard “free gas.”','supportive');
    add(1,2,'The Daily Shrug','dailyshrug','News desk','The Department of Energy has requested that campaign promises be measured in available fuel.','neutral');
  }
  for(const event of world.events.slice(-8)){
    if(event.news)add(event.after.day,event.id*100,'PNN','pnn','News desk',event.news.headline+'. '+event.news.facts,'neutral');
    if(event.campaign){add(event.after.day,event.id*10,'PNN','pnn','News desk',event.campaign.kind==='launch'?`The president promised: ${event.campaign.promises.join('; ')}. PNN is awaiting evidence, and possibly a dictionary.`:`A campaign promise receives a ${event.campaign.action.replace('_',' ')} response. An announcement is not a delivery receipt.`,'neutral');continue;}
    const day=event.after.day;const s=event.after;const talk=event.diplomacy;
    add(day,0,'Nina at the Pump','ninaneedsfuel','Commuter',s.oil===0?'The reserve is empty. My boss says “find a way.” Does anyone have the presidential helicopter on rideshare?':`Apparently we have ${s.oil} oil in reserve now. I am choosing to experience this as progress until my next commute.`,s.oil===0?'critical':'supportive');
    const spin=event.sterling?(event.sterling.reply==='fund'?'The buses are real. I repeat: an actual policy with wheels.':event.sterling.reply==='humiliate'?'The president roasted a billionaire. Finally, renewable entertainment.':'The president is negotiating with Max. Someone hide the launch button.'):(talk?.reply==='accept'||event.decision==='buy')?'Oil deal signed. Strategic genius. Invoice-based diplomacy is still diplomacy.':talk?'The president is working the phones. Some of you have never managed an international group chat and it shows.':event.decision==='subsidize'?'Cheaper gas! Promise kept! Please direct all questions about supply to a different reply thread.':event.decision==='ration'?'Fuel fasting builds character. Posting this from the passenger seat of a very character-building bus.':event.decision==='threaten'?'That speech had STRENGTH. I have watched it three times and filled my tank zero times.':'The president is taking time to think. Imagine that. Thinking. Revolutionary.';
    add(day,1,'Team Freedoma','freedomaforever','Supporter',spin,'supportive');
    const critique=event.sterling?(event.sterling.reply==='fund'?'Three days of buses. Max has ordered a statue with a longer warranty.':'Max called a meeting a product launch. The product appears to be attention.'):talk?.reply==='accept'?`We bought ${talk.offer.quantity} oil for ${talk.offer.quantity*talk.offer.unitPrice} treasury. Please clap at the appropriate exchange rate.`:event.decision==='buy'?'Oil purchased. Diplomacy is apparently shopping with flags.':talk?'Another day of talks. The fuel gauge has declined to issue a joint statement.':event.decision==='ration'?'“Freedom Fuel Fasting.” My car has been practicing this revolutionary policy since yesterday.':event.decision==='subsidize'?'Making gas cheaper without making more gas. This is how you get a queue with excellent brand loyalty.':event.decision==='threaten'?'Our new energy source is apparently a strongly worded sentence. Can I charge my car with the transcript?':'The crisis now has more screen time than the president. It should start a podcast.';
    add(day,2,'Civic Side-Eye','civicsideeye','Satire account',critique,'critical');
    add(day,3,'The Daily Shrug','dailyshrug','News desk',`Day ${day}: approval ${s.approval}%. Treasury ${s.treasury}. ${talk?.reply==='accept'?'A negotiated shipment arrived.':talk?'Talks ended without a shipment today.':'The Department of Energy confirms today’s policy is in effect.'}`,'neutral');
    if(s.approval<35)add(day,4,'Undecided Dave','stillundecideddave','Swing voter','I was undecided. Now I am undecided and walking. The second part is starting to influence the first.','critical');
  }
  return posts.reverse();
}
