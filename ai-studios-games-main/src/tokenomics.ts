/**
 * $ASG tokenomics section for the landing page.
 * Public copy is a PROPOSED DESIGN only: no sale, no price, no launch date, no yield.
 * Keep the disclaimer and the "NOT LIVE" badge until the legal review is done.
 */

interface Slice { label: string; pct: number; rule: string }
interface Perk { icon: string; title: string; text: string }

const esc = (v: string): string =>
  v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

export const TOTAL_SUPPLY = "1,000,000,000";

export const SLICES: Slice[] = [
  { label: "Community & airdrops", pct: 30, rule: "Released in seasons over 4 years" },
  { label: "Game ecosystem", pct: 20, rule: "Events and in-game rewards, 3 years" },
  { label: "Studio treasury", pct: 20, rule: "24-month linear vesting, multisig" },
  { label: "Team", pct: 15, rule: "12-month cliff, then 36-month vesting" },
  { label: "Initial liquidity", pct: 10, rule: "LP tokens locked 12+ months" },
  { label: "Reserve", pct: 5, rule: "Multisig, use approved by vote" },
];

export const PERKS: Perk[] = [
  { icon: "◈", title: "GAME PERKS", text: "Lock $ASG to unlock early access to tests, exclusive cosmetics and in-game boosts across our games." },
  { icon: "◎", title: "VOTING", text: "Locked $ASG gives voting weight. The community votes on priorities such as the next update, character or event. Votes are advisory." },
  { icon: "⌁", title: "AIRDROPS", text: "Stakers can be eligible for drops of in-game items and collectibles. Rules and dates are published before every snapshot." },
];

export const LOCKS: { days: string; weight: string }[] = [
  { days: "30 DAYS", weight: "1.0x" },
  { days: "90 DAYS", weight: "1.5x" },
  { days: "180 DAYS", weight: "2.0x" },
];

export const SAFEGUARDS: string[] = [
  "Fixed supply. The mint authority is revoked after minting.",
  "Team and treasury tokens sit in on-chain vesting, not promises.",
  "Liquidity LP tokens are locked.",
  "Treasury wallets are multisig.",
  "No yield, no APR. Staking gives perks and votes, not returns.",
];

export const tokenSection = `
      <section class="token-section" id="token">
        <div class="section-heading"><div><div class="eyebrow"><span class="eyebrow-line"></span> THE GOVERNANCE TOKEN</div><h2>$ASG <span>TOKENOMICS</span></h2></div><div class="section-note">PROPOSED DESIGN.<br/>SUBJECT TO CHANGE.</div></div>

        <div class="token-status"><b>DRAFT</b><span>NOT LIVE</span><span>NO SALE</span><span>NO PRICE</span><span>NO LAUNCH DATE</span></div>

        <div class="token-panel">
          <div class="token-top"><div><small>TOTAL SUPPLY (FIXED)</small><strong>${TOTAL_SUPPLY}</strong></div><div><small>NETWORK</small><strong>SOLANA</strong></div></div>
          <div class="token-bar" role="img" aria-label="Token distribution: ${SLICES.map((s) => `${esc(s.label)} ${s.pct}%`).join(", ")}">
            ${SLICES.map((s, i) => `<i class="seg seg-${i}" style="flex:${s.pct}"></i>`).join("")}
          </div>
          <ul class="token-legend">
            ${SLICES.map((s, i) => `<li><span class="dot seg-${i}"></span><div><b>${esc(s.label)}</b><small>${esc(s.rule)}</small></div><em>${s.pct}%</em></li>`).join("")}
          </ul>
        </div>

        <div class="token-perks">
          ${PERKS.map((p) => `<article class="log-item"><div class="log-top"><span>${esc(p.icon)}</span><b>UTILITY</b></div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></article>`).join("")}
        </div>

        <div class="token-split">
          <div class="token-box">
            <h4>STAKING = PERKS, NOT YIELD</h4>
            <p>Three tiers (Bronze, Silver, Gold) unlock different perks. Tier thresholds will be announced before launch. A longer lock gives more voting weight.</p>
            <ul class="token-locks">${LOCKS.map((l) => `<li><span>${l.days}</span><b>${l.weight}</b></li>`).join("")}</ul>
          </div>
          <div class="token-box">
            <h4>BUILT TO BE CHECKED</h4>
            <ul class="token-safe">${SAFEGUARDS.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
          </div>
        </div>

        <p class="token-disclaimer">THIS IS A PROPOSED DESIGN, NOT AN OFFER. $ASG HAS NOT BEEN ISSUED AND IS NOT FOR SALE. NOTHING HERE IS FINANCIAL ADVICE OR A PROMISE OF VALUE OR RETURNS. TOKENS CAN LOSE ALL VALUE. DETAILS MAY CHANGE BEFORE ANY LAUNCH AND WILL BE ANNOUNCED ON OUR OFFICIAL CHANNELS.</p>
      </section>`;
