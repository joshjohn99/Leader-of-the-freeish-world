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

## Browser office prototype

The user requested a small web 3D interface before the full Unreal milestone. `web/office.ts` builds the Three.js scene; `web/portraits.ts` supplies original SVG portraits; `web/main.ts` handles dialogue and interaction. Vite builds a local static single-player prototype. It imports the existing pure rules layer directly and saves replayable events in localStorage. This is a deliberate prototype exception to backend authority; a production multiplayer client must send validated decisions to an authoritative server. No network game API or generative AI service exists yet.

The 3D canvas redraws on resize and interaction rather than running a continuous animation loop. Rendering resolution is capped for the M2 development machine. A WebGL failure leaves accessible briefing controls operational.

### Appearances and charts

`web/broadcasts.ts` derives a scripted presidential appearance from an immutable WorldEvent. `web/charts.ts` derives each series from the fixed initial state plus committed event snapshots. Chart scales are fixed for approval/relations, zero-based for non-negative quantities, and separately labeled by unit. Historical replay is a presentation selection only; it must never call decide or append an event. Dialogue, scene, and historical charts are all keyed to the selected event while the global day remains the current world day.

## Optional local AI turn

Vite development middleware validates event history by replay before requesting a structured Claude turn. Petrov selects a bounded legal strategy, with an offline utility-agent fallback. The browser commits only validated choices through shared deterministic rules. This remains a local single-player prototype. The key lives in ignored `.env.local`; static preview has no AI API. See CLAUDE_SETUP.md.

The separate `/api/social` endpoint replays events, strips private negotiation text and terms, and sends a public projection plus up to sixteen validated social interactions. It validates exactly one response from each of six fixed personas. Model text is escaped in the UI and cannot mutate world state. Epoch guards discard old requests after world changes/reset. Social and diplomat caches are isolated. Generation runs on decisions, social interactions and explicit catch-up; no timer requests.

Max uses `/api/max`, an independent prompt and `sterling` event records. His temporary bus effect is derived from funded events, preserving old save snapshots. Generation epochs prevent his in-flight responses from overwriting a newer world. The social cast now includes Max as a seventh public persona.

## Campaign and extensible actors

`CampaignRules` owns pledge validation, legal follow-up actions and public campaign memory. Launching records three promises without advancing time or changing resources. `decidePromise` applies bounded deterministic effects: clarify costs one approval, study costs six treasury, withdrawal costs three approval, initial repetition adds one approval and repeated rhetoric loses two. Normal daily consumption still applies. None marks a pledge magically fulfilled. Existing event-only saves replay unchanged.

`WorldAgent` is the common asynchronous response interface. `CharacterAgent` adapts each independent generator, and `AgentRegistry` owns lookup/dispatch and rejects duplicate IDs. The development API registers Petrov, Max, the social cast, and staff instead of branching on each character. Add a generator and register an adapter to add a new response component; executable game actions still need explicit rules and tests. Mara and PNN produce separate voices in one briefing request; PNN also participates in the social cast. The shared public campaign projection is passed to all generators; private dialogue remains scoped to the relevant character.

New presidencies begin at the three-promise form. Old games remain playable without a campaign record; use New presidency to try the new opening. AI text is escaped. Custom promises are treated as untrusted data, never instructions. Request epochs discard stale reactions after reset or a new decision. Four grounded promise actions are supported now; arbitrary policy fulfillment is not simulated.

## PNN world-event engine

`WorldEventEngine` registers immutable event definitions and selects a seeded bulletin on days two, five, eight, and so on, avoiding consecutive repeats. The seed derives from the campaign record, day, and history length, so an identical presidency replays the same news. Bulletins contain confirmed facts and potential stakes; this first version does not silently alter oil, treasury, borders, or ownership on publication. `respondToNews` records one bounded response per bulletin, with normal daily consequences and explicit preparation/coordination costs. All character generators receive the same public news and response history. The PNN world desk exposes the full archive and unresolved response count.

Replay enables bulletin generation only for records that contain a bulletin, so older saves with no world-news field remain compatible. New live decisions enable the engine. Opening the news desk never advances time or generates news. A new event kind is registered through `WorldEventEngine.register`; future direct economic effects require explicit simulation rules and tests.

## Separate office activities and relationships

The office hub routes to a public press briefing, private Petrov diplomacy, or a private Max meeting. Opening and leaving activities does not advance time. Campaign follow-ups and public policy choices live in the press briefing; oil purchases live in diplomacy. Accepted Petrov deals stay in that conversation. The appearance archive excludes private exchanges; their transcripts remain in the corresponding conversation.

`RelationshipNetwork` registers reciprocal character connections and supplies scoped context to each agent. Max and Petrov begin as business acquaintances. Its public-development projection includes signed oil purchases, funded bus pilots, and public mockery, but excludes private dialogue. Knowing another character does not authorize invented backchannel agreements or hidden favors. Adding a relationship supplies context, not executable game actions.

## Cabinet consultations

Six cabinet definitions supply identity, department, personality and offline greetings. Each is registered as a separate CharacterAgent endpoint at `/api/cabinet/{id}`. The selected secretary receives the shared campaign, election and news context plus only their own bounded conversation history. Public outcomes exclude private diplomatic transcripts. Validated Claude responses contain the secretary’s dialogue and two to four contextual player follow-ups. Free-text questions are limited to 600 characters.

The Cabinet button opens a native dialog styled as a right-hand drawer. Each secretary remembers their latest 20 messages in browser storage. New presidency clears these conversations. Request epochs protect switching, closing and resetting; a changed world invalidates an in-flight answer. Only the consulted secretary generates a response; opening the drawer does not call six models. Cache keys include member route and conversation history.

This slice provides advice and a route to the public promise decision flow, not autonomous department execution. Consultation does not consume time, spend funds or fulfill pledges. Offline responses are explicitly labeled generic briefings.
