import "./style.css";
import { GAMES, STATUS_LABEL, safeUrl, type Game } from "./games";
import { NFTS } from "./nfts";

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

function actionFor(game: Game): string {
  const href = safeUrl(game.url);
  if (!href) {
    return `<span class="button button-ghost launch-btn is-disabled" role="link" aria-disabled="true">LINK COMING SOON</span>`;
  }
  return `<a class="button button-primary launch-btn" href="${esc(href)}" target="_blank" rel="noopener noreferrer">PLAY ${esc(game.title)} <span>↗</span></a>`;
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
        ${actionFor(game)}
      </div>
    </article>`
  ).join("");
}

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="site-shell">
    <div class="announcement"><span class="pulse"></span> GENESIS BUILD 001 <span class="announcement-divider">/</span> THE ARCADE IS ONLINE</div>
    <header class="topbar">
      <a class="brand" href="#top" aria-label="AI Studios Games home">
        ${logo}
        <span class="brand-type">AI STUDIOS <b>GAMES</b><small>PLAY BEYOND THE GRID</small></span>
      </a>
      <nav class="nav-links" aria-label="Main navigation">
        <a href="#games">GAMES</a><a href="#nfts">NFTS</a><a href="#about">THE STUDIO</a><a href="#roadmap">ROADMAP</a>
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
            <a class="button button-primary" href="#games">EXPLORE GAMES <span>↗</span></a>
            <a class="button button-ghost" href="#about"><span class="play-icon">▶</span> MEET THE STUDIO</a>
          </div>
          <div class="hero-stats">
            <div><strong>${String(GAMES.length).padStart(2, "0")}</strong><span>GAMES IN THE ARCADE</span></div>
            <i></i><div><strong>∞</strong><span>WORLDS TO EXPLORE</span></div>
            <i></i><div><strong class="green">◎</strong><span>SOLANA-READY VISION</span></div>
          </div>
        </div>
        <div class="hero-art" aria-label="Cyberpunk neon city artwork">
          <img class="hero-img" src="${img("hero-banner.webp")}" alt="AI Studios Games — Vex, Kira and Titan standing in a neon cyber-city" fetchpriority="high" decoding="async" />
          <div class="art-scan"></div>
          
          <div class="art-coordinate">34°03' N<br/>118°15' W</div>
          <div class="art-corner corner-a"></div><div class="art-corner corner-b"></div>
        </div>
        <div class="hero-bottomline"><span>SCROLL TO ENTER</span><span class="scroll-mark">↓</span><span class="bottom-right">EST. 2026 <b>///</b> DIGITAL WORLDS, REAL OWNERSHIP</span></div>
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
          </article>`).join("")}
        </div>
        <p class="nft-note">CONCEPT ART // PREVIEW ONLY // MINTING IS NOT LIVE</p>
      </section>

      <section class="manifesto" id="about"><div class="manifesto-mark">${logo}</div><div><div class="eyebrow"><span class="eyebrow-line"></span> OUR DIRECTIVE</div><h2>GAMES FIRST.<br/><span>LIMITS LAST.</span></h2><p>AI Studios Games is an independent playground for strange ideas, fast experiments, and browser-native worlds. We believe Web3 should add something meaningful to the game — never get in the way of playing it.</p></div><figure class="manifesto-coin"><img src="${img("coin.webp")}" alt="AI Studios Games bronze emblem coin" loading="lazy" decoding="async" width="170" height="170" /><figcaption>BUILT FOR THE<br/><b>NEXT LEVEL</b></figcaption></figure></div></section>

      <section class="roadmap-section" id="roadmap"><div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE MISSION LOG</div><h2>FROM PIXELS <span>TO PROTOCOL</span></h2></div><div class="section-note">A WORK IN PROGRESS.<br/>A WORLD IN MOTION.</div></div><div class="roadmap">
        <div class="roadmap-item active"><span class="roadmap-num">01</span><div><span class="roadmap-state">IN PROGRESS</span><h3>THE ARCADE</h3><p>Brand, website, first playable prototype, and Slither.Idle linked as an experiment.</p></div><span class="roadmap-icon">↗</span></div>
        <div class="roadmap-item"><span class="roadmap-num">02</span><div><span class="roadmap-state">UP NEXT</span><h3>WALLET CONNECT</h3><p>Optional Solana wallet connection and Devnet experiments.</p></div><span class="roadmap-icon">◎</span></div>
        <div class="roadmap-item"><span class="roadmap-num">03</span><div><span class="roadmap-state">ON THE HORIZON</span><h3>ON-CHAIN WORLDS</h3><p>Explore meaningful ownership, achievements, and game integrations.</p></div><span class="roadmap-icon">◇</span></div>
      </div></section>
    </main>
    <footer><a class="brand footer-brand" href="#top">${logo}<span class="brand-type">AI STUDIOS <b>GAMES</b><small>PLAY BEYOND THE GRID</small></span></a><span>INDEPENDENT WORLDS. INFINITE CONTINUES.</span><span>© 2026 AI STUDIOS GAMES</span></footer>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  </div>
`;

renderGames();

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
