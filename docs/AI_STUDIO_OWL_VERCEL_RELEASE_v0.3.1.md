# AI STUDIO OWL — Vercel Release v0.3.1

## Visual hotfix

This release addresses brand assets and hero-banner presentation observed in the v0.3.0 Preview.

- The top navigation and footer now use a dedicated horizontal logo lockup derived from the approved Desert Marble artwork.
- The square owl emblem remains available for compact visual placements.
- The Desert Marble banner remains the default opening slide instead of automatically switching to other showcase slides after seven seconds. Visitors may still navigate manually or start the rotation with the slideshow control.
- The image keeps its full panoramic frame; its controls are placed below the artwork so the bottom motto is not covered.
- Responsive sizing has been added for desktop and mobile.

## Static asset upload fix

The v0.3.0 Preview was reported to be missing some brand images and banners. The root `.vercelignore` contained unanchored directory patterns such as `images/`, `assets/` and `nft/`. Since Vercel `.vercelignore` patterns behave similarly to `.gitignore`, those rules could also match same-named directories nested under `public/`. The v0.3.1 file anchors auxiliary folders to the repository root (for example `/images/` and `/assets/`) so `public/images/` and `public/gridbreakers/assets/` are retained for deployment.

## Verification

The original v0.3.0 build passed on the user's Windows machine. This v0.3.1 archive was statically inspected, but the current preparation environment could not access the npm registry to reinstall dependencies. Run `npm ci` and `npm run build` before deployment. The PowerShell script performs those steps and aborts if either fails.

No deployment was made during preparation.
