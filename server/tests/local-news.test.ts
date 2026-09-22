import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,beginDay,endDay,replay,decide,replyToPetrov,replyToMax} from '../src/world/oil-crisis.ts';
import {petrovTurn} from '../src/diplomacy/petrov.ts';
import {maxTurn} from '../src/billionaires/sterling.ts';
import {localNewsEngine} from '../src/events/local-news.ts';

test('BULL produces fictional local headlines as the day advances',()=>{
 let world=beginDay(createWorld());
 world=decide(world,'wait');world=replyToPetrov(world,'decline',petrovTurn(world).id);world=replyToMax(world,'decline',maxTurn(world).id,maxTurn(world).strategy);
 const bulletin=localNewsEngine.next(world);world=endDay(world);assert.deepEqual(world.events.at(-1)?.localNews,bulletin);assert.equal(world.events.at(-1)?.localNews?.day,2);assert.match(world.events.at(-1)!.localNews!.headline,/SCHOOL|OFFICER|LAYOFF|HOSPITAL/);assert.deepEqual(replay(world.events),world);
});
