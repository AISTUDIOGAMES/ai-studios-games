import { MAPS, INSTANCES_PER_MAP } from "./maps";

export type Rarity = "common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary" | "super" | "ancestral";

// chest = valor base do bau dessa raridade; hp = vida do bau (quanto mais raro, mais dificil); mult = multiplicador do operador dessa raridade
export const RARITIES: Record<Rarity, { label: string; color: number; css: string; mult: number; chest: number; hp: number }> = {
  common: { label: "Comum", color: 0x8d99a6, css: "#8d99a6", mult: 1, chest: 1, hp: 10 },
  uncommon: { label: "Incomum", color: 0x4ade80, css: "#4ade80", mult: 1.05, chest: 1.5, hp: 15 }, // so operador (Kai): baus NAO sorteiam esta raridade
  rare: { label: "Raro", color: 0x3fa2ff, css: "#3fa2ff", mult: 1.1, chest: 2, hp: 20 },
  epic: { label: "Épico", color: 0x9b5cff, css: "#9b5cff", mult: 1.25, chest: 4, hp: 40 },
  mythic: { label: "Mítico", color: 0xff3fa4, css: "#ff3fa4", mult: 1.5, chest: 8, hp: 80 },
  legendary: { label: "Lendário", color: 0xffb830, css: "#ffb830", mult: 1.8, chest: 16, hp: 160 },
  super: { label: "Super lendário", color: 0xfff1b8, css: "#fff1b8", mult: 2.5, chest: 40, hp: 320 },
  ancestral: { label: "Ancestral", color: 0x4ff0d0, css: "#4ff0d0", mult: 3, chest: 80, hp: 640 }, // so operador (Aeon): baus NAO sorteiam esta raridade
};
export const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "mythic", "legendary", "super", "ancestral"];
/** As 6 raridades originais: a migracao de saves antigos (pre-1.6) cria so estes 6 operadores, nunca os novos. */
const LEGACY_RARITIES: Rarity[] = ["common", "rare", "epic", "mythic", "legendary", "super"];
const rank = (r: Rarity) => RARITY_ORDER.indexOf(r);

// ---------- economia (valores de teste; ajuste aqui) ----------
export const REWARD_SCALE = 100; // multiplica o valor dos baus, missoes e custos
export const CAPSULE_PRICE = 30000; // $BOMBERSI por Capsula de Recruta
export const MAX_COLLECTION = 500; // operadores que cada carteira pode possuir
export const MAX_WORKING = 15; // operadores trabalhando ao mesmo tempo
export const START_BALANCE = 60000; // saldo de teste de um save novo (2 capsulas)
export const OUTSIDE_RATE = 0.1; // stamina por segundo de quem descansa fora de alojamento
export type LodgeKind = "casulo" | "modulo" | "torre";
export const LODGING: Record<LodgeKind, { label: string; cap: number; rate: number; price: number | null }> = {
  casulo: { label: "Casulo", cap: 3, rate: 0.25, price: 150000 }, // rate = stamina por segundo
  modulo: { label: "Módulo", cap: 5, rate: 0.5, price: 600000 },
  torre: { label: "Torre", cap: 8, rate: 1, price: null }, // paga em $ASG: em breve
};
export const MAX_LODGINGS = 20; // alojamentos por carteira
export const BUTLER_PRICE = 1000000; // Droide Zelador (demo em $BOMBERSI)
export const WORK_MIN = 0.3; // "Enviar todos" so leva quem tem 30%+ de stamina
export const BUTLER_REST_AT = 0.15; // Zelador recolhe quem cai abaixo de 15%
export const BUTLER_WORK_AT = 0.8; // e devolve ao trabalho quem chega a 80%
/** Dano de uma bomba nos baus: cresce com o poder e o nivel do operador. */
export const bombDamage = (d: { power: number; level: number }) => Math.round(8 + 2 * d.power + 0.4 * (d.level - 1));
/** Chances (%) da Capsula de Recruta. Soma 100. Raro..Super lendario seguem iguais a 1.7.1; os 55% do Comum foram divididos entre Comum, Incomum (Kai) e Ancestral (Aeon). */
export const CAPSULE_ODDS: Record<Rarity, number> = { common: 41.9, uncommon: 13, rare: 24, epic: 12, mythic: 6, legendary: 2.5, super: 0.5, ancestral: 0.1 };

