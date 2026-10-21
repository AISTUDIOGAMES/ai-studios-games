// Placeholder sector backdrops: two SVG layers per sector (far + mid) so the camera can parallax them.
// Procedural and seeded, so they look the same every run. Swap for painted backgrounds later:
// just return { far: "<img ...>", mid: "<img ...>" } from sceneArt().
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const svg = (inner) => `<svg viewBox="0 0 1000 400" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
const range = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join("");

const SCENES = [
  // 1 · Night City: layered skyline with lit windows and neon signs
  (r) => ({
    far: svg(`<circle cx="780" cy="90" r="46" fill="#c9b8ff" opacity=".35"/>${range(22, (i) => { const h = 90 + r() * 150, x = i * 48; return `<rect x="${x}" y="${400 - h}" width="40" height="${h}" fill="#241552"/>${range(8, () => `<rect x="${x + 4 + r() * 28}" y="${400 - h + 8 + r() * (h - 20)}" width="3" height="4" fill="#ffd77a" opacity="${.3 + r() * .5}"/>`)}`; })}`),
    mid: svg(`${range(9, (i) => { const h = 150 + r() * 130, x = i * 118 - 10, c = ["#ff3df2", "#46e0ff", "#b6ff3b"][i % 3]; return `<rect x="${x}" y="${400 - h}" width="96" height="${h}" fill="#150c33"/><rect x="${x + 8}" y="${400 - h + 14}" width="6" height="${h * .5}" fill="${c}" opacity=".85"/>${range(10, () => `<rect x="${x + 22 + r() * 62}" y="${400 - h + 20 + r() * (h - 40)}" width="5" height="6" fill="#ffe9a8" opacity="${.25 + r() * .5}"/>`)}`; })}`),
  }),
  // 2 · Foundry: smokestacks, molten glow, gantries and gears
  (r) => ({
    far: svg(`<rect y="250" width="1000" height="150" fill="#ff7a3d" opacity=".18"/>${range(9, (i) => { const x = 20 + i * 115, h = 150 + r() * 120; return `<path d="M${x} 400 V${400 - h} h34 V400Z" fill="#2a1408"/><rect x="${x - 3}" y="${400 - h - 8}" width="40" height="8" fill="#3b1c0b"/><ellipse cx="${x + 17 + r() * 30}" cy="${400 - h - 30 - r() * 30}" rx="${30 + r() * 24}" ry="${12 + r() * 8}" fill="#5a2a12" opacity=".5"/>`; })}`),
    mid: svg(`<path d="M0 330 H1000 M0 360 H1000" stroke="#1a0c05" stroke-width="10"/>${range(6, (i) => `<path d="M${i * 190 + 40} 400 V300 M${i * 190 + 110} 400 V300" stroke="#1a0c05" stroke-width="12"/>`)}${range(4, (i) => { const x = 130 + i * 250, s = 46 + r() * 26; return `<g transform="translate(${x} ${300 - r() * 40})"><circle r="${s}" fill="none" stroke="#2c1507" stroke-width="16" stroke-dasharray="14 9"/><circle r="${s * .55}" fill="#1a0c05"/><circle r="6" fill="#ff7a3d"/></g>`; })}`),
  }),
  // 3 · Undergrid: tunnel arches, pipes and hanging cables
  (r) => ({
    far: svg(`${range(7, (i) => { const s = 1 - i * .13; return `<path d="M${500 - 420 * s} 400 V${230 + i * 14} A${420 * s} ${150 * s} 0 0 1 ${500 + 420 * s} ${230 + i * 14} V400" fill="none" stroke="#46e0c0" stroke-width="2" opacity="${.14 + i * .05}"/>`; })}<rect x="440" y="250" width="120" height="150" fill="#46e0c0" opacity=".1"/>`),
    mid: svg(`<path d="M0 90 H1000 M0 112 H1000" stroke="#0c2f33" stroke-width="14"/><path d="M0 300 H1000" stroke="#0c2f33" stroke-width="20"/>${range(12, (i) => { const x = 40 + i * 82 + r() * 30; return `<path d="M${x} 90 Q${x + 20} ${150 + r() * 80} ${x + 4} ${210 + r() * 60}" fill="none" stroke="#1c5a60" stroke-width="3"/><circle cx="${x + 4}" cy="${215 + r() * 55}" r="4" fill="#46e0c0"/>`; })}${range(5, (i) => `<ellipse cx="${100 + i * 200 + r() * 50}" cy="${330 + r() * 40}" rx="${60 + r() * 40}" ry="${14 + r() * 8}" fill="#8ff5e0" opacity=".08"/>`)}`),
  }),
  // 4 · Zero Cathedral: colonnade, pointed arches and a rose window
  () => ({
    far: svg(`<circle cx="500" cy="170" r="120" fill="none" stroke="#b9a8ff" stroke-width="3" opacity=".35"/><circle cx="500" cy="170" r="74" fill="none" stroke="#b9a8ff" stroke-width="2" opacity=".3"/>${range(12, (i) => `<path d="M500 170 L${500 + Math.cos(i * Math.PI / 6) * 120} ${170 + Math.sin(i * Math.PI / 6) * 120}" stroke="#b9a8ff" stroke-width="2" opacity=".28"/>`)}<circle cx="500" cy="170" r="22" fill="#f0cf7a" opacity=".5"/>`),
    mid: svg(`${range(8, (i) => { const x = i * 140 - 20; return `<rect x="${x}" y="40" width="26" height="360" fill="#1c1730"/><path d="M${x + 26} 110 Q${x + 70} 20 ${x + 114} 110" fill="none" stroke="#2c2548" stroke-width="12"/>`; })}<rect y="372" width="1000" height="28" fill="#120f20"/>`),
  }),
  // 5 · Static Wastes: dead sun, glitch bars, broken monoliths
  (r) => ({
    far: svg(`<circle cx="500" cy="210" r="130" fill="#ff3df2" opacity=".22"/><circle cx="500" cy="210" r="86" fill="#090b10"/>${range(14, () => `<rect x="${r() * 900}" y="${r() * 330}" width="${40 + r() * 160}" height="${2 + r() * 6}" fill="${r() > .5 ? "#ff3df2" : "#46e0ff"}" opacity="${.12 + r() * .3}"/>`)}`),
    mid: svg(`${range(7, (i) => { const x = 30 + i * 150 + r() * 40, h = 90 + r() * 190, w = 36 + r() * 40, t = (r() - .5) * 28; return `<polygon points="${x},400 ${x + t},${400 - h} ${x + w + t},${400 - h + 20 + r() * 20} ${x + w},400" fill="#17081f" stroke="#ff3df2" stroke-width="1.5" opacity=".95"/>`; })}`),
  }),
];

export function sceneArt(stageIdx) {
  const f = SCENES[stageIdx] || SCENES[0];
  return f(rng(1000 + stageIdx * 77));
}
