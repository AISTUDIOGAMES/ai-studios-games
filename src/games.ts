export type GameStatus = "experiment" | "prototype" | "live" | "soon";
/** 'external' opens another site in a new tab. 'local' is playable on this page. */
export type GameKind = "external" | "local";

export interface Game {
  id: string;
  kicker: string;
  title: string;
  summary: string;
  status: GameStatus;
  kind: GameKind;
  /** Public https address (external games only). Leave "" until it is ready to link. */
  url: string;
  /** Cover image file inside public/images. When empty, the card shows a generated illustration. */
  cover?: string;
  meta: string[];
}

export const STATUS_LABEL: Record<GameStatus, string> = {
  experiment: "EXPERIMENT",
  prototype: "PROTOTYPE",
  live: "LIVE",
  soon: "COMING SOON",
};

/**
 * Paste the public address of the Slither.Idle site here (https only),
 * for example "https://slitheridle.example.com".
 * While it is empty, the card shows "LINK COMING SOON" instead of a play button.
 */
export const SLITHER_IDLE_URL = "https://mburns2026.github.io/solana-slither-idle/index.html";

/** Public address of the Bomber Idle site (https only). */
export const BOMBER_IDLE_URL = "https://mburns2026.github.io/bomberidle/";

/**
 * Every game on the platform is one entry in this list.
 * To launch a new game: add an object here and put its cover image in public/images (set `cover`).
 */
export const GAMES: Game[] = [
  {
    id: "slither-idle",
    kicker: "01 / SNAKE + IDLE",
    title: "SLITHER.IDLE",
    summary:
      "A snake game with an idle twist. Collect coins to grow, take down rivals, or let the Auto-Bot play while you are away. It runs on its own site and opens in a new tab.",
    status: "experiment",
    kind: "external",
    url: SLITHER_IDLE_URL,
    cover: "slither-cover.webp",
    meta: ["◈ BROWSER GAME", "⌁ AUTO-BOT IDLE PLAY", "◎ TEST BUILD // NO REAL VALUE"],
  },
  {
    id: "bomber-idle",
    kicker: "02 / BOMBER + IDLE",
    title: "BOMBER.IDLE",
    summary:
      "An idle bomber game starring the Operators. Send your crew out to blow up blocks and collect coins, keep an eye on their stamina, and build a roster of rarer heroes across missions and maps. It runs on its own site and opens in a new tab.",
    status: "experiment",
    kind: "external",
    url: BOMBER_IDLE_URL,
    cover: "bomber-cover.webp",
    meta: ["◈ BROWSER GAME", "⌁ IDLE OPERATORS", "◎ EXPERIMENT BUILD"],
  },
];

/** Returns a safe https address, or null when the link is empty or invalid. */
export function safeUrl(raw: string): string | null {
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" ? parsed.href : null;
  } catch {
    return null;
  }
}