export interface Jitter { s: number; v: number; l: number } // variacao individual: stamina, velocidade, sorte

export interface HeroData {
  id: string;
  serial: number;
  name: string;
  rarity: Rarity;
  role: string;
  portrait: string; // carta NFT em public/
  power: number; // 1..5 -> alcance da bomba
  speed: number; // multiplicador de velocidade (ja com melhorias)
  maxStamina: number; // ja com nivel e melhorias
  stamina: number; // cada bomba gasta 1
  regen: number; // stamina recuperada por tick de descanso
  luck: number; // desloca a raridade dos baus para cima
  chestMult: number; // multiplicador do valor dos baus
  melee: boolean; // quebra blocos adjacentes sem bomba
  level: number;
  xp: number;
  up: { stamina: number; speed: number; luck: number }; // niveis de melhoria
  base: { maxStamina: number; speed: number; luck: number }; // atributos de fabrica
  jitter: Jitter;
  stats: HeroStats; // desempenho acumulado (so informativo: nao altera nenhuma regra)
}

/** Desempenho de um operador ao longo da vida (salvo junto; saves antigos comecam zerados). */
export interface HeroStats { chests: number; blocks: number; enemies: number; crits: number; skills: number }
const emptyStats = (): HeroStats => ({ chests: 0, blocks: 0, enemies: 0, crits: 0, skills: 0 });
const cnt = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.min(1e9, Math.floor(v)) : 0);
const cleanStats = (s?: Partial<HeroStats> | null): HeroStats => ({ chests: cnt(s?.chests), blocks: cnt(s?.blocks), enemies: cnt(s?.enemies), crits: cnt(s?.crits), skills: cnt(s?.skills) });
export const bumpStat = (h: HeroData, k: keyof HeroStats, n = 1) => { h.stats[k] = Math.min(1e9, h.stats[k] + n); };

export type UpKey = "stamina" | "speed" | "luck";
export const UP_MAX = 10;
const MAX_LEVEL = 30;

interface Daily { day: string; blocks: number; bombs: number; chests: number; maps: string[]; claimed: string[] }
interface SavedOp { r: Rarity; n: number; xp: number; lv: number; up: { stamina: number; speed: number; luck: number }; j: Jitter; w?: 1; s?: number; st?: Partial<HeroStats> }
interface SavedMap { i: number; n: number; a: boolean; r?: { i: number; n: number } } // indice, instancia, auto, ponto para retomar o Auto
interface Saved {
  pending: number; chests: number;
  owned?: SavedOp[]; serial?: number; wk?: boolean;
  lodging?: Record<LodgeKind, number>; butler?: { owned: boolean; on: boolean };
  heroes?: Record<string, { xp: number; level: number; up: { stamina: number; speed: number; luck: number } }>; // formato antigo (<1.6)
  daily?: Daily; map?: SavedMap;
}

const KEY = "bomber-idle:v1"; // mesma chave: saves antigos continuam validos
const BAK = `${KEY}:bak`; // copia de seguranca (inicio da sessao + a cada BACKUP_EVERY_MS)
const BAD = `${KEY}:corrupt`; // copia do save ilegivel, guardada antes de qualquer regravacao
const BACKUP_EVERY_MS = 10 * 60 * 1000;
/** Saude do salvamento (a interface avisa o jogador): `ok` cai para false quando gravar falha (armazenamento cheio/bloqueado);
 *  `recovered` diz como o save desta sessao foi obtido quando o principal estava ilegivel. */
