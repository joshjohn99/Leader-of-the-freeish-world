# First simulation specification

This is the original broader implementation brief, now deferred. The implemented first slice is documented in OIL_CRISIS.md.

## State

Use three fictional nations with GDP, approval, stability, military strength, oil supply, food supply, and technology. Define units and bounds explicitly before writing rules; GDP is not a spendable treasury. Model spendable funds separately when implementing aid or military purchases.

Track directional relationships and tariff rates between countries. Keep current tick and ordered event history in world state.

## Five starting actions

1. Impose tariff: increase an import tariff against another nation, with economic and relationship consequences.
2. Lower tariff: reduce an existing tariff, with corresponding trade and diplomatic effects.
3. Export oil: transfer an available quantity; specify whether payment is included.
4. Send foreign aid: transfer available funds with approval and relationship tradeoffs.
5. Increase military spending: spend available funds to improve readiness with a domestic tradeoff.

Balance values are fictional prototype rules and must be recorded with their tests. Do not implement arbitrary real-world economic predictions.

## Required checks

- The same initial state and ordered decisions produce identical states and events.
- Replaying accepted events reproduces final state.
- Unknown nations, invalid targets, non-finite values, invalid ranges, and insufficient resources are rejected atomically.
- Transfers conserve the transferred resource unless an explicit rule records a cost.
- Accepted actions do not mutate prior state or earlier events.
- Bounds and rounding are explicit and tested.
- A CLI scenario shows cross-country consequences and can reset to the initial world.

## First-term election prototype

The player has 30 simulated days (day 1 through day 30); the resulting day 31 opens election night. Win strictly more than 50% of the weighted national vote to be reelected. No playable second term yet. Election results derive deterministically from saved history; there is no random ballot swing or wall-clock timer. Old saves replay with their original timing, including histories longer than 30 days; their ballot uses the first completed deadline. New gameplay is blocked after the election.

Banner Party voters are 35% of the electorate, Workbench Party voters 35%, and Free Agents 30%. Bloc support is capped to 0–100 and weighted by these fixed shares. Approval affects all three; threats appeal more to Banner voters, studies/bus pilots/oil deals to Workbench voters, and credibility, fiscal reserves and mediation to Free Agents. Counted action bonuses cap at four occurrences. These are fictional balance assumptions, not polling estimates.

Promise status derives from the last action on each pledge: unaddressed, clarified, under study, withdrawn, or repeated without delivery. Studies are never marked fulfilled. Each pledge contributes bounded credibility; untouched promises begin hurting credibility after day 10. Generalized policy delivery is not implemented.

Petrov counteroffers, priority questions and declines, plus Max praise, guarantees and declines, now record conversation events without consuming time or resources. Other committed actions consume a day. A conversation timing marker allows new and legacy histories to replay exactly. Reading, opening meetings and social activity do not consume days.

## Explicit daily agenda (current browser loop)

The browser opens a saved `agenda.start` record at the current day. The plan is deterministic and fixed until the day ends. Public direction is always required; Petrov appears when oil is below 12, relations are negative, or every third day; Max appears when no pilot is running and it is day one, every fifth day, or reserves are low and the treasury can cover the discounted pilot. The latest unresolved PNN bulletin adds a news task. These are prototype thresholds. Opening a room does not complete a task. Negotiation questions remain open; a decision, including declining, completes the meeting.

Actions now apply their direct effects immediately without consuming days, fuel, daily revenue or supplier production. Domestic policy is limited to one selection per day, each pledge to one follow-up per day, announcements to one per day, and each character meeting to one final decision. This avoids repeated rewards from the same meeting. End day requires every agenda task to be complete, settles fuel demand once (including rationing, subsidies and buses), applies shortage/approval changes, pays daily revenue, produces supplier oil and generates the next bulletin. Day 30 ends at election night.

Legacy events retain their original semantics. The browser appends a start record to an existing save rather than rewriting history. Replay derives agendas and validates all recorded tasks and snapshots. `AgendaEngine.register` adds a rule with a state-based task selector, destination panel and event-based completion predicate. A new person also needs a conversation route and legal actions; adding a rule alone does not implement a character.

## Congress and promise fulfillment

The Congress tab seats the People’s House (100 seats) and Council of States (20 seats), each represented by three caucus voices: Banner, Workbench and Free Agents. A browser-generated unsigned 32-bit seed is recorded once in the presidency; support is derived deterministically by seed, promise, chamber and caucus. Opposing chamber tilts make the two bodies different. Refreshing dialogue does not reroll votes. Caucus shares are 40/35/25 in the House and 8/7/5 in the Senate. Projected yes votes round each caucus’s support times its seats. Passing requires a strict majority.

Players submit a practical proposal for each campaign promise, then can add costing (4 treasury), local-benefit requirements (3), and oversight (2). Each concession can be used once per bill and changes caucus support according to preferences. A concession amends the shared plan and invalidates prior chamber approvals. Votes and concessions each use the single congressional action available that day; they do not advance time independently. The daily agenda requests congressional work every third day after Congress is seated, while unresolved promises remain.

Per the user’s design decision, BOTH chambers approving the same practical proposal counts as promise fulfillment, worth six credibility points on the election scorecard. One chamber alone does not. This is a game milestone, not a generalized simulation of delivery: no resources, magical creatures, medical services or jobs appear automatically. The practical proposal provides the interpretation of the original promise. AI writes a multi-voice debate and contextual labels for legal actions; votes, costs and fulfillment remain deterministic.

## Petrov sale-term negotiation

The Petrov call exposes quantity and unit-price inputs for a counteroffer. Quantity must be a whole number from one through the current offer while preserving Petrovia’s twelve-oil reserve; price must be a whole number from one through six. A terms counteroffer records the requested values without buying oil or advancing the day. Petrov’s next deterministic offer reads those requested terms and his treasury, relations and reserve state, then may concede or hold. Acceptance settles the revised offer through the normal authoritative rules. Replay persists the requested quantity and price, so the negotiation cannot silently revert to the original terms.
