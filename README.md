# Leader of the Free-ish World

A single-player political satire prototype built with TypeScript, Vite, and Three.js. Govern fictional Freedoma through a map command center and a 3D presidential office: make campaign promises, work with your cabinet and Congress, negotiate with foreign leaders, and react to news and social feeds across a 30-day presidency.

## Requirements

- **Node.js 22.15.0**, the version pinned in `.nvmrc`, and its bundled npm. The package requires Node 22.15 or later.
- **Git** and access to this GitHub repository.
- A desktop browser with WebGL support for the 3D office. Chrome is used for browser verification.
- An internet connection for dependency installation. Claude dialogue and Mapbox satellite imagery also require connectivity and their respective API credentials.

You can play with deterministic offline characters without either API key. Country borders, labels, and map controls remain available without satellite imagery. Unreal Engine and a database are not required.

## Quick start

### 1. Clone the repository

```sh
git clone https://github.com/joshjohn99/Leader-of-the-freeish-world.git
cd Leader-of-the-freeish-world
```

If you already have the repository, open a terminal in its root—the folder containing `package.json`.

### 2. Select Node and install dependencies

If you use nvm:

```sh
nvm install
nvm use
```

Otherwise, install a compatible Node version and confirm it with `node --version`. Then run:

```sh
npm ci
```

### 3. Start the game

```sh
npm run dev
```