export const saveStatus = { ok: true, failures: 0, recovered: "none" as "none" | "backup" | "fresh" };
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const parseSave = (raw: string | null): Saved | null => {
  if (!raw) return null;
  try { const v: unknown = JSON.parse(raw); return isObj(v) ? (v as unknown as Saved) : null; } catch { return null; }
};
function load(): Saved | null {
  let raw: string | null;
  try { raw = localStorage.getItem(KEY); } catch { return null; }
  if (raw === null) return null; // sem save: jogo novo
  const ok = parseSave(raw);
  if (ok) { try { localStorage.setItem(BAK, raw); } catch { /* sem espaco: segue sem backup */ } return ok; } // o save que abriu bem vira o backup desta sessao
  // O save principal existe mas esta ilegivel. NUNCA recomecar em silencio: guarda a copia e tenta o backup.
  try { localStorage.setItem(BAD, raw); } catch { /* ok */ }
  let bak: Saved | null = null;
  try { bak = parseSave(localStorage.getItem(BAK)); } catch { /* ok */ }
  saveStatus.recovered = bak ? "backup" : "fresh";
  return bak;
}
const saved = load();
// Dia no fuso do jogador (antes usava UTC: no Brasil as missoes reiniciavam as 21h).
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const freshDaily = (): Daily => ({ day: today(), blocks: 0, bombs: 0, chests: 0, maps: [], claimed: [] });
/** Progresso do dia vindo do save: so vale se for de hoje; contadores viram inteiros seguros e as listas so aceitam texto. */
const cleanDaily = (d: unknown): Daily => {
  if (!isObj(d) || d.day !== today()) return freshDaily();
  const strs = (v: unknown, max: number) => (Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string"))].slice(0, max) : []);
  return { day: d.day as string, blocks: Math.floor(fin(d.blocks, 0, 1e9, 0)), bombs: Math.floor(fin(d.bombs, 0, 1e9, 0)), chests: Math.floor(fin(d.chests, 0, 1e9, 0)), maps: strs(d.maps, 200), claimed: strs(d.claimed, 20) };
};
const r2 = (n: number) => Math.round(n * 100) / 100;
/** Numero finito dentro de [min, max]; qualquer outra coisa (NaN, Infinity, texto, undefined) vira `def`. */
const fin = (v: unknown, min: number, max: number, def: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);

/** Recalcula os atributos a partir da base, do nivel e das melhorias. */
export function applyStats(h: HeroData) {
  h.maxStamina = h.base.maxStamina + 2 * h.up.stamina + (h.level - 1);
  h.speed = r2(h.base.speed * (1 + 0.06 * h.up.speed));
  h.luck = r2(h.base.luck + 0.15 * h.up.luck);
}
export const levelMult = (h: HeroData) => 1 + 0.03 * (h.level - 1);
const xpNeed = (lv: number) => Math.round(30 * Math.pow(lv, 1.4));
export const xpInfo = (h: HeroData) => ({ xp: h.xp, need: xpNeed(h.level) });

// ---------- modelos de operador: um por raridade ----------
interface Arch { key: string; name: string; role: string; portrait: string; power: number; speed: number; maxStamina: number; regen: number; luck: number; chestMult: number; melee: boolean }
export const ARCH: Record<Rarity, Arch> = {
  common: { key: "lyra", name: "Lyra", role: "Bio-mecânica: recupera stamina rápido", portrait: "nft/lyra.jpg", power: 1, speed: 1.0, maxStamina: 8, regen: 0.3, luck: 0, chestMult: 1, melee: false },
  uncommon: { key: "kai", name: "Kai", role: "Techno-Stalker: caça inimigos com precisão", portrait: "nft/kai.jpg", power: 2, speed: 1.15, maxStamina: 10, regen: 0.12, luck: 0.1, chestMult: 1, melee: false },
  rare: { key: "titan", name: "Titan", role: "Piloto tanque: bomba grande, lento", portrait: "nft/titan.jpg", power: 5, speed: 0.8, maxStamina: 14, regen: 0.12, luck: 0, chestMult: 1, melee: false },
  epic: { key: "vex", name: "Vex", role: "Hacker: atrai baús mais raros", portrait: "nft/vex.jpg", power: 3, speed: 1.3, maxStamina: 10, regen: 0.12, luck: 1, chestMult: 1, melee: false },
  mythic: { key: "kira", name: "Kira", role: "Android furtiva: a mais veloz", portrait: "nft/kira.jpg", power: 2, speed: 2.0, maxStamina: 12, regen: 0.12, luck: 0.3, chestMult: 1, melee: false },
  legendary: { key: "jax", name: "Jax", role: "Samurai: corta blocos sem bomba", portrait: "nft/jax.jpg", power: 3, speed: 1.7, maxStamina: 12, regen: 0.15, luck: 0.5, chestMult: 1, melee: true },
  super: { key: "orion", name: "Orion", role: "Divino: todos os bônus, baús x2", portrait: "nft/orion.jpg", power: 5, speed: 1.8, maxStamina: 20, regen: 0.25, luck: 1.5, chestMult: 2, melee: false },
  ancestral: { key: "aeon", name: "Aeon", role: "Grid Architect: o ápice dos BOMBERS, baús x2,5", portrait: "nft/aeon.jpg", power: 5, speed: 1.9, maxStamina: 24, regen: 0.3, luck: 2, chestMult: 2.5, melee: false },
};

const noJitter = (): Jitter => ({ s: 0, v: 0, l: 0 });
const rollJitter = (): Jitter => ({ s: Math.floor(Math.random() * 4) - 1, v: r2((Math.random() - 0.5) * 0.2), l: r2(Math.random() * 0.2) });

function build(r: Rarity, n: number, j: Jitter, lv = 1, xp = 0, up = { stamina: 0, speed: 0, luck: 0 }, stats?: Partial<HeroStats>): HeroData {
  const a = ARCH[r];
  const d: HeroData = {
    id: `op${n}`, serial: n, name: `${a.name} #${n}`, rarity: r, role: a.role, portrait: a.portrait,
    power: a.power, speed: a.speed, maxStamina: a.maxStamina, stamina: 0, regen: a.regen, luck: a.luck,
    chestMult: a.chestMult, melee: a.melee, level: lv, xp, up: { ...up },
    base: { maxStamina: a.maxStamina + j.s, speed: r2(a.speed * (1 + j.v)), luck: r2(a.luck + j.l) },
    jitter: j, stats: cleanStats(stats),
  };
  applyStats(d);
  d.stamina = d.maxStamina;
  return d;
}

/** Valida um operador salvo: raridade desconhecida ou numero ausente descarta o item; o resto vira valor seguro (sem NaN/Infinity/negativos). */
function cleanOp(o: SavedOp): SavedOp | null {
  if (!o || typeof o !== "object" || typeof o.r !== "string" || !Object.prototype.hasOwnProperty.call(ARCH, o.r)) return null;
  const n = o.n;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 1e9) return null; // numero de serie invalido: descarta (clamp criaria um "op1" duplicado)
  return {
    ...o, n,
    xp: fin(o.xp, 0, 1e9, 0), lv: Math.floor(fin(o.lv, 1, MAX_LEVEL, 1)),
    up: { stamina: Math.floor(fin(o.up?.stamina, 0, UP_MAX, 0)), speed: Math.floor(fin(o.up?.speed, 0, UP_MAX, 0)), luck: Math.floor(fin(o.up?.luck, 0, UP_MAX, 0)) },
    j: { s: fin(o.j?.s, -3, 3, 0), v: fin(o.j?.v, -0.5, 0.5, 0), l: fin(o.j?.l, 0, 0.5, 0) },
  };
}
const savedOpsRaw: SavedOp[] = Array.isArray(saved?.owned) ? saved!.owned!.map(cleanOp).filter((o): o is SavedOp => o !== null) : [];
/** Dois operadores com o mesmo numero teriam o mesmo id (op<N>) e se misturariam no trabalho/interface: o repetido ganha um numero novo. */
const savedOps: SavedOp[] = (() => {
  const seen = new Set<number>();
  let top = savedOpsRaw.reduce((m, o) => Math.max(m, o.n), 0);
  return savedOpsRaw.map((o) => {
    if (!seen.has(o.n)) { seen.add(o.n); return o; }
    const fixed: SavedOp = { ...o, n: ++top };
    delete fixed.w; // o repetido volta para a reserva
    seen.add(fixed.n);
    return fixed;
  });
})();

