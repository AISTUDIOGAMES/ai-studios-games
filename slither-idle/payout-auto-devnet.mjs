// Paga os saques da DEVNET automaticamente, repetindo a cada INTERVAL segundos (padrão 60). Substitui o passo manual
// "node payout.mjs --send --confirm=<TOTAL>": este script lê o total da fila e chama o payout.mjs com esse total exato.
// Todas as travas do payout.mjs continuam valendo (MAX_RUN, reserva anti-pagamento-duplo, parar se houver "processing").
// SÓ DEVNET: recusa qualquer RPC que não pareça devnet/testnet/localhost. Para mainnet, continue usando o payout.mjs na mão.
// Variáveis: API, ADMIN_KEY, MINT, KEYPAIR (as mesmas do payout.mjs), RPC (padrão: devnet), INTERVAL (segundos, mín. 10),
//            AUTO_APPROVE=1 (opcional, só devnet): aprova sozinho os saques retidos em "review" (conta com suspeita alta).
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DEVNET_RPC, isMainnetRpc, sum} from './lib/payout-guard.mjs';

const {API, ADMIN_KEY, RPC = DEVNET_RPC} = process.env;
const EVERY = Math.max(10, Number(process.env.INTERVAL ?? 60)) * 1000;
const AUTO_APPROVE = process.env.AUTO_APPROVE === '1';
const SCRIPT = process.env.PAYOUT_SCRIPT || fileURLToPath(new URL('./payout.mjs', import.meta.url));
const log = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), ...a);

if (!API || !ADMIN_KEY) { console.error('Defina API e ADMIN_KEY (e MINT e KEYPAIR, usados pelo payout.mjs).'); process.exit(1); }
if (isMainnetRpc(RPC)) { console.error(`Recusado: RPC "${RPC}" não parece devnet. O envio automático é só para testes. Em mainnet use o payout.mjs manualmente.`); process.exit(1); }

const H = {'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY};
const getQueue = async () => (await fetch(API + '/admin/queue', {headers: H})).json();
const approve = async id => (await fetch(API + '/admin/approve', {method: 'POST', headers: H, body: JSON.stringify({id})})).ok;
const runPayout = args => new Promise(done => spawn(process.execPath, [SCRIPT, ...args], {stdio: 'inherit', env: process.env}).on('close', done));

let lastReview = -1, lastIdle = 0;
async function tick() {
  let q;
  try { q = await getQueue(); } catch (e) { return log('falha ao ler a fila:', e.message); }
  if (!q.withdrawals) return log('resposta inesperada da API (ADMIN_KEY correta?)');

  const review = q.review || [];
  if (review.length && AUTO_APPROVE) {
    for (const r of review) log(`aprovando saque ${r.id} (${r.amount}) retido em revisão: ${await approve(r.id) ? 'ok' : 'falhou'}`);
    try { q = await getQueue(); } catch (e) { return log('falha ao reler a fila:', e.message); }
  } else if (review.length !== lastReview) {
    if (review.length) log(`${review.length} saque(s) em REVISÃO (ids: ${review.map(r => r.id).join(', ')}): o script não paga esses. Aprove com /admin/approve ou rode com AUTO_APPROVE=1 (só devnet).`);
    lastReview = review.length;
  }

  if (q.processing && q.processing.length) return log(`${q.processing.length} saque(s) em "processing": confira on-chain e resolva (admin/done ou admin/failed). Pausado.`);
  if (!q.withdrawals.length && !(q.burnPending >= 1)) {
    if (Date.now() - lastIdle > 300000) { lastIdle = Date.now(); log(review.length ? 'nada pendente para pagar (há saques em revisão, veja acima).' : 'fila vazia, tudo em dia.'); }
    return;
  }
  const total = sum(q.withdrawals);
  log(`enviando ${q.withdrawals.length} saque(s), total ${total}`);
  const code = await runPayout(['--send', `--confirm=${total}`]);
  if (code) log(`payout.mjs terminou com código ${code}; tento de novo no próximo ciclo`);
}

log(`Pagamento automático (devnet) ligado. RPC: ${RPC} | a cada ${EVERY / 1000}s | revisão automática: ${AUTO_APPROVE ? 'SIM' : 'não'} | Ctrl+C para parar`);
for (;;) { await tick(); await new Promise(r => setTimeout(r, EVERY)); }
