import { tokenSection } from "./tokenomics";
import { initWallet } from "./wallet";
import "./style.css";
import "./comic-reader.css";
import { GAMES, STATUS_LABEL, safeUrl, type Game } from "./games";
import { NFTS } from "./nfts";
import { spotlightMarkup, initSpotlight } from "./spotlight";
import { initNftCards } from "./nftFx";
import { SITE_URL, CONTACT_EMAIL, SOCIALS, WAITLIST_ENDPOINT, TOKEN_SYMBOL } from "./config";
import { FAQ, NEWS } from "./content";
import { initAnalytics, track } from "./analytics";
import { CHARACTERS, GROUP_LABEL, PROLOGUE, UNIVERSE, type Character } from "./lore";
import { initComicReader } from "./comicReader";
import { COMIC_VOLUME, COMIC_STATUS_LABEL, NEXT_VOLUME, type ComicEpisode } from "./comic";
import { initLanguageSwitcher } from "./i18n";
import { initThemeToggle } from "./theme";
import { initOwlAi } from "./owl-ai";
import "./owl-ai.css";
import "./neon-theme.css";

/** Images live in /public/images and respect the Vite base path. */
const img = (file: string) => `${import.meta.env.BASE_URL}images/${file}`;

const logo = `<img class="brand-mark" src="${img("logo-badge.webp")}" alt="AI STUDIO OWL emblem" width="64" height="64" decoding="async" />`;


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
    <img src="${img(game.cover)}" alt="${esc(game.title)} cover art" loading="lazy" decoding="async"${game.coverPos ? ` style="object-position:${esc(game.coverPos)}"` : ""} />
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
    return `<span class="button button-ghost launch-btn is-disabled" role="link" aria-disabled="true">COMING SOON</span>`;
  }
  return `<a class="button button-primary launch-btn" href="${esc(href)}" target="_blank" rel="noopener noreferrer" data-play="${esc(game.id)}">PLAY ${esc(game.title)} <span>↗</span></a>`;
}

function gameCard(game: Game): string {
  return `
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
    </article>`;
}

/** Home shows only games with home: true. The GAMES tab (#arcade) shows the rest. */
function renderGames(): void {
  const home = document.querySelector<HTMLDivElement>("#gamesList");
  const arcade = document.querySelector<HTMLDivElement>("#arcadeList");
  if (home) home.innerHTML = GAMES.filter((g) => g.home).map(gameCard).join("");
  if (arcade) arcade.innerHTML = GAMES.filter((g) => !g.home).map(gameCard).join("");
}

/** The newest game that already has a public link: used by the hero button and the top bar. */
const featured = [...GAMES].reverse().find((g) => g.home && safeUrl(g.url));
const featuredHref = featured ? safeUrl(featured.url) : null;

const announceLink = featured && featuredHref
  ? `<span class="announcement-divider">/</span> <a class="announce-link" href="${esc(featuredHref)}" target="_blank" rel="noopener noreferrer" data-play="${esc(featured.id)}">NEW: PLAY ${esc(featured.title)} ↗</a>`
  : "";

const liveSocials = SOCIALS.filter((s) => safeUrl(s.url));
const waitlistOn = !!safeUrl(WAITLIST_ENDPOINT);
const officialLinks = [
  { label: "WEBSITE", url: SITE_URL },
  { label: "EMAIL", url: `mailto:${CONTACT_EMAIL}` },
  ...GAMES.filter((g) => safeUrl(g.url)).map((g) => ({ label: g.title, url: g.url.startsWith("/") ? SITE_URL + g.url : g.url })),
  ...liveSocials.map((s) => ({ label: s.label, url: s.url })),
];

/** The trailer video lives in /public/trailer and respects the Vite base path. */
const trailerUrl = (file: string) => `${import.meta.env.BASE_URL}trailer/${file}`;

/** The YouTube channel comes from SOCIALS in config.ts, so there is only one place to edit. */
const youtubeUrl = safeUrl(SOCIALS.find((x) => x.id === "youtube")?.url ?? "");

