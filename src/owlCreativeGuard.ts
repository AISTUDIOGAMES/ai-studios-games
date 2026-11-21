import { GRIDBREAKERS_KNOWLEDGE } from "./owlKnowledge";

function normalize(value: string): string {
  return value.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Examina prioritariamente a parte operacional da proposta. */
function getFunctionalText(answer: string): string {
  const normalized = normalize(answer);
  const header = /(?:^|\n)\s*(?:funcionamento|como funciona|gameplay loop)\s*(?:[:\-â€“â€”]\s*)/i;
  const match = header.exec(normalized);

  let section = match
    ? normalized.slice(match.index + match[0].length)
    : normalized.slice(0, 1800);

  const end = section.search(
    /\n\s*(?:diferencial|novidade|impacto|balanceamento|risco|consideracoes|implementacao|observacao|distincao)\s*(?:[:\-â€“â€”]|\n)/i
  );
  if (end >= 0) section = section.slice(0, end);

  // Nao penaliza frases que apenas dizem que a proposta NAO usa um sistema.
  return section
    .split(/(?<=[.!?;])\s+|\n+/)
    .filter((sentence) =>
      !/\b(?:nao\s+(?:(?:deve|ira|vai)\s+)?(?:utiliza|usa|inclui|depende|repete|cria)|sem\s+(?:utilizar|usar|incluir|depender)|diferente\s+de|ao\s+contrario\s+de|em\s+vez\s+de|evita|dispensa)\b/.test(sentence)
    )
    .join(" ");
}

function getRequestedCount(question: string): number {
  const q = normalize(question);
  const words: Record<string, number> = {
    um: 1, uma: 1, dois: 2, duas: 2, tres: 3,
    quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8,
    nove: 9, dez: 10
  };
  const expression = /\b(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+(?:novas?\s+)?(?:ideias?|mecanicas?|propostas?)\b/g;
  const matches = [...q.matchAll(expression)];
  if (matches.length) {
    const last = matches[matches.length - 1][1];
    const count = Number(last);
    return Number.isFinite(count) && count > 0 ? count : (words[last] ?? 1);
  }
  return 1;
}

function getProposalHeadings(answer: string): string[] {
  const normalized = normalize(answer);
  const expression = /^\s*(?:#{1,6}\s*)?(?:[-*]\s*)?(?:(\d+)[.)]\s*)?(?:\*\*)?(?:ideia|mecanica|proposta)(?:\s+nova)?\s*(?:n[Âºo]\s*)?(\d+)?(?:\*\*)?\s*(?:[:\-â€“â€”]|$)/gim;
  return [...normalized.matchAll(expression)]
    .filter((match) => Boolean(match[1] || match[2]))
    .map((match) => match[0]);
}

export function validateCreativeAnswer(
  question: string,
  answer: string
): string | null {
  const q = normalize(question);
  const functionalText = getFunctionalText(answer);
  const requestedCount = getRequestedCount(question);
  const headings = getProposalHeadings(answer);

  // 1) Quantidade: sem numero explicito, o padrao solicitado e uma proposta.
  if (headings.length > 0 && headings.length !== requestedCount) {
    return `Foram solicitadas ${requestedCount} proposta(s), mas a resposta apresentou ${headings.length} titulo(s) de proposta.`;
  }
  if (requestedCount === 1 && /\b(?:segunda|terceira|quarta|outra)\s+(?:ideia|mecanica|proposta)\b/.test(normalize(answer))) {
    return "Foi solicitada uma unica proposta, mas a resposta indica uma ideia adicional.";
  }

  // 2) Sistemas que o usuario proibiu explicitamente.
  const hasExclusionIntent = /\b(?:nao\s+(?:use|utilize|inclua|quero)|evite|sem)\b/.test(q);
  if (hasExclusionIntent) {
    const excluded = [
      { question: /\bgacha\b/, answer: /\bgacha\b|\bsummon\b|\binvoc(?:a|am|ar|acao)\b/, reason: "A proposta usa invocacao, relacionada ao Gacha de herois." },
      { question: /\bdungeons?\b|\bmasmorras?\b/, answer: /\bdungeons?\b|\bmasmorras?\b/, reason: "A proposta reutiliza o sistema de Dungeons." },
      { question: /\becho(?:es)?\b/, answer: /\becho(?:es)?\b/, reason: "A proposta reutiliza o sistema Echoes." },
      { question: /\bancient\s+tower\b|\btorre\s+ancestral\b/, answer: /\bancient\s+tower\b|\btorre\s+ancestral\b/, reason: "A proposta reutiliza Ancient Tower." },
      { question: /\bformacao\s+(?:de\s+)?(?:equipe|party)\b|\bteam\s+formation\b/, answer: /\bformacao\s+(?:de\s+)?(?:equipe|party)\b|\bteam\s+formation\b|\bparty\s+formation\b/, reason: "A proposta reutiliza a formacao de equipe." },
      { question: /\b(?:habilidades?|skills?)\b/, answer: /\b(?:habilidades?|skills?)\b/, reason: "A proposta utiliza habilidades, que foram excluidas do pedido." },
      { question: /\bultimates?\b/, answer: /\bultimates?\b/, reason: "A proposta utiliza ultimates, que foram excluidas do pedido." },
      { question: /\benergia\b/, answer: /\benergia\b/, reason: "A proposta utiliza energia, que foi excluida do pedido." },
      { question: /\b(?:cooldown|recarga)\b/, answer: /\b(?:cooldown|recarga)\b/, reason: "A proposta utiliza recarga/cooldown, que foi excluida do pedido." },
      { question: /\b(?:ataques?\s+basicos?|basic\s+attacks?)\b/, answer: /\b(?:ataques?\s+basicos?|basic\s+attacks?)\b/, reason: "A proposta utiliza ataques basicos, que foram excluidos do pedido." },
      { question: /\b(?:cura|curar|curas|healing|heal)\b/, answer: /\b(?:cura|curar|curas|healing|heal)\b/, reason: "A proposta utiliza cura, que foi excluida do pedido." },
      { question: /\b(?:escudo|escudos|shield|shields)\b/, answer: /\b(?:escudo|escudos|shield|shields)\b/, reason: "A proposta utiliza escudos, que foram excluidos do pedido." },
      { question: /\b(?:stun|atordoamento|atordoar)\b/, answer: /\b(?:stun|atordoamento|atordoar)\b/, reason: "A proposta utiliza stun/atordoamento, que foi excluido do pedido." },
      { question: /\b(?:auto[- ]?battle|combate\s+automatico|batalha\s+automatica)\b/, answer: /\b(?:auto[- ]?battle|combate\s+automatico|batalha\s+automatica)\b/, reason: "A proposta reutiliza o combate automatico, que foi excluido do pedido." }
    ];

    for (const item of excluded) {
      if (item.question.test(q) && item.answer.test(functionalText)) return item.reason;
    }
  }

  // 3) Duplicacoes reconheciveis de sistemas que ja estao documentados.
  const duplicateChecks = [
    { pattern: /\b(?:bonus|efeito)\s+(?:de\s+)?(?:equipamentos?|sets?|conjuntos?|colecoes?)\b|\b(?:set|conjunto|colecao)\s+de\s+equipamentos?\b/, reason: "Bonus e colecoes de equipamentos ja existem no GRIDBREAKERS." },
    { pattern: /\bdificuldade\s+(?:adaptativa|dinamica)\b|\bdynamic\s+difficulty\b/, reason: "A dificuldade adaptativa ja existe no jogo." },
    { pattern: /\b(?:modo|expedicao|sistema)\s+(?:de\s+)?(?:dungeon|masmorra)\b/, reason: "Dungeons ja e um modo de expedicao existente; a proposta precisa apresentar uma diferenca funcional, nao apenas renomea-lo." },
    { pattern: /\b8\s+echo(?:es)?\b.{0,80}\b(?:proxima|seguinte)\s+raridade\b|\boito\s+echo(?:es)?\b.{0,80}\b(?:proxima|seguinte)\s+raridade\b/, reason: "A conversao de oito Echoes em um heroi da proxima raridade ja existe." },
    { pattern: /\b(?:33|trinta e tres)\s+ondas?\b.{0,100}\b(?:mini[- ]?chefe|chefe final)\b/, reason: "A estrutura de campanha com 33 ondas, mini-chefe e chefe ja existe." },
    { pattern: /\bcheckpoint\b.{0,100}\b25\s*%\s*(?:de\s*)?hp\b|\b25\s*%\s*(?:de\s*)?hp\b.{0,100}\bcheckpoint\b/, reason: "O retorno de herois com 25% de HP nos checkpoints ja existe." },
    { pattern: /\bultimates?\b.{0,70}\b100\s*(?:de\s*)?energia\b|\b100\s*(?:de\s*)?energia\b.{0,70}\bultimates?\b/, reason: "A ultimate ja e liberada ao atingir 100 de energia." },
    { pattern: /\b(?:ataques?\s+basicos?|basic\s+attacks?)\b.{0,50}\b(?:6|seis)\s*(?:pontos?\s+de\s+)?energia\b/, reason: "Ataques basicos ja concedem 6 pontos de energia." },
    { pattern: /\b(?:habilidade|skill)\b.{0,50}\b(?:10|dez)\s*(?:pontos?\s+de\s+)?energia\b/, reason: "Usar uma habilidade ja concede 10 pontos de energia." },
    { pattern: /\b(?:receber|sofrer)\b.{0,50}\b(?:4|quatro)\s*(?:pontos?\s+de\s+)?energia\b/, reason: "Receber dano ja concede 4 pontos de energia." }
  ];

  for (const check of duplicateChecks) {
    if (check.pattern.test(functionalText)) return check.reason;
  }

  // 4) Percentuais de ATK/DEF/HP/SPD/CRIT: so aceita pares valor/atributo documentados.
  const knowledge = normalize(GRIDBREAKERS_KNOWLEDGE);
  const officialStats = new Set<string>();
  const statPattern = /([+-]?\s*\d+(?:[.,]\d+)?)\s*%\s*(?:(?:do|de)\s+)?(atk|def|hp|spd|crit)\b|\b(atk|def|hp|spd|crit)\s*(?:de|:)?\s*([+-]?\s*\d+(?:[.,]\d+)?)\s*%/gi;

  for (const match of knowledge.matchAll(statPattern)) {
    const rawValue = (match[1] ?? match[4]).replace(/[+\s]/g, "").replace(",", ".");
    const stat = (match[2] ?? match[3]).toLowerCase();
    const value = Number(rawValue);
    if (Number.isFinite(value)) officialStats.add(`${value}|${stat}`);
  }

  for (const match of functionalText.matchAll(statPattern)) {
    const rawValue = (match[1] ?? match[4]).replace(/[+\s]/g, "").replace(",", ".");
    const stat = (match[2] ?? match[3]).toLowerCase();
    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;
    const key = `${value}|${stat}`;
    if (!officialStats.has(key)) {
      return `Percentual de atributo nao confirmado na documentacao: ${value}% ${stat.toUpperCase()}. Se for apenas um valor de teste, ele precisa ser identificado claramente como experimental.`;
    }
  }

  return null;
}