export const GRIDBREAKERS_KNOWLEDGE = String.raw`
AI WORLD OWL — BASE DE CONHECIMENTO OFICIAL: OWL GRIDBREAKERS

IDENTIDADE E GÊNERO
GRIDBREAKERS é um idle auto-battler com batalha em arena 3D, desenvolvido com Three.js. O jogo possui campanha, formação de heróis, combate automático, invocação Gacha, equipamentos, dungeons e modos de progressão.

INTERFACE E SISTEMAS
As áreas documentadas incluem Battle, Characters, Bag, Map, Forge, Summon, Realm, Reports e Configurações.
O jogo possui modos de interface Auto, Desktop e Mobile. Também oferece configurações gráficas, áudio, tela cheia e presets de resolução para o buffer WebGL.

CAMPANHA
Cada estágio possui 33 ondas:
- Ondas 1 a 31: encontros normais.
- Onda 32: mini-chefe.
- Onda 33: chefe final.

Recompensas documentadas por encontro:
- Onda normal: 3 vezes o número do estágio em XP e 5 vezes em ouro.
- Mini-chefe: 6 vezes o estágio em XP e 15 vezes em ouro.
- Chefe final: 12 vezes o estágio em XP e 25 vezes em ouro.

Checkpoints: onda 10, onda 22 e após o mini-chefe na onda 32. Heróis derrotados podem retornar com 25% de HP nesses checkpoints.

DUNGEONS
Existem três expedições: Gold, Forge e Relic.
Cada tentativa dura até 10 minutos. O chefe final aparece aos 8 minutos e precisa ser derrotado antes do limite.
Ondas intermediárias avançam a expedição, mas não concedem recompensas de conclusão. A recompensa principal é liberada ao derrotar o chefe final.
O tempo esgotado ou a derrota de toda a equipe encerra a tentativa sem as recompensas de conclusão.

ANCIENT TOWER
É uma progressão contínua por andares. A dificuldade considera o nível médio da equipe, o POWER total da equipe incluindo equipamentos e o tamanho da formação ativa.
Não há cura ou revive entre os andares. A progressão termina quando toda a equipe é derrotada.

GACHA E PERSONAGENS
A sequência ativa de raridades de heróis documentada é:
Common → Uncommon → Rare → Mythic → Divine → Ancestral.

Taxas documentadas de invocação:
- Common: 52,2%.
- Uncommon: 28%.
- Rare: 15%.
- Mythic: 3,5%.
- Divine: 1%.
- Ancestral: 0,3%.

As garantias documentadas são 90 invocações para Divine e 200 para Ancestral.
Orion é o único herói Divine documentado. Aeon é o único herói Ancestral documentado.
Legendary tem taxa reservada de 0% no sistema atual de Gacha e está incorporado ao Mythic nesse sistema.

CHARACTER SUMMONER E ECHOES
Resultados duplicados de Gacha concedem um Echo da raridade obtida.
Oito Echoes da mesma raridade podem ser usados para invocar um herói aleatório da próxima raridade ativa.
A fusão consome apenas Echoes, não consome heróis, equipamentos, Soul Crystals ou Star upgrades.
Resultados duplicados da fusão podem conceder uma Star ou, quando o limite de Stars é atingido, 20 shards.

EQUIPAMENTOS
Existem três coleções documentadas, cada uma com seis peças:
Obsidian:
- Weapon: Obsidian Blade.
- Helmet: Crown of Obsidia.
- Armor: Obsidian Aegis.
- Gloves: Devourer's Grips.
- Boots: Shadow Striders.
- Relic: Obsidian Core.

Lunar:
- Weapon: Lunar Arcblade.
- Helmet: Mooncrest Helm.
- Armor: Lunar Guardian Plate.
- Gloves: Moonlit Handguards.
- Boots: Lunar Treads.
- Relic: Lunar Sigil.

Thread:
- Weapon: Golden Thread Staff.
- Helmet: Ancient Owl Visor.
- Armor: Threadweaver Mantle.
- Gloves: Quantum Gloves.
- Boots: Void Walkers.
- Relic: Quantum Crystal.

Atributos principais por slot:
Weapon = ATK; Helmet = HP; Armor = DEF; Gloves = CRIT; Boots = SPD; Relic = ATK%.

RARIDADES DE EQUIPAMENTO
Common, Uncommon, Rare, Epic, Legendary, Mythic, Divine e Ancestral.
IMPORTANTE: Legendary existe na tabela de raridade e nas chances de drop de equipamentos, mesmo que sua taxa no Gacha de heróis seja 0%.

BÔNUS DOS SETS
Obsidian:
- 2 peças: +8% DEF.
- 4 peças: +14% DEF e +7% ATK.
- 6 peças: +24% DEF e +14% ATK.

Lunar:
- 2 peças: +8% HP.
- 4 peças: +14% HP e +6% DEF.
- 6 peças: +24% HP e +12% DEF.

Thread:
- 2 peças: +2% CRIT.
- 4 peças: +5% CRIT e +8% SPD.
- 6 peças: +8% CRIT, +16% SPD e +10% ATK.

Os bônus consideram peças equipadas. Apenas o maior patamar alcançado de cada coleção fica ativo.
O CRIT total possui limite absoluto de 30%.

PROGRESSO E SAVES
A chave principal de save da campanha é awo_save_v1 e os dados ficam no localStorage do navegador.
O endereço e a porta utilizados importam: mudar a origem pode fazer o save parecer indisponível. Recomende manter o mesmo endereço e porta.
As preferências gráficas usam a chave owl_gfx_v1, separada do progresso da campanha.
O histórico de relatórios de batalha usa awo_battle_report_history_v1.
O equipamento v1.6 documentado preserva IDs de itens, slots, raridades, enhancements e saves existentes, sem exigir reset ou migração.

COMBATE E HABILIDADES
O GRIDBREAKERS e um idle auto-battler com combate automatico. As habilidades ativas dos aliados podem ser acionadas automaticamente quando a opcao de habilidades automaticas esta habilitada e a recarga chega a zero. As ultimates dos aliados dependem da opcao de ultimates automaticas e ficam prontas quando a energia atinge 100.

Geracao de energia documentada no codigo de combate:
- Usar uma habilidade ativa concede 10 pontos de energia ao proprio heroi.
- Um ataque basico concede 6 pontos de energia ao atacante.
- Um heroi que recebe dano ganha 4 pontos de energia.
- A ultimate consome a energia acumulada e zera a barra.

Recargas e habilidades ativas dos herois:
- Lyra â€” Moonwall, recarga de 9 s: concede escudo a todos os aliados. O escudo usa como referencia 1,6 x ATK da Lyra + 10% do HP maximo dela.
- Jax â€” Eclipse Strike, recarga de 8 s: causa dano elevado a um inimigo, com multiplicador 3,2.
- Kira â€” Neural Rupture, recarga de 7 s: atinge o inimigo com menor HP, com multiplicador 1,8, e aplica stun por 2,5 s.
- Kai â€” Restoration Protocol, recarga de 8 s: cura todos os aliados. A cura usa 2,4 x ATK do Kai + 8% do HP maximo do aliado.
- Aeon â€” Code Storm, recarga de 9 s: causa dano a todos os inimigos, com multiplicador 0,9, e aplica stun por 1,5 s.
- Orion â€” Solar Aegis, recarga de 8 s: cura o aliado com menor proporcao de HP usando 4 x ATK de Orion e concede escudo aos aliados com referencia de 0,8 x ATK.
- Titan â€” Bulwark Slam, recarga de 9 s: atinge o primeiro inimigo, com multiplicador 1,6, aplica stun por 2 s e concede a Titan um escudo de referencia igual a 20% do HP maximo.
- Vex â€” Echo Execution, recarga de 8 s: atinge o inimigo com maior HP atual, com multiplicador 4.

Ultimates documentadas:
- Lyra â€” Lunar Sanctuary: concede escudo a todos os aliados, com referencia de 3 x ATK + 30% do HP maximo da Lyra, e cura 20% do HP maximo de cada aliado.
- Jax â€” Eclipse Annihilation: atinge todos os inimigos, com multiplicador 4,5.
- Kira â€” Total Blackout: atinge todos os inimigos, com multiplicador 3,2, e aplica stun por 3 s.
- Kai â€” Owl Protocol: cura todos os aliados em 55% do HP maximo de cada um; os aliados diferentes de Kai recebem mais 25 pontos de energia.
- Aeon â€” Quantum Destruction: atinge todos os inimigos, com multiplicador 5, e aplica stun por 2 s.
- Orion â€” Solar Judgement: atinge todos os inimigos, com multiplicador 3; cura todos os aliados em 40% do HP maximo e concede escudo com referencia minima de 2 x ATK de Orion.
- Titan â€” Obsidian Cataclysm: atinge todos os inimigos, com multiplicador 4, aplica stun por 2,5 s e concede a Titan escudo de referencia igual a 40% do HP maximo.
- Vex â€” Hex Collapse: atinge o inimigo com maior HP, com multiplicador 9, e os demais inimigos, com multiplicador 2,5.

Alvos e combate basico documentados:
- Aliados normalmente atacam o primeiro inimigo vivo; Kira prioriza o inimigo com menor HP.
- Inimigos priorizam alvos da linha de frente em aproximadamente 65% das escolhas de alvo.
- Os efeitos acima descrevem habilidades existentes; nao devem ser apresentados como novas mecanicas sem uma mudanca funcional claramente diferenciada.
REGRAS PARA RESPONDER
Use os fatos acima como informações confirmadas pela documentação consultada.
Não invente heróis, habilidades, itens, probabilidades, fórmulas ou funcionalidades.
Quando perguntarem sobre uma mecânica não descrita aqui, diga que ainda precisa consultar o código ou a documentação específica.
Diferencie sempre Gacha de heróis e drop de equipamentos.
Diferencie funcionalidades já implementadas de propostas de melhoria.
Pode ajudar Dev Owl a planejar balanceamento, criar conteúdo, revisar código e desenvolver novas mecânicas. Não diga que consegue controlar diretamente o jogo ou editar arquivos sem uma ferramenta real conectada.
A documentação consultada contém diferentes identificadores de versão, incluindo referências a v3.1, v3.7.1 e atualizações v1.6.x. Não declare uma única versão global atual sem verificar o manifesto ou a configuração de release.
`;