function initialOwned(): HeroData[] {
  if (savedOps.length)
    return savedOps.map((o) => {
      const h = build(o.r, o.n, o.j, o.lv, o.xp, o.up, o.st);
      if (typeof o.s === "number" && o.s >= 0) h.stamina = Math.min(h.maxStamina, o.s); // recarregar a pagina nao enche mais a stamina
      return h;
    });
  if (saved?.heroes) {
    // migracao: os 6 operadores fixos das versoes anteriores viram operadores #1..#6 com o progresso preservado
    const out: HeroData[] = [];
    LEGACY_RARITIES.forEach((r, i) => {
      const s = saved.heroes![ARCH[r].key];
      const up = s?.up ? { stamina: Math.floor(fin(s.up.stamina, 0, UP_MAX, 0)), speed: Math.floor(fin(s.up.speed, 0, UP_MAX, 0)), luck: Math.floor(fin(s.up.luck, 0, UP_MAX, 0)) } : undefined;
      out.push(build(r, i + 1, noJitter(), Math.floor(fin(s?.level, 1, MAX_LEVEL, 1)), fin(s?.xp, 0, 1e9, 0), up));
    });
    return out;
  }
  return [build("common", 1, rollJitter())]; // operador inicial de um save novo
}

const owned = initialOwned();
const workingIds = new Set<string>(saved?.wk ? savedOps.filter((o) => o.w).map((o) => `op${o.n}`) : []);

