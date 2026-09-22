# Cabinet promise owners

Open **Cabinet → Your Promises** to assign any secretary to each recorded campaign promise. One secretary may lead several promises. Reassignment is free. The owner also appears under **On the Record**, where **Ask your secretary** opens a conversation about that exact promise.

Each promise shows its congressional status, projected votes, blockers and next step. Recommendations favor introduction for an untouched bill, an outstanding chamber's vote when it has a projected majority, then an affordable missing concession. Concessions follow the existing costing, local-benefits, oversight order. Daily limits and insufficient funds stay visible. Amending a bill reopens earlier approvals. Withdrawn promises are identified for review; both chamber approvals remain fulfillment under existing election rules.

The Congress link selects the correct promise and chamber. It never introduces, negotiates or votes automatically. Congress is seated on its first visit using the existing saved founding flow. All consequential actions still require the player to click their action in Congress.

## Persistence and advice

Ownership uses an immutable `cabinetAssignment` event with a validated promise index and secretary ID. It uses conversation timing, has no resource or electoral effect, creates no headline, and does not complete daily tasks. Replay restores the latest assignment. Older saves remain unassigned until the player chooses an owner. New presidencies clear assignments.

Cabinet requests accept an optional `promise` index. Code supplies current progress, ownership, costs, vote reports, legal options and recorded news; Claude supplies explanation, feasibility discussion and personality. Unsupported proposals remain proposals. Invalid topics are rejected before generation. Offline advice retains factual progress and navigation.

Chats are stored under `freedoma-cabinet-v2`, with separate histories per secretary and promise, plus a general thread. Each retains 20 messages. Existing v1 chats migrate into general threads. Topic changes and world changes invalidate pending replies. Earlier chats remain accessible as historical advice; current facts are always shown separately.

## Verification

Rule tests cover assignment validation, replay, neutrality, progress, blocked actions, withdrawal, fulfillment, escaped markup, and scoped AI context. An isolated Chrome check covers assignment/reassignment, reload, topic switching, rejecting stale replies, Congress navigation without actions, mobile width, keyboard dismissal and reset.
