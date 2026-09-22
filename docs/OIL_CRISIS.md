# Oil crisis: first playable slice

## Purpose

Test decision -> understandable immediate consequence -> unexpected knock-on effect -> next decision. The user prioritizes this loop, then walking around, then multiplayer. Other leaders may be computer-controlled. This slice contains Freedoma and Petrovia only, with no fixed story outcome or win condition.

## Units and initial state

All values are fictional integer playtest units, not real economics. Day starts at 1. Freedoma has treasury 80, oil 8, approval 55 (0–100), and relations 0 (-100–100). Petrovia has oil 60, treasury 20, and asking price 2 treasury per oil unit. Initial consecutive subsidy count is zero.

## Daily order

Validate action and affordability without changing state; apply policy; clamp relations and determine next day's asking price; consume oil; apply approval consequences; produce 4 oil in Petrovia; add 3 revenue to Freedoma; clamp approval; advance day and record an immutable event. There is no wall-clock time or randomness.

Normal demand is 6. A fully supplied day adds 1 approval. Each missing oil costs 3 approval. Consumed oil leaves the world; production and revenue are explicit sources.

## Policies

- Buy: transfer 10 oil from Petrovia at the current price, transfer payment to Petrovia, relations +5. Reject if funds or supplier oil are insufficient.
- Subsidize: spend 8 treasury, approval +5, demand rises to 8. On consecutive subsidized days with inadequate oil, approval loses another 3 due to public frustration. Any other policy resets the subsidy streak.
- Ration: demand falls to 3, approval -4.
- Threaten: approval +2, relations -15.
- Wait: no policy effect; daily consumption still happens.

Petrovia's next asking price is 4 at relations <= -15, 1 at relations >= 15, otherwise 2. This is a minimal rule-driven opponent, not an LLM or a complete autonomous leader.

## Boundaries

Narrative messages are templates derived from rule outcomes. Events include the decision, ordered messages, and resulting state. Replay starts from the fixed initial scenario, regenerates each event, and rejects a mismatch. It is not a versioned save format. Core world values and event records are frozen at runtime. Runtime input accepts only the five named policies; caller-supplied world objects are trusted internal state, not a network API.

The sandbox continues at zero approval so we can explore recovery and failure without inventing victory rules yet. No files are saved between play sessions. Balance is intentionally provisional; automatic taxes and production are simplified scaffolding for the playtest.

## Verification

Use npm test for policies, economic transfers, shortages, delayed subsidy effects, foreign responses, input rejection, bounds, immutability, and replay. Use npm run simulate for a five-choice narrative example. TypeScript is executed using Node type stripping; static type checking is not yet configured.