/** Estado de selecao de mapa: "auto" avanca para a proxima instancia (e troca de mapa a cada 33) ao limpar a atual.
 *  `resume` guarda onde o Auto estava quando o jogador escolheu um mapa na mao, para nao perder o progresso. */
const validMap = (m?: SavedMap) => !!m && Number.isInteger(m.i) && Number.isInteger(m.n) && m.i >= 0 && m.i < MAPS.length && m.n >= 1 && m.n <= INSTANCES_PER_MAP;
export const mapState = {
  index: validMap(saved?.map) ? saved!.map!.i : 0,
  instance: validMap(saved?.map) ? saved!.map!.n : 1,
  auto: validMap(saved?.map) ? saved!.map!.a : true,
  request: null as number | null,
  requestInstance: null as number | null, // instancia a abrir junto com `request` (null = 1)
  resume: saved?.map?.r && validMap({ ...saved.map.r, a: true }) ? { i: saved.map.r.i, n: saved.map.r.n } : (null as { i: number; n: number } | null),
};

/** Alojamentos do save: inteiros de 0 a MAX_LODGINGS, e o total nunca passa do limite (valores de texto/negativos/gigantes viram 0 ou o teto). */
function cleanLodging(l: unknown): Record<LodgeKind, number> {
  const o = isObj(l) ? l : {};
  const out = { casulo: 0, modulo: 0, torre: 0 } as Record<LodgeKind, number>;
  let left = MAX_LODGINGS;
  for (const k of ["torre", "modulo", "casulo"] as LodgeKind[]) { out[k] = Math.min(left, Math.floor(fin(o[k], 0, MAX_LODGINGS, 0))); left -= out[k]; }
  return out;
}

export const store = {
  pending: saved ? fin(saved.pending, 0, 1e15, 0) : START_BALANCE, // $BOMBERSI de teste (ainda sem blockchain)
  chests: Math.floor(fin(saved?.chests, 0, 1e12, 0)),
  serial: Math.max(Math.floor(fin(saved?.serial, 0, 1e9, 0)), ...owned.map((o) => o.serial)) + 1, // proximo numero de operador
  collection: owned, // tudo o que o jogador possui
  heroes: [] as HeroData[], // os que estao trabalhando agora (ate MAX_WORKING)
  lodging: cleanLodging(saved?.lodging),
  butler: { owned: isObj(saved?.butler) && saved!.butler!.owned === true, on: !(isObj(saved?.butler) && saved!.butler!.on === false) },
  housed: new Map<string, LodgeKind>(), // quem esta descansando em qual alojamento (recalculado a cada segundo)
  version: 0, // sobe quando a colecao muda (a interface se refaz)
  status: {} as Record<string, string>,
  daily: cleanDaily(saved?.daily),
};

