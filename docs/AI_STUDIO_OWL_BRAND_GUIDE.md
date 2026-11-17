# AI STUDIO OWL — Brand and Platform Notes

- Official site: https://aistudiosowl.vercel.app/
- Official email: aistudioowl@gmail.com
- X: https://x.com/aistudioowl
- YouTube: https://www.youtube.com/@aistudioowl
- Brand tagline: THE UNIVERSE OF AI
- Secondary campaign motto from the primary banner: PLAY BEYOND THE GRID
- Core areas: Games; TikTok Series; AI Videos & Memes; AI Influencers; Crypto & Blockchain; AI Tools & Technology.
- Main site default language: English. Visitors can switch to Brazilian Portuguese or Spanish from the header.
- Future community token: $OWL, planned for pump.fun. Status: Coming Soon. CA: Coming Soon.

## Visual system — Desert Marble (v0.3.0)

The supplied owl crest and panoramic wordmark banner are the primary brand artworks. The site-wide visual palette is desert marble: parchment ivory, warm limestone, pale sand, muted taupe, aged bronze and antique gold. Cyan and violet should remain restrained signature colors from the owl eyes, not the dominant UI palette. Use warm light surfaces, fine stone-like line work, subtle mineral gradients and restrained bronze accents. Avoid returning to the former dark neon-blue/purple look for the main site.

Recommended UI palette:
- Parchment / page base: `#EEE7D9`
- Ivory / raised panels: `#F7F1E6`
- Sand / secondary surface: `#E5DAC6`
- Limestone border: `#D0C1A7`
- Aged bronze accent: `#A67B43`
- Muted taupe: `#81684C`
- Deep text: `#403426`
- Secondary text: `#887963`

Use gentle mineral gradients and low-contrast veining rather than a strong repeating marble pattern. Keep body text dark enough for accessible contrast.

## Existing service dependency

The Slither.Idle frontend still calls its existing Cloudflare Worker endpoint under the former project namespace. It was intentionally retained so the current game service continues to work; do not change that endpoint until a replacement Worker is deployed and tested. The website domain and Worker allowed-origin list are already updated to AI STUDIO OWL.
