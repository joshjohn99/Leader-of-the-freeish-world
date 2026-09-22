import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { worldMapProjection, mapCountries, countryForMapEvent } from '../../web/world-map.ts';
import { createWorld, decide, replay } from '../src/world/oil-crisis.ts';
import type { World, WorldEvent } from '../../shared/schemas/oil-crisis.ts';

function bulletin(kind: string): WorldEvent {
  return { id: 1, decision: 'wait', messages: [], after: createWorld().state,
    news: { id: 'pnn-test', kind, day: 1, headline: 'Recorded bulletin', facts: 'Recorded facts', stakes: 'Recorded stakes' } };
}
test('geographic registry uses real country outlines and isolates the Gaza strip', () => {
  const boundaries = JSON.parse(readFileSync(new URL('../../public/maps/countries.geojson', import.meta.url), 'utf8'));
  assert.equal(boundaries.features.length, mapCountries.length);
  assert.deepEqual(new Set(boundaries.features.map((f: {properties:{id:string}}) => f.properties.id)), new Set(mapCountries.map(c => c.id)));
  assert.equal(mapCountries.find(c => c.id === 'freedoma')!.counterpart, 'United States');
  assert.equal(mapCountries.find(c => c.id === 'petrovia')!.counterpart, 'Russia');
  const strip = boundaries.features.find((f: {properties:{id:string}}) => f.properties.id === 'lydian');
  for (const point of strip.geometry.coordinates.flat(2)) assert.ok(point[0] > 34 && point[0] < 34.6);
});
test('only territorial disputes color neighbors red; trade and low relations do not invent a war', () => {
  const world: World = { ...createWorld(), events: [bulletin('trade_war')] };
  let view = worldMapProjection(world);
  assert.deepEqual(view.countries.filter(c => c.conflict).map(c => c.id), ['karmenia', 'lydian']);
  const conflict: World = { ...world, events: [bulletin('border_dispute')] };
  view = worldMapProjection(conflict);
  assert.equal(view.countries.find(c => c.id === 'bellara')!.conflict, true);
  assert.equal(view.countries.find(c => c.id === 'northhaven')!.conflict, true);
  assert.equal(view.countries.find(c => c.id === 'eastmere')!.conflict, false);
  assert.equal(view.countries.find(c => c.id === 'petrovia')!.conflict, false);
  const response: WorldEvent = { id: 2, decision: 'wait', messages: [], after: world.state, newsResponse: { newsId:'pnn-test', action:'mediate' } };
  view = worldMapProjection({ ...world, events:[...conflict.events, response] });
  assert.equal(view.countries.find(c => c.id === 'bellara')!.conflict, true);
  assert.match(view.countries.find(c => c.id === 'bellara')!.reason, /no settlement/);
});
test('map projection is deterministic, read only, replay compatible and routes news to its location', () => {
  let world = createWorld();
  for (let i = 0; i < 8; i++) world = decide(world, 'wait');
  const before = JSON.stringify(world);
  assert.deepEqual(worldMapProjection(world), worldMapProjection(replay(world.events)));
  assert.equal(JSON.stringify(world), before);
  assert.equal(countryForMapEvent(bulletin('shipping')), 'eastmere');
  assert.equal(countryForMapEvent(bulletin('border_dispute')), 'bellara');
  assert.equal(countryForMapEvent(undefined), 'freedoma');
});
