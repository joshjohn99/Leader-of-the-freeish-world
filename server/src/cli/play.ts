import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { availableDecisions, createWorld, decide } from '../world/oil-crisis.ts';
import type { World } from '../../../shared/schemas/oil-crisis.ts';

function show(world: World) {
  const s = world.state;
  console.log(`\nDAY ${s.day} | Treasury ${s.treasury} | Oil ${s.oil} | Approval ${s.approval}/100`);
  console.log(`Petrovia: oil ${s.supplierOil} | Relations ${s.relations} | Asking price ${s.price}/oil`);
}
function consequences(world: World) {
  for (const message of world.events.at(-1)?.messages ?? []) console.log(` • ${message}`);
}
console.log('\nLEADER OF THE FREE-ISH WORLD — Oil crisis playtest');
console.log('Freedoma needs 6 oil per day. You have 8. Each accepted choice advances one day.');
console.log('Petrovia reacts through simple rules. All numbers are fictional playtest values.');
let world = createWorld();
if (process.argv.includes('--demo')) {
  show(world);
  for (const action of ['subsidize', 'subsidize', 'threaten', 'buy', 'ration']) {
    console.log(`\nDECISION: ${action}`);
    world = decide(world, action); consequences(world); show(world);
  }
} else {
  const rl = createInterface({ input: stdin, output: stdout });
  try {
    while (true) {
      show(world);
      for (const option of availableDecisions(world)) console.log(` ${option.decision}: ${option.description}${option.blocked ? ` [Unavailable: ${option.blocked}]` : ''}`);
      const input = (await rl.question('\nYour choice (reset / history / quit): ')).trim().toLowerCase();
      if (input === 'quit' || input === 'q') break;
      if (input === 'reset') { world = createWorld(); continue; }
      if (input === 'history') {
        for (const event of world.events) console.log(`Day ${event.id}: ${event.decision}\n${event.messages.join('\n')}`);
        continue;
      }
      try { world = decide(world, input); consequences(world); }
      catch (error) { console.log(error instanceof Error ? error.message : 'Decision rejected.'); }
    }
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ERR_USE_AFTER_CLOSE')) throw error;
  } finally { rl.close(); }
}
