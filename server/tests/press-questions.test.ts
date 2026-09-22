import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,startPresidency,beginDay,endDay,replyToPetrov,replyToMax,decidePromise,publishAnnouncement,replay} from '../src/world/oil-crisis.ts';
import {petrovTurn} from '../src/diplomacy/petrov.ts';
import {maxTurn} from '../src/billionaires/sterling.ts';
import {generateStaff,validateStaff} from '../src/ai/staff.ts';
import {pressQuestions,pressQuestionsMarkup,pressQuestionDraft} from '../../web/press-questions.ts';
import {campaignPanel} from '../../web/campaign.ts';
const start=()=>startPresidency(createWorld(),['Safer schools for everyone','Affordable fuel for families','Better local hospitals']);
const choices=[0,1,2].map(index=>({index,action:'clarify',title:'Explain the plan',line:'Here is what the promise means.'}));
function nextMorning(){
 let world=decidePromise(beginDay(start()),2,'clarify');
 world=replyToPetrov(world,'decline',petrovTurn(world).id);
 world=replyToMax(world,'decline',maxTurn(world).id,maxTurn(world).strategy);
 return endDay(world);
}

test('both desks appear offline and questions follow the campaign and local news without changing state',()=>{
 const world=start(),before=JSON.stringify(world);
 const questions=pressQuestions(world);
 assert.deepEqual(questions.map(q=>q.name),['PNN','BULL']);
 assert.match(questions[1].question,/Safer schools/);assert.match(questions[1].question,/cost/);
 assert.match(campaignPanel(world,undefined,false,''),/data-press-answer="bull"/);
 assert.equal(JSON.stringify(world),before);
 const changed=nextMorning();
 assert.match(pressQuestions(changed)[0].question,/Better local hospitals/);
 const local=changed.events.findLast(e=>e.localNews)?.localNews;
 assert.ok(local);assert.match(pressQuestions(changed)[1].question,new RegExp(local.community));
 assert.deepEqual(pressQuestions(replay(changed.events)),pressQuestions(changed));
});

test('generated media text is validated and escaped, and legacy briefs still render both outlets',()=>{
 const world=start(),legacy={line:'Mara has advice.',pnn:'A promise awaits.',choices};
 const brief=validateStaff({...legacy,bull:'<script>headline</script>',pnnQuestion:'What is the evidence?',bullQuestion:'Who pays <img src=x onerror=alert(1)>?'},world);
 const markup=pressQuestionsMarkup(world,brief);
 assert.doesNotMatch(markup,/<script>|<img/);assert.match(markup,/&lt;script&gt;/);
 assert.equal(pressQuestions(world,validateStaff(legacy,world))[1].name,'BULL');
 for(const bad of ['',42,'x'.repeat(401)])assert.throws(()=>validateStaff({...legacy,bullQuestion:bad},world));
 assert.throws(()=>pressQuestionDraft(world,brief,'unknown'));
});

test('an answer preserves the question in the public record and uses the existing daily announcement rule',()=>{
 const world=beginDay(start()),draft=pressQuestionDraft(world,undefined,'bull');
 assert.match(draft,/BULL asked:/);assert.ok(draft.length<600);
 const answered=publishAnnouncement(world,draft+'We will publish the costs before asking Congress to vote.');
 assert.equal(answered.state.day,world.state.day);
 assert.match(answered.events.at(-1)!.announcement!.text,/BULL asked:/);
 assert.deepEqual(replay(answered.events),answered);
 assert.throws(()=>publishAnnouncement(answered,'A second announcement today.'),/already/);
});

test('Claude receives local facts and generates two distinct media questions in the same briefing request',async()=>{
 const world=nextMorning();
 const choices=[0,1,2].map(index=>({index,action:'double_down',title:'Stand by the promise',line:'I stand by the promise I made.'}));
 let calls=0;
 const result=await generateStaff(world,'test-key','test-model','',async(_url,init)=>{
  calls++;
  const request=JSON.parse(init!.body as string),context=JSON.parse(request.messages[0].content);
  assert.match(request.system,/openly conservative/);assert.match(request.system,/Never invent casualties/);
  assert.ok(context.localNews.bulletins.length);
  assert.ok(request.output_config.format.schema.required.includes('bullQuestion'));
  return new Response(JSON.stringify({stop_reason:'end_turn',content:[{type:'text',text:JSON.stringify({maraLine:'Let us prepare the bill.',pnn:'PNN seeks evidence.',bull:'BULL asks who pays.',pnnQuestion:'What can voters verify?',bullQuestion:'How will you protect taxpayers?',promise0Choices:[choices[0]],promise1Choices:[choices[1]],promise2Choices:[choices[2]]})}]}));
 });
 assert.equal(calls,1);assert.equal(result.bull,'BULL asks who pays.');
 assert.equal(pressQuestions(world,result)[1].question,'How will you protect taxpayers?');
});
