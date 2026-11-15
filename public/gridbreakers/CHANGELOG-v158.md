# OWL GRIDBREAKERS v1.5.8

## Loot na arena
- Diamantes, Soul, Ouro, Relics, Keys e Forge agora aparecem agrupados no canto superior esquerdo do campo de batalha, com valores compactos e valores exatos em tooltip.

## Ancient Tower sem fim
- A torre avança automaticamente para o próximo andar após cada vitória.
- Não há cura, recuperação de escudo ou revives entre os andares; HP, escudos, energia e personagens caídos são preservados.
- A expedição termina somente quando toda a Party é derrotada.
- A partir do andar 97, a dificuldade continua escalando: +3,5% HP, +2,2% ATK e +1,2% DEF por andar acima do 96.
- O progresso de melhor andar continua sendo salvo pelo save existente.
- Ao final, o resumo da expedição informa andares concluídos, andar alcançado e loot obtido.

## Characters e equipamentos
- Personagens bloqueados não recebem pulsos, brilho animado ou transições de raridade; ao serem recrutados, voltam ao visual animado correspondente à raridade.
- Equipamentos Ancestral (r7) voltam a exibir animação de brilho e passagem de luz.

## Balanceamento de crítico
- A taxa base de crítico dos heróis foi reduzida em 20%.
- O crítico adicional dos equipamentos usa retornos decrescentes, limitado a +10 pontos percentuais.
- A chance total de crítico dos heróis tem teto de 35%.
- O bônus do Thread Lens e o bônus de raridade continuam considerados.
- O cálculo de POWER, as telas de comparação e os oponentes da Arena usam a nova taxa efetiva.

## Compatibilidade
- Save existente preservado (`awo_save_v1`); nenhuma migração destrutiva.
- As regras de recuperação das demais modalidades não foram alteradas.
