# Fase G/H — Auditoria inicial (antes de qualquer alteração de código)

Data: 2026-10-31. Base: `ai-studios-games-repo_1.rar` (HEAD `c617070`, "fase F"). Nenhum arquivo de código foi modificado; só este documento foi criado.
Backup feito antes de tudo: `pre-fase-GH-20261031.tgz` (sem `node_modules` e `.git`).

## 1. Linha de base verificada (executado neste ambiente)

| Verificação | Resultado |
|---|---|
| `client`: `npm ci` + `npm test` | **120/120 testes passam** |
| `client`: `tsc --noEmit` | sem erros |
| `server`: `npm test` | **6/6 passam** |
| `server`: `tsc --noEmit` | sem erros |
| `client`: `VITE_BASE=/bomber-idle/ npm run build` | gera `index-CLf7-Z1a.js`, `index.browser.esm-B4F54SM5.js`, `phaser-CszcXVXQ.js` |
| Build x `public/bomber-idle/assets` | **os 3 JS são byte a byte idênticos** (publicado == código atual) |
| `git status` | só `src/art.ts` e `src/scenes/FarmScene.ts` modificados; `git diff -w` é vazio, ou seja, **apenas fim de linha (CRLF)**, nenhuma mudança real |

Os `node_modules` do .rar vieram do Windows (esbuild nativo) e não rodam no Linux; foram reinstalados com `npm ci` (não afeta o repositório, pois estão no `.gitignore`).

**Não foi possível verificar aqui:** compilação do programa Anchor (não há Rust/Solana/Anchor neste ambiente e os domínios de instalação não estão liberados), carteira Phantom, Devnet real, Vercel e Cloudflare reais. Nada disso será declarado como testado sem execução.

## 2. Mapa do repositório

- `client/` — código oficial do BomberIdle (Phaser 3 + TypeScript + Vite). Publicado por `scripts/publish-bomber.mjs` em `public/bomber-idle/`.
- `server/` — Express + `@solana/web3.js`: esqueleto de saque (`/player/:wallet`, `/claim`). **Não há indício de que esteja publicado em algum lugar.**
- `programs/bomber_idle/` — programa Anchor 0.30.1 (claim com vault, config, nonce).
- `wrangler.toml`, `migrations/`, `slither-idle/` — Worker Cloudflare + D1 do Slither.Idle (outro jogo; não será tocado).
- `src/`, `public/rpg*`, `public/world*` — outros jogos/portal (não tocar).

## 3. Problemas encontrados

### Críticos (bloqueiam recompensas on-chain)
1. **O servidor não conhece o jogo.** `server/src/game/farming.ts` simula o modelo antigo de "heróis e baús" (`Player.heroes`, `pending`). O jogo real (`client/src/state.ts`) usa operadores, cápsulas, mapas, missões e saldo `$BOMBERSI` guardados só em `localStorage`. Os dois saldos **não têm relação nenhuma**: o saldo que o jogador vê não é o que o `/claim` paga.
2. **Persistência em memória** (`server/src/store.ts`: `Map`; reiniciar o servidor perde tudo, inclusive `reserved`).
3. **Sybil**: toda carteira nova ganha um herói inicial (`getPlayer`), sem custo nem verificação.
4. **Stamina do servidor nunca recarrega**, então o farming do servidor para sozinho.
5. **A semente do sorteio usa `Date.now()`** (`now ^ …`): o resultado depende de quando o jogador consulta (`GET /player/:wallet` executa `settle`), logo é manipulável por tempo de chamada.
6. **Rate limit por IP em memória** (`Map`), válido só para 1 instância; sem limite por carteira.
7. **Sem idempotência**, sem registro de eventos econômicos, sem log de operações administrativas.

