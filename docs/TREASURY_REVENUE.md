# Recurring treasury income

The treasury receives **F$45 in tax receipts on entering days 3, 6, 9, …, 30**, alongside the existing **F$3 daily revenue**. These are fixed prototype balance values, independent of promises, approval, spending or AI dialogue. No extra task or claim button is required.

Scheduled receipts arrive when the player selects End day, before contractual oil payments and defensive deployment upkeep. Domestic consumption and the existing daily revenue follow. A default six-barrel contract at F$2/barrel costs F$36 across three days; the F$45 deposit plus F$9 daily revenue leaves F$18 for other spending in that interval. More expensive agreements and initiatives can still exhaust the treasury.

The command center, office desk and State of the Nation show the next payment day and last receipt. A notification appears once when a new deposit is recorded. Treasury cabinet advice receives the same schedule. Reloading does not show an old deposit as a new payment, and starting a new presidency clears its record.

`server/src/economy/revenue.ts` owns the schedule, versioned receipt type and prototype settings. Each payment is attached to its End day event as `treasuryDeposit`. Replay only reapplies scheduled income when that saved event contains a receipt, validates its day/amount, and checks the reconstructed outcome. Old events without receipts keep their original balances. Continuing an older save receives future scheduled payments, with no retroactive catch-up. Election-completed saves remain unchanged.

Tests cover the schedule, ordering before bills, single payment per transition, replay/tamper rejection, old-save continuation, a full term, clean resets and UI text. Isolated browser checks cover the countdown, office display, notification, reload safety and mobile layout.
