import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, decide, replay } from '../src/world/oil-crisis.ts';

test('purchase transfers money and oil, then applies explicit consumption, production and revenue', () => {
  const before = createWorld(); const after = decide(before, 'buy');
  assert.equal(after.state.treasury, 63); assert.equal(after.state.supplierTreasury, 40);
  assert.equal(after.state.oil, 12); assert.equal(after.state.supplierOil, 54);
  assert.equal(after.state.oil + after.state.supplierOil, before.state.oil + before.state.supplierOil - 6 + 4);
  assert.equal(after.state.treasury + after.state.supplierTreasury, before.state.treasury + before.state.supplierTreasury + 3);
  assert.equal(after.state.relations, 5); assert.equal(after.state.approval, 56);
});
test('subsidy consumes cash and increases demand; repetition has a knock-on effect', () => {
  const first = decide(createWorld(), 'subsidize');
  assert.equal(first.state.treasury, 75); assert.equal(first.state.oil, 0); assert.equal(first.state.approval, 61);
  const second = decide(first, 'subsidize');
  assert.equal(second.state.approval, 39); assert.equal(second.state.subsidyDays, 2);
  assert.equal(decide(second, 'wait').state.subsidyDays, 0);
});
test('rationing preserves oil but costs approval', () => {
  const world = decide(createWorld(), 'ration');
  assert.equal(world.state.oil, 5); assert.equal(world.state.approval, 52);
});
test('threats cause a predictable foreign response; purchases can repair relations', () => {
  let world = decide(createWorld(), 'threaten');
  assert.equal(world.state.price, 4); assert.equal(world.state.relations, -15);
  world = decide(world, 'buy');
  assert.equal(world.state.treasury, 46); assert.equal(world.state.price, 2);
  let friendly = createWorld();
  for (let i = 0; i < 3; i++) friendly = decide(friendly, 'buy');
  assert.equal(friendly.state.price, 1);
});
test('waiting consumes oil and shortages cost approval without going below zero', () => {
  let world = decide(createWorld(), 'wait');
  assert.equal(world.state.oil, 2); assert.equal(world.state.approval, 56);
  world = decide(world, 'wait'); assert.equal(world.state.approval, 44);
  for (let i = 0; i < 20; i++) world = decide(world, 'wait');
  assert.equal(world.state.approval, 0); assert.equal(world.state.oil, 0);
});
test('invalid decisions and unaffordable actions reject atomically', () => {
  const world = createWorld(); const snapshot = JSON.stringify(world);
  for (const invalid of ['toString', '__proto__', 'invade', '', null, NaN, Infinity, {}]) assert.throws(() => decide(world, invalid), /Unknown decision/);
  assert.equal(JSON.stringify(world), snapshot);
  let poor = world;
  for (let i = 0; i < 6; i++) poor = decide(poor, 'buy');
  const poorSnapshot = JSON.stringify(poor);
  assert.throws(() => decide(poor, 'buy'), /treasury/);
  assert.equal(JSON.stringify(poor), poorSnapshot);
  assert.throws(() => decide({ ...world, state: { ...world.state, treasury: 0 } }, 'subsidize'), /treasury/);
  assert.throws(() => decide({ ...world, state: { ...world.state, supplierOil: 0 } }, 'buy'), /oil available/);
});
test('worlds and events are frozen, replayable and deterministic', () => {
  const initial = createWorld(); let world = initial;
  for (const action of ['subsidize', 'threaten', 'buy', 'ration']) world = decide(world, action);
  assert.deepEqual(initial, createWorld()); assert.deepEqual(replay(world.events), world);
  assert.throws(() => { world.state.oil = 999; }, TypeError);
  assert.throws(() => { world.events[0].after.oil = 999; }, TypeError);
  assert.throws(() => { world.events[0].messages.push('fake'); }, TypeError);
  const corrupted = JSON.parse(JSON.stringify(world.events)); corrupted[0].after.oil = 999;
  assert.throws(() => replay(corrupted), /does not match/);
});
test('approval and relations stay bounded across long policy sequences', () => {
  let world = createWorld();
  for (let i = 0; i < 100; i++) world = decide(world, 'threaten',true,false);
  assert.equal(world.state.relations, -100); assert.ok(world.state.approval >= 0 && world.state.approval <= 100);
});