### Altos
8. **O cliente não verifica a rede.** `wallet.ts` usa `window.solana` e `signAndSendTransaction`, que envia na rede **selecionada na Phantom**. Não há checagem de Devnet, nem aviso de rede errada.
9. **Só Phantom via `window.solana`**; sem Wallet Standard (o `@wallet-standard/*` está no `package.json` da raiz, mas o client não usa).
10. **`API` padrão `http://localhost:3001`**: sem `.env.example`, sem separação dev/Alpha/produção.
11. **Botão "Recarregar stamina de todos (teste)" (`#refill`) está no HTML publicado** (`public/bomber-idle/index.html`) e funciona em produção: qualquer jogador enche a stamina. Hoje é inofensivo porque a economia é 100% local, mas **precisa ser removido/protegido antes de qualquer recompensa real** (só o `DEV` do Vite protege o atalho de teste em `state.ts`, não esse botão).
12. **Saldo inicial `START_BALANCE = 60000` e todo o `$BOMBERSI` são do cliente**: qualquer um pode editar o `localStorage`. Isso é aceitável para o jogo solo, **não** para pagar token.

### Programa Anchor (`lib.rs`)
13. `declare_id!("1111…1111")` (System Program) e `Anchor.toml` com o mesmo ID em `localnet` e `devnet`: **placeholder**. Precisa de keypair próprio (`anchor keys sync`).
14. `initialize` não valida `max_claim > 0`.
15. Administração com uma única chave `admin`, sem transferência em duas etapas e sem eventos nas mudanças de admin/autoridade/pausa/limite.
16. Sem limite diário on-chain (só `max_claim` por transação). Sem expiração própria da autorização do servidor (depende do blockhash ~60–90 s, o que é aceitável, mas deve ser documentado).
17. `user_claim` com `init_if_needed` (feature ligada): aceitável porque a PDA é derivada do `user`, mas o ideal é testar replay e reinicialização.
18. **Zero testes do programa** (`Anchor.toml` aponta `tests/**/*.ts`, que não existem para o BomberIdle).
19. Pontos positivos confirmados na leitura: `has_one = server_authority` e dupla assinatura (jogador + servidor), nonce estritamente crescente, vault e config como PDAs, checagem de mint e dono da conta de token, `overflow-checks = true`, pausa de emergência.

### Pontos fortes a preservar
- Salvamento com backup/recuperação/`eraseSave` (Fase F), 120 testes cobrindo isso e a economia local.
- `verifyClaimAuth` (assinatura de mensagem com janela de 2 min) e a reserva de saque (`reserved` + nonce on-chain) são um bom desenho de base.
- `publish-bomber.mjs` já valida base path, referências, marcadores do código e faz backup da versão publicada.

## 4. Infraestrutura: o que a hospedagem atual permite

- **Vercel** serve o site estático e funções serverless. **Funções serverless não mantêm conexões WebSocket**; Vercel não é lugar para o chat em tempo real nem para um `server/` Express persistente.
- **Cloudflare (Worker + D1)** já é usado no Slither, e a auditoria anterior já registrou que multiplayer exige **Durable Objects**. É o caminho que reaproveita conta, ferramentas (`wrangler`) e padrões (`ledger`, idempotência, `mutate()` atômico) já existentes.
- **Supabase** (Postgres + Realtime + Auth) é a alternativa: chat pronto, mas é um serviço novo para configurar, com políticas RLS a escrever e testar.

## 5. Decisão recomendada (precisa da sua confirmação, ver §7)

**Um Worker Cloudflare novo para o Alpha do BomberIdle** (`bomber-alpha-api`), separado do Worker do Slither:
- **D1** para jogadores, eventos econômicos (livro-caixa), mensagens, denúncias, bloqueios, auditoria administrativa.
- **Durable Object** para o chat (conexões WebSocket, presença, reconexão; mensagens gravadas no D1).
- **Autenticação por assinatura de mensagem** da carteira (nonce emitido pelo servidor, uso único), com sessão curta; administradores por lista de carteiras no ambiente do Worker, **checada no servidor em toda rota `/admin` e `/devtest`**.
- O `server/` Express atual fica como referência/legado do fluxo de claim; a montagem da transação de claim é portada para o Worker (já usa só `web3.js`/`tweetnacl`).

