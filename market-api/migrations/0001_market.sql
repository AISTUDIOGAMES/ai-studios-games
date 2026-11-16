-- Marketplace global AI STUDIO GAMES. Migração aditiva (não altera nenhuma tabela dos jogos).
-- Valores em unidades brutas do token ficam em TEXT (inteiro decimal) e são comparados com BigInt: nunca ponto flutuante.
CREATE TABLE IF NOT EXISTS mk_users(
  id INTEGER PRIMARY KEY AUTOINCREMENT, wallet_address TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL, last_login INTEGER);

CREATE TABLE IF NOT EXISTS mk_games(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','soon','disabled')));
-- game_id 'ecosystem' = item valido em todos os jogos
INSERT OR IGNORE INTO mk_games(id, name, slug, status) VALUES('ecosystem','Ecosystem','ecosystem','active');

CREATE TABLE IF NOT EXISTS mk_products(
  id TEXT PRIMARY KEY, game_id TEXT NOT NULL REFERENCES mk_games(id),
  name TEXT NOT NULL, description TEXT DEFAULT '', category TEXT NOT NULL,
  price_raw TEXT NOT NULL CHECK(price_raw GLOB '[0-9]*' AND price_raw NOT GLOB '*[^0-9]*'),
  token_mint TEXT NOT NULL, rarity TEXT DEFAULT 'common',
  kind TEXT NOT NULL DEFAULT 'unique' CHECK(kind IN ('unique','consumable')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
  image_url TEXT, metadata TEXT DEFAULT '{}', compatible_games TEXT DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS ix_mk_products_game ON mk_products(game_id, active);
CREATE INDEX IF NOT EXISTS ix_mk_products_cat ON mk_products(category, active);

CREATE TABLE IF NOT EXISTS mk_orders(
  id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES mk_users(id),
  product_id TEXT NOT NULL REFERENCES mk_products(id), game_id TEXT NOT NULL,
  amount_raw TEXT NOT NULL, token_mint TEXT NOT NULL, decimals INTEGER NOT NULL,
  treasury_token_account TEXT NOT NULL, memo TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','paid','expired','cancelled','review')),
  expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS ix_mk_orders_user ON mk_orders(user_id, created_at);
CREATE INDEX IF NOT EXISTS ix_mk_orders_status ON mk_orders(status, expires_at);

-- Um pagamento verificado por pedido e uma assinatura só serve uma vez (anti-replay).
CREATE TABLE IF NOT EXISTS mk_payments(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL UNIQUE REFERENCES mk_orders(id),
  transaction_signature TEXT NOT NULL UNIQUE,
  sender_wallet TEXT NOT NULL, treasury_wallet TEXT NOT NULL, token_mint TEXT NOT NULL,
  amount_raw TEXT NOT NULL, verification_status TEXT NOT NULL DEFAULT 'verified',
  block_time INTEGER, verified_at INTEGER NOT NULL);

-- Tentativas de verificação que NÃO viraram pagamento (para inspeção/reconciliação).
CREATE TABLE IF NOT EXISTS mk_payment_attempts(
  id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT, transaction_signature TEXT,
  outcome TEXT NOT NULL, reason TEXT, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS ix_mk_attempts_order ON mk_payment_attempts(order_id);

-- Uma linha por compra (purchase_id = order_id, UNIQUE): entrega nunca duplica.
CREATE TABLE IF NOT EXISTS mk_inventory(
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES mk_users(id),
  product_id TEXT NOT NULL REFERENCES mk_products(id), game_id TEXT NOT NULL,
  purchase_id TEXT NOT NULL UNIQUE REFERENCES mk_orders(id),
  quantity INTEGER NOT NULL, metadata TEXT DEFAULT '{}', delivery_status TEXT NOT NULL DEFAULT 'delivered',
  acquired_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS ix_mk_inv_user ON mk_inventory(user_id, game_id);

CREATE TABLE IF NOT EXISTS mk_nonces(
  wallet TEXT NOT NULL, nonce TEXT NOT NULL, exp INTEGER NOT NULL, PRIMARY KEY(wallet, nonce));

-- Trilha de auditoria append-only: triggers bloqueiam UPDATE e DELETE.
CREATE TABLE IF NOT EXISTS mk_audit_logs(
  id INTEGER PRIMARY KEY AUTOINCREMENT, event_type TEXT NOT NULL, user_id INTEGER,
  reference_id TEXT, timestamp INTEGER NOT NULL, metadata TEXT DEFAULT '{}');
CREATE TRIGGER IF NOT EXISTS mk_audit_no_update BEFORE UPDATE ON mk_audit_logs BEGIN SELECT RAISE(ABORT,'audit log is append-only'); END;
CREATE TRIGGER IF NOT EXISTS mk_audit_no_delete BEFORE DELETE ON mk_audit_logs BEGIN SELECT RAISE(ABORT,'audit log is append-only'); END;

CREATE TABLE IF NOT EXISTS mk_rl(k TEXT NOT NULL, win INTEGER NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(k, win));
