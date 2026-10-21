import { initWallet } from "./wallet";
import "./style.css";
import { GAMES, STATUS_LABEL, safeUrl, type Game } from "./games";
import { NFTS } from "./nfts";
import { initHeroBanner } from "./heroFx";
import { SITE_URL, SOCIALS, WAITLIST_ENDPOINT } from "./config";
import { FAQ, NEWS } from "./content";
import { initAnalytics, track } from "./analytics";
import { CHARACTERS, GROUP_LABEL, PROLOGUE, UNIVERSE, type Character } from "./lore";

/** Images live in /public/images and respect the Vite base path. */
const img = (file: string) => `${import.meta.env.BASE_URL}images/${file}`;

const logo = `<img class="brand-mark" src="${img("logo-badge.webp")}" alt="" width="64" height="64" decoding="async" />`;


const slitherArt = `
  <div class="game-art slither-art">
    <div class="game-sky"></div>
    <svg class="slither-svg" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="slitherGrad" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#8a72ff"/><stop offset="1" stop-color="#b6ff3b"/></linearGradient></defs>
      <path d="M-10 232 C60 232 70 120 140 130 S225 242 292 196 S330 104 352 100" fill="none" stroke="url(#slitherGrad)" stroke-width="18" stroke-linecap="round"/>
      <circle cx="352" cy="100" r="12" fill="#b6ff3b"/><circle cx="356" cy="95" r="3" fill="#10131b"/><circle cx="356" cy="106" r="3" fill="#10131b"/>
      <circle cx="96" cy="64" r="5" fill="#ff4fd8"/><circle cx="210" cy="82" r="5" fill="#b6ff3b"/><circle cx="250" cy="268" r="5" fill="#ff4fd8"/><circle cx="48" cy="150" r="4" fill="#b6ff3b"/><circle cx="330" cy="220" r="4" fill="#ff4fd8"/>
    </svg>
    <div class="game-art-tag">EXPERIMENT // TEST BUILD</div>
    <div class="game-art-title">SLITHER<br/><b>.IDLE</b></div>
  </div>`;

function artFor(game: Game): string {
  if (game.cover) {
    return `
  <div class="game-art game-cover">
    <img src="${img(game.cover)}" alt="${esc(game.title)} cover art" loading="lazy" decoding="async" />
    <div class="game-art-tag">${esc(STATUS_LABEL[game.status])} // TEST BUILD</div>
  </div>`;
  }
  return slitherArt;
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function renderLore(): void {
  const root = document.querySelector<HTMLDivElement>("#loreRoot");
  if (!root) return;
  const groups: Character["group"][] = ["supreme", "operator"];
  root.innerHTML = `
    <div class="lore-prologue">
      <div class="lore-chapter"><span>CHAPTER 00</span><b>${esc(PROLOGUE.kicker)}</b></div>
      <h3>${esc(PROLOGUE.title)}</h3>
      <div class="lore-text">${PROLOGUE.paragraphs.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
    </div>
    <div class="dossier" id="dossier" aria-live="polite"></div>
    <div class="roster" role="tablist" aria-label="Characters of ${esc(UNIVERSE)}">
      ${groups.map((g) => `<div class="roster-group"><div class="roster-label">${esc(GROUP_LABEL[g])}</div><div class="roster-row">${CHARACTERS.filter((c) => c.group === g).map((c) => `<button class="roster-btn" role="tab" id="tab-${esc(c.id)}" data-char="${esc(c.id)}" aria-selected="false" aria-controls="dossier" style="--accent:${esc(c.accent)}"><img src="${img(c.thumb)}" alt="" width="120" height="150" loading="lazy" decoding="async" /><span>${esc(c.name)}</span></button>`).join("")}</div></div>`).join("")}
    </div>`;

  const dossier = root.querySelector<HTMLDivElement>("#dossier")!;
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>(".roster-btn"));

  function show(id: string): void {
    const c = CHARACTERS.find((x) => x.id === id);
    if (!c) return;
    dossier.style.setProperty("--accent", c.accent);
    dossier.setAttribute("role", "tabpanel");
    dossier.setAttribute("aria-labelledby", `tab-${c.id}`);
    dossier.innerHTML = `
      <div class="dossier-stage"><img src="${img(c.sprite)}" alt="${esc(c.alt)}" decoding="async" /></div>
      <div class="dossier-body">
        <div class="dossier-kicker">DOSSIER // ${esc(UNIVERSE)}</div>
        <h3>${esc(c.name)}</h3>
        <div class="dossier-role">${esc(c.role)}</div>
        ${c.bio.map((p) => `<p>${esc(p)}</p>`).join("")}
        <a class="button button-ghost dossier-card-link" href="#nft-${esc(c.id)}">SEE THE CARD <span>↓</span></a>
      </div>`;
    tabs.forEach((t) => {
      const on = t.dataset.char === c.id;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
  }

  tabs.forEach((t, i) => {
    t.addEventListener("click", () => show(t.dataset.char!));
    t.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const next = tabs[(i + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      show(next.dataset.char!);
      e.preventDefault();
    });
  });

  // Every "READ BIO" button on the NFT cards opens that character's dossier.
  document.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest<HTMLElement>("[data-bio]");
    if (link?.dataset.bio) show(link.dataset.bio);
  });

  show(CHARACTERS[0].id);
}

