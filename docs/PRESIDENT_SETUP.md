# President identity

New presidency forms on the map and in the office require first and last names before the three campaign promises. Each name supports 1–60 characters after trimming, Unicode, spaces, apostrophes and hyphens. Markup and control characters are rejected. The UI uses textContent or escaped text when showing the name.

The optional president field on the campaign launch event stores the normalized, immutable name. The existing local event save and replay preserve it; a new presidency starts without the previous identity. Older events that omit president remain byte-for-byte replay compatible. Validation accepts the omitted legacy field, but rejects partial identities supplied by a client.

The masthead and public appearance identify the player as President First Last. Campaign context includes the identity for AI consumers, and Petrov's explicit player context uses it as well. A name changes no resources or game rules.
