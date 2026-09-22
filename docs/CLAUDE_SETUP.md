# Local Claude setup

1. Run `npm run dev` and open http://127.0.0.1:5173/.
2. Create an API key at https://platform.claude.com/settings/keys. API usage requires an API account with available billing/credits.
3. Click **Connect Claude**, paste the key into the password field, and click **Save and test connection**. Never paste keys into chat or commit them.
4. For a key not scoped to a workspace, copy the workspace ID from Claude Console → Settings → Workspaces into the workspace field. Leave the key blank to keep it. Saving automatically tests a real turn while the dialog stays open. Then open the desk phone. The call badge shows **Claude** when a generated turn succeeds. If it fails, check key permissions, API billing and connection; the offline opponent remains playable.

The local Node server stores the key in `.env.local` with owner-only permissions. Git ignores this file. The key is never placed in browser storage or bundled client code. An existing `ANTHROPIC_API_KEY` environment variable takes precedence. To override the default `claude-haiku-4-5` model, set `ANTHROPIC_MODEL` in the shell before starting the server.

Each uncached request sends the current fictional world and recent decision/conversation history to Claude. Responses use structured output, an forty-five-second timeout. Completed turns are cached for this server session. Explicit retry is available; there is no automatic retry loop. API usage can incur charges. This development API is restricted to local same-origin requests and is not a production deployment service.

The model selects among legal strategies and writes dialogue/social posts. Simulation rules validate the chosen strategy and player reply before committing an event. Text is generated fiction and may occasionally be inconsistent; the displayed offer card is authoritative. Selected strategies and spoken dialogue are saved with accepted decisions for replay. Social prose is presentation only and does not change approval.

Official setup documentation: https://platform.claude.com/docs/en/api/overview

The server sends the saved workspace ID in `anthropic-workspace-id`. `ANTHROPIC_WORKSPACE_ID` in the server environment overrides the saved value. Local credential changes are excluded from Vite reloads so the setup dialog retains the connection result.