function actionFor(game: Game): string {
  const href = safeUrl(game.url);
  if (!href) {
    return `<span class="button button-ghost launch-btn is-disabled" role="link" aria-disabled="true">LINK COMING SOON</span>`;
  }
  return `<a class="button button-primary launch-btn" href="${esc(href)}" target="_blank" rel="noopener noreferrer" data-play="${esc(game.id)}">PLAY ${esc(game.title)} <span>↗</span></a>`;
}

function renderGames(): void {
  const list = document.querySelector<HTMLDivElement>("#gamesList");
  if (!list) return;
  list.innerHTML = GAMES.map(
    (game) => `
    <article class="game-card" id="game-${esc(game.id)}">
      ${artFor(game)}
      <div class="game-info">
        <div class="game-info-top">
          <div><div class="game-kicker">${esc(game.kicker)}</div><h3>${esc(game.title)}</h3></div>
          <span class="status-pill is-${game.status}"><i></i> ${STATUS_LABEL[game.status]}</span>
        </div>
        <p>${esc(game.summary)}</p>
        <div class="game-meta">${game.meta.map((m) => `<span>${esc(m)}</span>`).join("")}</div>
        <div class="game-actions">${actionFor(game)}<button class="button button-ghost share-btn" type="button" data-share="${esc(game.id)}">SHARE <span>↗</span></button></div>
      </div>
    </article>`
  ).join("");
}

/** The newest game that already has a public link: used by the hero button and the top bar. */
const featured = [...GAMES].reverse().find((g) => safeUrl(g.url));
const featuredHref = featured ? safeUrl(featured.url) : null;

const heroActions = featured && featuredHref
  ? `<a class="button button-primary" href="${esc(featuredHref)}" target="_blank" rel="noopener noreferrer" data-play="${esc(featured.id)}">PLAY ${esc(featured.title)} <span>↗</span></a>
            <a class="button button-ghost" href="#games"><span class="play-icon">▶</span> EXPLORE GAMES</a>`
  : `<a class="button button-primary" href="#games">EXPLORE GAMES <span>↗</span></a>
            <a class="button button-ghost" href="#about"><span class="play-icon">▶</span> MEET THE STUDIO</a>`;

const announceLink = featured && featuredHref
  ? `<span class="announcement-divider">/</span> <a class="announce-link" href="${esc(featuredHref)}" target="_blank" rel="noopener noreferrer" data-play="${esc(featured.id)}">NEW: PLAY ${esc(featured.title)} ↗</a>`
  : "";

const liveSocials = SOCIALS.filter((s) => safeUrl(s.url));
const waitlistOn = !!safeUrl(WAITLIST_ENDPOINT);
const officialLinks = [
  { label: "WEBSITE", url: SITE_URL },
  ...GAMES.filter((g) => safeUrl(g.url)).map((g) => ({ label: g.title, url: g.url })),
  ...liveSocials.map((s) => ({ label: s.label, url: s.url })),
];

const logSection = `
      <section class="log-section" id="log">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> WHAT'S NEW</div><h2>THE STUDIO <span>LOG</span></h2></div><div class="section-note">SHIPPING<br/>IN PUBLIC.</div></div>
        <div class="log-grid">
          ${NEWS.map((n) => `<article class="log-item"><div class="log-top"><span>${esc(n.date)}</span><b>${esc(n.tag)}</b></div><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></article>`).join("")}
        </div>
      </section>`;

