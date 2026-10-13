export interface Nft {
  id: string;
  kicker: string;
  name: string;
  role: string;
  tier: string;
  price: string;
  image: string; // file inside public/images
  alt: string;
}

/** Collection preview. Ordered by price. To add a card, drop the image in public/images and add an entry here. */
export const NFTS: Nft[] = [
  { id: "titan", kicker: "01 / SCOUT", name: "TITAN", role: "HEAVY PILOT // TANK", tier: "SCOUT NFT", price: "0.01 SOL", image: "nft-titan.webp", alt: "Titan, Heavy Pilot — Scout NFT card" },
  { id: "vex", kicker: "02 / PROTOWAVE", name: "VEX", role: "NEURAL HACKER // CYPHER", tier: "PROTOWAVE NFT", price: "0.03 SOL", image: "nft-vex.webp", alt: "Vex, Neural Hacker — Protowave NFT card" },
  { id: "kira", kicker: "03 / GENESIS", name: "KIRA", role: "SLEEK ROGUE // STEALTH", tier: "GENESIS NFT", price: "0.05 SOL", image: "nft-kira.webp", alt: "Kira, Sleek Rogue — Genesis NFT card" },
];
