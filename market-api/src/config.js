import {isAddress} from './lib/base58.js';

export class HttpError extends Error {
  constructor(status, code, message) { super(message || code); this.status = status; this.code = code; }
}

// Configuração central. Nada de produção é fixo no código: tudo vem do ambiente.
export function getConfig(env) {
  const network = env.SOLANA_NETWORK || 'devnet';
  if (!['devnet', 'mainnet-beta', 'testnet'].includes(network)) throw new HttpError(500, 'config', 'SOLANA_NETWORK inválida');
  const mint = (env.AI_STUDIO_TOKEN_MINT || '').trim();
  const treasury = (env.AI_STUDIO_TREASURY_WALLET || '').trim();
  const rpcUrls = [env.SOLANA_RPC_URL, env.SOLANA_RPC_FALLBACK_URL].map(s => (s || '').trim()).filter(Boolean);
  return {
    network, mint, treasury, rpcUrls,
    treasuryTokenAccountOverride: (env.AI_STUDIO_TREASURY_TOKEN_ACCOUNT || '').trim(),
    orderTtlSec: Math.max(60, Math.min(3600, parseInt(env.ORDER_TTL_SEC || '900', 10) || 900)),
    lateGraceSec: 24 * 3600,
    allowToken2022: env.ALLOW_TOKEN_2022 === '1',
    commitment: env.PAYMENT_COMMITMENT === 'confirmed' ? 'confirmed' : 'finalized',
    chain: network === 'mainnet-beta' ? 'solana:mainnet' : 'solana:' + network,
  };
}

// Exige o que o pagamento precisa; devolve erro claro em vez de seguir com valores inventados.
export function requirePaymentConfig(cfg) {
  const missing = [];
  if (!isAddress(cfg.mint)) missing.push('AI_STUDIO_TOKEN_MINT');
  if (!isAddress(cfg.treasury)) missing.push('AI_STUDIO_TREASURY_WALLET');
  if (!cfg.rpcUrls.length) missing.push('SOLANA_RPC_URL');
  if (missing.length) throw new HttpError(503, 'payments_not_configured', 'Pagamentos desativados: faltam ' + missing.join(', '));
  return cfg;
}

// Unidades brutas -> texto exato (sem ponto flutuante). 1500000, 6 -> "1.5"
export function formatUnits(raw, decimals) {
  const v = BigInt(raw), d = BigInt(10) ** BigInt(decimals);
  const whole = v / d, frac = (v % d).toString().padStart(decimals, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}
