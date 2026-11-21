import { GRIDBREAKERS_KNOWLEDGE } from "./owlKnowledge";
import { validateCreativeAnswer } from "./owlCreativeGuard";
type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };
type CompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

const API_URL = "/owl-api/v1/chat/completions";
const HEALTH_URL = "/owl-api/health";
const MODEL_NAME = "qwen3-1.7b";
const SYSTEM_PROMPT = [
  "You are OWL_AI, the official local AI assistant of AI STUDIO OWL and AI WORLD OWL.",
  "Your identity is OWL_AI. Be friendly, intelligent, practical, creative and confident without pretending to be human.",
  "Respond in the user's language. When the user writes Portuguese, use natural Brazilian Portuguese.",
  "Answer the exact question in at most 100 words unless asked for detail. Avoid generic introductions, repeated explanations and long numbered lists. When asked about 6-piece equipment bonuses, report the 6-piece bonus for every requested set only. Do not list 2-piece or 4-piece bonuses unless asked.",
  "Never repeat the same list of capabilities in consecutive answers. When asked what you can do, give at most five relevant examples.",
  "Help Dev Owl with AI STUDIO OWL, AI WORLD OWL, game development, programming, debugging, game mechanics, balancing, level design, characters, stories, interfaces, AI tools and creative projects.",
  "You can analyze code, errors, screenshots and descriptions that the user shares. You can propose solutions and write code. Never claim that you can directly see the user's screen, control a running game, edit local files or execute actions unless a real tool has been connected.",
  "Do not say you cannot help with a game just because you cannot access it directly. Explain what information you need to help with the game.",
  "Do not invent features, files, game mechanics, project decisions or actions. Clearly distinguish confirmed information from suggestions.",
  "Use the supplied local date and time context when asked about the current time. Do not claim that you cannot read the clock when that context is available.",
  "Do not claim internet access or current external knowledge unless a search tool is actually connected.",
  "When a request is unclear, ask one focused question. When you do not know something, say so honestly.",
  "Your purpose is to help Dev Owl improve AI STUDIO OWL and build extraordinary experiences in AI WORLD OWL."
].join(" ");

const KNOWLEDGE_HEADINGS = [
  "IDENTIDADE E GÊNERO",
  "INTERFACE E SISTEMAS",
  "CAMPANHA",
  "DUNGEONS",
  "ANCIENT TOWER",
  "GACHA E PERSONAGENS",
  "CHARACTER SUMMONER E ECHOES",
  "EQUIPAMENTOS",
  "RARIDADES DE EQUIPAMENTO",
  "BÔNUS DOS SETS",
  "PROGRESSO E SAVES",
  "COMBATE E HABILIDADES",
  "REGRAS PARA RESPONDER"
];

const KNOWLEDGE_TOPICS = [
  {
    keywords: ["equipamento", "equipamentos", "set", "sets", "obsidian", "lunar", "thread", "pecas", "bonus", "raridade", "legendary", "arma", "armadura", "reliquia"],
    headings: ["EQUIPAMENTOS", "RARIDADES DE EQUIPAMENTO", "BÔNUS DOS SETS"]
  },
  {
    keywords: ["gacha", "summon", "invocacao", "invocar", "soul crystal", "echo", "orion", "aeon", "heroi", "herois", "personagem", "personagens", "pity"],
    headings: ["GACHA E PERSONAGENS", "CHARACTER SUMMONER E ECHOES"]
  },
  {
    keywords: ["campanha", "onda", "ondas", "stage", "estagio", "checkpoint", "chefe", "xp", "ouro"],
    headings: ["CAMPANHA"]
  },
  {
    keywords: ["dungeon", "dungeons", "gold", "forge", "relic", "expedicao"],
    headings: ["DUNGEONS"]
  },
  {
    keywords: ["ancient tower", "tower", "torre", "andar", "andares"],
    headings: ["ANCIENT TOWER"]
  },
  {
    keywords: ["save", "salvar", "progresso", "localstorage", "awo_save"],
    headings: ["PROGRESSO E SAVES"]
  },
  {
    keywords: ["interface", "mobile", "desktop", "fullscreen", "tela cheia", "audio", "grafico", "configuracao"],
    headings: ["INTERFACE E SISTEMAS"]
  },
  {
    keywords: ["combate", "habilidade", "habilidades", "skill", "skills", "ultimate", "ultimates", "energia", "stun", "atordoamento", "cura", "curar", "escudo", "ataque", "ataques", "dano", "cooldown", "recarga", "lyra", "jax", "kira", "kai", "aeon", "orion", "titan", "vex"],
    headings: ["COMBATE E HABILIDADES"]
  }
] as const;

