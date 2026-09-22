# Roadmap

## 0. Project foundation — current setup

Create the folder structure, design notes, development instructions, local Git repository, and private GitHub remote. GitHub connection is complete only when the remote and initial files have been verified.

## 1. Deterministic simulation — next implementation

Start with schemas and three countries. Deliver one tariff action from input through validation, event, updated state, tests, and CLI output. Then add lower tariff, oil export, foreign aid, and military spending. Define resource units, treasury, and bounds with the rules.

Acceptance: an `npm run simulate` demo displays consequences; automated checks cover all rules and deterministic replay. No network or API key is needed to run the demo. Expand toward more actions only after playtesting.

## 2. Billionaire influence

Start with one corporate actor, one investment offer, and visible tradeoffs. Add other actors only when the first loop works.

## 3. Narrative presentation

Start with deterministic news/social templates; add an optional AI provider with fallback output. Narrative cannot mutate world state.

## 4. API and persistence boundary

Expose state, actions, and events with validated contracts. Add persistence when save/resume is needed.

## 5. Unreal vertical slice

Verify the engine/toolchain on the M2 Mac. Build one office, one president, and one phone showing real simulation data. Configure Git LFS before importing assets.

## 6. Two-player diplomacy

Assign two nations to two players. Validate ownership, ordering, reconnect behavior, and shared consequences. Playtest session duration and victory conditions.
