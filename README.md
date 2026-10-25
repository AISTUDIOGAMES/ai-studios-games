# OWL Studios Game — Prototype 0.1

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
- Game catalog card and roadmap section
- Playable canvas endless-runner prototype (Arrow keys / A-D to move, Space / Up to jump)
- Optional browser-injected Solana wallet connect/disconnect detection (`window.solana`, e.g. Phantom)
- No blockchain transactions, tokens, NFTs, backend, or database are enabled in this prototype

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
├── public/images/      # all site artwork
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── main.ts
    └── style.css
```
