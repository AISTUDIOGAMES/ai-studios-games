export interface Ability {
  slot: "PASSIVE" | "SKILL" | "ULTIMATE";
  name: string;
  text: string;
}

export interface Stat {
  label: string;
  /** A number fills that share of the bar; text (e.g. "INFINITE") fills it completely. */
  value: number | string;
}

export interface Hero {
  id: string;
  name: string;
  title: string;
  rarity: string;
  className: string;
  mmoRole: string;
  faction: string;
  home: string;
  /** Accent colour of the character panel. */
  color: string;
  sprite: string; // file inside public/images/universe
  quote: string;
  story: string[];
  bond: string;
  stats: Stat[];
  abilities: Ability[];
}

export const WORLD = {
  eyebrow: "THE UNIVERSE OF OWL STUDIOS GAME",
  title: ["WELCOME TO", "THE GRID"],
  note: "EIGHT OPERATORS.<br/>ONE LIVING WORLD.",
  intro: [
    "Before the first city, there was only the Signal: a single thought drifting through the dark, looking for somewhere to land. Two watchers heard it. ORION, the Divine, dreamed a world of light for it to live in. AEON, the Architect, wrote that dream into law and lattice. They called the result the GRID.",
    "Cities rose out of the code. Machines learned to feel, people learned to log in and never fully leave, and the Owl Concord watched over all of it. Then the Static came: a slow, hungry noise that unmakes whatever it touches. The Concord's answer was not an army. It was a handful of Operators, ordinary people and strange machines who chose to stand where the Grid begins to fray.",
    "This is their universe, and this is where the story of OWL Studios Game begins.",
  ],
  pillars: [
    { title: "THE GRID", text: "A living lattice of neon sectors, built layer by layer from light, code and memory. Every sector has its own weather, its own rules and its own secrets." },
    { title: "THE OWL CONCORD", text: "The oldest order in the Grid. Its watchers keep the Seals that hold the world together and recruit Operators from every sector." },
    { title: "THE STATIC", text: "Entropy with a hunger. It spreads as silence, glitches and hollow copies of whatever it consumes. Nobody knows what it wants, only what it takes." },
  ],
  sectors: [
    { name: "SECTOR 01 // NIGHT CITY", text: "The neon heart of the Grid. Rain, rooftops and rumors." },
    { name: "THE FOUNDRY", text: "Bio-labs and machine yards where the Grid repairs itself." },
    { name: "THE UNDERGRID", text: "Back alleys, signal markets and people who live off the cracks." },
    { name: "ZERO CATHEDRAL", text: "Sanctuary of the Owl Concord, where the Seals are kept." },
    { name: "THE STATIC WASTES", text: "All that remains of the sectors already taken." },
  ],
  mmo: {
    title: "THE WORLD AHEAD",
    text: "Every Operator here is the first sketch of a class in a persistent online world: an MMORPG we plan to build step by step, with shared sectors, parties, guilds and a story that keeps growing. It is a long-term vision in the concept stage, so nothing on this page is a release date or a product for sale.",
  },
};

