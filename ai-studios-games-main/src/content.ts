export interface NewsItem { date: string; tag: string; title: string; text: string }
export interface FaqItem { q: string; a: string }

/** Newest first. Add a line here every time something ships: a fresh log shows visitors the studio is active. */
export const NEWS: NewsItem[] = [
  { date: "OCT 2026", tag: "NEW GAME", title: "Bomber.Idle joins the arcade", text: "Send your Operators out to blow up blocks and collect coins. A second experiment, now playable right here on the site." },
  { date: "OCT 2026", tag: "LORE", title: "The AI World Owl universe is live", text: "Read the prologue and open the dossier of every Operator, from Orion to Vex." },
  { date: "OCT 2026", tag: "COLLECTION", title: "Operator card previews", text: "Eight collectible concept cards are on display. Minting is not live yet." },
];

export const FAQ: FaqItem[] = [
  { q: "Do I need a wallet to play?", a: "No. Games open in your browser. On this site the wallet button is optional, and it only asks to connect. It never requests a signature or a transaction. Some game sites have their own optional wallet features, so always read what a wallet asks you to approve." },
  { q: "Are the NFT cards for sale?", a: "Not yet. The cards on this site are concept-art previews and minting is not live. Prices shown are planned values and may change." },
  { q: "Is any of this an investment?", a: "No. AI Studios Games makes games. Nothing here is financial advice or a promise of returns or value, and digital items can lose all of their value. Only spend what you would spend on entertainment." },
  { q: "Will you ever ask for my seed phrase?", a: "Never. Do not share your seed phrase or private key with anyone, and be careful with anyone who messages you first asking you to connect a wallet or sign something. The official links are listed in the Join section of this page." },
  { q: "What does Experiment or Prototype mean?", a: "These are early builds. They can have bugs, change quickly, or be reset as we learn what makes them fun." },
  { q: "Where do I follow updates?", a: "The Studio Log on this page lists what ships. The Join section has the community links and the waitlist as soon as they are open." },
];
