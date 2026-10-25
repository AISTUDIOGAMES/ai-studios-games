/**
 * Growth settings: the only file you need to edit to turn community features on.
 * Anything left as "" is simply hidden on the site.
 */

/** Public address of the site. Change it to https://aistudiosgames.fun when the domain is live. */
export const SITE_URL = "https://aistudiosgames.vercel.app";

/** Community links. Fill in the ones you own (https only). Empty ones are not shown. */
export const SOCIALS: { id: string; label: string; url: string }[] = [
  { id: "x", label: "X / TWITTER", url: "https://x.com/AiStudioGameOwl" },
  { id: "telegram", label: "TELEGRAM", url: "" },
  { id: "discord", label: "DISCORD", url: "https://discord.gg/bdCFfhBqq" },
  { id: "github", label: "GITHUB", url: "" },
];

/**
 * Waitlist form endpoint (https). Works with any service that accepts a JSON POST with an
 * "email" field, for example a Formspree form: "https://formspree.io/f/xxxxxxx".
 * While empty, the waitlist form is hidden.
 */
export const WAITLIST_ENDPOINT = "";

/**
 * Optional privacy-friendly analytics (Plausible). Put the site domain here, for example
 * "aistudiosgames.vercel.app". Empty = no analytics, nothing is loaded. Do-Not-Track is respected.
 */
export const ANALYTICS_DOMAIN = "";