const joinSection = `
      <section class="join-section" id="join">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE COMMUNITY</div><h2>JOIN <span>THE GRID</span></h2></div><div class="section-note">NEW GAMES. NEW DROPS.<br/>BE THERE FIRST.</div></div>
        <div class="join">
          <div class="join-main">
            <h3>${waitlistOn ? "GET THE NEXT DROP" : "CHANNELS OPENING SOON"}</h3>
            <p>${waitlistOn ? "Leave your email and we will tell you when a new game or experiment goes live. Game updates only." : "The community channels and the waitlist are being set up. Until then, the games below are the best way to follow along."}</p>
            ${waitlistOn ? `<form class="waitlist" id="waitlistForm" novalidate>
              <label class="sr-only" for="wlEmail">Email address</label>
              <input id="wlEmail" name="email" type="email" placeholder="you@email.com" autocomplete="email" required />
              <input class="hp" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true" />
              <button class="button button-primary" type="submit">JOIN WAITLIST <span>↗</span></button>
              <p class="wl-note" id="wlNote" role="status" aria-live="polite">We only use your email for AI Studios Games updates and never share it.</p>
            </form>` : ""}
            ${liveSocials.length ? `<div class="socials">${liveSocials.map((s) => `<a class="button button-ghost" href="${esc(safeUrl(s.url)!)}" target="_blank" rel="noopener noreferrer" data-social="${esc(s.id)}">${esc(s.label)} <span>↗</span></a>`).join("")}</div>` : ""}
          </div>
          <aside class="official">
            <h4>OFFICIAL LINKS</h4>
            <ul>${officialLinks.map((l) => `<li><span>${esc(l.label)}</span><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.url.replace(/^https:\/\//, ""))}</a></li>`).join("")}</ul>
            <p class="safety"><b>STAY SAFE.</b> We will never ask for your seed phrase or private key, and we will never DM you first to connect a wallet. If a link is not listed here, do not trust it.</p>
          </aside>
        </div>
      </section>`;

const faqSection = `
      <section class="faq-section" id="faq">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> GOOD TO KNOW</div><h2>QUESTIONS <span>&amp; SAFETY</span></h2></div><div class="section-note">STRAIGHT ANSWERS.<br/>NO HYPE.</div></div>
        <div class="faq-list">
          ${FAQ.map((f) => `<details class="faq-item"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}
        </div>
      </section>`;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="site-shell">
    <div class="announcement"><span class="pulse"></span> GENESIS BUILD 001 <span class="announcement-divider">/</span> THE ARCADE IS ONLINE ${announceLink}</div>
    <header class="topbar">
      <a class="brand" href="#top" aria-label="AI Studios Games home">
        ${logo}
        <span class="brand-type">AI STUDIOS <b>GAMES</b><small>PLAY BEYOND THE GRID</small></span>
      </a>
      <nav class="nav-links" aria-label="Main navigation">
        <a href="#lore">LORE</a><a href="#games">GAMES</a><a href="#nfts">NFTS</a><a href="#about">THE STUDIO</a><a href="#roadmap">ROADMAP</a><a href="#join">JOIN</a>
      </nav>
      <button class="wallet-btn" id="walletBtn"><span class="wallet-dot"></span><span id="walletLabel">CONNECT WALLET</span></button>
      <button class="menu-toggle" id="menuToggle" aria-label="Toggle navigation">☰</button>
    </header>

    <main id="top">
      <section class="hero">
        <div class="hero-grid"></div><div class="hero-glow"></div>
        <div class="hero-copy">
          <div class="eyebrow"><span class="eyebrow-line"></span> INDEPENDENT GAME LAB <span class="eyebrow-tag">WEB3 / SOLANA-READY</span></div>
          <h1>PLAY BEYOND<br/>THE <span class="outlined">GRID</span><span class="period">.</span></h1>
          <p class="hero-text">A new generation of browser games. Built at the edge of AI, arcade culture, and on-chain worlds.</p>
          <div class="hero-actions">
            ${heroActions}
          </div>
          <div class="hero-stats">
            <div><strong>${String(GAMES.length).padStart(2, "0")}</strong><span>GAMES IN THE ARCADE</span></div>
            <i></i><div><strong>∞</strong><span>WORLDS TO EXPLORE</span></div>
            <i></i><div><strong class="green">◎</strong><span>SOLANA-READY VISION</span></div>
          </div>
        </div>
        <div class="hero-art" id="heroArt" aria-label="Cyberpunk neon city artwork">
          <div class="hb-cover">
            <div class="hb-stage">
              <div class="hb-center"><div class="hb-media">
                <img class="hero-img" src="${img("hero-banner-live.webp")}" alt="AI Studios Games — Vex, Kira and Titan standing in a neon cyber-city under the owl emblem" width="1584" height="672" fetchpriority="high" decoding="async" />
                <i class="hb-glow"></i><i class="hb-eye hb-eye-blue"></i><i class="hb-eye hb-eye-purple"></i>
                <div class="hb-glitch hb-g1" style="background-image:url(${img("hero-banner-live.webp")})"></div>
                <div class="hb-glitch hb-g2" style="background-image:url(${img("hero-banner-live.webp")})"></div>
              </div>
              </div>
            </div>
            <canvas class="hb-fx" aria-hidden="true"></canvas>
          </div>
          <div class="hb-sweep"></div><div class="hb-scanbar"></div><div class="art-scan"></div>
          <div class="hb-hud"><span class="hb-live"><i></i>LIVE FEED</span><span>GRID-01 // SIGNAL STABLE</span><span id="hbClock">00:00:00</span></div>
          <div class="art-coordinate">34°03' N<br/>118°15' W</div>
          <div class="art-corner corner-a"></div><div class="art-corner corner-b"></div>
        </div>
        <div class="hero-bottomline"><span>SCROLL TO ENTER</span><span class="scroll-mark">↓</span><span class="bottom-right">EST. 2026 <b>///</b> DIGITAL WORLDS, REAL OWNERSHIP</span></div>
      </section>

      <section class="lore-section" id="lore">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE UNIVERSE</div><h2>AI WORLD <span>OWL</span></h2></div><div class="section-note">ONE GRID.<br/>EIGHT LEGENDS.</div></div>
        <div id="loreRoot"></div>
      </section>

      <section class="section games-section" id="games">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE ARCADE</div><h2>ENTER THE <span>PLAYGROUND</span></h2></div><div class="section-note">SMALL WORLDS.<br/>BIG ENERGY.</div></div>
        <div class="games-list" id="gamesList"></div>
      </section>

      <section class="nft-section" id="nfts">
        <div class="nft-bg" style="background-image:url(${img("banner-glow.webp")})"></div>
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE CREW</div><h2>MEET THE <span>OPERATORS</span></h2></div><div class="section-note">EIGHT OPERATORS.<br/>ONE GRID.</div></div>
        <div class="nft-grid">
          ${NFTS.map((n) => `<article class="nft-card${n.accent ? " nft-" + n.accent : ""}" id="nft-${esc(n.id)}">
            <div class="nft-frame"><img src="${img(n.image)}" alt="${esc(n.alt)}" loading="lazy" decoding="async" width="620" height="871" /></div>
            <div class="nft-info"><div><div class="game-kicker">${esc(n.kicker)}</div><h3>${esc(n.name)}</h3><small>${esc(n.role)}</small></div><span class="nft-price">${esc(n.price)}</span></div>
            <a class="button button-ghost nft-bio" href="#lore" data-bio="${esc(n.id)}">READ BIO <span>→</span></a>
          </article>`).join("")}
        </div>
        <p class="nft-note">CONCEPT ART // PREVIEW ONLY // MINTING IS NOT LIVE</p>
      </section>

${logSection}

      <section class="manifesto" id="about"><div class="manifesto-mark">${logo}</div><div><div class="eyebrow"><span class="eyebrow-line"></span> OUR DIRECTIVE</div><h2>GAMES FIRST.<br/><span>LIMITS LAST.</span></h2><p>AI Studios Games is an independent playground for strange ideas, fast experiments, and browser-native worlds. We believe Web3 should add something meaningful to the game — never get in the way of playing it.</p></div><figure class="manifesto-coin"><img src="${img("coin.webp")}" alt="AI Studios Games bronze emblem coin" loading="lazy" decoding="async" width="170" height="170" /><figcaption>BUILT FOR THE<br/><b>NEXT LEVEL</b></figcaption></figure></section>

      <section class="roadmap-section" id="roadmap"><div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE MISSION LOG</div><h2>FROM PIXELS <span>TO PROTOCOL</span></h2></div><div class="section-note">A WORK IN PROGRESS.<br/>A WORLD IN MOTION.</div></div><div class="roadmap">
        <div class="roadmap-item active"><span class="roadmap-num">01</span><div><span class="roadmap-state">IN PROGRESS</span><h3>THE ARCADE</h3><p>Brand, website, first playable prototype, and Slither.Idle and Bomber.Idle linked as experiments.</p></div><span class="roadmap-icon">↗</span></div>
        <div class="roadmap-item"><span class="roadmap-num">02</span><div><span class="roadmap-state">UP NEXT</span><h3>WALLET CONNECT</h3><p>Optional Solana wallet connection and Devnet experiments.</p></div><span class="roadmap-icon">◎</span></div>
        <div class="roadmap-item"><span class="roadmap-num">03</span><div><span class="roadmap-state">ON THE HORIZON</span><h3>ON-CHAIN WORLDS</h3><p>Explore meaningful ownership, achievements, and game integrations.</p></div><span class="roadmap-icon">◇</span></div>
      </div></section>
${joinSection}
${faqSection}
    </main>
    <p class="legal-note">AI STUDIOS GAMES MAKES BROWSER GAMES. NOTHING ON THIS SITE IS FINANCIAL ADVICE OR A PROMISE OF VALUE. DIGITAL ITEMS CAN LOSE ALL VALUE. NFT CARDS ARE PREVIEWS AND MINTING IS NOT LIVE. NEVER SHARE YOUR SEED PHRASE.</p>
    <footer><a class="brand footer-brand" href="#top">${logo}<span class="brand-type">AI STUDIOS <b>GAMES</b><small>PLAY BEYOND THE GRID</small></span></a><span>INDEPENDENT WORLDS. INFINITE CONTINUES.</span><span>© 2026 AI STUDIOS GAMES</span></footer>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  </div>
`;

renderGames();
renderLore();
initHeroBanner();
initAnalytics();
initGrowth();

function initGrowth(): void {
  document.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    const play = t.closest<HTMLElement>("[data-play]");
    if (play?.dataset.play) track("Play Click", { game: play.dataset.play });
    const share = t.closest<HTMLElement>("[data-share]");
    if (share?.dataset.share) void shareGame(share.dataset.share);
    const social = t.closest<HTMLElement>("[data-social]");
    if (social?.dataset.social) track("Social Click", { network: social.dataset.social });
  });
  initWaitlist();
  injectFaqSchema();
}

async function shareGame(id: string): Promise<void> {
  const game = GAMES.find((g) => g.id === id);
  if (!game) return;
  const url = `${SITE_URL}/#game-${id}`;
  const text = `${game.title} — play it in your browser on AI Studios Games`;
  track("Share", { game: id });
  if (navigator.share) {
    try { await navigator.share({ title: game.title, text, url }); return; }
    catch (err) { if ((err as DOMException).name === "AbortError") return; }
  }
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank", "noopener,noreferrer");
}

function initWaitlist(): void {
  const form = document.querySelector<HTMLFormElement>("#waitlistForm");
  const endpoint = safeUrl(WAITLIST_ENDPOINT);
  if (!form || !endpoint) return;
  const note = form.querySelector<HTMLElement>("#wlNote")!;
  const button = form.querySelector<HTMLButtonElement>("button")!;
  const say = (text: string, kind: "ok" | "error" | "") => { note.textContent = text; note.className = "wl-note" + (kind ? ` is-${kind}` : ""); };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    if (data.get("_gotcha")) return; // bots fill the hidden field
    const email = String(data.get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say("Please enter a valid email address.", "error"); return; }
    button.disabled = true;
    say("Sending…", "");
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email, source: "aistudiosgames-site" }) });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      say("You are on the list. See you on the Grid.", "ok");
      track("Waitlist Signup");
    } catch {
      say("Something went wrong. Please try again in a moment.", "error");
    } finally {
      button.disabled = false;
    }
  });
}

