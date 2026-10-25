// Paga os saques da DEVNET automaticamente, repetindo a cada INTERVAL segundos (padrão 60). Substitui o passo manual
// "node payout.mjs --send --confirm=<TOTAL>": este script lê o total da fila e chama o payout.mjs com esse total exato.
// Todas as travas do payout.mjs continuam valendo (MAX_RUN, reserva anti-pagamento-duplo, parar se houver "processing").
// SÓ DEVNET: recusa qualquer RPC que não pareça devnet/testnet/localhost. Para mainnet, continue usando o payout.mjs na mão.
// Variáveis: API, ADMIN_KEY, MINT, KEYPAIR (as mesmas do payout.mjs), RPC (padrão: devnet), INTERVAL (segundos, mín. 10).
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {DEVNET_RPC, isMainnetRpc, sum} from './lib/payout-guard.mjs';

const {API, ADMIN_KEY, RPC = DEVNET_RPC} = process.env;
const EVERY = Math.max(10, Number(process.env.INTERVAL ?? 60)) * 1000;
const SCRIPT = process.env.PAYOUT_SCRIPT || fileURLToPath(new URL('./payout.mjs', import.meta.url));
const log = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), ...a);

if (!API || !ADMIN_KEY) { console.error('Defina API e ADMIN_KEY (e MINT e KEYPAIR, usados pelo payout.mjs).'); process.exit(1); }
if (isMainnetRpc(RPC)) { console.error(`Recusado: RPC "${RPC}" não parece devnet. O envio automático é só para testes. Em mainnet use o payout.mjs manualmente.`); process.exit(1); }

const runPayout = args => new Promise(done => spawn(process.execPath, [SCRIPT, ...args], {stdio: 'inherit', env: process.env}).on('close', done));

async function tick() {
  let q;
  try { q = await (await fetch(API + '/admin/queue', {headers: {'X-Admin-Key': ADMIN_KEY}})).json(); }
  catch (e) { return log('falha ao ler a fila:', e.message); }
  if (!q.withdrawals) return log('resposta inesperada da API (ADMIN_KEY correta?)');
  if (q.processing && q.processing.length) return log(`${q.processing.length} saque(s) em "processing": confira on-chain e resolva (admin/done ou admin/failed). Pausado.`);
  if (!q.withdrawals.length && !(q.burnPending >= 1)) return;   // nada a fazer
  const total = sum(q.withdrawals);
  log(`enviando ${q.withdrawals.length} saque(s), total ${total}`);
  const code = await runPayout(['--send', `--confirm=${total}`]);
  if (code) log(`payout.mjs terminou com código ${code}; tento de novo no próximo ciclo`);
}

log(`Pagamento automático (devnet) ligado. RPC: ${RPC} | a cada ${EVERY / 1000}s | Ctrl+C para parar`);
for (;;) { await tick(); await new Promise(r => setTimeout(r, EVERY)); }
