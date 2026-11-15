# OWL: GRIDBREAKERS — Equipment Catalog v1.6.0

Official equipment organization for the three current collections. Each collection contains six base items. Every base item can drop in any of the eight equipment rarity tiers.

## Equipment slots

| Slot order | Slot | Main stat |
|---:|---|---|
| 1 | Weapon | ATK |
| 2 | Helmet | HP |
| 3 | Armor | DEF |
| 4 | Gloves | CRIT |
| 5 | Boots | SPD |
| 6 | Relic | ATK% |

Sub-stats continue to be rolled by the existing item generator. Enhancement levels, hero binding and item IDs are unchanged.

## Set 01 — Obsidian

*Violet obsidian plates, ancient gold and fortress-grade protection.*

| Slot | Official item name |
|---|---|
| Weapon | Obsidian Blade |
| Helmet | Crown of Obsidia |
| Armor | Obsidian Aegis |
| Gloves | Devourer's Grips |
| Boots | Shadow Striders |
| Relic | Obsidian Core |

**Set bonuses**

| Equipped pieces | Bonus |
|---:|---|
| 2 | +8% DEF |
| 4 | +14% DEF and +7% ATK |
| 6 | +24% DEF and +14% ATK |

## Set 02 — Lunar

*Silver-blue lunar steel, celestial wards and restorative resilience.*

| Slot | Official item name |
|---|---|
| Weapon | Lunar Arcblade |
| Helmet | Mooncrest Helm |
| Armor | Lunar Guardian Plate |
| Gloves | Moonlit Handguards |
| Boots | Lunar Treads |
| Relic | Lunar Sigil |

**Set bonuses**

| Equipped pieces | Bonus |
|---:|---|
| 2 | +8% HP |
| 4 | +14% HP and +6% DEF |
| 6 | +24% HP and +12% DEF |

## Set 03 — Thread

*Quantum lattice, cyan energy lines, precision and speed.*

| Slot | Official item name |
|---|---|
| Weapon | Golden Thread Staff |
| Helmet | Ancient Owl Visor |
| Armor | Threadweaver Mantle |
| Gloves | Quantum Gloves |
| Boots | Void Walkers |
| Relic | Quantum Crystal |

**Set bonuses**

| Equipped pieces | Bonus |
|---:|---|
| 2 | +2% CRIT |
| 4 | +5% CRIT and +8% SPD |
| 6 | +8% CRIT, +16% SPD and +10% ATK |

Thread CRIT bonuses are still constrained by the existing 30% absolute CRIT cap.

## Rarity ladder

| Rank | Rarity | Equipment color |
|---:|---|---|
| 1 | Common | `#9aa0aa` — grey |
| 2 | Uncommon | `#25c56e` — green |
| 3 | Rare | `#2753a5` — deep blue |
| 4 | Epic | `#b25cff` — violet |
| 5 | Legendary | `#f0d34a` — yellow-gold |
| 6 | Mythic | `#ef4444` — red |
| 7 | Divine | `#d9a52b` — gold |
| 8 | Ancestral | `#16c9d5` — cyan |

The rarity rank belongs to an item independently of its Set and slot. For example, Obsidian Core can exist as Common, Uncommon, Rare, Epic, Legendary, Mythic, Divine or Ancestral.

## Equipment drop-rate table

The campaign uses six gear-drop bands. The Legendary and Mythic columns were corrected to follow the rarity ladder: each higher tier is at least as rare as the tier before it. Each band still totals 100%.

| Stage band | Common | Uncommon | Rare | Epic | Legendary | Mythic | Divine | Ancestral |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1–10 | 50% | 25% | 15% | 7% | 2.5% | 0.45% | 0.049% | 0.001% |
| 11–30 | 44% | 25% | 16% | 9% | 4% | 1.5% | 0.45% | 0.05% |
| 31–50 | 38% | 24% | 17% | 10% | 7% | 3% | 0.9% | 0.1% |
| 51–70 | 33% | 23% | 18% | 11% | 9% | 4% | 1.7% | 0.3% |
| 71–90 | 29% | 22% | 18% | 12% | 10% | 6% | 2.5% | 0.5% |
| 91–100 | 25% | 20% | 18% | 13% | 12% | 8% | 3.5% | 0.5% |

## Compatibility

- Save key remains `awo_save_v1`.
- Existing item IDs, Set IDs, slot IDs and rarity indices are unchanged.
- Existing owned/equipped items and enhancement levels are preserved.
- No save reset or migration is required.
- The approved Ancestral Obsidian Core artwork remains restricted to Obsidian + Relic + Ancestral.


## Lunar sprite implementation — v1.6.3

The six Lunar pieces now use isolated transparent PNGs in `assets/img/equipment/lunar/`. The names and set bonuses above remain unchanged.


## Thread sprite implementation — v1.6.4

The six Thread pieces now use isolated transparent PNGs in `assets/img/equipment/thread/`. The names and set bonuses above remain unchanged.
