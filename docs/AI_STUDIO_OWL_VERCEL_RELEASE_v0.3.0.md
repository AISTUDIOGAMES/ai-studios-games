# AI STUDIO OWL v0.3.0 — Vercel release notes

- Target: primary static Vite/TypeScript website.
- Build: `npm run build`.
- Install: `npm ci`.
- Output: `dist/`.
- Visual identity: Desert Marble, based on the two user-provided brand images.
- The full website media package is included in this release archive.
- Preview is the default deployment target; Production requires an explicit PowerShell parameter and confirmation.
- Express server and Cloudflare Worker deployments remain separate operations.
- Build could not be certified in the preparation environment because dependency installation timed out; the included script must pass `npm ci` and `npm run build` before deployment.
