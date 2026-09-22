import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, decide } from '../src/world/oil-crisis.ts';
import { chartSeries, chartMarkup, metrics } from '../../web/charts.ts';
import { broadcastFor, actionArtwork } from '../../web/broadcasts.ts';

test('charts include the starting position and every recorded day, not just the current value', () => {
  const world=decide(decide(createWorld(),'subsidize'),'threaten');
  assert.deepEqual(chartSeries(world,'approval'),[{day:1,value:55},{day:2,value:61},{day:3,value:45}]);
  assert.deepEqual(chartSeries(world,'relations'),[{day:1,value:0},{day:2,value:0},{day:3,value:-15}]);
  const html=chartMarkup(world,'relations');
  assert.match(html,/Day 3: -15 points/);
  assert.doesNotMatch(html,/NaN|Infinity/);
});
test('all charts render a single starting point and flat zero history without invalid coordinates', () => {
  for(const metric of metrics){
    assert.match(chartMarkup(createWorld(),metric.key),/Starting position/);
    assert.doesNotMatch(chartMarkup(createWorld(),metric.key),/NaN|Infinity/);
  }
  let world=createWorld();for(let i=0;i<12;i++)world=decide(world,'wait');
  assert.equal(chartSeries(world,'oil').at(-1)?.value,0);
  assert.doesNotMatch(chartMarkup(world,'oil'),/NaN|Infinity/);
});
test('appearances reflect the recorded action and outcome and cannot advance the simulation', () => {
  const formats=new Set<string>();
  for(const decision of ['buy','subsidize','ration','threaten','wait']) {
    const world=decide(createWorld(),decision);const before=JSON.stringify(world);
    const event=world.events[0];const broadcast=broadcastFor(event);
    formats.add(broadcast.format);assert.equal(broadcast.day,1);
    if(event.after.oil===0)assert.match(broadcast.outcome,/no oil remaining/);
    else assert.ok(broadcast.outcome.includes(`${event.after.oil} oil remaining`));
    assert.match(actionArtwork(event.decision),/<svg/);
    assert.equal(JSON.stringify(world),before);
  }
  assert.equal(formats.size,5);
});
