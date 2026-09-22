import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, startPresidency, beginDay, replay } from '../src/world/oil-crisis.ts';
import { presidentFor, presidentTitle } from '../src/campaign/president.ts';
import { campaignRules } from '../src/campaign/campaign.ts';
import { campaignOpening } from '../../web/campaign.ts';
import { commandCenterMarkup } from '../../web/command-center.ts';

const promises = ['Improve public transport', 'Make schools safer', 'Bring back manufacturing jobs'];
test('president name is normalized, frozen, and survives saved event replay and subsequent days', () => {
  const original = createWorld();
  const identity = { firstName:'  José  Luis ', lastName:' O’Neill-Smith ' };
  const launched = startPresidency(original, promises, identity);
  identity.firstName = 'Changed';
  assert.deepEqual(launched.state, original.state);
  assert.deepEqual(presidentFor(launched), {firstName:'José Luis',lastName:'O’Neill-Smith'});
  assert.equal(Object.isFrozen(presidentFor(launched)), true);
  assert.equal(presidentTitle(launched), 'President José Luis O’Neill-Smith');
  const world = beginDay(launched);
  const restored = replay(JSON.parse(JSON.stringify(world.events)));
  assert.deepEqual(restored, world);
  assert.deepEqual(campaignRules.context(restored).president, presidentFor(launched));
});
test('invalid or partial identity is rejected without starting a presidency', () => {
  const world = createWorld();
  for (const identity of [null, {}, {firstName:'Alex'}, {firstName:' ',lastName:'Hill'}, {firstName:42,lastName:'Hill'},
    {firstName:'Alex',lastName:'a'.repeat(61)}, {firstName:'<script>',lastName:'Hill'}, {firstName:'Alex\n',lastName:'Hill'}]) {
    assert.throws(() => startPresidency(world,promises,identity), /name/);
  }
  assert.equal(world.events.length, 0);
  assert.equal(world.state.day, 1);
});
test('legacy presidencies replay unchanged; a fresh presidency has no previous name', () => {
  const old = startPresidency(createWorld(),promises);
  assert.deepEqual(replay(JSON.parse(JSON.stringify(old.events))),old);
  assert.equal(presidentFor(old),undefined);
  assert.equal(presidentTitle(old),'President');
  const named = startPresidency(createWorld(),promises,{firstName:'Alex',lastName:'Hill'});
  assert.equal(presidentTitle(named),'President Alex Hill');
  assert.equal(presidentFor(createWorld()),undefined);
});
test('map and office setup require both name fields before promises', () => {
  for (const markup of [campaignOpening(),commandCenterMarkup(createWorld())]) {
    assert.match(markup, /name="firstName"[^>]*required/);
    assert.match(markup, /name="lastName"[^>]*required/);
    assert.ok(markup.indexOf('name="firstName"') < markup.indexOf('Campaign promise 1'));
    assert.ok(markup.indexOf('name="lastName"') < markup.indexOf('Campaign promise 1'));
  }
});
