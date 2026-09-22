import test from 'node:test';import assert from 'node:assert/strict';
import {congressControls,congressVoteReport} from '../../web/congress-controls.ts';
import {createWorld,startPresidency,seatCongress,actInCongress} from '../src/world/oil-crisis.ts';
import {congressRules} from '../src/congress/congress.ts';
test('Congress exposes negotiation dropdown and vote button without a proposal field',()=>{
 const world=seatCongress(startPresidency(createWorld(),['<script>Better buses</script>','Better rural schools','Better family care']),7),html=congressControls(world,0,'house');
 assert.match(html,/<select id="congress-approach"/);assert.match(html,/data-congress-action="vote"/);assert.doesNotMatch(html,/<textarea|congress-draft|<script>/);assert.match(html,/&lt;script&gt;/);
});
test('failed ballot markup shows reasons and vote deficit',()=>{
 let world=seatCongress(startPresidency(createWorld(),['Better buses for all','Better rural schools','Better family care']),7);
 const chamber=congressRules.tally(world,0,'house').canPass?'senate':'house';world=actInCongress(world,0,chamber,'vote');const html=congressVoteReport(world,0,chamber);assert.match(html,/Vote failed/);assert.match(html,/fell short/);assert.match(html,/Banner Party/);assert.match(html,/oversight/);
});