Open **[http://127.0.0.1:5173/](http://127.0.0.1:5173/)**. Keep the terminal running while you play; press **Ctrl+C** there to stop the server. Open the server URL, not `index.html` directly.

### 4. Begin your presidency

1. Enter the president's first and last name and three campaign promises.
2. Use **Today's Timeline** to open the day's required activities.
3. Open **Work with Petrov** for diplomacy, or **Enter 3D space** for the office and red phone. **Return to map** brings you back.
4. Use **On the Record**, **Congress**, **Cabinet**, and **Press Secretary** to advance promises and make announcements.
5. Complete the required tasks and select **End day**. Conversation does not advance the clock; end-of-day settlement processes supplies, costs, revenue, and developments.

The treasury receives F$45 on entering days 3, 6, 9, and onward through day 30, in addition to F$3 daily revenue. The income card shows the next deposit. Review treaty terms and spending before confirming them.

The music controls let you play, stop, or skip between the three included tracks. The selected track repeats until you stop it or choose another.

## Optional: connect Claude

The browser game works without Claude; connecting it enables generated dialogue and responses grounded in the simulation's legal choices.

1. Start the game with `npm run dev` and record your campaign promises.
2. Click **Connect Claude**.
3. Enter your Claude API key in the game's password field. If applicable, enter the workspace ID.
4. Click **Save and test connection** and read the result in the dialog.
5. Open a conversation. A successful generated turn is marked **Claude**; failed requests fall back to offline dialogue.

The local server saves credentials in the ignored `.env.local` file. Do not commit it or put the Claude key in a variable beginning with `VITE_`: those variables are exposed to the browser. API calls use your Claude account and may incur charges.

You can also set `ANTHROPIC_API_KEY` and `ANTHROPIC_WORKSPACE_ID` in the server environment or `.env.local`. Environment variables override saved values. The default model is `claude-haiku-4-5`; to override it, set `ANTHROPIC_MODEL` in the **shell environment** before starting the server. See [Claude setup](docs/CLAUDE_SETUP.md) for details.

## Optional: add Mapbox imagery

Add a public Mapbox access token to a `.env.local` file in the repository root:

```dotenv
VITE_MAPBOX_ACCESS_TOKEN=your_public_mapbox_token
```

Use [.env.example](.env.example) as a reference. If `.env.local` already contains your Claude key, add this line to that file rather than replacing it.

Restart `npm run dev` after adding or changing the Mapbox token. The map uses Mapbox satellite images with local fictional country labels, boundaries, and conflict overlays. Without a token, or if imagery cannot load, local borders and controls still work.

This token is intentionally used in the browser; use a public token, not a secret Mapbox token. Mapbox requests are subject to your account's access settings and usage limits. For a static build, set the token **before** running `npm run build`.

## Saves and resets

- World events are saved in this browser's localStorage and checked by deterministic replay on reload.
- Saves stay with the browser profile and origin. `localhost`, `127.0.0.1`, different ports, and different browsers have separate storage.
- **New presidency** clears the current run after confirmation. Clearing browser site data also removes its saves.
- GitHub stores the source code and bundled assets, not your local browser save or API credentials.
- Existing saves keep their historical balances; new recurring revenue applies to future scheduled days.

## Tests and production build

```sh
npm test
npm run build
npm run preview
```

The build is written to `dist/`. Open the preview URL printed in the terminal (normally `http://localhost:4173/`).

**Claude's local API is available only through `npm run dev`.** Static builds and `npm run preview` support offline play but do not include that middleware. Preview uses a different origin and therefore a separate save.

The tests run TypeScript using Node's experimental type stripping; the warning on Node 22.15 is expected. This does not perform static TypeScript type checking.

## Other commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Browser game with the local Claude API |
| `npm test` | Simulation, replay, validation, and component checks |
| `npm run build` | Build the browser app into `dist/` |
| `npm run preview` | Preview the static build; no Claude API |
| `npm run play` | Original terminal oil-crisis prototype |
| `npm run simulate` | Scripted terminal demonstration |

The terminal prototype supports `buy`, `subsidize`, `ration`, `threaten`, `wait`, `history`, `reset`, and `quit`. It is the earlier, smaller gameplay slice, not the full browser game.

## Troubleshooting

| Problem | What to check |
| --- | --- |
| `node` or `npm` is not found | Install Node, reopen your terminal, and run `node --version`. With nvm, run `nvm use` in the repository root. |
| Installation or TypeScript execution fails | Confirm Node 22.15 or later and run `npm ci` from the folder containing `package.json`. |
| Port 5173 is already in use | An existing game server may already be running. Open its URL, or stop it in its terminal before restarting. The dev server uses a fixed port. |
| The page is blank when opening a file | Run `npm run dev` and use the HTTP URL instead of a `file://` address. |
| Claude is offline | Use the dev server, check **Connect Claude**, and verify credentials, account access, billing, and network connectivity. Offline play remains available. |
| The map has borders but no satellite image | Check `VITE_MAPBOX_ACCESS_TOKEN` in `.env.local`, restart the dev server, and check the token's access settings and connectivity. |
| The 3D room does not render | Try Chrome with hardware acceleration/WebGL enabled. The map does not need a WebGL camera. |
| A save seems missing | Return to the same browser profile and exact host/port used for that run. Preview and dev server saves are separate. |

## Project layout

```text
web/                  Browser UI, command center, office, music and conversations
public/               Bundled audio, seal image and local map boundaries
server/src/           Deterministic simulation and local AI middleware
  ai/                 Claude requests, validation and local API routes
  agenda/             Daily tasks
  cabinet/            Promise ownership and guidance
  congress/           Legislative negotiations and votes
  diplomacy/          Petrov treaties, strategic crisis and other diplomacy
  economy/            Scheduled treasury revenue
  events/             PNN and BULL developments
  world/              Decision orchestration and event replay
server/tests/         Automated checks
shared/schemas/       World-state and event contracts
docs/                 Design notes, feature rules and prototype settings
game/                 Placeholder for a future Unreal client
AGENTS.md             Development instructions
```

Start with [the roadmap](docs/ROADMAP.md), [strategic diplomacy](docs/STRATEGIC_DIPLOMACY.md), [cabinet promise owners](docs/CABINET_PROMISES.md), and [treasury revenue](docs/TREASURY_REVENUE.md).

This is a local, single-player prototype. The office is a stylized 3D room, not a walkable world. There is no Unreal client, multiplayer server, or production-hosted AI service in this repository.
