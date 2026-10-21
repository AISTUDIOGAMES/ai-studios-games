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
- Lore section (`src/lore.ts`): AI World Owl prologue plus an interactive dossier for all 8 characters, with sprites and short bios
- Each NFT card has a READ BIO button that opens that character's dossier
- Animated hero banner (`src/heroFx.ts` + CSS): slow zoom, pulsing logo glow, glitch flashes, light sweep, scan bar, rising sparks, mouse parallax and click bursts. Pauses off screen and respects reduced motion
- Growth kit: PLAY button in the hero and top bar (newest game), SHARE on every game card, Studio Log (`src/content.ts`), Join section with optional waitlist and community links, FAQ & safety section, SEO tags, social preview image, robots/sitemap, security headers (`vercel.json`) and optional Plausible analytics
- Neon cyberpunk visual system (acid green, electric purple, dark graphite)
- Game catalog driven by one list (`src/games.ts`): Slither.Idle and Bomber.Idle, both external experiments with cover art
- Playable canvas endless-runner prototype (Arrow keys / A-D to move, Space / Up to jump)
- Optional browser-injected Solana wallet connect/disconnect detection (`window.solana`, e.g. Phantom)
- No blockchain transactions, tokens, NFTs, backend, or database are enabled in this prototype

## Turning on community features
Edit `src/config.ts`: set `SOCIALS` links (X, Telegram, Discord, GitHub), `WAITLIST_ENDPOINT` (any https endpoint that accepts a JSON POST with an `email` field, e.g. Formspree), `ANALYTICS_DOMAIN` (Plausible) and `SITE_URL`. Empty values are hidden. When the domain moves to `aistudiosgames.fun`, also update the URLs in `index.html`, `public/robots.txt` and `public/sitemap.xml`.

## Adding or linking a game
1. Put the cover image in `public/images/`.
2. Add an object to `GAMES` in `src/games.ts` (set `cover`, `status` and a public https `url`; leave `url` empty to show LINK COMING SOON).

## Adding a character to the lore
1. Put the sprite (transparent PNG/WebP) and a small thumbnail in `public/images/`.
2. Add an entry to `CHARACTERS` in `src/lore.ts`. Use the same `id` as the card in `src/nfts.ts` so READ BIO links the two.

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
    ├── config.ts       # socials, waitlist, analytics, site URL
    ├── content.ts      # studio log + FAQ text
    ├── analytics.ts
    ├── heroFx.ts       # hero banner canvas effects + parallax
    ├── lore.ts         # story + character bios
    ├── main.ts
    └── style.css
```
