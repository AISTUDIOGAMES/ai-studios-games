-- Fila de saques do BOMBERI (devnet/alpha).
-- amount_units: quantidade em unidades de 1/10000 do token (4 casas), evitando ponto flutuante.
-- idempotency_key: único; impede o mesmo saque ser criado duas vezes (ex.: retry do cliente).
-- status: pending (na fila) -> review (retido) -> processing (reservado para envio) -> done | failed
--   "processing" nunca volta sozinho para a fila: quem resolve é o operador, conferindo on-chain.

CREATE TABLE IF NOT EXISTS withdrawals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wallet TEXT NOT NULL,
  amount_units INTEGER NOT NULL CHECK (amount_units > 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'review', 'processing', 'done', 'failed')),
  idempotency_key TEXT NOT NULL UNIQUE,
  sig TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Queimas de tokens da tesouraria. sig única impede registrar a mesma queima duas vezes.
CREATE TABLE IF NOT EXISTS burns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount_units INTEGER NOT NULL CHECK (amount_units > 0),
  sig TEXT NOT NULL UNIQUE,
  at INTEGER NOT NULL
);
