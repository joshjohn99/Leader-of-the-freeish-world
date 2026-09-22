import type {World} from '../shared/schemas/oil-crisis.ts';
import type {StaffBrief} from '../server/src/ai/staff.ts';
import {campaignRules} from '../server/src/campaign/campaign.ts';
import {escapeHtml as e} from './conversation.ts';

export function pressQuestions(world:World,brief?:StaffBrief){
 const context=campaignRules.context(world);
 const latest=context.history.at(-1);
 const promise=context.promises[latest?.index??0]??'your campaign agenda';
 const local=world.events.findLast(event=>event.localNews)?.localNews;
 const worldNews=world.events.findLast(event=>event.news)?.news;
 return [
  {id:'pnn',name:'PNN',desk:'World & accountability desk',headline:brief?.pnn??worldNews?.headline??'CAMPAIGN PROMISES MEET THE FOLLOW-UP QUESTION',question:brief?.pnnQuestion??`President, on “${promise}”, what concrete step can the public verify, and what remains only a promise?`},
  {id:'bull',name:'BULL',desk:'Conservative desk · Local voices',headline:brief?.bull??local?.headline??'BIG PROMISES. WHO GETS THE BILL?',question:brief?.bullQuestion??(local?`President, regarding ${local.community}: ${local.stakes} What will you do for local families without handing taxpayers another blank check?`:`President, you promised “${promise}”. Why should working families trust the government with more of their money? What will this cost, and where is the limit on government involvement?`)},
 ];
}

export function pressQuestionsMarkup(world:World,brief?:StaffBrief){
 return `<section class="press-questions" aria-label="Questions from the press"><p class="eyebrow">TWO NETWORKS. TWO VERY DIFFERENT FOLLOW-UPS.</p>${pressQuestions(world,brief).map(outlet=>`<article class="press-question press-question--${outlet.id}"><header><b>${outlet.name}</b><span>${outlet.desk}</span></header><h3>${e(outlet.headline)}</h3><p class="press-question-line">“${e(outlet.question)}”</p><button class="text-button" data-press-answer="${outlet.id}">Answer ${outlet.name} through the Press Secretary →</button></article>`).join('')}<p class="fineprint">Answers enter the public record through your daily announcement. Bills and votes below make policy.</p></section>`;
}

export function pressQuestionDraft(world:World,brief:StaffBrief|undefined,outletId:string){
 const outlet=pressQuestions(world,brief).find(outlet=>outlet.id===outletId);
 if(!outlet)throw Error('Unknown press outlet');
 return `${outlet.name} asked: “${outlet.question}”\n\nMy response: `;
}
