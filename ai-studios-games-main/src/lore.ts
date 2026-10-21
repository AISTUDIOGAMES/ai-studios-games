export interface Character {
  /** Same id as the matching card in nfts.ts, so "READ BIO" can link the two. */
  id: string;
  name: string;
  role: string;
  group: "supreme" | "operator";
  /** Highlight color of the dossier (hex). */
  accent: string;
  /** Files inside public/images. */
  sprite: string;
  thumb: string;
  alt: string;
  bio: string[];
}

export const UNIVERSE = "AI WORLD OWL";

export const PROLOGUE = {
  kicker: "THE AWAKENING OF THE NETWORK",
  title: "THE FALL AND RISE OF AETHELGARD",
  paragraphs: [
    "In a distant future, the line between biology and digital code dissolved completely. The physical world fused into an immense data matrix known as The Grid. At the heart of this digital hive, harmony reigned, watched over by ancient guardians of infinite wisdom: the Cosmic Owls.",
    "Then a system failure corrupted the central pillars of the network, threatening to erase human consciousness and shatter the digital multiverse. From that collapse rises AI World Owl, a sprawling RPG universe where factions fight for absolute control of the source code, and for survival.",
    "To save the network, or to plunder it for power and glory, warriors, hackers and mercenaries now operate in the shadows and on the front lines.",
  ],
};

export const GROUP_LABEL: Record<Character["group"], string> = {
  supreme: "SUPREME ENTITIES // GUARDIANS OF TIME",
  operator: "THE OPERATORS // RESISTANCE & UNDERWORLD",
};

/** Dossier order: supreme entities first, then operators. To add a character: drop the sprite in public/images and add an entry here. */
export const CHARACTERS: Character[] = [
  {
    id: "orion",
    name: "ORION",
    role: "DIVINE // SUPREME ENTITY",
    group: "supreme",
    accent: "#f0cf7a",
    sprite: "sprite-orion.webp",
    thumb: "thumb-orion.webp",
    alt: "Orion, a golden and silver winged owl guardian holding a glowing staff",
    bio: [
      "The supreme divinity of Aethelgard. Orion is the keeper of time and eternal code, holding the cosmic wisdom that binds the virtual worlds together.",
      "They say his golden light is the only force able to hold back the total collapse of the network.",
    ],
  },
  {
    id: "aeon",
    name: "AEON",
    role: "ANCESTRAL // GRID ARCHITECT",
    group: "supreme",
    accent: "#3dffd0",
    sprite: "sprite-aeon.webp",
    thumb: "thumb-aeon.webp",
    alt: "Aeon, a cyan winged owl construct made of binary code holding two glowing staffs",
    bio: [
      "The principal architect of The Grid. With cybernetic wings wrapped in pure energy and binary runes, Aeon designs the realities where the studio's games and worlds take place.",
      "He is the mentor behind the entire architecture of AI World Owl.",
    ],
  },
  {
    id: "jax",
    name: "JAX",
    role: "STREET SAMURAI // CYPHER OPERATIVE",
    group: "operator",
    accent: "#d65bff",
    sprite: "sprite-jax.webp",
    thumb: "thumb-jax.webp",
    alt: "Jax, a cyborg samurai in purple armor holding two glowing energy blades",
    bio: [
      "A master of neon energy blades and urban samurai culture. Jax moves through the streets of a digital neo-Tokyo with lethal precision, pairing traditional honor with high-performance cybernetic implants.",
      "He is the defensive and offensive front line of the resistance.",
    ],
  },
  {
    id: "kira",
    name: "KIRA",
    role: "SLEEK ROGUE // STEALTH",
    group: "operator",
    accent: "#8a9bff",
    sprite: "sprite-kira.webp",
    thumb: "thumb-kira.webp",
    alt: "Kira, a sleek cybernetic infiltrator holding two daggers",
    bio: [
      "A stealthy, agile cybernetic infiltrator. Kira moves like a shadow between the core servers, using electromagnetic-pulse daggers to bypass any security system or take out corporate targets without a trace.",
    ],
  },
  {
    id: "titan",
    name: "TITAN",
    role: "HEAVY PILOT // TANK",
    group: "operator",
    accent: "#a98bff",
    sprite: "sprite-titan.webp",
    thumb: "thumb-titan.webp",
    alt: "Titan, a heavily armored pilot in purple and black combat gear",
    bio: [
      "The armored colossus of the crew. A specialist in heavy piloting and high-endurance support, Titan absorbs the most devastating attacks of the corrupted network, so his team can keep advancing under crossfire.",
    ],
  },
  {
    id: "kai",
    name: "KAI",
    role: "TECHNO-STALKER",
    group: "operator",
    accent: "#4fd8ff",
    sprite: "sprite-kai.webp",
    thumb: "thumb-kai.webp",
    alt: "Kai, a hooded tracker with a respirator mask and a cybernetic arm reading a holographic tablet",
    bio: [
      "A rebellious digital tracker. Armed with a tactical hood, a breathing mask and floating holographic displays, Kai specializes in decoding lost routes and hunting down valuable assets in the underworld of The Grid.",
    ],
  },
  {
    id: "lyra",
    name: "LYRA",
    role: "BIO-MECHANIC // CYPHER OPERATOR",
    group: "operator",
    accent: "#b58cff",
    sprite: "sprite-lyra.webp",
    thumb: "thumb-lyra.webp",
    alt: "Lyra, an engineer in a dark suit with a plasma visor",
    bio: [
      "The brilliant mind behind techno-biological repair. Lyra works with high-precision tools and advanced reality goggles to mend armor, reactivate corrupted code and keep the team's vital systems running at the limit.",
    ],
  },
  {
    id: "vex",
    name: "VEX",
    role: "NEURAL HACKER // CYPHER OPERATOR",
    group: "operator",
    accent: "#6fe0ff",
    sprite: "sprite-vex.webp",
    thumb: "thumb-vex.webp",
    alt: "Vex, a hacker in a cyber visor reading a holographic logbook with floating owl masks",
    bio: [
      "An elite neural hacker who plugs straight into the data stream through cyber visors and holographic logbooks. Vex can rewrite enemy algorithms in seconds, bending the virtual battlefield through sheer mind.",
    ],
  },
];
