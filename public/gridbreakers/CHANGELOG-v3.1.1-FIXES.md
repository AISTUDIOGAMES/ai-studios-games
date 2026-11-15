# v3.1.1 — Bug fixes (QA review)
- Gacha: weights index was used as rarity. Divine/Ancestral slots now map to ranks 5/6 (Orion/Aeon obtainable at advertised rates).
- Retry/Replay no longer restarts Dungeon/Raid/Arena for free (keys and daily attempts are respected). Tower retry unchanged.
- Removed one-time boot wipe that erased saves lacking the reset marker.
- OWL.merge ignores __proto__/constructor/prototype (prototype pollution via imported save).
- Campaign Reset also clears the backup key; modal text now matches the real starter roster (Lyra).
- tools/difficulty-sim/sim.js paths updated.
- Not changed (design decisions, see QA report): Soul farming rate, gear scaling, inventory cap, memory disposal, floater cap, Equip Best performance.
