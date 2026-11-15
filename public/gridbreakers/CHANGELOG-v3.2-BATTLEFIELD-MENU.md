# v3.2 — Battle menu at the top + HUD polish (layout/CSS only)
- Navigation menu is docked at the TOP of the battlefield (`#bf-menu-slot`, first child of `#battlefield-hud`)
  while the Battle tab is open; on other tabs it returns to the bottom bar. (`js/38-battlefield-menu-v166.js`)
  The nav node is held by reference and re-attached before every view rebuild, so it can't be destroyed with the arena.
- Loot counter moved down to sit just under the menu (top 5px -> 46px); header, party rail and target panel shifted accordingly.
  Arena is a little taller on phones to make room.
- Loot counter now uses compact chips; party portraits have gold rings; skill buttons pulse when ready / ultimate;
  control buttons use vector icons instead of text glyphs; arena frame has soft depth.
- No combat, economy or save logic touched. NOT changed: the 3D map and character models/sprites.
