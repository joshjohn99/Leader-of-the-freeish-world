# Leader of the Free-ish World

A political satire game about fictional presidents, interdependent countries, billionaire influence, and decisions that visibly change the world.

## Current status

Project foundation only. The folder layout and design notes are ready; the simulation and Unreal game are not implemented yet. No paid services or API keys are required for this scaffold.

## Layout

```text
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

Read `docs/ROADMAP.md`. The next implementation is a small deterministic simulation of three fictional countries with five actions. Prove that decisions have understandable, interesting consequences before adding graphics.

The intended implementation uses TypeScript and Node. Pin and install the toolchain when implementing the first slice; this scaffold has no dependencies, build command, or runnable demo yet.

## Development environment

Initial development machine: Apple M2 with 16 GB RAM. Keep the first environment small. Unreal engine version and Windows build tooling will be selected and verified at the Unreal milestone.

Never commit credentials or generated Unreal build files. Configure Git LFS before committing binary Unreal assets.
