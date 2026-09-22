# Roadmap

## Current priority — oil crisis playtest

The subsequent design conversation narrowed the first build to decisions and consequences in a small sandbox. This supersedes the broader milestone 1 plan below for now.

Implemented: one player country, one rule-driven supplier, five decisions, daily resource use, foreign price responses, narrative consequences, reset/history, and deterministic replay tests. See OIL_CRISIS.md.

The user then requested a web 3D interface. Implemented a small Three.js office blockout with a desk, phone, original vector faces, satirical dialogue, local session persistence, and the existing decision rules. There is no walking or production AI yet.

Next step: playtest the office presentation together before expanding the game. Review tone, camera, portraits, and how choices feel.

## 0. Project foundation — complete

Create the folder structure, design notes, development instructions, local Git repository, and GitHub remote (the existing repository is public). GitHub connection is complete only when the remote and initial files have been verified.

## 1. Broader deterministic simulation — deferred

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

## Current presentation increment

Every decision now has its own illustrated public appearance and satirical transcript, followed by character reactions and history-based charts. Appearances can be revisited without new simulation events. This is a still-image presentation increment; voice, video, and an AI-driven Petrov are not implemented. Next, review this flow with the user before adding the agent decision layer.

### Current incremental slice: adaptive conversation

Implemented conditional Petrov replies, counteroffers, remembered threats, legal model-selected strategies, optional local Claude setup, and fictional social feed reactions. Playtest this loop before expanding to free-text negotiations or additional countries.

### Social cast and conversation lane

Six Claude-driven fictional personalities now inhabit J.com, Feedbox and Pictogram. Platform tabs coexist with For You, Supporters and Critics. Likes and preset presidential replies trigger contextual agent responses; decisions prompt new public reactions. A persistent Petrov lane shows preparation, replies and exchange history. Calls batch six personalities into one model request, not six autonomous model processes. No continuous polling. Pictogram uses designed caption cards, not generated photographs. Social history lasts for the current page session; world and diplomatic history retain existing local saves.

### Contextual player dialogue

Claude now chooses three to six legal tactics and writes player reply titles and spoken lines in response to Petrov’s exact dialogue. The chosen wording is recorded and replayed, while canonical action effects remain authoritative. Added conditional markup challenges, priority inquiries and public-credit concessions. Offline play keeps deterministic choices.

### Max Sterling’s first playable encounter

Max Sterling, chaotic attention seeker and owner of Volt Motors/J.com, has a separate Claude endpoint, bounded strategies, generated replies, portrait, conversation lane and saved event memory. Praise unlocks the discounted pilot; guarantees force the guarded offer; humiliation removes the discount and adds two approval before daily consequences. Funding costs twelve, eighteen or twenty treasury and saves two oil demand for three days starting immediately. Active pilots cannot stack. Public Max events enter the social cast and Petrov’s world context; private transcripts stay separate.

### Campaign opening and staff/media reactions

Implemented three custom promises, recorded follow-through, contextual Mara decisions, PNN coverage, and campaign-aware Petrov/Max/social reactions. The oil crisis remains the practical simulation. Promise fulfillment is not generalized: current actions clarify, study, withdraw or repeat a claim. New actors share the WorldAgent interface and AgentRegistry.

### PNN world desk

Implemented seeded trade, border, shipping and currency-proposal bulletins, clickable breaking headlines, archived reports, and one response per bulletin. Characters share authoritative news context. These incidents currently create choices and conversation pressure; automatic trade losses, wars and currency simulation are deferred.

### First-term election objective

Implemented a 30-day deadline, three connected voter-bloc charts, national support projection, pledge scorecard and final reelection result. Neutral negotiation replies no longer burn a day. Next balance playtests should measure session length and election difficulty; 45–60 minutes remains a target, not a measured duration. Playable second terms and generalized promise fulfillment remain future slices.

### Daily desk agenda

Implemented the desk → state-selected tasks → explicit End day → overnight reactions → new agenda loop. Existing saves adopt it at their current day. Daily requirements cover public direction, Petrov, Max and relevant PNN news. Additional people can register agenda rules alongside their own routes and recorded decisions.

### Fictional Congress

Added a Congress tab with two chambers, six caucus speakers, saved randomized starting support, practical proposals for all three promises, concessions, explicit votes and congressional agenda tasks. Approval by both bodies fulfills the promise for election scoring, as requested. Physical policy delivery and new economic subsystems are outside this slice.
