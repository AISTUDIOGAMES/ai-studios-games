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
}

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
    { number: "001", title: "THE LAST SIGNAL", tagline: "One signal. One choice.", status: "soon" },
    { number: "002", title: "ECHOES OF THE FALLEN GRID", tagline: "It didn't die. It evolved.", status: "soon" },
    { number: "003", title: "THE CORRUPTED ORDER", tagline: "Trust is the first thing to break.", status: "soon" },
    { number: "004", title: "THE OBSIDIAN SANCTUM", tagline: "Everyone has a price.", status: "soon" },
  ],
};

/** Next volume, shown as a teaser card. */
export const NEXT_VOLUME = { number: "02", label: "COMING SOON" };
