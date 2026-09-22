# Leader of the Free-ish World

A political satire game about fictional presidents, interdependent countries, billionaire influence, and decisions that visibly change the world.

## Current status

First playable slice: a browser-based 3D presidential office and a terminal oil crisis with five choices, a rule-driven foreign leader, deterministic consequences, immutable events, and replay tests. The terminal version needs no installed packages. The browser version needs one npm install; after that, play requires no API keys or external services.

## Open the 3D office

```sh
npm ci
npm run dev
```

Open the localhost address printed by Vite. Drag the room to look around, choose a camera view, and select the desk phone or briefing folder. The same controls are also available as keyboard-accessible buttons below the office. Character portraits, dialogue, choices, and headlines connect to the existing crisis rules. After each choice, an illustrated rally, summit, briefing, national address, or podcast shows your president making the announcement. Continue to see the character response and approval/oil trends. These are still illustrations with written speeches, not voiced video.

The state-of-the-nation button opens historical charts for approval, treasury, oil reserves, relations, and oil prices. Each chart includes the initial state; points expose exact values, with a table alternative. The appearance history lets you replay earlier scenes without repeating the action or advancing the day.

Decisions are saved in this browser. New presidency resets them after confirmation. The browser prototype runs the shared simulation locally; it is not a multiplayer authority or production backend. Optional Claude dialogue and strategy selection are available through the local development server; see docs/CLAUDE_SETUP.md. The 3D office is a stylized blockout with original vector portraits, not final character art or a walkable environment.

`npm run build` produces the static site in `dist/`; `npm run preview` previews that build. Three.js and Vite are pinned in package-lock.json. All scene assets and portraits are local; there are no CDN or external font requests.

## Play in the terminal

Use Node 22.15.0 (`nvm use` if you use nvm), then:

```sh
npm run play
```

Enter `buy`, `subsidize`, `ration`, `threaten`, or `wait`. Each accepted choice advances one day. `history` shows prior events, `reset` starts over, and `quit` exits. State is kept only during the session.

Run `npm run simulate` for a scripted example, or `npm test` for the rule and replay checks. Node 22.15 runs TypeScript with its experimental type-stripping flag and may show a warning. This executes TypeScript but does not perform static type checking.

## Playtest questions

Try six decisions, then reset and try another approach. Were the immediate tradeoffs clear? Did one consequence create an interesting next decision? Was there an obvious strategy you always preferred? These answers guide the next small slice.

## Layout

```text
web/                  Browser office, portraits, and dialogue
game/                 Future Unreal client
server/src/           Authoritative TypeScript simulation
  nations/            Nation state
  economy/            Resources and economic rules
  diplomacy/          Relationships, tariffs, and treaties
  billionaires/       Later corporate actors
  events/             Immutable consequence records
  world/              Simulation orchestration
server/tests/         Simulation rule and replay tests
ai/                   Future news, social, and dialogue presentation
shared/schemas/       Shared state, decision, and event contracts
docs/                 Design, architecture, simulation, and roadmap
AGENTS.md             Development instructions
```

## Start here

Read `docs/OIL_CRISIS.md` for the current rules and `docs/ROADMAP.md` for scope. The original broad simulation plan is deferred while we test this smaller decision loop. No Unreal client, multiplayer, billionaire system, is implemented.

## Development environment

Initial development machine: Apple M2 with 16 GB RAM. Keep the first environment small. Unreal engine version and Windows build tooling will be selected and verified at the Unreal milestone.

Never commit credentials or generated Unreal build files. Configure Git LFS before committing binary Unreal assets.

## Negotiations and social feed

Call Petrov to negotiate a bounded offer. His resources, relations and recent memory shape his strategy; your reply changes tomorrow’s offer and available replies. Claude can select a legal strategy and write dialogue, while validated game rules apply all resource changes. Every reply advances one day; opening or leaving the call does not. social feed shows fictional supporters, commuters, critics and news reacting to your choices. Its sentiment measures the displayed posts, not national polling.

Use `npm run dev` for Claude. Static build previews retain offline play but do not include the local AI API.
