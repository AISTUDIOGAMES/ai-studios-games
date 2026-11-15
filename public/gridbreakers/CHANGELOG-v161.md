# OWL: GRIDBREAKERS v1.6.1 — Equipment Shimmer Boundary Fix

- **Fixed:** moving rarity highlight no longer travels beyond the equipment tile.
- The gradient now shifts across a stationary overlay that is bounded by the icon's dimensions and rounded corners.
- Applied consistently to Epic, Mythic, Divine and Ancestral equipment.
- Preserved +10 fire ember particles, including their intentional external rendering.
- Visual-only patch. No combat stats, drop rates, item IDs, inventory, enhancement data, save key or save data changed.
- Updated asset query versions in `index.html` to avoid loading cached copies.

## Validation
- All JavaScript files passed `node --check`.
- Source audit found no remaining equipment rarity sheen using `translateX()` / `shn` motion.
