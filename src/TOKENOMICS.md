# Tokenomics do $ASG — Rascunho v0.1

> **Status:** rascunho para discussão. Os números são uma proposta e devem ser ajustados antes de qualquer emissão.
> Não é oferta de investimento. Revisar com advogado especializado antes de distribuir o token.

## 1. Papel do $ASG
Token de **utilidade e governança** do AI Studios Games. Ele **não** paga rendimento (sem APR/APY).
Usos: benefícios nos jogos, votação consultiva e elegibilidade para airdrops.

Fora do $ASG: **$BOMBERSI** continua sendo a moeda interna do Bomber.Idle (veja `docs/GLOSSARIO.md`).

## 2. Parâmetros do token
| Item | Proposta |
|---|---|
| Rede | Solana (SPL Token) |
| Supply total | 1.000.000.000 $ASG, fixo |
| Decimais | 9 |
| Mint authority | **Revogada** após mintar todo o supply |
| Freeze authority | Nenhuma (não criada ou revogada) |
| Metadata | Metaplex Token Metadata, com `update authority` no multisig do estúdio |
| Carteiras de tesouraria | **Multisig** (ex.: Squads), nunca carteira única |

## 3. Distribuição
| Fatia | % | Tokens | Regra |
|---|---|---|---|
| Comunidade, airdrops e benefícios de stake | 30% | 300.000.000 | Liberação gradual por 4 anos, em lotes por temporada |
| Ecossistema dos jogos (eventos, recompensas) | 20% | 200.000.000 | Multisig, liberação gradual por 3 anos |
| Tesouraria do estúdio (desenvolvimento, parcerias) | 20% | 200.000.000 | Vesting linear de 24 meses |
| Equipe | 15% | 150.000.000 | Cliff de 12 meses + vesting linear de 36 meses |
| Liquidez inicial (DEX) | 10% | 100.000.000 | LP tokens bloqueados por no mínimo 12 meses |
| Reserva | 5% | 50.000.000 | Multisig, uso aprovado em votação |

Todos os vestings devem ser on-chain e verificáveis (contrato de vesting/lock), e não promessa.

## 4. Stake (sem retorno em %)
O usuário trava $ASG por um prazo e recebe **benefícios**, e não juros.

| Nível | Mínimo travado (ajustar) | Benefícios (exemplos) |
|---|---|---|
| Bronze | 10.000 | Acesso antecipado a testes, cargo na comunidade |
| Prata | 100.000 | Bronze + cosméticos exclusivos, 1 slot extra no Bomber.Idle |
| Ouro | 1.000.000 | Prata + boost de stamina/velocidade, direito de propor votações |

| Prazo de trava | Multiplicador de voto |
|---|---|
| 30 dias | 1,0x |
| 90 dias | 1,5x |
| 180 dias | 2,0x |

Regras:
- Sem saque antecipado (mais simples e mais fácil de auditar). O saque libera na data final.
- Os benefícios valem enquanto o $ASG estiver travado.
- Os limites de cada nível são provisórios e dependem do preço e da distribuição reais.

## 5. Votação
- Peso do voto = quantidade travada × multiplicador, com **snapshot** no início de cada votação.
- Votações **consultivas**: a comunidade escolhe prioridades (próximo update, personagem, evento). O estúdio mantém a decisão final e se compromete a explicar quando não seguir o resultado.
- Votação off-chain com assinatura de mensagem da carteira (sem custo de gás). Migrar para governança on-chain só se houver necessidade.
- Quem propõe: nível Ouro ou o multisig do estúdio. Quórum mínimo a definir.

## 6. Airdrops
- Base: snapshot de quem tem $ASG travado, com mínimo de dias travados para evitar farm de última hora.
- Prioridade para **itens de jogo, NFTs e cosméticos**. Evitar airdrops de tokens negociáveis apresentados como "ganho por travar".
- Distribuição por Merkle distributor (uma transação do estúdio, cada usuário faz o claim).
- Regras e datas publicadas antes do snapshot.

## 7. Como lançar o token (decisão)
**Plano:** criar o token por conta própria e listar na **Raydium** com liquidez do estúdio. Não usar pump.fun e não usar bonding curve.

1. Testar tudo em **devnet** com um token de teste.
2. Criar o SPL token, mintar o supply total para o multisig e **revogar a mint authority**.
3. Mover as fatias para os contratos de vesting/lock conforme a seção 3.
4. Criar o pool na Raydium (CPMM) com os 10% de liquidez + SOL/USDC, e **bloquear os LP tokens**.
5. Publicar endereço do mint, endereços dos locks e do multisig no site.

Por quê:
- Pump.fun e Raydium LaunchLab vendem o token ao público por bonding curve, com taxa de 1% por trade, e o supply fica na curva. Isso dificulta vesting de equipe e é o formato de **oferta pública** que mais aumenta o risco regulatório.
- Criar por conta própria custa pouco em SOL (rent + taxas), a taxa de criação do pool na Raydium é pequena (confirmar o valor atual no site da Raydium), e você controla a distribuição.
- LaunchLab só faria sentido se você quiser descoberta de preço pública, o que não é o caso agora.

## 8. Cronograma sugerido
1. Jogos estáveis e lançados em modo teste público.
2. Programa de stake e votação na devnet.
3. Auditoria do programa de stake e consulta jurídica.
4. Emissão do $ASG, pool na Raydium e abertura do stake na mainnet.

## 9. Pontos em aberto
- Preço/valor de referência e limites finais dos níveis.
- Quórum e regras de proposta.
- Calendário exato de liberação das fatias da comunidade.
- Enquadramento jurídico final (CVM / Lei 14.478) com advogado.