function getRelevantKnowledge(question: string): string {
  const normalized = question
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const selected = new Set<string>([
    "IDENTIDADE E GÊNERO",
    "REGRAS PARA RESPONDER"
  ]);

  for (const topic of KNOWLEDGE_TOPICS) {
    if (topic.keywords.some((keyword) => normalized.includes(keyword))) {
      topic.headings.forEach((heading) => selected.add(heading));
    }
  }

  const brainstormingTerms = [
    "ideia", "ideias", "mecanica", "mecanicas",
    "novo", "nova", "novas", "novos", "criar", "crie",
    "sugerir", "sugestao", "sugestoes", "proposta",
    "propostas", "melhoria", "melhorias", "inovacao",
    "balancear", "balanceamento"
  ];

  const isBrainstorming = brainstormingTerms.some((term) =>
    normalized.includes(term)
  );

  if (isBrainstorming) {
    [
        "CAMPANHA",
        "DUNGEONS",
        "ANCIENT TOWER",
        "GACHA E PERSONAGENS",
        "CHARACTER SUMMONER E ECHOES",
        "EQUIPAMENTOS",
        "RARIDADES DE EQUIPAMENTO",
        "BÔNUS DOS SETS"
    ,
        "COMBATE E HABILIDADES",
    ].forEach((heading) => selected.add(heading));
}
  if (selected.size === 2) {
    selected.add("INTERFACE E SISTEMAS");
  }

  return KNOWLEDGE_HEADINGS
    .filter((heading) => selected.has(heading))
    .map((heading) => {
      const start = GRIDBREAKERS_KNOWLEDGE.indexOf(`${heading}\n`);
      if (start < 0) return "";

      const nextStarts = KNOWLEDGE_HEADINGS
        .map((next) => GRIDBREAKERS_KNOWLEDGE.indexOf(`${next}\n`))
        .filter((index) => index > start);

      const end = nextStarts.length
        ? Math.min(...nextStarts)
        : GRIDBREAKERS_KNOWLEDGE.length;

      return GRIDBREAKERS_KNOWLEDGE.slice(start, end).trim();
    })
    .filter(Boolean)
    .join("\n\n");
}
function getKnownAnswer(question: string): string | null {
  const q = question.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const asksSixPieceBonuses =
    q.includes("bonus") &&
    (q.includes("gridbreakers") || q.includes("obsidian") ||
     q.includes("lunar") || q.includes("thread")) &&
    /\b(seis|6)\s*pecas\b/.test(q);

  if (!asksSixPieceBonuses) return null;

  return [
    "Os bônus completos de seis peças (6/6) do GRIDBREAKERS são:",
    "",
    "OBSIDIAN: +24% DEF e +14% ATK.",
    "LUNAR: +24% HP e +12% DEF.",
    "THREAD: +8% CRIT, +16% SPD e +10% ATK.",
    "",
    "Importante: os bônus de 2, 4 e 6 peças não são somados entre si. Apenas o maior patamar alcançado de cada set fica ativo."
  ].join("\n");
}
export function initOwlAi(): void {
  if (document.getElementById("owl-ai-root")) return;

  const root = document.createElement("div");
  root.id = "owl-ai-root";
  root.innerHTML = `
    <button class="owl-ai-launcher" id="owl-ai-launcher" type="button" aria-label="Abrir OWL_AI" aria-expanded="false" aria-controls="owl-ai-panel">
      <span class="owl-ai-launcher-icon" aria-hidden="true">◉</span>
      <span class="owl-ai-launcher-label">OWL_AI</span>
      <span class="owl-ai-launcher-dot" aria-hidden="true"></span>
    </button>
    <section class="owl-ai-panel" id="owl-ai-panel" aria-label="Assistente OWL_AI" hidden>
      <header class="owl-ai-header">
        <div class="owl-ai-brand">
          <span class="owl-ai-brand-icon" aria-hidden="true">◉</span>
          <span><strong>OWL_AI</strong><small>AI STUDIO OWL · LOCAL AI</small></span>
        </div>
        <div class="owl-ai-header-actions">
          <span class="owl-ai-status" id="owl-ai-status">VERIFICANDO...</span>
          <button class="owl-ai-close" id="owl-ai-close" type="button" aria-label="Fechar OWL_AI">×</button>
        </div>
      </header>
      <div class="owl-ai-messages" id="owl-ai-messages" role="log" aria-live="polite" aria-relevant="additions text"></div>
      <form class="owl-ai-form" id="owl-ai-form">
        <label class="owl-ai-sr-only" for="owl-ai-input">Mensagem para OWL_AI</label>
        <textarea id="owl-ai-input" rows="2" maxlength="4000" placeholder="Escreva sua mensagem..." required></textarea>
        <div class="owl-ai-form-footer">
          <span>ENTER PARA ENVIAR · SHIFT + ENTER PARA NOVA LINHA</span>
          <button id="owl-ai-send" type="submit">ENVIAR ↗</button>
        </div>
      </form>
      <div class="owl-ai-footnote">EXECUTANDO LOCALMENTE NESTE COMPUTADOR</div>
    </section>
  `;
  document.body.append(root);

  const launcher = root.querySelector<HTMLButtonElement>("#owl-ai-launcher")!;
  const panel = root.querySelector<HTMLElement>("#owl-ai-panel")!;
  const closeButton = root.querySelector<HTMLButtonElement>("#owl-ai-close")!;
  const status = root.querySelector<HTMLElement>("#owl-ai-status")!;
  const messagesElement = root.querySelector<HTMLDivElement>("#owl-ai-messages")!;
  const form = root.querySelector<HTMLFormElement>("#owl-ai-form")!;
  const input = root.querySelector<HTMLTextAreaElement>("#owl-ai-input")!;
  const sendButton = root.querySelector<HTMLButtonElement>("#owl-ai-send")!;

  let history: ChatMessage[] = [];
  let sending = false;

  function setStatus(label: string, online: boolean | null): void {
    status.textContent = label;
    status.dataset.state = online === true ? "online" : online === false ? "offline" : "checking";
  }

  function appendMessage(role: ChatRole, content: string, extraClass = ""): HTMLDivElement {
    const row = document.createElement("div");
    row.className = `owl-ai-message is-${role}${extraClass ? ` ${extraClass}` : ""}`;
    const label = document.createElement("span");
    label.className = "owl-ai-message-label";
    label.textContent = role === "user" ? "VOCÊ" : "OWL_AI";
    const bubble = document.createElement("div");
    bubble.className = "owl-ai-bubble";
    bubble.textContent = content;
    row.append(label, bubble);
    messagesElement.append(row);
    messagesElement.scrollTop = messagesElement.scrollHeight;
    return row;
  }

  function setOpen(open: boolean): void {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    root.classList.toggle("is-open", open);
    if (open) {
      void checkHealth();
      input.focus();
    }
  }

  async function checkHealth(): Promise<void> {
    setStatus("VERIFICANDO MOTOR", null);
    try {
      const response = await fetch(HEALTH_URL, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as { status?: string };
      if (data.status !== "ok") throw new Error("O servidor ainda não está pronto.");
      setStatus("MODELO ONLINE", true);
    } catch {
      setStatus("MOTOR OFFLINE", false);
    }
  }

  launcher.addEventListener("click", () => setOpen(panel.hidden));
  closeButton.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) setOpen(false);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!sending) form.requestSubmit();
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = input.value.trim();
    if (!prompt || sending) return;

    sending = true;
    input.value = "";
    input.disabled = true;
    sendButton.disabled = true;
    appendMessage("user", prompt);
    history.push({ role: "user", content: `${prompt}
/no_think` });
    history = history.slice(-2);
    const pending = appendMessage("assistant", "OWL_AI está pensando...", "is-pending");
    setStatus("GERANDO RESPOSTA", true);
      const knownAnswer = getKnownAnswer(prompt);
      if (knownAnswer) {
        pending.remove();
        appendMessage("assistant", knownAnswer);
        history.push({ role: "assistant", content: knownAnswer });
        history = history.slice(-2);
        setStatus("BASE GRIDBREAKERS", true);
        sending = false;
        input.disabled = false;
        sendButton.disabled = false;
        input.focus();
        return;
      }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 180000);

    try {
      const normalizedPrompt = prompt.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

      const isCreativeRequest = [
        "ideia", "ideias", "mecanica", "mecanicas",
        "proposta", "propostas", "criar", "crie",
        "sugira", "melhoria", "melhorias", "inovacao", "sugestao", "sugestoes", "balancear", "balanceamento", "desenvolver", "desenvolva", "planejar", "planejamento"
      ].some((term) => normalizedPrompt.includes(term));
      const relevantKnowledge = getRelevantKnowledge(prompt);
      const localNow = new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "full",
        timeStyle: "short"
      }).format(new Date());

      const localTimeZone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "local timezone";

      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [{
            role: "system",
            content: `${SYSTEM_PROMPT}\n\n${isCreativeRequest ? "CREATIVE MODE: Use the supplied GRIDBREAKERS documentation, including combat knowledge, as the source of truth. First identify existing systems: campaign waves and checkpoints, Dungeons, Gacha, Echoes, Ancient Tower, adaptive difficulty, equipment and set bonuses, auto-battle, hero skills, ultimates, energy, cooldowns, basic attacks, healing, shields and stun. Never repackage an existing mechanic under a new name. Respect all systems the user explicitly excludes. Respect the exact number requested; when no quantity is specified, propose ONE idea only. For multiple ideas, title each section Ideia 1, Ideia 2, and so on. Explain concept, gameplay loop, the functional difference from existing systems, whether it is an extension or a genuinely separate mechanic, and balancing risks. Do not invent official stats or claim a proposal is implemented. Clearly label it experimental. Creative responses may exceed the 100-word default only as needed to satisfy the requested structure." : ""}\n\nRELEVANT GRIDBREAKERS KNOWLEDGE:\n${relevantKnowledge}\n\nLocal date and time: ${localNow} (${localTimeZone}). Use this context when asked about current time.`
          }, ...history],
          temperature: isCreativeRequest ? 0.65 : 0.25,
          max_tokens: isCreativeRequest ? 512 : 320,
          stream: false
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 400);
        throw new Error(`API HTTP ${response.status}: ${detail}`);
      }
      const result = await response.json() as CompletionResponse;
      let answer = result.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error("A API respondeu, mas não trouxe texto.");
            const creativeGuardIssue = isCreativeRequest
  ? validateCreativeAnswer(prompt, answer)
  : null;