### Economia Alpha (resolve o bloqueador nº 1)
O jogo é idle, e a simulação roda no navegador (Phaser). Não dá para o servidor "reexecutar" o jogo sem reescrevê-lo, e isso violaria "não reconstruir o jogo". Proposta realista:
- O **saldo local `$BOMBERSI` continua sendo do jogo solo** e nunca vira token.
- O **servidor tem uma economia Alpha separada em TEST**, alimentada só por fontes que ele consegue validar: **missões/desafios com limites calculados pelo servidor a partir do tempo real e da progressão informada com teto**, com cota diária por carteira, idempotência e livro-caixa. O cliente informa *que* uma meta foi atingida; o servidor valida plausibilidade (teto por tempo/operadores) e **limita**, como já faz o Slither (`sus`, tetos), e documenta que isso **limita** fraude mas não a elimina (o gameplay roda no cliente).
- Saques de TEST só da economia do servidor, com revisão e pausa global.

## 6. Plano de execução (ordem do briefing)

1. **G0 (feito)**: auditoria, backup, linha de base.
2. **Bloqueadores** (sem depender de hospedagem): remover/proteger `#refill`, `.env.example` e configuração dev/Alpha/prod no cliente, verificação de rede Devnet na carteira, Wallet Standard.
3. **G1 DEVTEST**: painel só para admin, com autorização no servidor.
4. **G2 Solana**: ID do programa (`anchor keys sync` na sua máquina), testes Anchor, criação do mint TEST (script `spl-token` ou `@solana/spl-token`, rodado na sua máquina com sua chave, nunca no repositório), consulta de saldo, histórico.
5. **G3 economia/persistência** no Worker + D1 (+ testes com o `d1shim` que já existe em `tests/`).
6. **G4 chat** (Durable Object + D1), com limites, moderação e sanitização.
7. **G5/H1/H2/H3** por prioridade, depois **H4 testes** e **H5 publicação** via `publish-bomber.mjs`.

## 7. O que preciso de você

1. **Aprovar Cloudflare Worker + D1 + Durable Objects** para o Alpha (você tem conta Cloudflare ativa? O Slither já usa um D1 cujo `database_id` no `wrangler.toml` ainda é o placeholder `COLE_AQUI_O_ID…`), ou preferir Supabase.
2. **Carteira de administrador** (só o endereço público) para a lista de admins do DEVTEST.
3. **Mint TEST**: já existe algum na Devnet? Se sim, o endereço. Se não, ele deve ser criado na sua máquina (eu preparo o script e a documentação; não crio nem invento endereço).
4. **Rust/Solana/Anchor**: o programa só pode ser compilado/testado/implantado onde esse toolchain estiver instalado (sua máquina ou CI). Eu escrevo os testes e o fluxo, mas eles só serão dados como aprovados depois de executados.

## 8. Riscos já conhecidos

- O gameplay roda no cliente: qualquer economia on-chain terá apenas **limites e plausibilidade**, não prova de gameplay.
- Alpha em Devnet: tokens TEST sem valor; mesmo assim o cliente deve recusar rede diferente de Devnet.
- Nada aqui foi testado com Phantom, Devnet, Vercel ou Cloudflare reais.

---

## 9. Decisões confirmadas (2026-10-31)

| # | Decisão | Consequência |
|---|---|---|
| 1 | **Cloudflare Worker + D1 + Durable Objects** para o Alpha | Novo Worker em `alpha-api/`, separado do Worker do Slither (`wrangler.toml` da raiz não foi tocado). |
| 2 | **Carteira admin do DEVTEST:** `J1Py7edvZwQjwvkGvcAVr4VyAG3JGxR6W178gi4DfWUb` (chave pública, não é segredo) | Em `alpha-api/wrangler.toml` (`ADMIN_WALLETS`). Validada: decodifica para 32 bytes. Verificada no servidor em toda rota `/devtest`. |
| 3 | **Não existe mint TEST na Devnet** | Nenhum endereço foi inventado. O mint será criado por `alpha-api/scripts/create-test-mint.mjs`, rodado na sua máquina. |
| 4 | **Anchor:** você roda build e testes na sua máquina | Testes do programa ainda não escritos (próxima etapa). Só serão dados como aprovados após execução. |

## 10. O que foi implementado nesta etapa (G1 parte 1)

