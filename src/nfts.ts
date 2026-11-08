export interface Nft {
  id: string;
  kicker: string;
  name: string;
  role: string;
  tier: string;
  price: string;
  image: string; // file inside public/images
  model: string; // 3D model (.glb) inside public/models
  alt: string;
  /** Optional highlight for the top rarities. */
  accent?: "gold";
}

/** Collection preview. To add a card, drop the image in public/images, the 3D model in public/models and add an entry here. */
export const NFTS: Nft[] = [
  { id: "orion", kicker: "01 / DIVINE", name: "ORION", role: "SUPREME DIVINITY", tier: "DIVINE NFT", price: "ETERNAL", image: "nft-orion.webp", model: "orion.glb", alt: "Orion — Divine NFT card: a golden and silver winged owl guardian holding the Primordial Data-Staff", accent: "gold" },
  { id: "aeon", kicker: "02 / ANCESTRAL", name: "AEON", role: "GRID ARCHITECT // PRIMORDIAL", tier: "ANCESTRAL NFT", price: "1 SOL", image: "nft-aeon.webp", model: "aeon.glb", alt: "Aeon, Grid Architect — Ancestral NFT card: a cyan winged owl construct holding two glowing staves", accent: "gold" },
];
