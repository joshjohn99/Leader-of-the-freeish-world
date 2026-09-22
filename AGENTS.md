# Development instructions

Project: Leader of the Free-ish World.

- Start with the current milestone in docs/ROADMAP.md.
- Keep simulation rules deterministic: explicit ticks, ordered decisions, and seeded randomness only when needed.
- LLMs may describe committed events; they never directly modify authoritative world state.
- Every consequential accepted action produces an immutable event.
- Unreal presents the world; the backend owns global simulation state.
- Keep the backend a modular monolith. Store initial state in memory.
- Test every simulation rule, rejected input, resource conservation, and deterministic replay.
- Avoid premature abstractions and infrastructure. Do not add databases, queues, containers, authentication, or networking before their milestone needs them.
- Keep presentation separate from simulation rules.
- Never commit secrets, dependency folders, build output, or generated Unreal files.
- Configure Git LFS before adding Unreal binary assets.
- Document prototype balance assumptions; do not present them as real economic forecasts.
- Keep a runnable, tested vertical slice at each implementation milestone.
