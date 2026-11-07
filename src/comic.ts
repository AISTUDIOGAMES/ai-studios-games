/**
 * AI WORLD OWL: the graphic novel saga.
 * To release an episode later, change its status to "live" and set its url
 * (a reader page, a PDF, an itch.io or Webtoon link). Nothing else needs to change.
 */
export interface ComicEpisode {
  number: string;
  title: string;
  tagline: string;
  status: "soon" | "live";
  url?: string;
  /** Index in COMIC_PAGES where this episode starts (opens in the on-site reader). */
  page?: number;
}

/** Pages of Vol. 01 in reading order (files in public/images/hq). */
export const COMIC_PAGES: { file: string; label: string; alt: string }[] = [
  { file: "hq/p0-cover.webp", label: "COVER", alt: "AI World Owl Vol. 01: The Obsidian Sanctum, cover." },
  { file: "hq/p1-ep001.webp", label: "EP 001 / THE LAST SIGNAL", alt: "Chapter 001, The Last Signal: the Ouroi are dying in Kaldra and the Grid hears their last signal." },
  { file: "hq/p2-ep002.webp", label: "EP 002 / ECHOES OF THE FALLEN GRID", alt: "Chapter 002, Echoes of the Fallen Grid: the heroes cross the desert and meet a hooded stranger." },
  { file: "hq/p3-ep003.webp", label: "EP 003 / THE CORRUPTED ORDER", alt: "Chapter 003, The Corrupted Order: the Obsidian Order attacks and a daughter is used as a lure." },
  { file: "hq/p4-ep004.webp", label: "EP 004 / THE OBSIDIAN SANCTUM", alt: "Chapter 004, The Obsidian Sanctum: the sphere opens and a hundred thousand sleeping faces appear." },
  { file: "hq/p5-back.webp", label: "BACK COVER", alt: "Back cover: every choice is a thread. Vol. 02 coming soon." },
];

export interface ComicVolume {
  number: string;
  title: string;
  tagline: string;
  blurb: string;
  /** Cover file inside public/images. */
  cover: string;
  coverAlt: string;
  episodes: ComicEpisode[];
}

export const COMIC_STATUS_LABEL: Record<ComicEpisode["status"], string> = {
  soon: "COMING SOON",
  live: "READ NOW",
};

export const COMIC_VOLUME: ComicVolume = {
  number: "01",
  title: "THE OBSIDIAN SANCTUM",
  tagline: "Every choice is a thread.",
  blurb:
    "In Kaldra, the Ouroi are dying. Their last signal wakes the Grid, and one proud family accepts a gift it should have refused. Four episodes. One fall. A hundred thousand sleeping faces.",
  cover: "hq-vol01-cover.webp",
  coverAlt: "AI World Owl, Vol. 01: The Obsidian Sanctum. Four heroes face a colossal golden serpent under a cracked purple sky.",
  episodes: [
    { number: "001", page: 1, title: "THE LAST SIGNAL", tagline: "One signal. One choice.", status: "live" },
    { number: "002", page: 2, title: "ECHOES OF THE FALLEN GRID", tagline: "It didn't die. It evolved.", status: "live" },
    { number: "003", page: 3, title: "THE CORRUPTED ORDER", tagline: "Trust is the first thing to break.", status: "live" },
    { number: "004", page: 4, title: "THE OBSIDIAN SANCTUM", tagline: "Everyone has a price.", status: "live" },
  ],
};

/** Next volume, shown as a teaser card. */
export const NEXT_VOLUME = { number: "02", label: "COMING SOON" };
