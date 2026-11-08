-- Saldo do jogo no servidor. Fonte da verdade: o ledger. balances pode ser recalculado a partir de ledger.
CREATE TABLE IF NOT EXISTS balances (
  wallet TEXT PRIMARY KEY,
  units INTEGER NOT NULL DEFAULT 0 CHECK (units >= 0),
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT NOT NULL,
  delta_units INTEGER NOT NULL,
  reason TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON ledger(wallet);
