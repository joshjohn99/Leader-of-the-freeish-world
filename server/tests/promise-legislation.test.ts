import test from 'node:test';import assert from 'node:assert/strict';
import {createWorld,startPresidency,seatCongress,beginDay,actInCongress,replay} from '../src/world/oil-crisis.ts';
import {congressRules} from '../src/congress/congress.ts';import {agendaEngine} from '../src/agenda/agenda.ts';
import {campaignPanel,promiseLegislation} from '../../web/campaign.ts';
const start=()=>beginDay(seatCongress(startPresidency(createWorld(),['Improve healthcare access','Build affordable housing','Raise wages for workers']),42));
test('On the Record exposes bill actions for the exact promise and secondary statements',()=>{
 const world=start(),html=campaignPanel(world,undefined,false,'Ready');assert.match(html,/data-promise-bill="0"/);assert.match(html,/data-promise-bill="1"/);assert.match(html,/data-promise-bill="2"/);assert.match(html,/Introduce bill/);assert.match(html,/<details class="promise-statements">/);
});
test('introducing a bill records work, completes public agenda and changes CTA without advancing day',()=>{
 const before=start(),world=actInCongress(before,1,'house','introduce');assert.equal(world.state.day,before.state.day);assert.equal(world.state.treasury,before.state.treasury);assert.equal(congressRules.records(world,1)[0].action,'introduce');assert.equal(congressRules.records(world,0).length,0);assert.equal(agendaEngine.tasks(world).find(t=>t.id==='public')?.done,true);
 assert.match(promiseLegislation(world,1),/Negotiate bill \/ Call vote/);assert.match(promiseLegislation(world,0),/disabled/);assert.throws(()=>actInCongress(world,1,'house','introduce'));assert.deepEqual(replay(world.events),world);
});