/** Ordena por raridade (maior primeiro), depois nivel e numero. */
export const sortOps = (list: HeroData[]) =>
  [...list].sort((a, b) => rank(b.rarity) - rank(a.rarity) || b.level - a.level || a.serial - b.serial);

export const isWorking = (h: HeroData) => workingIds.has(h.id);
function syncWorking() {
  const list = sortOps(store.collection.filter((h) => workingIds.has(h.id)));
  store.heroes.length = 0;
  store.heroes.push(...list);
}
/** Preenche as vagas livres com os melhores operadores descansados (stamina >= 30%). */
export function fillSlots(): number {
  const free = MAX_WORKING - workingIds.size;
  const pick = sortOps(store.collection.filter((h) => !workingIds.has(h.id) && h.stamina >= WORK_MIN * h.maxStamina)).slice(0, Math.max(0, free));
  pick.forEach((h) => workingIds.add(h.id));
  syncWorking();
  return pick.length;
}
if (saved?.wk) syncWorking(); else fillSlots();

let lastBak = Date.now(); // load() ja gravou o backup do inicio da sessao
let erased = false; // depois de apagar o progresso, NADA mais e gravado nesta pagina (veja eraseSave)
function persist() {
  if (erased) return;
  try {
    const json = JSON.stringify({
      pending: store.pending, chests: store.chests, daily: store.daily, serial: store.serial,
      wk: true, lodging: store.lodging, butler: store.butler,
      owned: store.collection.map((h): SavedOp => ({ r: h.rarity, n: h.serial, xp: h.xp, lv: h.level, up: h.up, j: h.jitter, ...(workingIds.has(h.id) ? { w: 1 as const } : {}), s: r2(h.stamina), st: { ...h.stats } })),
      map: { i: mapState.index, n: mapState.instance, a: mapState.auto, ...(mapState.resume ? { r: mapState.resume } : {}) } as SavedMap,
    });
    localStorage.setItem(KEY, json);
    saveStatus.ok = true;
    if (Date.now() - lastBak > BACKUP_EVERY_MS) { // backup a cada 10 min; se faltar espaco, o save principal tem prioridade
      lastBak = Date.now();
      try { localStorage.setItem(BAK, json); } catch { try { localStorage.removeItem(BAK); } catch { /* ok */ } }
    }
  } catch {
    saveStatus.ok = false; // sem storage / cheio / bloqueado: a interface avisa o jogador
    saveStatus.failures++;
  }
}
persist(); // grava ja no formato novo (migracao)
/** Apaga o progresso deste navegador (save, backup e copia ilegivel) e congela as gravacoes. Sem o congelamento o "pagehide"
 *  do recarregamento chamava saveNow() e regravava o progresso antigo: o botao "Apagar progresso" nao apagava nada. Recarregue a pagina depois. */
export function eraseSave() {
  erased = true;
  for (const k of [KEY, BAK, BAD]) { try { localStorage.removeItem(k); } catch { /* ignora */ } }
}
/** Salva agora (usado em intervalos e ao fechar/esconder a pagina). */
export const saveNow = () => persist();
const ensureDay = () => { if (store.daily.day !== today()) store.daily = freshDaily(); };

/** Bau aberto: soma $BOMBERSI, XP do operador e progresso das missoes. */
const PENDING_MAX = 1e15; // o mesmo teto que a carga do save aceita: nada que se grave deixa de ser lido de volta
const credit = (v: number) => { if (Number.isFinite(v) && v > 0) store.pending = Math.min(PENDING_MAX, r2(store.pending + v)); };
export function addReward(value: number, h: HeroData, chestBase: number) {
  ensureDay();
  credit(value);
  store.chests += 1;
  store.daily.chests += 1;
  h.xp += 5 + chestBase * 2;
  while (h.level < MAX_LEVEL && h.xp >= xpNeed(h.level)) { h.xp -= xpNeed(h.level); h.level++; applyStats(h); }
  persist();
}

