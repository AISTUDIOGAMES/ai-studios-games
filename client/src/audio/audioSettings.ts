// Preferências de áudio (música/efeitos ligados e volumes).
// É uma preferência do aparelho: fica numa chave própria e NÃO faz parte do save do jogo ("bomber-idle:v1"),
// então economia e progresso nunca são tocados. Tudo é lido de forma preguiçosa e dentro de try/catch:
// sem localStorage (modo privado, testes) o jogo segue com os padrões.
export interface AudioPrefs {
  music: boolean;
  sfx: boolean;
  /** 0..1 (posição do controle deslizante; o ganho real é perceptual, veja volToGain). */
  musicVol: number;
  sfxVol: number;
}

export const AUDIO_KEY = "bomber-idle:audio";
export const AUDIO_DEFAULTS: Readonly<AudioPrefs> = { music: true, sfx: true, musicVol: 0.5, sfxVol: 0.7 };

let cache: AudioPrefs | null = null;
const listeners = new Set<(p: AudioPrefs) => void>();

const clamp01 = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);

/** Aceita qualquer coisa vinda do armazenamento e devolve preferências válidas (valores ruins viram o padrão). */
export function sanitizeAudioPrefs(raw: unknown): AudioPrefs {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    music: bool(o.music, AUDIO_DEFAULTS.music),
    sfx: bool(o.sfx, AUDIO_DEFAULTS.sfx),
    musicVol: clamp01(o.musicVol, AUDIO_DEFAULTS.musicVol),
    sfxVol: clamp01(o.sfxVol, AUDIO_DEFAULTS.sfxVol),
  };
}

export function getAudioPrefs(): AudioPrefs {
  if (!cache) {
    let parsed: unknown = null;
    try { const s = localStorage.getItem(AUDIO_KEY); parsed = s ? JSON.parse(s) : null; } catch { /* sem armazenamento ou JSON ruim: usa o padrão */ }
    cache = sanitizeAudioPrefs(parsed);
  }
  return { ...cache };
}

export function setAudioPrefs(patch: Partial<AudioPrefs>): AudioPrefs {
  cache = sanitizeAudioPrefs({ ...getAudioPrefs(), ...patch });
  try { localStorage.setItem(AUDIO_KEY, JSON.stringify(cache)); } catch { /* sem armazenamento: vale só nesta sessão */ }
  const snap = { ...cache };
  listeners.forEach((fn) => { try { fn(snap); } catch { /* um ouvinte com erro não derruba os outros */ } });
  return snap;
}

/** Avisa quando as preferências mudam. Devolve a função que cancela a inscrição. */
export function onAudioPrefs(fn: (p: AudioPrefs) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Volume 0..1 do controle -> ganho. Curva quadrática: a metade do controle soa como "metade" para o ouvido. */
export const volToGain = (v: number) => { const c = Math.min(1, Math.max(0, v)); return c * c; };

/** Só para testes: esquece o valor em memória e os ouvintes. */
export function resetAudioPrefsCache() { cache = null; listeners.clear(); }