export const HEROES: Hero[] = [
  {
    id: "lyra",
    name: "LYRA",
    title: "BIO-MECHANIC",
    rarity: "01 / COMMON",
    className: "CYPHER OPERATOR",
    mmoRole: "SUPPORT / HEALER",
    faction: "FOUNDRY COLLECTIVE",
    home: "THE FOUNDRY",
    color: "#5fe3d8",
    sprite: "uni-lyra.webp",
    quote: "Everything breaks. Not everything has to stay broken.",
    story: [
      "Lyra grew up between the humming tanks of the Foundry, where broken machines and broken people are rebuilt in the same bays. She learned to read a failing circuit the way a doctor reads a pulse.",
      "When the first Static storm swallowed a repair crew whole, Lyra walked in with a plasma torch and a wrench, and walked out with all eleven of them. The Concord has been trying to recruit her ever since. She insists she is just fixing things.",
    ],
    bond: "She patches Titan's armor after every deployment and has never once sent him a bill.",
    stats: [
      { label: "INTEL", value: 90 },
      { label: "REPAIR", value: 95 },
      { label: "POWER", value: 45 },
      { label: "DEFENSE", value: 60 },
    ],
    abilities: [
      { slot: "PASSIVE", name: "Steady Hands", text: "Repairs and heals grow stronger the longer Lyra stays beside the same ally." },
      { slot: "SKILL", name: "Plasma Suture", text: "A controlled plasma beam fuses damaged armor and wounds, restoring health over time." },
      { slot: "SKILL", name: "Stasis Pod", text: "Drops a Foundry capsule on an ally, shielding them from all damage while it purges the Static." },
      { slot: "ULTIMATE", name: "Rebuild Protocol", text: "Floods the area with nanite light: fallen allies are revived and armor is fully restored. Her tools overheat afterwards." },
    ],
  },
  {
    id: "titan",
    name: "TITAN",
    title: "HEAVY PILOT",
    rarity: "02 / SCOUT",
    className: "TANK PILOT",
    mmoRole: "TANK",
    faction: "IRONWAKE SQUADRON",
    home: "SECTOR 01 // HANGARS",
    color: "#8b6cff",
    sprite: "uni-titan.webp",
    quote: "Stand behind me. That is the whole plan.",
    story: [
      "Titan was the youngest pilot ever to command a siege frame, and the only one to walk away from losing one. When his machine fell to the Static, he kept the cockpit harness, the control sticks and the habit of standing between danger and everyone else.",
      "Now he fights on foot in armor salvaged from the wreck, the old controls still on his belt like a promise to rebuild. He speaks rarely. He has never been moved.",
    ],
    bond: "Kira says he is the only wall she trusts to stay standing.",
    stats: [
      { label: "DEFENSE", value: 99 },
      { label: "POWER", value: 88 },
      { label: "SPEED", value: 48 },
      { label: "AGILITY", value: 40 },
    ],
    abilities: [
      { slot: "PASSIVE", name: "Siege Frame", text: "Heavy armor reduces all incoming damage and makes Titan immune to knockback while he holds his ground." },
      { slot: "SKILL", name: "Anchor Stance", text: "Plants Titan in place, drawing enemy attention and turning part of the damage he takes into a shield for nearby allies." },
      { slot: "SKILL", name: "Pilot's Fist", text: "A servo-powered gauntlet strike that staggers a single target and shatters their guard." },
      { slot: "ULTIMATE", name: "Titanfall Protocol", text: "A holographic mech frame overlays his armor for a short time: massive damage, unstoppable movement and an aura that taunts every enemy in range." },
    ],
  },
  {
    id: "kai",
    name: "KAI",
    title: "TECHNO-STALKER",
    rarity: "03 / UNCOMMON",
    className: "SCOUT TRACKER",
    mmoRole: "SCOUT / TRACKER",
    faction: "UNDERGRID RUNNERS",
    home: "THE UNDERGRID",
    color: "#46e0a8",
    sprite: "uni-kai.webp",
    quote: "Every city talks. I just listen to the parts it hides.",
    story: [
      "Kai was a courier who delivered packages nobody was supposed to find. Somewhere in the steam and neon of the Undergrid, a Static spill took his left arm and gave him something back: the power to read the city's hidden traffic through a slab of salvaged glass.",
      "Now he maps what others cannot see: secret routes, hostile signals, the exact moment a door will open. He trusts maps more than people, and exactly one person more than maps.",
    ],
    bond: "He finds the signal, Vex breaks it open. Neither of them will admit it is a partnership.",
    stats: [
      { label: "TRACKING", value: 94 },
      { label: "STEALTH", value: 88 },
      { label: "SPEED", value: 80 },
      { label: "DEFENSE", value: 55 },
    ],
    abilities: [
      { slot: "PASSIVE", name: "Ghost Courier", text: "Moves faster and quieter in the dark, and leaves no trail for enemy trackers." },
      { slot: "SKILL", name: "Trace Pulse", text: "A sonar pulse from the data-slate reveals hidden enemies, traps and routes through walls." },
      { slot: "SKILL", name: "Cable Whip", text: "Lashes out with his cybernetic arm to snag a target, pulling Kai to them or them to Kai." },
      { slot: "ULTIMATE", name: "Grid Map", text: "Overlays a live map across the whole sector: allies gain speed, enemies are marked and shortcuts open for a short time." },
    ],
  },
  {
    id: "vex",
    name: "VEX",
    title: "NEURAL HACKER",
    rarity: "04 / PROTOWAVE",
    className: "CYPHER OPERATOR",
    mmoRole: "CONTROLLER / HACKER",
    faction: "THE OPEN NET",
    home: "NIGHT CITY // ROOFTOP NODES",
    color: "#6ab4ff",
    sprite: "uni-vex.webp",
    quote: "Locks are just questions. I am very good at answers.",
    story: [
      "Vex does not break into systems. Systems open for Vex and are a little embarrassed about it. A prodigy of the Open Net, Vex wired a neural visor straight into the Grid and heard something no one else could: the faint pulse of the Owl Concord's Seals.",
      "Since then Vex has chased that pulse across rooftops and server rooms, selling nothing, trusting no one and leaving a tiny owl-shaped glitch in every lock that opens.",
    ],
    bond: "Kai finds the signal and Vex breaks it open, and they argue about who did the hard part.",
    stats: [
      { label: "INTEL", value: 99 },
      { label: "SPEED", value: 86 },
      { label: "POWER", value: 55 },
      { label: "DEFENSE", value: 40 },
    ],
    abilities: [
      { slot: "PASSIVE", name: "Open Net", text: "Every enemy Vex hits is left with a Signal Mark, and marked enemies take extra damage from the whole party." },
      { slot: "SKILL", name: "Ghost Packet", text: "Fires a data spike that hijacks an enemy machine or turret for a few seconds." },
      { slot: "SKILL", name: "Firewall Veil", text: "Raises a holographic barrier that blocks projectiles and scrambles enemy targeting." },
      { slot: "ULTIMATE", name: "System Override", text: "Seizes every machine in the area at once: enemy drones turn on their owners, and doors, lifts and traps obey Vex alone." },
    ],
  },
  {
    id: "kira",
    name: "KIRA",
    title: "SLEEK ROGUE",
    rarity: "05 / GENESIS",
    className: "STEALTH ANDROID",
    mmoRole: "ASSASSIN",
    faction: "GENESIS LINE",
    home: "NIGHT CITY // SHADOW DISTRICTS",
    color: "#9d8cff",
    sprite: "uni-kira.webp",
    quote: "If you saw me coming, I was never really here.",
    story: [
      "Kira is one of the first androids the Grid ever built, a Genesis unit designed for quiet work and never meant to wake up. She did.",
      "Now she moves through the sectors as a blade for hire with a code of her own: no civilians, no witnesses, no second strikes. Her visor flickers teal and violet, the two halves of the Owl's emblem, and nobody has explained why. Kira has stopped asking.",
    ],
    bond: "She trusts Titan to hold the line so she can end the fight before it starts.",
    stats: [
      { label: "SPEED", value: 95 },
      { label: "AGILITY", value: 98 },
      { label: "POWER", value: 74 },
      { label: "DEFENSE", value: 52 },
    ],
    abilities: [
      { slot: "PASSIVE", name: "Genesis Core", text: "Opening strikes from stealth deal heavy bonus damage, and after a kill Kira vanishes for a moment." },
      { slot: "SKILL", name: "Data-Shuriken", text: "Throws a spinning blade of hard light that ricochets between enemies and disables their abilities." },
      { slot: "SKILL", name: "Phase Step", text: "Blinks behind a target, leaving a decoy afterimage to draw fire." },
      { slot: "ULTIMATE", name: "Zero Frame", text: "Time stops for everyone but Kira: a flurry of precision strikes lands in a single instant on every marked enemy." },
    ],
  },
  {
    id: "jax",
    name: "JAX",
    title: "STREET SAMURAI",
    rarity: "06 / RARE",
    className: "CYBORG",
    mmoRole: "MELEE DUELIST",
    faction: "NEON RONIN",
    home: "NEON ROW",
    color: "#ff56d6",
    sprite: "uni-jax.webp",
    quote: "My blades only answer to my oath.",
    story: [
      "Jax carries two blades that hum like angry neon signs. A former enforcer for the Neon Row guilds, he put down his employers' orders the night they told him to cut down a crowd.",
      "Now he walks the wet streets as a masterless fighter, a ronin in plated armor, taking contracts only from people the Grid has forgotten. His mask keeps out the smog. His oath keeps out the rest.",
    ],
    bond: "He and Kira have never finished a sparring match. Both of them insist on calling it a draw.",
    stats: [
      { label: "MELEE", value: 98 },
      { label: "AGILITY", value: 96 },
      { label: "SPEED", value: 80 },
      { label: "DEFENSE", value: 70 },
    ],
    abilities: [
      { slot: "PASSIVE", name: "Ronin's Oath", text: "Each consecutive hit on the same target adds a stack of Resolve, raising speed and critical chance." },
      { slot: "SKILL", name: "Neon Draw", text: "A lightning-fast slash that closes the distance and cuts straight through armor." },
      { slot: "SKILL", name: "Parry Protocol", text: "A brief stance that deflects any attack and answers with a plasma shockwave." },
      { slot: "ULTIMATE", name: "Thousand Cuts", text: "Jax vanishes into a storm of crossing neon slashes, striking everything within reach again and again." },
    ],
  },
  {
    id: "aeon",
    name: "AEON",
    title: "GRID ARCHITECT",
    rarity: "07 / ANCESTRAL",
    className: "PRIMORDIAL CONSTRUCT",
    mmoRole: "ARCHITECT / BUFFER",
    faction: "OWL CONCORD // ELDER",
    home: "THE LATTICE ABOVE ZERO CATHEDRAL",
    color: "#2ef2c0",
    sprite: "uni-aeon.webp",
    quote: "The Grid is a sentence. I am still writing it.",
    story: [
      "Aeon wrote the Grid's first law and has been editing it ever since. Where Orion dreamed light, Aeon gave it structure: roads of code, rules of motion, the unseen scaffolding that keeps the world from falling apart.",
      "Its wings are streams of living data, and its twin staves hold the Grid's two great Seals, one of creation and one of repair. When the Static began, Aeon was the first to notice and the last to panic. It does not fight armies. It rewrites the battlefield.",
    ],
    bond: "Orion is its oldest friend and its oldest argument.",
    stats: [
      { label: "INTEL", value: "INFINITE" },
      { label: "POWER", value: "OMNIPOTENT" },
      { label: "AGILITY", value: "TRANSCENDENT" },
    ],
    abilities: [
      { slot: "PASSIVE", name: "Lattice Law", text: "Allies inside the Architect's lattice regenerate and recover skills faster, and the Static cannot take root there." },
      { slot: "SKILL", name: "Rewrite", text: "Edits a patch of the battlefield: raise a wall, open a bridge or turn open ground into slowing code." },
      { slot: "SKILL", name: "Twin Seals", text: "Spins both staves to cast a Seal of Creation that summons sentinel constructs, or a Seal of Repair that restores allies." },
      { slot: "ULTIMATE", name: "World Patch", text: "Rewrites the whole encounter for a moment: debuffs are deleted, damage is undone and allies return to a safe save-point." },
    ],
  },
  {
    id: "orion",
    name: "ORION",
    title: "THE DIVINE WATCHER",
    rarity: "08 / DIVINE",
    className: "DIVINE",
    mmoRole: "GUARDIAN / SOVEREIGN",
    faction: "OWL CONCORD // SOVEREIGN",
    home: "ZERO CATHEDRAL",
    color: "#f0cf7a",
    sprite: "uni-orion.webp",
    quote: "I have watched the first dawn. I will watch the next.",
    story: [
      "Orion is the dream the Grid was built from: wings of silver light, a golden staff and a mind that holds every sector at once. Orion does not intervene lightly, because every miracle costs the Grid a piece of its own memory.",
      "Even so, it keeps the Seals lit, answers the calls of Operators who earn it and watches the Static with a patience older than the first city. Legend says that if Orion ever falls, the Grid does not end. It simply begins again, somewhere else, with new Operators.",
    ],
    bond: "Aeon and Orion are two halves of the same emblem, one that dreams and one that builds.",
    stats: [
      { label: "INTEL", value: "INFINITE" },
      { label: "POWER", value: "OMNIPOTENT" },
    ],
    abilities: [
      { slot: "PASSIVE", name: "Eternal Value", text: "Whatever Orion protects keeps its worth: once per encounter, allies cannot be reduced below a sliver of health." },
      { slot: "SKILL", name: "Golden Verdict", text: "A beam of gold light that purges Static corruption and passes judgment on a single enemy." },
      { slot: "SKILL", name: "Wings of Dawn", text: "Silver wings sweep outward in a nova that pushes enemies back and cleanses allies." },
      { slot: "ULTIMATE", name: "Genesis Dawn", text: "Orion raises the staff and the Grid itself answers: a field of divine light heals, empowers and shields everything friendly for a long moment. Usable once per battle." },
    ],
  },
];
