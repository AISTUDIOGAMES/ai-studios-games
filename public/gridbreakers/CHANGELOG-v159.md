# OWL GRIDBREAKERS v1.5.9

## Campaign reset
- Reset Campanha moved to the Settings panel. The Campaign Map no longer contains the destructive reset entry.
- The confirmation dialog is layered above Settings; Cancel leaves Settings open.
- Confirm resets progression and campaign resources, while preserving display, audio and auto-combat preferences.
- Starter roster text now matches the actual new-save roster: Lyra, Jax, Kira and Kai.

## Dungeons
- Gold, Forge and Relic Dungeons run continuously for a maximum of 10 minutes.
- Intermediate wave clears grant no loot or XP; the final boss enters at 08:00 and must be defeated before the deadline.
- Dungeon enemies receive a stronger baseline plus stage, wave and party-strength scaling.
- Completion grants a generous dungeon-specific bundle; a full party wipe or timeout grants no completion loot.
- The in-arena status shows the live timer, uncapped wave count and final-boss phase.

## Ancient Tower and battle cleanup
- Ancient Tower enemy HP, attack and defence adapt to the active Party's average level, summed equipment-aware team POWER and active roster size with soft scaling, plus floor scaling. Existing attrition between floors is preserved.
- Enemy scene models and remaining overhead bars are removed one second after a completed victory; the cleanup is not triggered during intermediate Dungeon waves.

## Compatibility
- Campaign save key remains `awo_save_v1`.
- Settings remain in their existing independent settings store. Reset is confirmation-protected.
- Updated asset query versions prevent browsers from reusing older core/settings scripts.
