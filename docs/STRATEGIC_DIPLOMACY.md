# Petrov: strategic diplomacy prototype

This is a fictional game system. Its settings are gameplay assumptions, not forecasts or a model of any real country.

## Play and review

Open **Work with Petrov** on the daily timeline, or enter the office and use the red phone. Each exchange offers three to five contextual replies. Read the canonical terms beneath a reply: those are the proposal it actually makes. Claude writes the dialogue and chooses one of the valid counterpackages; it cannot execute a shipment, invent an attack, or sign for the player.

Review the accepted and disputed clauses in **Terms on the table**. Acceptance in principle is not a treaty. **Review agreement before signing** displays commitments and costs; **Sign this agreement** is the committing action. Questions and counterproposals are free. Signing, an explicit decision to leave talks, a spot purchase, or suspension settles the diplomatic agenda task. A second settlement waits until tomorrow. Security orders have a separate one-per-day allowance.

The three reviewable increments are:

1. **Negotiation foundation.** Structured proposals, clause acceptance, saved model turns, free questions, exact confirmation, standing oil contracts, and one-time purchases. Review `strategicCandidates`, `strategicChoices`, `applyStrategic`, and the proposal/signature tests.
2. **Territorial bargaining.** Day-three Bellara reports; halt/withdrawal, recognition, restraint and observer clauses; deterministic compliance and allegations. Review `assessTerms`, `complianceRisk`, and territorial settlement/verification tests.
3. **Wider consequences.** Daily security orders, sustained effects, recorded escalation and infrastructure attacks, public reports, cabinet advice, map conflicts and agenda integration. Review `securityOptions`, `settleStrategic`, and the full-term replay test.

The implementation lives in `server/src/diplomacy/strategic-types.ts`, `strategic.ts`, `server/src/ai/strategic.ts`, and `web/strategic-diplomacy.ts`. The browser shell routes the existing Petrov channel to this interface after explicit initialization. Legacy diplomacy code remains for old saves and spot quotations.

## Contracts and overnight order

- A contract lasts three day transitions. Signing on day 1 schedules deliveries for days 2, 3, and 4. It expires after the final delivery; a new signature on day 4 can supply day 5 without a gap. Contracts do not stack. Active contracts must expire or be explicitly suspended before replacement.
- Starting quantities are six barrels/day; contextual alternatives include four and eight, or no oil obligation in a territorial bargain. Prices are F$1–F$6 per barrel. Three days is fixed in this slice.
- The sign check requires monitoring setup plus the first scheduled payment to be affordable. It does not prepay three days. Each transition checks funds again and protects Petrovia's twelve-barrel domestic reserve.
- End day applies sanctions and deployment upkeep, resolves compliance, processes contractual shipments/payments, then escalation and disruption. Domestic consumption and the existing daily revenue/production follow. Each successful shipment transfers equal barrels and money between the two treasuries/reserves.
- An unaffordable or blocked shipment transfers neither money nor oil and suspends the contract. Replacing or suspending a treaty never reverses completed transfers.
- Verified-first terms require both observers and a territorial clause. No oil is released while verification is pending. A conditional summit happens after the first confirmed territorial compliance; a trade-only public concession is a joint statement.
- The election still ends play. A contract signed near the end may show obligations beyond the playable term; those future transitions are not simulated.

## Territorial scenario and compliance

The scenario is enabled by an explicit immutable `init` event. A new run begins quietly. At the transition reaching day 3, PNN reports border pressure. Existing active campaigns initialize at their current day and encounter the report at the next eligible transition. Completed runs receive no initialization or new events.

Recorded stages are quiet, border pressure, incursion, regional war, ceasefire, and withdrawal. Unopposed tension can advance the crisis only through these stages. A direct threat to Freedoma requires regional escalation, and an attack requires an earlier recorded threat. Model dialogue never changes those facts.

Compliance uses a saved seed, day, and treaty serial. Trust, incentives, observers, prior breaches, and Petrov's recorded posture influence the deterministic draw. Observers confirm a detected violation immediately. Without them, the first report is explicitly unverified; the next transition confirms the stored allegation. No reopening or model retry rerolls the result. Confirmed violations suspend future obligations and reopen the dispute.

