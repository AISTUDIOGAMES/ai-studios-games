/**
 * Token section for the landing page. Driven by src/config.ts (symbol, CA, dev buy).
 * The token was launched on pump.fun (Solana), so the numbers below follow the standard
 * pump.fun launch: fixed 1B supply, no presale, no team allocation, no vesting.
 * Do not add vesting, multisig, staking or lock claims unless they really exist on-chain.
 */
import { TOKEN_SYMBOL, TOKEN_NAME, TOKEN_CA, DEV_BUY_PCT } from "./config";

interface Slice { label: string; pct: number; rule: string }
interface Perk { icon: string; title: string; text: string }

const esc = (v: string): string =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export const TOTAL_SUPPLY = "1,000,000,000";

const CURVE_PCT = 79.3; // standard pump.fun bonding curve
const LIQ_PCT = 20.7; // reserved for the liquidity pool when the curve completes
const dev = typeof DEV_BUY_PCT === "number" && DEV_BUY_PCT > 0 ? DEV_BUY_PCT : 0;

export const SLICES: Slice[] = [
  { label: "Public bonding curve", pct: CURVE_PCT, rule: "Open to everyone on pump.fun. No presale." },
  { label: "Liquidity pool", pct: LIQ_PCT, rule: "Seeded automatically when the curve completes" },
];

const pumpUrl = `https://pump.fun/coin/${TOKEN_CA}`;
const dexUrl = `https://dexscreener.com/solana/${TOKEN_CA}`;
const scanUrl = `https://solscan.io/token/${TOKEN_CA}`;
// Live chart: Dexscreener embed (updates in real time by itself). Resolves the token's main pair from the mint.
const chartUrl = `https://dexscreener.com/solana/${TOKEN_CA}?embed=1&loadChartSettings=0&chartLeftToolbar=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=usd&interval=15`;

export const PERKS: Perk[] = [
  { icon: "◈", title: "GAME PERKS", text: `Idea: holding ${TOKEN_SYMBOL} could unlock early access to tests and cosmetics in our games. Not live yet.` },
  { icon: "◎", title: "COMMUNITY VOTES", text: "Idea: holders could vote on priorities such as the next update, character or event. Votes would be advisory. Not live yet." },
  { icon: "⌁", title: "DROPS", text: "Idea: in-game items and collectibles for the community. Rules and dates would be announced on our X before anything happens." },
];

export const SAFEGUARDS: string[] = [
  "Fixed supply of 1B. pump.fun creates the token with the mint authority revoked.",
  "Fair launch: no presale and no private allocation.",
  dev > 0
    ? `The creator wallet bought about ${dev}% of the supply at launch. Anyone can verify it on-chain.`
    : "Holder distribution is public. Check the holders list on pump.fun or Solscan.",
  "When the curve completes, pump.fun migrates liquidity to a PumpSwap pool and burns the LP tokens.",
  "No yield, no APR, no promises of returns.",
];

export const tokenSection = `
      <section class="token-section" id="token">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE COMMUNITY TOKEN</div><h2>${esc(TOKEN_SYMBOL)} <span>TOKENOMICS</span></h2></div><div class="section-note">LIVE ON PUMP.FUN.<br/>ALWAYS VERIFY THE CA.</div></div>

        <div class="token-status"><b>LIVE</b><span>SOLANA</span><span>PUMP.FUN</span><span>FAIR LAUNCH</span><span>NO PRESALE</span></div>

        <div class="token-ca">
          <small>CONTRACT ADDRESS (CA)</small>
          <div class="token-ca-row"><code id="tokenCa">${esc(TOKEN_CA)}</code><button class="button button-primary" type="button" id="copyCa" data-ca="${esc(TOKEN_CA)}">COPY CA <span>⧉</span></button></div>
          <div class="token-links">
            <a class="button button-ghost" href="${pumpUrl}" target="_blank" rel="noopener noreferrer">BUY ON PUMP.FUN <span>↗</span></a>
            <a class="button button-ghost" href="${dexUrl}" target="_blank" rel="noopener noreferrer">DEXSCREENER <span>↗</span></a>
            <a class="button button-ghost" href="${scanUrl}" target="_blank" rel="noopener noreferrer">SOLSCAN <span>↗</span></a>
          </div>
        </div>

        <div class="token-chart">
          <div class="token-chart-head"><b>LIVE CHART</b><span><i class="live-dot"></i>REAL-TIME // DEXSCREENER</span></div>
          <div class="token-chart-frame"><iframe src="${chartUrl}" title="${esc(TOKEN_SYMBOL)} live chart on Dexscreener" loading="lazy" referrerpolicy="no-referrer" allow="clipboard-write"></iframe></div>
          <p class="token-foot">Chart by Dexscreener. If it shows "no pairs found" right after launch, give it a few minutes to index, or <a href="${dexUrl}" target="_blank" rel="noopener noreferrer">open it on Dexscreener ↗</a>.</p>
        </div>

        <div class="token-panel">
          <div class="token-top"><div><small>NAME</small><strong>${esc(TOKEN_NAME.toUpperCase())}</strong></div><div><small>TOTAL SUPPLY (FIXED)</small><strong>${TOTAL_SUPPLY}</strong></div><div><small>NETWORK</small><strong>SOLANA</strong></div></div>
          <div class="token-bar" role="img" aria-label="Token distribution: ${SLICES.map((s) => `${esc(s.label)} ${s.pct}%`).join(", ")}">
            ${SLICES.map((s, i) => `<i class="seg seg-${i}" style="flex:${s.pct}"></i>`).join("")}
          </div>
          <ul class="token-legend">
            ${SLICES.map((s, i) => `<li><span class="dot seg-${i}"></span><div><b>${esc(s.label)}</b><small>${esc(s.rule)}</small></div><em>~${s.pct}%</em></li>`).join("")}
          </ul>
          <p class="token-foot">Standard pump.fun split. The share bought by any wallet (including the creator) comes out of the public curve and is visible on-chain.</p>
        </div>

        <div class="token-split">
          <div class="token-box">
            <h4>BUILT TO BE CHECKED</h4>
            <ul class="token-safe">${SAFEGUARDS.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
          </div>
          <div class="token-box">
            <h4>WHAT COMES NEXT (IDEAS, NOT PROMISES)</h4>
            <p>The token is the community's way into the AI Studios Games universe. Our focus stays on the games. Anything below is an idea we may explore, and nothing is guaranteed.</p>
          </div>
        </div>

        <div class="token-perks">
          ${PERKS.map((p) => `<article class="log-item"><div class="log-top"><span>${esc(p.icon)}</span><b>PLANNED</b></div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`).join("")}
        </div>

        <p class="token-disclaimer">${esc(TOKEN_SYMBOL)} IS A COMMUNITY TOKEN LAUNCHED ON PUMP.FUN. IT IS NOT AN INVESTMENT AND NOTHING HERE IS FINANCIAL ADVICE OR A PROMISE OF VALUE OR RETURNS. MEMECOINS ARE VOLATILE AND YOU CAN LOSE EVERYTHING. DO YOUR OWN RESEARCH. THE ONLY OFFICIAL CONTRACT ADDRESS IS THE ONE SHOWN ON THIS PAGE AND ON OUR X (@AiStudioGameOwl). BEWARE OF FAKE TOKENS AND IMPERSONATORS.</p>
      </section>`;
