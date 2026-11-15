# OWL GRIDBREAKERS v1.5.10 — Desktop Display Options

- Added a Desktop-only fullscreen toggle to Settings. Fullscreen uses the browser Fullscreen API from a user click and keeps the in-game bottom navigation visible.
- Added 1080p / 720p / 480p internal WebGL render-resolution presets for Desktop.
- Resolution presets cap the WebGL drawing-buffer height and adapt to viewport height, device-pixel ratio and graphics quality profile. They do not change Windows or monitor physical resolution (browser security limitation).
- Settings and display choices are saved in `owl_gfx_v1`; fullscreen state follows the browser session and safely resets when the player exits with Esc.
- Mobile layout does not show Desktop display options. Auto mode shows them on desktop-width screens.
- No changes to campaign progression, combat calculations or `awo_save_v1`.
