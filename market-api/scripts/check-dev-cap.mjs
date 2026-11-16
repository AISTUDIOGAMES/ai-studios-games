// Verificação SOMENTE LEITURA do teto de 3% do supply para a carteira do desenvolvedor (não move fundos, não usa chaves).
// Uso: SOLANA_RPC_URL=... AI_STUDIO_TOKEN_MINT=... DEV_WALLET=... node scripts/check-dev-cap.mjs
export async function checkDevCap({rpcUrl, mint, devWallet, capBps = 300, fetchFn = fetch}) {
  const call = async (method, params) => { const r = await fetchFn(rpcUrl, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params})});
    const j = await r.json(); if (j.error) throw new Error(method + ': ' + j.error.message); return j.result; };
  const supply = BigInt((await call('getTokenSupply', [mint])).value.amount);
  const accts = (await call('getTokenAccountsByOwner', [devWallet, {mint}, {encoding: 'jsonParsed'}])).value;
  const held = accts.reduce((s, a) => s + BigInt(a.account.data.parsed.info.tokenAmount.amount), 0n);
  const bps = supply === 0n ? 0n : (held * 10000n) / supply;           // pontos-base, só inteiros
  return {supply: supply.toString(), held: held.toString(), percent: `${bps / 100n}.${String(bps % 100n).padStart(2, '0')}`, ok: bps <= BigInt(capBps)};
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const {SOLANA_RPC_URL: rpcUrl, AI_STUDIO_TOKEN_MINT: mint, DEV_WALLET: devWallet} = process.env;
  if (!rpcUrl || !mint || !devWallet) { console.error('Defina SOLANA_RPC_URL, AI_STUDIO_TOKEN_MINT e DEV_WALLET'); process.exit(2); }
  const r = await checkDevCap({rpcUrl, mint, devWallet}); console.log(r); process.exit(r.ok ? 0 : 1);
}