/** FAQ rich results: lets search engines read the questions and answers. */
function injectFaqSchema(): void {
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  });
  document.head.appendChild(s);
}

const toast = document.querySelector<HTMLDivElement>("#toast")!;
let toastTimer: number | undefined;
function notify(message: string) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 3200);
}
document.querySelector("#menuToggle")?.addEventListener("click", () => document.querySelector(".nav-links")?.classList.toggle("open"));

type SolanaProvider = { isPhantom?: boolean; publicKey?: { toString(): string }; connect: () => Promise<{ publicKey: { toString(): string } }>; disconnect?: () => Promise<void> };
declare global { interface Window { solana?: SolanaProvider } }
let connectedAddress = "";
document.querySelector("#walletBtn")?.addEventListener("click", async () => {
  const label = document.querySelector<HTMLSpanElement>("#walletLabel")!;
  const provider = window.solana;
  if (connectedAddress && provider?.disconnect) {
    try { await provider.disconnect(); } catch { /* wallet may already be disconnected */ }
    connectedAddress = "";
    label.textContent = "CONNECT WALLET";
    notify("Wallet disconnected from this prototype.");
    return;
  }
  if (!provider?.connect) {
    notify("No Solana wallet detected. Install a compatible wallet such as Phantom to test connection.");
    window.open("https://phantom.app/", "_blank", "noopener,noreferrer");
    return;
  }
  try {
    const result = await provider.connect();
    connectedAddress = result.publicKey.toString();
    label.textContent = connectedAddress.slice(0, 4) + "…" + connectedAddress.slice(-4);
    notify("Wallet connected. No transaction was requested.");
  } catch {
    notify("Wallet connection cancelled or unavailable.");
  }
});
