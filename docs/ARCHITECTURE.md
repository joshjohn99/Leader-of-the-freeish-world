# Architecture

## Initial boundary

The TypeScript simulation is a pure rules layer inside one server package. Shared schemas define Nations, Resources, Relationships, Decisions, WorldEvents, and WorldState. The CLI is a thin adapter around the same rules that a later API will use.

Flow: decision -> validation -> immutable event -> deterministic state transition -> presentation.

Reject invalid decisions without changing state or advancing time. Assign event ordering and simulation ticks inside the rules layer, not from wall-clock time. Define replay semantics before adding persistence.

## Later adapters

An API will expose authoritative state and validate player actions. Unreal will handle character movement and local presentation while consuming global simulation state. Multiplayer movement authority and global political simulation are separate responsibilities.

AI receives a bounded description of committed events and produces narrative output. Provider failures must not block or change simulation results. Postgres is a future persistence choice, not an initial dependency.

## Open decisions

Choose the precise tick model, event schema versioning, balance formulas, and action authorization model as their slices are implemented. Verify engine support on the actual Mac before pinning Unreal.
