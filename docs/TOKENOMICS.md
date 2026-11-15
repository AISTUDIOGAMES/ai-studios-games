# Tokenomics

## Token da comunidade (ao vivo na pump.fun)
- Rede: Solana
- CA: `2t9TvrU2LF45xLGPZ9aTVzmkYg2kcdkcyvnUd18kpump`
- Supply fixo: 1.000.000.000
- Lancamento justo (fair launch): sem presale, sem alocacao de time, sem vesting.
- Distribuicao padrao pump.fun: ~79,3% na bonding curve, ~20,7% reservado para a liquidez na graduacao.
- Ao completar a curva, a pump.fun migra a liquidez para um pool PumpSwap e queima os LP tokens.
- Edite simbolo, nome e % de dev buy em `src/config.ts`.

## Moeda do jogo ($BOMBERSI)
Meta: emissao controlada + sumidouros (sinks) maiores ou iguais a emissao no longo prazo.

### Fontes (emissao)
- Baus abertos no farming (limitado por stamina e por heroi).
- Pool do ranking (renovado a cada periodo).

### Sumidouros (sinks)
- Compra de Capsulas de Recruta e upgrade de operadores (em $BOMBERSI).
- Alojamentos, Droide Zelador e recarga de stamina.
- Taxa de marketplace (parte queimada).

### Regras
- `max_claim` on-chain limita saques por transacao.
- Orcamento diario de emissao definido no servidor.
- Limite de operadores ativos por carteira (anti multi-conta).
