import { ART_H, ART_W, BOXES, PLANET, POLYS, REGION_ORDER, type RegionId } from "./heroKeyData";

const pct = (n: number): string => `${n}%`;
const pts = (p: [number, number][]): string => p.map(([x, y]) => `${x},${y}`).join(" ");

/** Position of the dragon's visible eye in the 1024x572 art space. */
export const OURO_EYE = { x: 398, y: 257 };

/**
 * The interactive top layer of the hero key art: villains, glow maps that light up on hover,
 * hit areas and the particle canvas. It sits above the readability gradient, below the copy.
 */
export function keyFxLayer(img: (file: string) => string): string {
  const v = BOXES.villains;
  const box = (id: RegionId | "villains"): string => {
    const b = BOXES[id];
    return `left:${pct(b.x)};top:${pct(b.y)};width:${pct(b.w)};height:${pct(b.h)}`;
  };
  const lit = REGION_ORDER.map(
    (id) => `<img class="lit lit-${id}" src="${img(`lit-${id}.webp`)}" alt="" aria-hidden="true" decoding="async" loading="lazy" style="${box(id)}" />`,
  ).join("");
  const hits = [
    `<circle class="hit" data-r="planet" cx="${PLANET.cx}" cy="${PLANET.cy}" r="${PLANET.r}"/>`,
    ...(["jax", "kira", "lyra", "kai", "ouro", "nox", "dorran"] as const).map(
      (id) => `<polygon class="hit" data-r="${id}" points="${pts(POLYS[id])}"/>`,
    ),
  ].join("");
  return `
          <div class="key-stage key-stage-fx" aria-hidden="true">
            <div class="key-zoom">
              <img class="key-villains" src="${img("key-villains.webp")}" alt="" decoding="async" style="left:${pct(v.x)};top:${pct(v.y)};width:${pct(v.w)};height:${pct(v.h)}" />
              ${lit}
              <svg class="key-fx-svg" viewBox="0 0 ${ART_W} ${ART_H}" preserveAspectRatio="none" focusable="false">
                <defs>
                  <radialGradient id="gPlanet"><stop offset="0" stop-color="#d27bff" stop-opacity=".55"/><stop offset=".6" stop-color="#8a3dff" stop-opacity=".28"/><stop offset="1" stop-color="#8a3dff" stop-opacity="0"/></radialGradient>
                  <radialGradient id="gOuro"><stop offset="0" stop-color="#ffd24a" stop-opacity=".5"/><stop offset=".55" stop-color="#ff9d1a" stop-opacity=".22"/><stop offset="1" stop-color="#ff9d1a" stop-opacity="0"/></radialGradient>
                  <radialGradient id="gEye"><stop offset="0" stop-color="#fff6c2"/><stop offset=".25" stop-color="#ffd24a" stop-opacity=".95"/><stop offset="1" stop-color="#ffb000" stop-opacity="0"/></radialGradient>
                </defs>
                <circle class="fx-planet-halo" cx="${PLANET.cx}" cy="${PLANET.cy}" r="${PLANET.r * 1.25}" fill="url(#gPlanet)"/>
                <ellipse class="fx-ouro-halo" cx="470" cy="292" rx="190" ry="105" fill="url(#gOuro)"/>
                <circle class="fx-eye" cx="${OURO_EYE.x}" cy="${OURO_EYE.y}" r="15" fill="url(#gEye)"/>
                ${hits}
              </svg>
              <canvas class="key-canvas"></canvas>
            </div>
          </div>`;
}