Agreements express six clause groups: supply, territory, monitoring, Freedoman restraint, public recognition, and delivery verification. The acceptance calculation is deterministic. Claude may choose the exact proposal, a prestige counterpackage, or a pressure counterpackage, and must explain disputed terms. Rejected proposals and the exact offered package remain in the event history.

## Prototype settings

All new simulation tuning is grouped in `STRATEGIC_BALANCE` and `SECURITY_ORDERS` in `strategic-types.ts`. Existing domestic fuel/election/Congress rules are unchanged.

| Setting | Initial value |
| --- | --- |
| Contract length / protected reserve | 3 transitions / 12 barrels |
| Observer setup | F$2 on signature |
| Crisis start / initial tension | Day 3 / 40 |
| Incursion / regional-war / homeland-threat thresholds | 55 / 75 / 85 |
| Minimum stage duration before escalation | 2 days |
| Trust at initialization | 50 |
| Daily pressure by posture | Pragmatic 6; prestige 3; pressure 9 |
| Compliance failure bounds | 5–65 on the seeded 0–99 draw |
| Compliance calculation | Base 18 + tension/4 + 8 per prior breach − trust/4 − 10 with observers − 5 with recognition + 8 with pressure posture |
| Confirmed breach | Trust −20; tension +15; disruption +6; relations −8 |
| Compliant territorial day | Trust +2; tension −12 |
| Security measure duration | 3 transitions |
| Sanctions | F$4 upfront; up to F$4/day lost export income; trade blocked |
| Defensive readiness | F$6 upfront; reduced escalation and attack risk |
| Bellara support | F$5 upfront; reduced pressure; relationship tradeoff |
| Limited defensive deployment | F$10 and 2 barrels upfront; F$2 and 1 barrel/night |
| Humanitarian assistance | F$4; disruption reduced by 10 |
| Peace initiative | No resource cost; tension reduced by 8; no automatic ceasefire |
| Regional-war daily cost | Up to F$2 plus disruption |
| Infrastructure attack | Up to F$5 and 2 barrels; minimum 3-day attack spacing |

The module also centralizes bargaining thresholds, trust/relationship adjustments, deterrence, disruption recovery and risk labels. Zero resources never become negative through these new actions. Deployment ends early when upkeep cannot be paid. These settings need playtesting for pace, difficulty, and whether the concessions feel meaningfully different.

## Save, AI, and public boundaries

Every accepted command has an immutable snapshot. Generated turns also save the model's dialogue, offered terms, legal reply IDs, and a context key. Replay validates each event against reconstructed rules; it never calls Claude. Duplicate signatures, repeated orders, stale replies, and tampered outcomes fail validation. Cabinet assignments do not invalidate a diplomatic turn.

The browser discards AI responses created against a different world context or superseded by offline continuation. Reloading and reopening use the saved turn. Offline responses use the same legal packages and settlement rules. No external model is required to finish a run.

PNN, BULL and social agents receive public signed commitments, orders, confirmed reports and explicitly labelled allegations. Private proposals and negotiating dialogue stay outside these contexts. State, Defense, and Treasury consultations explain recorded developments and available actions without executing them. Map conflicts derive from the recorded crisis, and a functioning full-size contract removes routine fuel reminders. Expiration, interrupted supply, and violations restore relevant agenda items.

## Verification

Run `npm test` and `npm run build`. Strategic tests cover migration, free discussion, contextual suggestions, partial acceptance, explicit signature, transfer conservation, reserve/payment failures, expiration/renewal, compliance, allegations, order limits/upkeep, public privacy, API validation/caching, and a complete replay through election night.

Isolated Chrome checks exercise review/cancel/sign, persistence, stale AI rejection, offline play, cabinet links, territorial concessions, incompatible-order warnings, news navigation, keyboard focus and mobile width. They use separate browser storage, not the player's save. A live local Claude request was also validated against the strategic response schema.

No tactical movement, arbitrary free-text executable treaties, autonomous cabinet spending, additional rivals, or playable second term are introduced here.