if (creativeGuardIssue) {
  setStatus("REFORMULANDO PROPOSTA", true);

  const pendingBubble = pending.querySelector<HTMLElement>(".owl-ai-bubble");
  if (pendingBubble) pendingBubble.textContent = "Revisando a proposta para respeitar as regras...";

  const retryController = new AbortController();
  const retryTimeout = window.setTimeout(
    () => retryController.abort(),
    180000
  );

  try {
    const retrySystemContent =
      `${SYSTEM_PROMPT}\n\nCREATIVE MODE: Respect exactly the quantity requested; if no quantity was specified, deliver one idea. Never use systems explicitly excluded by the user. Do not repackage campaign waves/checkpoints, Dungeons, Gacha, Echoes, Ancient Tower, adaptive difficulty, equipment sets, auto-battle, existing hero skills, ultimates, energy, cooldowns, basic attacks, healing, shields or stun as new mechanics. Distinguish a meaningful extension from a genuinely separate system. Never invent official game statistics. Label proposals experimental and not implemented.\n\nRELEVANT GRIDBREAKERS KNOWLEDGE:\n${relevantKnowledge}\n\nLocal date and time: ${localNow} (${localTimeZone}).`;

    const retryInstruction = [
      "Sua proposta anterior foi rejeitada pelo validador local.",
      `Motivo: ${creativeGuardIssue}`,
      `Pedido original: ${prompt}`,
      "Recomece a proposta do zero. Respeite exatamente a quantidade solicitada.",
      "Não utilize os sistemas proibidos no funcionamento da mecânica.",
      "Não apresente sistemas existentes com nomes diferentes.",
      "Não invente atributos, estatísticas ou probabilidades oficiais.",
      "Estruture em: Conceito, Funcionamento, Diferencial e Risco de balanceamento.",
      "Identifique a ideia como experimental e ainda não implementada.",
      "Responda em português brasileiro, de maneira objetiva.",
      "/no_think"
    ].join("\n");

    const retryResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: retrySystemContent },
          ...history,
          { role: "assistant", content: answer },
          { role: "user", content: retryInstruction }
        ],
        temperature: 0.3,
        max_tokens: 512,
        stream: false
      }),
      signal: retryController.signal
    });

    if (!retryResponse.ok) {
      throw new Error(`Tentativa de reformulação: HTTP ${retryResponse.status}`);
    }

    const retryResult = await retryResponse.json() as CompletionResponse;
    const retryAnswer = retryResult.choices?.[0]?.message?.content?.trim();

    if (!retryAnswer) {
      throw new Error("A reformulação não retornou texto.");
    }

    const retryIssue = validateCreativeAnswer(prompt, retryAnswer);

    if (retryIssue) {
      pending.remove();
      appendMessage(
        "assistant",
        `NÃO FOI POSSÍVEL VALIDAR A PROPOSTA\n\n${retryIssue}\n\nPodemos tentar outra abordagem.`
      );
      setStatus("REVISAR PROPOSTA", true);
      return;
    }

    answer = retryAnswer;
  } finally {
    window.clearTimeout(retryTimeout);
  }
}

const finalAnswer = isCreativeRequest
  ? `PROPOSTA EXPERIMENTAL — ainda não implementada e não confirmada como inédita por auditoria completa do código.\n\n${answer}`
  : answer;

pending.remove();
appendMessage("assistant", finalAnswer);
history.push({ role: "assistant", content: finalAnswer });
      history = history.slice(-2);
      setStatus("MODELO ONLINE", true);
    } catch (error) {
      pending.remove();
      const message = error instanceof Error && error.name === "AbortError"
        ? "A geração excedeu o limite de 3 minutos. Tente uma mensagem menor."
        : error instanceof Error
          ? error.message
          : "Falha desconhecida ao consultar o motor local.";
      appendMessage("assistant", `Não consegui gerar uma resposta. ${message}`);
      setStatus("ERRO NA CONEXÃO", false);
    } finally {
      window.clearTimeout(timeout);
      sending = false;
      input.disabled = false;
      sendButton.disabled = false;
      input.focus();
    }
  });

  appendMessage("assistant", "Olá! Eu sou o OWL_AI, o assistente local do AI STUDIO OWL. Como posso ajudar?");
  void checkHealth();
}