export interface Nft {
  id: string;
  kicker: string;
  name: string;
  role: string;
  tier: string;
  price: string;
  image: string; // file inside public/images
  alt: string;
  /** Optional highlight for the top rarities. */
  accent?: "gold";
}

/** Collection preview, ordered from the most common to the rarest. To add a card, drop the image in public/images and add an entry here. */
export const NFTS: Nft[] = [
  { id: "lyra", kicker: "01 / COMMON", name: "LYRA", role: "BIO-MECHANIC // CYPHER", tier: "COMMON NFT", price: "0.005 SOL", image: "nft-lyra.webp", alt: "Lyra, Bio-Mechanic — Common NFT card" },
  { id: "titan", kicker: "02 / SCOUT", name: "TITAN", role: "HEAVY PILOT // TANK", tier: "SCOUT NFT", price: "0.01 SOL", image: "nft-titan.webp", alt: "Titan, Heavy Pilot — Scout NFT card" },
  { id: "kai", kicker: "03 / UNCOMMON", name: "KAI", role: "TECHNO-STALKER", tier: "UNCOMMON NFT", price: "0.02 SOL", image: "nft-kai.webp", alt: "Kai, Techno-Stalker — Uncommon NFT card" },
  { id: "vex", kicker: "04 / PROTOWAVE", name: "VEX", role: "NEURAL HACKER // CYPHER", tier: "PROTOWAVE NFT", price: "0.03 SOL", image: "nft-vex.webp", alt: "Vex, Neural Hacker — Protowave NFT card" },
  { id: "kira", kicker: "05 / GENESIS", name: "KIRA", role: "SLEEK ROGUE // STEALTH", tier: "GENESIS NFT", price: "0.05 SOL", image: "nft-kira.webp", alt: "Kira, Sleek Rogue — Genesis NFT card" },
  { id: "jax", kicker: "06 / RARE", name: "JAX", role: "STREET SAMURAI // CYBORG", tier: "RARE NFT", price: "0.15 SOL", image: "nft-jax.webp", alt: "Jax, Street Samurai — Rare NFT card" },
  { id: "aeon", kicker: "07 / ANCESTRAL", name: "AEON", role: "GRID ARCHITECT // PRIMORDIAL", tier: "ANCESTRAL NFT", price: "1 SOL", image: "nft-aeon.webp", alt: "Aeon, Grid Architect — Ancestral NFT card", accent: "gold" },
  { id: "orion", kicker: "08 / DIVINE", name: "ORION", role: "SUPREME DIVINITY", tier: "DIVINE NFT", price: "ETERNAL", image: "nft-orion.webp", alt: "Orion — Divine NFT card", accent: "gold" },
];