const trailerSection = `
      <section class="trailer-section" id="trailer">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> OFFICIAL TRAILER</div><h2>WATCH THE <span>TRAILER</span></h2></div><div class="section-note">AI WORLD OWL<br/>VOL. 01 // THE OBSIDIAN SANCTUM</div></div>
        <div class="trailer-frame">
          <video id="trailerVideo" class="trailer-video" controls playsinline preload="none" poster="${trailerUrl("poster.jpg")}" aria-label="AI World Owl official trailer">
            <source src="${trailerUrl("trailer.mp4")}" type="video/mp4" />
            Your browser does not support the video tag. <a href="${trailerUrl("trailer.mp4")}">Download the trailer</a>.
          </video>
          <i class="art-corner corner-a"></i><i class="art-corner corner-b"></i>
        </div>
        <div class="trailer-actions"><a class="button button-ghost" href="/trailer/" target="_blank" rel="noopener noreferrer"><span class="play-icon">▶</span> OPEN FULL PAGE <span>↗</span></a>${youtubeUrl ? `<a class="button button-primary" href="${esc(youtubeUrl)}" target="_blank" rel="noopener noreferrer" data-social="youtube"><span class="play-icon yt">▶</span> SUBSCRIBE ON YOUTUBE <span>↗</span></a>` : ""}</div>
      </section>`;

function comicEpisodeRow(ep: ComicEpisode): string {
  const pill = `<span class="status-pill ${ep.status === "live" ? "is-live" : "is-soon"}"><i></i> ${COMIC_STATUS_LABEL[ep.status]}</span>`;
  const inner = `<span class="ep-num">EP ${esc(ep.number)}</span><span class="ep-body"><b>${esc(ep.title)}</b><em>${esc(ep.tagline)}</em></span>${pill}`;
  if (ep.status === "live" && ep.page !== undefined) return `<li><button type="button" class="ep-row is-live" data-read="${ep.page}">${inner}</button></li>`;
  const href = ep.status === "live" && ep.url ? safeUrl(ep.url) : null;
  return href
    ? `<li><a class="ep-row is-live" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${inner}</a></li>`
    : `<li><div class="ep-row">${inner}</div></li>`;
}

const comicSection = `
      <section class="comic-section" id="comic">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE GRAPHIC NOVEL</div><h2>THE <span>SAGA</span></h2></div><div class="section-note">AI WORLD OWL<br/>EVERY CHOICE IS A THREAD.</div></div>
        <div class="comic-grid">
          <figure class="comic-cover" data-read="0" title="Read Vol. 01">
            <img src="${img(COMIC_VOLUME.cover)}" alt="${esc(COMIC_VOLUME.coverAlt)}" width="687" height="1024" loading="lazy" decoding="async" />
            <i class="art-corner corner-a"></i><i class="art-corner corner-b"></i>
          </figure>
          <div class="comic-info">
            <div class="comic-kicker">VOLUME ${esc(COMIC_VOLUME.number)} <span>/</span> EPISODES 001 - 004</div>
            <h3>${esc(COMIC_VOLUME.title)}</h3>
            <p class="comic-blurb">${esc(COMIC_VOLUME.blurb)}</p>
            <ul class="comic-episodes" aria-label="Episodes of Volume ${esc(COMIC_VOLUME.number)}">
              ${COMIC_VOLUME.episodes.map(comicEpisodeRow).join("")}
              <li><div class="ep-row ep-next"><span class="ep-num">VOL ${esc(NEXT_VOLUME.number)}</span><span class="ep-body"><b>THE SAGA CONTINUES</b><em>The threads are still being pulled.</em></span><span class="status-pill is-soon"><i></i> ${esc(NEXT_VOLUME.label)}</span></div></li>
            </ul>
            <div class="comic-actions">
              <button type="button" class="button button-primary" data-read="0">READ VOL. 01 <span>→</span></button>
              <a class="button button-ghost" href="#join">GET NOTIFIED ON VOL. 02 <span>↗</span></a>
              <a class="button button-ghost" href="#lore"><span class="play-icon">▶</span> MEET THE LEGENDS</a>
            </div>
          </div>
        </div>
      </section>`;

const logSection = `
      <section class="log-section" id="log">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> WHAT'S NEW</div><h2>THE STUDIO <span>LOG</span></h2></div><div class="section-note">SHIPPING<br/>IN PUBLIC.</div></div>
        <div class="log-grid">
          ${NEWS.map((n) => `<article class="log-item"><div class="log-top"><span>${esc(n.date)}</span><b>${esc(n.tag)}</b></div><h3>${esc(n.title)}</h3><p>${esc(n.text)}</p></article>`).join("")}
        </div>
      </section>`;

