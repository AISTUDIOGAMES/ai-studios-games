# AI Studios Games — Prototype 0.1

An English-language cyberpunk neon landing page and a small playable 2D browser platformer prototype. Built with Vite + TypeScript, with a lightweight optional Phantom wallet connection hook for local experimentation.

## Requirements
- Node.js 20+ (recommended)
- npm

## Run locally
```bash
npm install
npm run dev
```
Open the local URL printed by Vite.

## Production build
```bash
npm run build
npm run preview
```

## What's included
- Responsive landing page with custom inline SVG brand mark
- Neon cyberpunk visual system (acid green, electric purple, dark graphite)
- Game catalog driven by one list (`src/games.ts`): Slither.Idle (external link, experiment) and Neon Runner (playable on the page)
- Roadmap section
- Playable canvas endless-runner prototype (click the game to focus it, then Arrow keys / A-D to move, Space / Up to jump)
- Optional browser-injected Solana wallet connect/disconnect detection (`window.solana`, e.g. Phantom)
- No blockchain transactions, tokens, NFTs, backend, or database are enabled in this prototype

## Linking a game (Slither.Idle)
1. Open `src/games.ts`.
2. Set `SLITHER_IDLE_URL` to the public https address of the Slither.Idle site.
3. Commit and push. The card's button changes from "LINK COMING SOON" to "PLAY SLITHER.IDLE" and opens the game in a new tab.

Only https links are accepted. To launch another game, add an object to the `GAMES` list, set its `status` (`experiment`, `prototype`, `live` or `soon`), and add its artwork in `artFor()` in `src/main.ts`.

## Solana integration roadmap
This prototype only requests a wallet connection when the user clicks Connect Wallet. It does not request signatures or transactions. For production, choose and pin a supported Solana SDK/provider integration, configure Devnet RPC, handle wallet-standard providers and errors, and independently validate game scores server-side before using them for rewards or on-chain actions. Never request or store a user's seed phrase or private key.

Suggested next steps:
1. Replace the prototype provider hook with a maintained Solana wallet-standard / Solana Kit integration.
2. Add automated tests and accessibility checks.
3. Add a backend only when accounts, leaderboards, anti-cheat validation, or persistent data are needed.
4. Register `aistudiosgames.fun`, deploy the built site, and configure DNS + HTTPS.
5. Keep blockchain features on Devnet until reviewed and tested.

## Project structure
```text
ai-studios-games/
├── index.html
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── games.ts        # catalog data: add or edit games here
    ├── main.ts
    ├── style.css
    └── vite-env.d.ts
```
