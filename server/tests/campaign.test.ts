import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,startPresidency,decidePromise,replay} from '../src/world/oil-crisis.ts';
import {campaignRules} from '../src/campaign/campaign.ts';
import {AgentRegistry,CharacterAgent} from '../src/agents/registry.ts';
import {validateStaff} from '../src/ai/staff.ts';
import {campaignPanel} from '../../web/campaign.ts';
const promises=['Unicorns at every school','Affordable fuel for all','Reliable public transport'];
test('three promises start Day 1 without delivering anything and replay intact',()=>{
 const old=createWorld(),world=startPresidency(old,promises);assert.deepEqual(world.state,old.state);assert.deepEqual(replay(world.events),world);assert.equal(campaignRules.context(world).promises[0],promises[0]);
 assert.throws(()=>startPresidency(world,promises));assert.throws(()=>startPresidency(old,['Only one promise']));assert.throws(()=>startPresidency(old,[promises[0],promises[0],promises[2]]));
});
test('studies cost treasury without magical fulfillment; choices follow previous actions',()=>{
 const world=startPresidency(createWorld(),promises);const study=decidePromise(world,0,'pilot','Study pony costumes, not imaginary animals.');
 assert.equal(study.state.treasury,77);assert.equal(study.state.oil,2);assert.equal(study.state.day,2);assert.match(study.events.at(-1)!.messages.join(' '),/No promised outcome/);
 assert.ok(!campaignRules.options(study,0).some(o=>o.id==='pilot'));assert.throws(()=>decidePromise(study,0,'pilot'));assert.deepEqual(replay(study.events),study);
 const withdrawn=decidePromise(study,0,'withdraw');assert.equal(campaignRules.context(withdrawn).history.at(-1)?.action,'withdraw');assert.deepEqual(replay(withdrawn.events),withdrawn);
});
test('repeated rhetoric loses approval and campaign text is escaped',()=>{
 let world=startPresidency(createWorld(),['<script>alert(1)</script>',promises[1],promises[2]]);world=decidePromise(world,0,'double_down');world=decidePromise(world,0,'clarify');world=decidePromise(world,0,'double_down');assert.match(world.events.at(-1)!.messages.join(' '),/costs 2 approval/);
 const html=campaignPanel(world,undefined,false,'Offline');assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
});
test('new characters register without changing dispatch logic',async()=>{
 const registry=new AgentRegistry().register(new CharacterAgent('pnn',async()=>({headline:'Evidence pending.'})));
 assert.deepEqual(await registry.respond('pnn',{world:createWorld(),interactions:[]},{key:'',model:'',workspaceId:''}),{headline:'Evidence pending.'});
 assert.throws(()=>registry.register(new CharacterAgent('pnn',async()=>({}))));assert.throws(()=>registry.respond('missing',{world:createWorld(),interactions:[]},{key:'',model:'',workspaceId:''}));
});
test('staff cannot invent executable actions or omit a promise',()=>{
 const world=startPresidency(createWorld(),promises);const brief={line:'Reality has requested a meeting.',pnn:'PNN awaits evidence.',choices:promises.map((_,index)=>({index,action:'clarify',title:'Explain the promise',line:'Let me explain the intended policy.'}))};
 assert.equal(validateStaff(brief,world).choices.length,3);assert.throws(()=>validateStaff({...brief,choices:brief.choices.map(c=>({...c,action:'create_unicorns'}))},world));assert.throws(()=>validateStaff({...brief,choices:[brief.choices[0],brief.choices[0],brief.choices[0]]},world));
});