const joinSection = `
      <section class="join-section" id="join">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE COMMUNITY</div><h2>JOIN <span>THE OWL UNIVERSE</span></h2></div><div class="section-note">NEW IDEAS. NEW WORLDS.<br/>BE PART OF WHAT'S NEXT.</div></div>
        <div class="join">
          <div class="join-main">
            <h3>${waitlistOn ? "GET THE NEXT UPDATE" : "FOLLOW AI STUDIO OWL"}</h3>
            <p>${waitlistOn ? "Leave your email and we will share new AI projects, creative experiments and platform updates." : "Follow our official channels for new AI projects, experiments, creator culture, games and platform announcements."}</p>
            ${waitlistOn ? `<form class="waitlist" id="waitlistForm" novalidate>
              <label class="sr-only" for="wlEmail">Email address</label>
              <input id="wlEmail" name="email" type="email" placeholder="you@email.com" autocomplete="email" required />
              <input class="hp" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true" />
              <button class="button button-primary" type="submit">JOIN WAITLIST <span>↗</span></button>
              <p class="wl-note" id="wlNote" role="status" aria-live="polite">We only use your email for AI STUDIO OWL updates and never share it.</p>
            </form>` : ""}
            ${liveSocials.length ? `<div class="socials">${liveSocials.map((s) => `<a class="button button-ghost" href="${esc(safeUrl(s.url)!)}" target="_blank" rel="noopener noreferrer" data-social="${esc(s.id)}">${esc(s.label)} <span>↗</span></a>`).join("")}</div>` : ""}
          </div>
          <aside class="official">
            <h4>OFFICIAL LINKS</h4>
            <ul>${officialLinks.map((l) => `<li><span>${esc(l.label)}</span><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.url.replace(/^https:\/\//, "").replace(/^mailto:/, ""))}</a></li>`).join("")}</ul>
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
    <div class="announcement"><span class="pulse"></span> THE UNIVERSE OF AI <span class="announcement-divider">/</span> GAMES, CREATORS, CULTURE & TECHNOLOGY</div>
    <header class="topbar">
      <a class="brand" href="#top" aria-label="AI STUDIO OWL home">
        ${logo}
        <span class="brand-type">AI STUDIO <b>OWL</b><small>THE UNIVERSE OF AI</small></span>
      </a>
      <nav class="nav-links" aria-label="Main navigation">
        <a href="#ai-universe">EXPLORE</a><a href="#games">GAMES</a><a href="#lore">AI WORLD</a><a href="#trailer">VIDEO</a><a href="#about">STUDIO</a><a href="#token">${TOKEN_SYMBOL}</a><a href="#join">JOIN</a>
      </nav>
      <div class="language-switch" role="group" aria-label="Select language">
        <button type="button" data-language="en" aria-label="English" title="English">EN</button>
        <button type="button" data-language="pt-BR" aria-label="Português brasileiro" title="Português">🇧🇷</button>
        <button type="button" data-language="es" aria-label="Español" title="Español">🇪🇸</button>
        <button type="button" class="theme-toggle" id="themeToggle" aria-label="Switch theme" title="Switch theme" aria-pressed="false"><span class="tt-ico" aria-hidden="true">◐</span><span class="tt-to-desert">DESERT MODE</span><span class="tt-to-neon">NEON MODE</span></button>
      </div>
      <button class="wallet-btn" id="walletBtn"><span class="wallet-dot"></span><span id="walletLabel">CONNECT WALLET</span></button>
      <button class="menu-toggle" id="menuToggle" aria-label="Toggle navigation">☰</button>
    </header>

    <main id="top">
      ${spotlightMarkup()}

      <section class="ai-categories section" id="ai-universe">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> EXPLORE THE AI UNIVERSE</div><h2>ONE PLATFORM. <span>MANY WORLDS.</span></h2></div><div class="section-note">DISCOVER WHAT'S NEXT<br/>ACROSS THE AI ECOSYSTEM</div></div>
        <p class="ai-intro">Explore the growing universe of AI STUDIO OWL — from games and short-form storytelling to virtual creators, internet culture, crypto and useful AI tools.</p>
        <div class="category-grid">
          <a class="category-card is-live" href="#games"><span class="category-icon">🎮</span><strong>GAMES</strong><p>PLAYABLE WORLDS, CHARACTERS AND EXPERIMENTS.</p><em>EXPLORE GAMES ↗</em></a>
          <article class="category-card"><span class="category-icon">📱</span><strong>TIKTOK SERIES</strong><p>SHORT EPISODES, ORIGINAL STORIES AND VERTICAL ENTERTAINMENT.</p><em>COMING SOON</em></article>
          <article class="category-card"><span class="category-icon">🎬</span><strong>AI VIDEOS &amp; MEMES</strong><p>GENERATIVE CLIPS, INTERNET HUMOR AND CREATIVE EXPERIMENTS.</p><em>COMING SOON</em></article>
          <article class="category-card"><span class="category-icon">✨</span><strong>AI INFLUENCERS</strong><p>VIRTUAL PERSONALITIES, DIGITAL AVATARS AND CREATOR WORLDS.</p><em>COMING SOON</em></article>
          <article class="category-card"><span class="category-icon">₿</span><strong>CRYPTO &amp; BLOCKCHAIN</strong><p>AI, DIGITAL ASSETS AND EMERGING BLOCKCHAIN CULTURE.</p><em>COMING SOON</em></article>
          <article class="category-card"><span class="category-icon">🧠</span><strong>AI TOOLS &amp; TECHNOLOGY</strong><p>DISCOVER USEFUL SYSTEMS, CREATIVE WORKFLOWS AND NEW AI TECHNOLOGY.</p><em>COMING SOON</em></article>
        </div>
      </section>

      ${trailerSection}

      ${comicSection}

      <section class="lore-section" id="lore">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE UNIVERSE</div><h2>AI WORLD <span>OWL</span></h2></div><div class="section-note">ONE GRID.<br/>EIGHT LEGENDS.</div></div>
        <div id="loreRoot"></div>
      </section>

      <section class="section games-section" id="games">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE ARCADE</div><h2>ENTER THE <span>PLAYGROUND</span></h2></div><div class="section-note">SMALL WORLDS.<br/>BIG ENERGY.</div></div>
        <div class="games-list" id="gamesList"></div>
        <div class="games-more"><a class="button button-ghost" href="#arcade">MORE GAMES <span>→</span></a></div>
      </section>

      <section class="section games-section" id="arcade">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE ARCADE</div><h2>MORE <span>GAMES</span></h2></div><div class="section-note">SMALL WORLDS.<br/>BIG ENERGY.</div></div>
        <div class="games-list" id="arcadeList"></div>
        <div class="games-more"><a class="button button-ghost" href="#top">← BACK TO HOME</a></div>
      </section>

      <section class="nft-section" id="nfts">
        <div class="nft-bg" style="background-image:url(${img("banner-glow.webp")})"></div>
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE VAULT</div><h2>THE <span>DIVINE</span> CARDS</h2></div><div class="section-note">TWO CARDS.<br/>ONE GRID.</div></div>
        <div class="nft-grid">
          ${NFTS.map((n) => `<article class="nft-card${n.accent ? " nft-" + n.accent : ""}" id="nft-${esc(n.id)}">
            <div class="nft-frame" data-tilt><img src="${img(n.image)}" alt="${esc(n.alt)}" loading="lazy" decoding="async" width="1084" height="1451" /><span class="nft-glare" aria-hidden="true"></span></div>
            <div class="nft-info"><div><div class="game-kicker">${esc(n.kicker)}</div><h3>${esc(n.name)}</h3><small>${esc(n.role)}</small></div><span class="nft-price">${esc(n.price)}</span></div>
            <div class="nft-actions"><button class="button button-primary nft-3d" type="button" data-3d="${esc(n.id)}">VIEW IN 3D <span>◆</span></button><a class="button button-ghost nft-bio" href="#lore" data-bio="${esc(n.id)}">READ BIO <span>→</span></a></div>
          </article>`).join("")}
        </div>
        <p class="nft-note">CONCEPT ART // PREVIEW ONLY // MINTING IS NOT LIVE</p>
      </section>

${logSection}
${tokenSection}

      <section class="manifesto" id="about"><div class="manifesto-mark">${logo}</div><div><div class="eyebrow"><span class="eyebrow-line"></span> OUR DIRECTIVE</div><h2>IDEAS FIRST.<br/><span>LIMITS LAST.</span></h2><p>AI STUDIO OWL is an independent platform exploring the universe of artificial intelligence — games, video, storytelling, virtual creators, internet culture, crypto and useful AI technology. One creative ecosystem, built to keep expanding.</p></div><figure class="manifesto-coin"><img src="${img("logo-badge.webp")}" alt="AI STUDIO OWL cyber owl emblem" loading="lazy" decoding="async" width="170" height="170" /><figcaption>THE UNIVERSE<br/><b>OF AI</b></figcaption></figure></section>

      <section class="roadmap-section" id="roadmap"><div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE MISSION LOG</div><h2>FROM PIXELS <span>TO PROTOCOL</span></h2></div><div class="section-note">A WORK IN PROGRESS.<br/>A WORLD IN MOTION.</div></div><div class="roadmap">
        <div class="roadmap-item active"><span class="roadmap-num">01</span><div><span class="roadmap-state">IN PROGRESS</span><h3>THE ARCADE</h3><p>AI STUDIO OWL brand refresh, platform expansion and new AI-powered experiences across multiple niches.</p></div><span class="roadmap-icon">↗</span></div>
        <div class="roadmap-item"><span class="roadmap-num">02</span><div><span class="roadmap-state">UP NEXT</span><h3>WALLET CONNECT</h3><p>Explore responsible integrations across AI, creative tools and emerging technologies.</p></div><span class="roadmap-icon">◎</span></div>
        <div class="roadmap-item"><span class="roadmap-num">03</span><div><span class="roadmap-state">ON THE HORIZON</span><h3>ON-CHAIN WORLDS</h3><p>Expand the ecosystem with new categories, creator experiences and community projects.</p></div><span class="roadmap-icon">◇</span></div>
      </div></section>
${joinSection}
${faqSection}
    </main>
    <p class="legal-note">AI STUDIO OWL IS A DIGITAL PLATFORM COVERING ARTIFICIAL INTELLIGENCE, ENTERTAINMENT, GAMES, CREATOR CULTURE AND EMERGING TECHNOLOGY. EXPERIMENTAL FEATURES MAY CHANGE. NEVER SHARE YOUR SEED PHRASE OR PRIVATE KEYS.</p>
    <footer><a class="brand footer-brand" href="#top">${logo}<span class="brand-type">AI STUDIO <b>OWL</b><small>THE UNIVERSE OF AI</small></span></a><span>ONE PLATFORM. MANY WORLDS.</span>${liveSocials.length ? `<nav class="footer-socials" aria-label="Community links">${liveSocials.map((s) => `<a href="${esc(safeUrl(s.url)!)}" target="_blank" rel="noopener noreferrer" data-social="${esc(s.id)}">${esc(s.label)} ↗</a>`).join("")}</nav>` : ""}<span>© 2026 AI STUDIO OWL</span></footer>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  </div>
`;

renderGames();
initViews();
initSpotlight();
renderLore();
initNftCards();
initComicReader(img);
initAnalytics();
initGrowth();
initLanguageSwitcher();
initThemeToggle();
initOwlAi();

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
  document.querySelector<HTMLVideoElement>("#trailerVideo")?.addEventListener("play", () => track("Trailer Play"), { once: true });
  initWaitlist();
  injectFaqSchema();
}

async function shareGame(id: string): Promise<void> {
  const game = GAMES.find((g) => g.id === id);
  if (!game) return;
  const url = `${SITE_URL}/#game-${id}`;
  const text = `${game.title} — play it in your browser on AI STUDIO OWL`;
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
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email, source: "aistudioowl-site" }) });
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

initWallet(notify);

document.querySelector<HTMLButtonElement>("#copyCa")?.addEventListener("click", async (e) => {
  const ca = (e.currentTarget as HTMLElement).dataset.ca ?? "";
  try {
    await navigator.clipboard.writeText(ca);
    notify("Contract address copied.");
  } catch {
    const r = document.createRange();
    const el = document.querySelector("#tokenCa");
    if (el) { r.selectNodeContents(el); const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r); }
    notify("Press Ctrl+C to copy the address.");
  }
});

/** Two views on one page: home, and the GAMES tab (#arcade). */
function initViews(): void {
  const apply = (): void => {
    const hash = location.hash;
    const gameId = hash.startsWith("#game-") ? hash.slice(6) : "";
    const gameOnArcade = !!gameId && GAMES.some((g) => g.id === gameId && !g.home);
    const arcade = hash === "#arcade" || gameOnArcade;
    document.body.classList.toggle("view-arcade", arcade);
    if (hash === "#arcade") window.scrollTo(0, 0);
    else if (gameOnArcade) document.getElementById(hash.slice(1))?.scrollIntoView();
    else if (!arcade && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  };
  window.addEventListener("hashchange", apply);
  apply();
}