let ticks = 0;
const bump = () => { if (++ticks % 10 === 0) persist(); };
export const track = {
  block() { ensureDay(); store.daily.blocks++; bump(); },
  bomb() { ensureDay(); store.daily.bombs++; bump(); },
  map(id: string) { ensureDay(); if (!store.daily.maps.includes(id)) store.daily.maps.push(id); persist(); }, // salva a cada troca de instancia/mapa
};

// ---------- Capsula de Recruta ----------
// Aviso: no modo demo o sorteio roda no navegador. Com a economia on-chain, o sorteio TEM de rodar no servidor.
function rollCapsule(): Rarity {
  let x = Math.random() * 100;
  for (const r of RARITY_ORDER) { x -= CAPSULE_ODDS[r]; if (x < 0) return r; }
  return "common";
}
/** Compra `count` capsulas. Devolve os operadores novos ou uma mensagem de erro. */
export function buyCapsule(count: number): HeroData[] | string {
  if (!Number.isInteger(count) || count < 1 || count > MAX_COLLECTION) return "Quantidade inválida"; // (-5 cápsulas "custaria" -150000 e AUMENTARIA o saldo)
  const cost = CAPSULE_PRICE * count;
  if (store.collection.length + count > MAX_COLLECTION) return `Coleção cheia (máx. ${MAX_COLLECTION} operadores)`;
  if (store.pending < cost) return "$BOMBERSI insuficientes";
  store.pending = r2(store.pending - cost);
  const fresh: HeroData[] = [];
  for (let i = 0; i < count; i++) fresh.push(build(rollCapsule(), store.serial++, rollJitter()));
  store.collection.push(...fresh);
  store.version++; // a lista de operadores precisa ser refeita
  fillSlots();
  persist();
  return fresh;
}

// ---------- trabalho, descanso, alojamentos e Droide Zelador ----------
export function setWorking(h: HeroData, on: boolean): string | null {
  if (on) {
    if (workingIds.size >= MAX_WORKING) return `Limite de ${MAX_WORKING} operadores trabalhando`;
    if (h.stamina < 1) return "Sem stamina: deixe descansar primeiro";
    workingIds.add(h.id);
  } else workingIds.delete(h.id);
  syncWorking();
  persist();
  return null;
}
/** Envia os mais raros descansados (30%+) para as vagas livres. */
export function workAll(): number { const n = fillSlots(); persist(); return n; }
export function restAll(): number { const n = workingIds.size; workingIds.clear(); syncWorking(); persist(); return n; }
export function buyLodging(kind: LodgeKind): string | null {
  const L = LODGING[kind];
  if (!L) return "Alojamento inválido";
  if (L.price === null) return "Disponível em breve (pago em $ASG)";
  const total = store.lodging.casulo + store.lodging.modulo + store.lodging.torre;
  if (total >= MAX_LODGINGS) return `Limite de ${MAX_LODGINGS} alojamentos`;
  if (store.pending < L.price) return "$BOMBERSI insuficientes";
  store.pending = r2(store.pending - L.price);
  store.lodging[kind]++;
  persist();
  return null;
}
export function buyButler(): string | null {
  if (store.butler.owned) return "Você já tem o Droide Zelador";
  if (store.pending < BUTLER_PRICE) return "$BOMBERSI insuficientes";
  store.pending = r2(store.pending - BUTLER_PRICE);
  store.butler.owned = true;
  store.butler.on = true;
  persist();
  return null;
}
export function toggleButler() { store.butler.on = !store.butler.on; persist(); }

