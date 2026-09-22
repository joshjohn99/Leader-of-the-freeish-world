# First simulation specification

This is an implementation brief, not implemented behavior.

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
