# Marketplace global — Fases 2 e 3 (carteira + motor de pagamento)

Novo, aditivo: `market-api/` (Cloudflare Worker + D1) e `public/shared/aisg-wallet.js`. **Nenhum arquivo existente foi alterado.**
Jogos, saves, Slither, Bomber e Gridbreakers seguem exatamente como estão (o P2E atual não foi tocado).

## Como a compra funciona
1. Jogador conecta (Wallet Standard: Phantom, Solflare e outras) e assina uma mensagem de login (sem custo, sem pagamento).
2. `POST /v1/orders`: o servidor lê o preço **do banco**, confere o saldo, e devolve uma transação **sem assinatura** (TransferChecked + Memo `aisg:order:<id>`).
3. A carteira mostra a transação e o jogador autoriza (ou recusa).
4. `POST /v1/payments/verify`: o servidor busca a transação na Solana e confere: sucesso, assinante = jogador, mint, conta destino (tesouraria), valor bruto exato, memo do pedido, saldo real da tesouraria, janela de tempo.
5. Em uma única transação de banco: grava pagamento (assinatura UNIQUE), marca o pedido pago e cria o item (UNIQUE por compra) + auditoria.

## Rotas (`/v1`)
`GET /health` · `POST /wallet/challenge` · `POST /wallet/verify` · `GET /marketplace` · `GET /marketplace/:id` · `POST /orders` · `GET /orders/:id` · `POST /payments/verify` · `GET /inventory` · `GET /inventory/:gameId` · `GET /transactions`.
Preço sempre em unidades brutas (`price_raw`, texto) + `amount_display` calculado com os decimais reais do mint. Itens com `game_id = ecosystem` valem em qualquer jogo.

## Instalação e teste local
```
cd market-api && npm install
npm test                       # 30 testes (RPC simulado; Node 22+)
npx wrangler d1 create aisg-market      # cole o database_id no wrangler.toml
npx wrangler d1 migrations apply aisg-market --remote
npx wrangler secret put SESSION_SECRET  # e SOLANA_RPC_URL, SOLANA_RPC_FALLBACK_URL
```
## Devnet (antes de qualquer mainnet)
1. Use um mint de teste na devnet e uma tesouraria de devnet **com a conta do token criada** (`spl-token create-account`).
2. Preencha `AI_STUDIO_TOKEN_MINT`, `AI_STUDIO_TREASURY_WALLET` (e, de preferência, `AI_STUDIO_TREASURY_TOKEN_ACCOUNT`) em `wrangler.toml`.
3. Insira um produto de teste (a Fase 7 traz o painel; por ora, SQL com `price_raw` e o **mesmo** `token_mint`) e rode `wrangler deploy`.
4. Na página: `AISGWallet.configure({api:'https://<worker>'})`, conectar, `AISGWallet.buy('<id>', console.log)`.
Nunca faça compra real na mainnet sem sua autorização.

## Segurança (o que está garantido e por quê)
- Preço, mint e destino vêm do servidor; o cliente só escolhe o produto.
- Uma assinatura só serve uma vez (UNIQUE) e um pedido só tem um pagamento (UNIQUE); entrega UNIQUE por compra → sem entrega dupla, mesmo com requisições simultâneas.
- Memo único por pedido amarra a transação ao pedido; transação anterior ao pedido é recusada.
- Pagamento depois do prazo → `review` (sem reembolso automático; fluxo de reembolso fica separado e documentado à parte).
- Nonce de login de uso único, consumido de forma atômica; sessão HMAC de 1 h; rate limit em D1; auditoria append-only (triggers).
- RPC com fallback e tempo limite; credenciais nunca aparecem em respostas/logs. Token-2022 desligado por padrão e extensões perigosas sempre recusadas.

## Limites conhecidos (honestidade)
- **Tudo foi testado com Solana simulada** (RPC falso, D1 simulado em SQLite). Não houve teste contra a devnet real, Phantom real nem Cloudflare real (sem rede/credenciais aqui). Pontos a confirmar na devnet: formato `jsonParsed` do memo, instruções extras que a carteira adiciona (a verificação tolera extras, mas só com teste real se prova) e os nomes de features da sua carteira.
- A suíte comprova a lógica; a garantia contra corrida em produção vem das restrições UNIQUE do D1, não do simulador.
- Falta: UI do marketplace (Fase 4), integração por jogo (Fase 6, cada jogo precisa de um adaptador; Gridbreakers guarda tudo no navegador), painel admin (Fase 7), reconciliação por cron de pedidos pendentes.
- Pendências suas: mint, tesouraria, RPC, produtos/preços; decisão sobre o P2E vs. "sem recompensas automáticas"; alinhar `docs/TOKENOMICS.md` (fala de governança/staking).

## Atualização (decisões do dono)
- **Token do marketplace = $ASG** (pump.fun). O play-to-earn **não está autorizado**; quando for, pagará em um token separado por jogo e não passa pelo marketplace.
- Mint e tesouraria já estão em `wrangler.toml` (valores públicos). Atenção: são da **mainnet**; para testar na devnet use um mint de teste. A API revalida o mint on-chain (decimais, programa, extensões).
- **O mint do $ASG é Token-2022** (extensões `metadataPointer` e `tokenMetadata`, vistas no Solscan). Por isso `ALLOW_TOKEN_2022 = "1"`. Extensões que alteram valor/poder (taxa, hook, delegado permanente, pausa etc.) continuam bloqueadas, e testes cobrem os dois cenários.
- A tesouraria precisa ter a **conta de token do $ASG** criada (Token-2022) antes da primeira compra; senão a API responde `treasury_token_account_missing`.
- `scripts/check-dev-cap.mjs`: confere, só leitura, se a carteira do dev tem no máximo 3% do supply (limite: só enxerga a carteira informada, não outras que o dev controle).
