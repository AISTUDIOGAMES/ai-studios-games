export type Rarity = "common" | "uncommon" | "rare" | "ancestral" | "divine";

export interface NftAttr {
  label: string;
  value: string;
}

export interface Nft {
  id: string;
  name: string;
  title: string;
  rarity: Rarity;
  /** Price in SOL as shown on the card artwork. Use null while there is no price yet. */
  priceSol: number | null;
  /** File inside /public/nfts (served from /nfts/...). */
  image: string;
  alt: string;
  attrs: NftAttr[];
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "COMMON",
  uncommon: "UNCOMMON",
  rare: "RARE",
  ancestral: "ANCESTRAL",
  divine: "DIVINE",
};

/**
 * Every NFT card on the site is one entry in this list (shown in this order).
 * To add another: drop the image in public/nfts/ and add an object here.
 * Display only: nothing here can be bought or minted yet.
 */
export const NFTS: Nft[] = [
  {
    id: "lyra",
    name: "LYRA",
    title: "BIO-MECHANIC",
    rarity: "common",
    priceSol: 0.005,
    image: "lyra.jpg",
    alt: "Lyra, Bio-Mechanic: a cyberpunk engineer with a plasma visor holding a wrench and a welding torch",
    attrs: [
      { label: "CLASS", value: "Cypher Operator" },
      { label: "GEAR", value: "Plasma Visor | Tool" },
      { label: "STATS", value: "Intel 90, Repair 95" },
    ],
  },
  {
    id: "kai",
    name: "KAI",
    title: "TECHNO-STALKER",
    rarity: "uncommon",
    priceSol: 0.02,
    image: "kai.jpg",
    alt: "Kai, Techno-Stalker: a hooded figure with a respirator mask and a cybernetic arm reading a holographic tablet in a neon alley",
    attrs: [],
  },
  {
    id: "jax",
    name: "JAX",
    title: "STREET SAMURAI",
    rarity: "rare",
    priceSol: 0.15,
    image: "jax.jpg",
    alt: "Jax, Street Samurai: a cyborg in purple armor holding two glowing energy blades in a rainy neon street",
    attrs: [
      { label: "CLASS", value: "Cyborg" },
      { label: "STATS", value: "Agility 96, Melee 98" },
    ],
  },
  {
    id: "aeon",
    name: "AEON",
    title: "GRID ARCHITECT",
    rarity: "ancestral",
    priceSol: 1,
    image: "aeon.jpg",
    alt: "Aeon, Grid Architect: a winged owl-headed construct made of data holding two glowing staffs",
    attrs: [
      { label: "CLASS", value: "Primordial Construct" },
      { label: "GEAR", value: "Primordial Data-Staff" },
      { label: "STATS", value: "Intel Infinite, Power Omnipotent, Agility Transcendent" },
    ],
  },
  {
    id: "orion",
    name: "ORION",
    title: "SUPREME DIVINITY",
    rarity: "divine",
    priceSol: null,
    image: "orion.jpg",
    alt: "Orion, Supreme Divinity: a golden and white winged owl guardian holding a golden staff",
    attrs: [
      { label: "CLASS", value: "Divine" },
      { label: "STATS", value: "Intel Infinite, Power Omnipotent" },
    ],
  },
];

export function formatPrice(priceSol: number | null): string {
  return priceSol === null ? "PRICE TBA" : `${priceSol} SOL`;
}
