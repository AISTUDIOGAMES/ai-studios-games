/** Future $OWL launch teaser. Keep this section factual until the token is officially deployed. */
import { TOKEN_SYMBOL, TOKEN_NAME, TOKEN_CA } from "./config";

const esc = (v: string): string =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export const tokenSection = `
  <section class="token-section aso-section" id="token">
    <div class="section-heading">
      <div><div class="eyebrow"><span class="eyebrow-line"></span> THE FUTURE COMMUNITY TOKEN</div><h2>AI STUDIO OWL <span>${esc(TOKEN_SYMBOL)}</span></h2></div>
      <div class="section-note">PUMP.FUN LAUNCH<br/>ANNOUNCEMENT COMING SOON</div>
    </div>
    <div class="aso-card">
      <div class="aso-card-head"><img class="aso-coin" src="${import.meta.env.BASE_URL}images/coin-owl.webp" alt="AI STUDIO OWL bronze coin with the mechanical owl emblem" width="96" height="96" loading="lazy" decoding="async" /><div><small>${esc(TOKEN_NAME).toUpperCase()} TOKEN</small><h3>${esc(TOKEN_SYMBOL)}</h3></div><span class="aso-status">COMING SOON</span></div>
      <p>The future community token for the AI STUDIO OWL ecosystem. Official launch details will be published on our verified channels.</p>
      <div class="aso-facts">
        <div><small>TICKER</small><b>${esc(TOKEN_SYMBOL)}</b></div>
        <div><small>LAUNCH PLATFORM</small><b>pump.fun</b></div>
        <div><small>LAUNCH STATUS</small><b>COMING SOON</b></div>
      </div>
      <div class="aso-ca"><small>CONTRACT ADDRESS (CA)</small><code>CA: ${esc(TOKEN_CA)}</code></div>
      <p class="aso-disclaimer">The token has not launched. There is no official contract address, market price, liquidity pool, or trading link at this time. Beware of impersonators and unofficial tokens.</p>
    </div>
  </section>`;