**Cliente (`client/`)**
- `src/env-rules.ts` e `src/env-config.ts`: ambientes `dev` (DEVTEST), `alpha` e `prod`, definidos por `VITE_ENV`. Valor desconhecido = erro (não existe "ambiente padrão" silencioso para Alpha).
- Rede travada em **Devnet** por verificação do **genesis hash**: `assertDevnetGenesis` recusa Mainnet e qualquer outra rede. A função `assertRpcIsDevnet` ainda não é chamada pela carteira (próxima etapa).
- Botão `#refill` ("Recarregar stamina (teste)") agora começa **oculto** no HTML e só aparece em `dev`. Em `alpha` e `prod` ele é removido do DOM. Isso não altera a economia local.
- Selo visível `DEVTEST` ou `ALPHA · DEVNET` (vazio em produção).
- `client/.env.example` (o `.gitignore` já libera esse arquivo).
- 5 testes novos (`test/env-rules.test.ts`). Total do cliente: **125/125**.

**Worker do Alpha (`alpha-api/`)**
- Login por **assinatura Ed25519** da carteira: o servidor gera o nonce, guarda a mensagem (o cliente não escolhe o texto assinado), e o nonce é consumido de forma atômica (sem replay e sem corrida).
- Sessões de 12 h, guardadas **só como hash SHA-256** do token.
- Limite de taxa no D1 (10 desafios/min por IP, 5/min por carteira).
- CORS restrito a `ALLOW_ORIGIN`.
- `/devtest/status`: retorna 404 em `prod`, 401 sem sessão válida, 403 para quem não está na lista de admins, 200 para o admin. Cada acesso vai para `audit_log`.
- `/health`: ambiente, rede e versão, sem expor segredos.
- `migrations/0001_init.sql`: `nonces`, `sessions`, `rate_limits`, `audit_log`.
- **19 testes**, usando chaves Ed25519 reais. Testei a eficácia dos testes quebrando o código de propósito em 3 pontos (consumo do nonce, checagem de admin, bloqueio em produção): os 3 foram detectados e o código foi restaurado.
- `wrangler deploy --dry-run` gerou o bundle sem erros. **Nada foi enviado à Cloudflare.**

**Script do token TEST (`alpha-api/scripts/create-test-mint.mjs`)**
- Só roda com `TEST_MINT_KEYPAIR` apontando para um arquivo **fora do repositório**. Recusa RPC que não seja Devnet. Nunca imprime nem grava a chave; grava só o endereço público em `docs/TEST-MINT.json`.
- **Não foi executado** (sem acesso à Devnet deste ambiente).
- Escolhas que você pode mudar: **6 decimais** (coerente com o comentário do programa) e **sem autoridade de congelamento**.

## 11. Estado honesto

| Item | Estado |
|---|---|
| Testes do cliente / Worker / server | Passando (125 / 19 / 6) |
| Build alpha (`VITE_ENV=alpha`) | Gera sem erros; `#refill` oculto no HTML |
| Publicação em `public/bomber-idle/` | **Não feita** (será feita na H5) |
| Worker na Cloudflare | **Não implantado**; `database_id` ainda é o placeholder |
| Mint TEST | **Não criado** (script pronto, não executado) |
| Programa Anchor | **Não compilado, não testado, sem ID próprio** (pendente, você executa na sua máquina) |
| Carteira Phantom e verificação de rede na carteira | **Não implementado nem testado** (próxima etapa) |
| Chat, economia Alpha, perfil, ranking, eventos, feedback | Não iniciados |

Arquivos já modificados no .rar antes desta etapa (`src/art.ts`, `src/scenes/FarmScene.ts`) continuam sem alteração; a diferença era só de fim de linha (CRLF) e não foi incluída nos commits.

## 12. Próximos passos (ordem)

1. Criar o D1 `bomber-alpha` na Cloudflare e colar o `database_id` no `wrangler.toml`; aplicar `migrations/0001_init.sql`; `wrangler secret` não é necessário ainda.
2. Você roda `create-test-mint.mjs --dry-run` e depois sem `--dry-run`; me envie o endereço público (ele vai para `docs/TEST-MINT.json`).
3. Carteira Phantom: conectar, checar a rede com `assertRpcIsDevnet`, login por assinatura no cliente, tela DEVTEST.
4. Economia Alpha no Worker (D1 + livro-caixa), chat no Durable Object, testes E2E.
5. Programa Anchor: `anchor keys sync` na sua máquina, testes em `tests/` e validação de `max_claim`.
