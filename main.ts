import "./style.css";
import { GAMES, STATUS_LABEL, safeUrl, type Game } from "./games";

const logo = `
<svg class="brand-mark" viewBox="0 0 52 52" aria-hidden="true">
  <path d="M26 3 46 14.5V37.5L26 49 6 37.5V14.5Z" fill="none" stroke="currentColor" stroke-width="2"/>
  <path d="M14 33 25.5 12 38 33M19 25h14M17 37h18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square"/>
  <circle cx="26" cy="26" r="3" fill="#b6ff3b"/>
</svg>`;


const runnerArt = `
  <div class="game-art">
    <div class="game-sky"></div><div class="moon"></div><div class="game-city"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="platform p1"></div><div class="platform p2"></div><div class="platform p3"></div>
    <div class="player-sprite"><span></span></div><div class="game-art-tag">EARLY ACCESS // BUILD 0.1</div>
    <div class="game-art-title">NEON<br/><b>RUNNER</b></div>
  </div>`;

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
  return game.id === "slither-idle" ? slitherArt : runnerArt;
}

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

function actionFor(game: Game): string {
  if (game.kind === "local") {
    return `<button class="button button-primary launch-btn" id="launchGame">LAUNCH PROTOTYPE <span>↗</span></button>`;
  }
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
        <a href="#games">GAMES</a><a href="#about">THE STUDIO</a><a href="#roadmap">ROADMAP</a>
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
          <div class="art-scan"></div><div class="art-sun"></div>
          <div class="city city-back"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="city city-front"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
          <div class="road"></div><div class="road-lines"></div>
          <div class="art-label"><span>SECTOR 01 / NIGHT CITY</span><b>THE FUTURE IS PLAYABLE</b></div>
          <div class="art-coordinate">34°03' N<br/>118°15' W</div>
          <div class="art-corner corner-a"></div><div class="art-corner corner-b"></div>
        </div>
        <div class="hero-bottomline"><span>SCROLL TO ENTER</span><span class="scroll-mark">↓</span><span class="bottom-right">EST. 2026 <b>///</b> DIGITAL WORLDS, REAL OWNERSHIP</span></div>
      </section>

      <section class="section games-section" id="games">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE ARCADE</div><h2>ENTER THE <span>PLAYGROUND</span></h2></div><div class="section-note">SMALL WORLDS.<br/>BIG ENERGY.</div></div>
        <div class="games-list" id="gamesList"></div>
      </section>

      <section class="play-section" id="play">
        <div class="play-header"><div><div class="eyebrow"><span class="eyebrow-line"></span> LIVE TEST // LOCAL BUILD</div><h2>NEON <span>RUNNER</span></h2></div><button class="restart-btn" id="restartGame">↻ RESTART</button></div>
        <div class="game-window"><div class="game-hud"><span><i class="hud-dot"></i> SYSTEM ONLINE</span><span>SCORE <b id="score">0000</b></span><span>BEST <b id="best">0000</b></span></div><canvas id="gameCanvas" width="960" height="360" aria-label="Neon Runner platform game"></canvas><div class="game-controls"><span><kbd>←</kbd> <kbd>→</kbd> MOVE</span><span><kbd>SPACE</kbd> JUMP</span><span class="controls-note">CLICK THE GAME TO FOCUS, THEN PLAY</span></div></div>
      </section>

      <section class="manifesto" id="about"><div class="manifesto-mark">${logo}</div><div><div class="eyebrow"><span class="eyebrow-line"></span> OUR DIRECTIVE</div><h2>GAMES FIRST.<br/><span>LIMITS LAST.</span></h2><p>AI Studios Games is an independent playground for strange ideas, fast experiments, and browser-native worlds. We believe Web3 should add something meaningful to the game — never get in the way of playing it.</p></div><div class="manifesto-stamp">BUILT<br/>FOR THE<br/><b>NEXT LEVEL</b></div></section>

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
document.querySelector("#launchGame")?.addEventListener("click", () => {
  document.querySelector("#play")?.scrollIntoView({ behavior: "smooth" });
  setTimeout(() => (document.querySelector<HTMLCanvasElement>("#gameCanvas"))?.focus(), 400);
});
document.querySelector("#restartGame")?.addEventListener("click", () => game.reset());
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

// Small playable endless-runner prototype. No wallet or blockchain interaction is needed to play.
const canvas = document.querySelector<HTMLCanvasElement>("#gameCanvas")!;
const ctx = canvas.getContext("2d")!;
const scoreEl = document.querySelector<HTMLElement>("#score")!;
const bestEl = document.querySelector<HTMLElement>("#best")!;
const keys = new Set<string>();
class RunnerGame {
  x = 110; y = 260; vy = 0; grounded = true; speed = 4; score = 0; best = 0; frame = 0; obstacles: {x:number,w:number,h:number}[] = []; started = false;
  reset() { this.x=110; this.y=260; this.vy=0; this.grounded=true; this.speed=4; this.score=0; this.frame=0; this.obstacles=[]; this.started=false; }
  jump() { if (this.grounded) { this.vy=-11.5; this.grounded=false; this.started=true; } }
  update() {
    this.frame++;
    if (keys.has("ArrowLeft") || keys.has("a")) this.x=Math.max(24,this.x-4);
    if (keys.has("ArrowRight") || keys.has("d")) { this.x=Math.min(350,this.x+3); this.started=true; }
    if (keys.has(" ") || keys.has("ArrowUp") || keys.has("w")) this.jump();
    this.vy += .48; this.y += this.vy;
    if (this.y >= 260) { this.y=260; this.vy=0; this.grounded=true; }
    if (this.started && this.frame % 82 === 0) this.obstacles.push({x:canvas.width+20,w:18+Math.random()*20,h:25+Math.random()*34});
    this.obstacles.forEach(o=>o.x-=this.speed);
    this.obstacles=this.obstacles.filter(o=>o.x+o.w>0);
    if (this.started) this.score += .12;
    this.speed=Math.min(7,this.speed+.0007);
    for (const o of this.obstacles) if (this.x+25>o.x && this.x<o.x+o.w && this.y+34>294-o.h) { this.started=false; this.best=Math.max(this.best,Math.floor(this.score)); this.obstacles=[]; this.x=110; this.y=260; this.vy=0; this.score=0; notify("Run ended — press SPACE to jump back in."); break; }
    scoreEl.textContent=String(Math.floor(this.score)).padStart(4,"0");
    bestEl.textContent=String(this.best).padStart(4,"0");
  }
  draw() {
    const w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h);
    const g=ctx.createLinearGradient(0,0,0,h); g.addColorStop(0,"#11162b");g.addColorStop(1,"#090c14");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle="rgba(120,112,255,.13)";ctx.lineWidth=1;
    for(let x=0;x<w;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=15;y<h;y+=35){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    for(let i=0;i<15;i++){const bx=(i*87-(this.frame*.45)%87);const bh=45+(i*37)%115;ctx.fillStyle="#121a2a";ctx.fillRect(bx,294-bh,50,bh);ctx.fillStyle=i%3===0?"#b6ff3b":"#7a5cff";for(let wy=307-bh;wy<285;wy+=17){ctx.fillRect(bx+9,wy,4,7);ctx.fillRect(bx+25,wy,4,7);}}
    ctx.fillStyle="#161e2b";ctx.fillRect(0,294,w,66);ctx.fillStyle="#b6ff3b";ctx.fillRect(0,294,w,2);
    ctx.strokeStyle="rgba(182,255,59,.22)";for(let x=-40-(this.frame%55);x<w;x+=55){ctx.beginPath();ctx.moveTo(x,360);ctx.lineTo(x+50,294);ctx.stroke();}
    this.obstacles.forEach(o=>{ctx.shadowBlur=12;ctx.shadowColor="#ff4fd8";ctx.fillStyle="#ff4fd8";ctx.fillRect(o.x,294-o.h,o.w,o.h);ctx.shadowBlur=0;ctx.fillStyle="#ffc2f0";ctx.fillRect(o.x+4,294-o.h+4,3,o.h-8);});
    // Stylized neon runner
    ctx.shadowBlur=18;ctx.shadowColor="#b6ff3b";ctx.fillStyle="#b6ff3b";ctx.fillRect(this.x,this.y,24,34);ctx.shadowBlur=0;
    ctx.fillStyle="#0b0e13";ctx.fillRect(this.x+5,this.y+7,15,5);ctx.fillStyle="#7a5cff";ctx.fillRect(this.x+7,this.y+21,10,4);
    if(!this.started){ctx.fillStyle="rgba(7,9,15,.64)";ctx.fillRect(0,0,w,h);ctx.textAlign="center";ctx.fillStyle="#b6ff3b";ctx.font="700 13px monospace";ctx.fillText("PRESS SPACE TO START",w/2,164);ctx.fillStyle="#e7e9ef";ctx.font="12px monospace";ctx.fillText("DODGE THE GLITCHES // SURVIVE THE GRID",w/2,190);}
  }
}
const game = new RunnerGame();
function loop(){game.update();game.draw();requestAnimationFrame(loop);}
// Keys only control the game while the canvas has focus, so Space and the arrows still scroll the page and activate buttons everywhere else.
canvas.addEventListener("keydown", e => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if ([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(key)) e.preventDefault();
  keys.add(key);
  if (key === " " || key === "ArrowUp" || key === "w") game.jump();
});
canvas.addEventListener("keyup", e => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key));
canvas.addEventListener("blur", () => keys.clear());
canvas.tabIndex=0;
loop();
