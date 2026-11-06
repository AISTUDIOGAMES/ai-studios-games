/**
 * Trilha de fundo do site: 4 músicas tocando em sequência, em loop infinito
 * (depois da última volta para a primeira).
 *
 * - Os navegadores bloqueiam som automático. Tentamos tocar ao abrir; se for bloqueado,
 *   começa no primeiro clique, toque ou tecla do visitante.
 * - Botão flutuante para pausar/retomar e pular de faixa. A escolha de quem pausou é lembrada.
 * - Pausa sozinha quando a aba fica escondida e retoma ao voltar.
 * - A faixa e o ponto onde parou ficam salvos para a próxima visita.
 */

const TRACKS: { title: string; file: string }[] = [
  { title: "The Golden Beam", file: "audio/the-golden-beam.mp3" },
  { title: "The Golden Strike", file: "audio/the-golden-strike.mp3" },
  { title: "Solfeggio Sutra", file: "audio/solfeggio-sutra.mp3" },
  { title: "Dune's Last Stand", file: "audio/dunes-last-stand.mp3" },
];

const KEY = "aistudios:music";
const VOLUME = 0.35;

type Saved = { muted?: boolean; index?: number; time?: number };

function load(): Saved {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Saved; } catch { return {}; }
}
function save(patch: Saved): void {
  try { localStorage.setItem(KEY, JSON.stringify({ ...load(), ...patch })); } catch { /* modo privado: ignora */ }
}

export function initMusic(): void {
  if (document.querySelector("#musicPlayer")) return;

  const saved = load();
  let index = Number.isInteger(saved.index) && saved.index! >= 0 && saved.index! < TRACKS.length ? saved.index! : 0;
  let wantsPlay = !saved.muted;   // false só se o visitante pausou de propósito
  let resumeAfterHide = false;

  const audio = new Audio();
  audio.preload = "auto";
  audio.volume = VOLUME;

  const src = (i: number) => `${import.meta.env.BASE_URL}${TRACKS[i].file}`;

  const root = document.createElement("div");
  root.id = "musicPlayer";
  root.className = "music-player";
  root.innerHTML = `
    <button type="button" class="music-btn music-toggle" id="musicToggle" aria-label="Ativar música" aria-pressed="false">
      <span class="music-icon" aria-hidden="true"></span>
    </button>
    <div class="music-meta" aria-live="polite">
      <small>TRILHA</small>
      <b id="musicTitle"></b>
    </div>
    <button type="button" class="music-btn music-next" id="musicNext" aria-label="Próxima música">⏭</button>`;
  document.body.appendChild(root);

  const toggle = root.querySelector<HTMLButtonElement>("#musicToggle")!;
  const next = root.querySelector<HTMLButtonElement>("#musicNext")!;
  const title = root.querySelector<HTMLElement>("#musicTitle")!;

  const paint = (): void => {
    const playing = !audio.paused;
    root.classList.toggle("is-playing", playing);
    root.classList.toggle("is-waiting", wantsPlay && !playing);
    toggle.setAttribute("aria-pressed", String(playing));
    toggle.setAttribute("aria-label", playing ? "Pausar música" : "Tocar música");
    title.textContent = TRACKS[index].title;
  };

  const setTrack = (i: number, startAt = 0): void => {
    index = (i + TRACKS.length) % TRACKS.length;
    audio.src = src(index);
    if (startAt > 0) {
      audio.addEventListener("loadedmetadata", () => {
        if (startAt < (audio.duration || Infinity) - 2) audio.currentTime = startAt;
      }, { once: true });
    }
    save({ index, time: startAt });
    paint();
  };

  const tryPlay = async (): Promise<boolean> => {
    try { await audio.play(); paint(); return true; }
    catch { paint(); return false; }   // bloqueado pelo navegador: espera um gesto
  };

  // Fim da faixa -> próxima; depois da última, volta para a primeira (loop da lista).
  audio.addEventListener("ended", () => { setTrack(index + 1); if (wantsPlay) void tryPlay(); });
  // Arquivo com erro: pula para a próxima em vez de travar o player em silêncio.
  let errors = 0;
  audio.addEventListener("error", () => {
    if (++errors >= TRACKS.length) { root.classList.add("is-error"); title.textContent = "Áudio indisponível"; return; }
    setTrack(index + 1); if (wantsPlay) void tryPlay();
  });
  audio.addEventListener("playing", () => { errors = 0; paint(); });
  audio.addEventListener("pause", paint);

  // Guarda o ponto da faixa (a cada ~5 s) para continuar de onde parou na próxima visita.
  let lastSave = 0;
  audio.addEventListener("timeupdate", () => {
    if (audio.currentTime - lastSave > 5 || audio.currentTime < lastSave) { lastSave = audio.currentTime; save({ time: Math.floor(lastSave) }); }
  });

  toggle.addEventListener("click", () => {
    if (audio.paused) { wantsPlay = true; save({ muted: false }); void tryPlay(); }
    else { wantsPlay = false; save({ muted: true }); audio.pause(); }
    paint();
  });
  next.addEventListener("click", () => {
    setTrack(index + 1);
    wantsPlay = true; save({ muted: false });
    void tryPlay();
  });

  // Aba escondida: pausa; ao voltar, retoma só se estava tocando.
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { resumeAfterHide = !audio.paused; if (resumeAfterHide) audio.pause(); }
    else if (resumeAfterHide && wantsPlay) { resumeAfterHide = false; void tryPlay(); }
  });

  // Primeiro gesto do visitante libera o som (regra de autoplay dos navegadores).
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const onGesture = (ev: Event): void => {
    if (root.contains(ev.target as Node)) return;          // o botão do player tem lógica própria
    if (!wantsPlay) { cleanup(); return; }                  // visitante pausou de propósito
    if (!audio.paused) { cleanup(); return; }
    void tryPlay().then((ok) => { if (ok) cleanup(); });
  };
  const cleanup = (): void => events.forEach((e) => document.removeEventListener(e, onGesture, true));
  events.forEach((e) => document.addEventListener(e, onGesture, true));

  setTrack(index, saved.time ?? 0);
  if (wantsPlay) void tryPlay();
}