/** Roda a cada segundo: Zelador troca quem cansou, e a reserva recupera stamina (mais rapido nos alojamentos). */
export function economyTick() {
  if (store.butler.owned && store.butler.on) {
    let changed = false;
    for (const h of [...store.heroes]) if (h.stamina < BUTLER_REST_AT * h.maxStamina) { workingIds.delete(h.id); changed = true; }
    const free = MAX_WORKING - workingIds.size;
    if (free > 0) {
      const back = sortOps(store.collection.filter((h) => !workingIds.has(h.id) && h.stamina >= BUTLER_WORK_AT * h.maxStamina)).slice(0, free);
      back.forEach((h) => workingIds.add(h.id));
      changed = changed || back.length > 0;
    }
    if (changed) syncWorking();
  }
  const tired = sortOps(store.collection.filter((h) => !workingIds.has(h.id) && h.stamina < h.maxStamina));
  store.housed.clear();
  let i = 0;
  for (const kind of ["torre", "modulo", "casulo"] as LodgeKind[])
    for (let c = 0; c < store.lodging[kind] * LODGING[kind].cap && i < tired.length; c++, i++) store.housed.set(tired[i].id, kind);
  for (const h of tired) {
    const k = store.housed.get(h.id);
    h.stamina = Math.min(h.maxStamina, h.stamina + (k ? LODGING[k].rate : OUTSIDE_RATE));
  }
}

// ---------- melhorias (sumidouro de $BOMBERSI) ----------
export const UPGRADE_GROWTH = 1.4; // crescimento do custo por nivel (era 1,5: maximizar 3 atributos de um operador ia de ~3,4 mi para ~2,1 mi)
export const upgradeCost = (h: HeroData, k: UpKey) => Math.round(100 * REWARD_SCALE * Math.pow(UPGRADE_GROWTH, h.up[k]));
export function upgrade(h: HeroData, k: UpKey): boolean {
  if (!Object.prototype.hasOwnProperty.call(h.up, k)) return false;
  const c = upgradeCost(h, k);
  if (!Number.isFinite(c) || h.up[k] >= UP_MAX || store.pending < c) return false;
  store.pending = r2(store.pending - c);
  h.up[k]++;
  applyStats(h);
  persist();
  return true;
}

// ---------- missoes diarias ----------
export const MISSIONS = [
  { id: "chests", label: "Abrir 30 baús", goal: 30, reward: 40 * REWARD_SCALE, stat: "chests" },
  { id: "blocks", label: "Quebrar 80 blocos", goal: 80, reward: 30 * REWARD_SCALE, stat: "blocks" },
  { id: "bombs", label: "Plantar 40 bombas", goal: 40, reward: 30 * REWARD_SCALE, stat: "bombs" },
  { id: "maps", label: "Visitar 3 mapas", goal: 3, reward: 60 * REWARD_SCALE, stat: "maps" },
] as const;
export function missionProgress(m: (typeof MISSIONS)[number]): number {
  ensureDay();
  return m.stat === "maps" ? store.daily.maps.length : store.daily[m.stat];
}
export const missionClaimed = (id: string) => { ensureDay(); return store.daily.claimed.includes(id); };
export function claimMission(id: string): boolean {
  const m = MISSIONS.find((x) => x.id === id);
  if (!m || missionClaimed(id) || missionProgress(m) < m.goal) return false;
  store.daily.claimed.push(id);
  credit(m.reward);
  persist();
  return true;
}

export function refillAll() {
  store.collection.forEach((h) => (h.stamina = h.maxStamina));
}


/** Recompensa por derrotar um inimigo (bonus fora do fluxo de baus: nao soma em store.chests/missoes). */
export function addEnemyReward(value: number, h: HeroData) {
  credit(value);
  h.xp += Math.round(3 + (Number.isFinite(value) && value > 0 ? value : 0) * 0.02);
  while (h.level < MAX_LEVEL && h.xp >= xpNeed(h.level)) { h.xp -= xpNeed(h.level); h.level++; applyStats(h); }
  persist();
}

// ---- atalhos de teste: so existem no `npm run dev` (o Vite remove isto do build de producao) ----
if ((import.meta as any).env?.DEV) {
  (window as any).dev = {
    addCoins: (n: number) => { store.pending = r2(store.pending + n); persist(); },
    setCoins: (n: number) => { store.pending = r2(n); persist(); },
  };
}
