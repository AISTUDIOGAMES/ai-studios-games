import { NFTS } from "./nfts";
import { track } from "./analytics";

const modelUrl = (file: string) => `${import.meta.env.BASE_URL}models/${file}`;

/** Pointer tilt + foil glare on the NFT cards. Only for fine pointers and when the visitor has not asked for less motion. */
function initTilt(): void {
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!canHover || reduced) return;

  document.querySelectorAll<HTMLElement>("[data-tilt]").forEach((card) => {
    const glare = card.querySelector<HTMLElement>(".nft-glare");
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 12}deg) rotateY(${(px - 0.5) * 12}deg) translateY(-6px)`;
      if (glare) glare.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, #ffffff55 0%, #ffffff0d 45%, transparent 70%)`;
    });
    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
      if (glare) glare.style.background = "";
    });
  });
}

let viewerLoaded: Promise<unknown> | null = null;
/**
 * The <model-viewer> library is code-split and only downloaded the first time someone opens a 3D model.
 * The models are meshopt-compressed (about 3 MB instead of 23 MB), so the decoder is served from /vendor
 * instead of the default CDN.
 */
function loadViewer(): Promise<unknown> {
  viewerLoaded ??= import("@google/model-viewer").then(({ ModelViewerElement }) => {
    ModelViewerElement.meshoptDecoderLocation = `${import.meta.env.BASE_URL}vendor/meshopt_decoder.js`;
  });
  return viewerLoaded;
}

function initViewer(): void {
  const overlay = document.createElement("div");
  overlay.className = "nft-modal";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="nft-modal-box" role="dialog" aria-modal="true" aria-labelledby="nftModalTitle">
      <div class="nft-modal-head"><h3 id="nftModalTitle"></h3><button type="button" class="nft-modal-close" aria-label="Close 3D viewer">&times;</button></div>
      <div class="nft-modal-stage"><p class="nft-modal-status" role="status">LOADING 3D MODEL…</p></div>
      <p class="nft-modal-hint">DRAG TO ROTATE // SCROLL OR PINCH TO ZOOM</p>
    </div>`;
  document.body.appendChild(overlay);

  const title = overlay.querySelector<HTMLElement>("#nftModalTitle")!;
  const stage = overlay.querySelector<HTMLElement>(".nft-modal-stage")!;
  const status = overlay.querySelector<HTMLElement>(".nft-modal-status")!;
  const closeBtn = overlay.querySelector<HTMLButtonElement>(".nft-modal-close")!;
  let opener: HTMLElement | null = null;

  function close(): void {
    overlay.hidden = true;
    document.body.classList.remove("nft-modal-open");
    stage.querySelector("model-viewer")?.remove(); // frees the GPU memory
    opener?.focus();
  }

  async function open(id: string, from: HTMLElement): Promise<void> {
    const nft = NFTS.find((n) => n.id === id);
    if (!nft) return;
    opener = from;
    title.textContent = `${nft.name} // 3D MODEL`;
    status.hidden = false;
    status.textContent = "LOADING 3D MODEL…";
    overlay.hidden = false;
    document.body.classList.add("nft-modal-open");
    closeBtn.focus();
    track("NFT 3D View", { card: nft.id });
    try {
      await loadViewer();
      const mv = document.createElement("model-viewer");
      mv.setAttribute("src", modelUrl(nft.model));
      mv.setAttribute("alt", `3D model of ${nft.name}`);
      mv.setAttribute("camera-controls", "");
      mv.setAttribute("auto-rotate", "");
      mv.setAttribute("shadow-intensity", "1");
      mv.setAttribute("exposure", "1.1");
      mv.addEventListener("load", () => { status.hidden = true; });
      mv.addEventListener("error", () => { status.hidden = false; status.textContent = "COULD NOT LOAD THE 3D MODEL."; });
      stage.querySelector("model-viewer")?.remove();
      stage.appendChild(mv);
    } catch {
      status.hidden = false;
      status.textContent = "COULD NOT LOAD THE 3D MODEL.";
    }
  }

  document.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>("[data-3d]");
    if (btn?.dataset["3d"]) void open(btn.dataset["3d"], btn);
  });
  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  document.addEventListener("keydown", (e) => {
    if (overlay.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "Tab") { // keep the focus inside the dialog
      const focusable = overlay.querySelectorAll<HTMLElement>("button, model-viewer");
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });
}

export function initNftCards(): void {
  initTilt();
  initViewer();
}
