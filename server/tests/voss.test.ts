import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld,beginDay,replyToVoss,replay} from '../src/world/oil-crisis.ts';
import {vossTurn,vossReplies} from '../src/diplomacy/voss.ts';

test('fictional Karmenia security channel offers bounded choices and replays',()=>{
 let world=beginDay(createWorld());
 const offer=vossTurn(world); const humanitarian=vossReplies(world,offer).find(r=>r.id==='humanitarian_corridor')!;
 world=replyToVoss(world,humanitarian.id,offer.id,offer.strategy,undefined,humanitarian.line);
 assert.equal(world.state.day,1); assert.equal(world.state.treasury,76); assert.equal(world.state.approval,57);
 assert.match(world.events.at(-1)!.messages.join(' '),/Lydian Strip/); assert.deepEqual(replay(world.events),world);
});

test('fictional security channel never exposes an operational attack action',()=>{
 const world=createWorld(); const ids=vossReplies(world).map(r=>r.id);
 assert.ok(!ids.includes('attack' as never)); assert.ok(ids.includes('reject_attack'));
});
