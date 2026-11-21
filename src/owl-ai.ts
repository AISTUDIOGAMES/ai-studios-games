/** OWL_AI chat widget. Talks to /api/owl-ai (streamed SSE) and follows the site language (EN / PT-BR / ES). */
type Lang = "en" | "pt-BR" | "es";

const ENDPOINT: string = import.meta.env?.VITE_OWL_AI_ENDPOINT ?? "/api/owl-ai";
const MAX_INPUT = 400;
const MAX_HISTORY = 8;

interface Strings {
  title: string; sub: string; open: string; close: string; placeholder: string; send: string; hello: string;
  thinking: string; offline: string; busy: string; rate: string; error: string; note: string; chips: string[];
}

const T: Record<Lang, Strings> = {
  en: {
    title: "OWL_AI", sub: "AI STUDIO OWL assistant", open: "Open OWL_AI chat", close: "Close chat", placeholder: "Ask OWL_AI…", send: "Send",
    hello: "Systems online. I'm OWL_AI, your guide to the AI STUDIO OWL universe. What are you curious about?",
    thinking: "Scanning the grid…", offline: "OWL_AI is offline right now. Please try again later.", busy: "I'm helping other explorers. Try again in a moment.",
    rate: "You're sending messages too fast. Please wait a minute.", error: "Signal lost. Please try again.",
    note: "AI can be wrong. Not financial advice. Never share your seed phrase.",
    chips: ["What is AI STUDIO OWL?", "Which games can I play?", "How do I stay safe with wallets?"],
  },
  "pt-BR": {
    title: "OWL_AI", sub: "Assistente do AI STUDIO OWL", open: "Abrir chat da OWL_AI", close: "Fechar chat", placeholder: "Pergunte à OWL_AI…", send: "Enviar",
    hello: "Sistemas online. Sou a OWL_AI, sua guia pelo universo do AI STUDIO OWL. O que você quer saber?",
    thinking: "Escaneando a grade…", offline: "A OWL_AI está offline agora. Tente novamente mais tarde.", busy: "Estou ajudando outros exploradores. Tente de novo em instantes.",
    rate: "Você está enviando mensagens rápido demais. Aguarde um minuto.", error: "Sinal perdido. Tente novamente.",
    note: "A IA pode errar. Não é conselho financeiro. Nunca compartilhe sua frase-semente.",
    chips: ["O que é o AI STUDIO OWL?", "Quais jogos posso jogar?", "Como me proteger com carteiras?"],
  },
  es: {
    title: "OWL_AI", sub: "Asistente de AI STUDIO OWL", open: "Abrir chat de OWL_AI", close: "Cerrar chat", placeholder: "Pregunta a OWL_AI…", send: "Enviar",
    hello: "Sistemas en línea. Soy OWL_AI, tu guía por el universo de AI STUDIO OWL. ¿Qué quieres saber?",
    thinking: "Escaneando la red…", offline: "OWL_AI está fuera de línea ahora. Inténtalo más tarde.", busy: "Estoy ayudando a otros exploradores. Inténtalo en un momento.",
    rate: "Estás enviando mensajes muy rápido. Espera un minuto.", error: "Señal perdida. Inténtalo de nuevo.",
    note: "La IA puede equivocarse. No es consejo financiero. Nunca compartas tu frase semilla.",
    chips: ["¿Qué es AI STUDIO OWL?", "¿Qué juegos puedo jugar?", "¿Cómo me protejo con billeteras?"],
  },
};

function currentLang(): Lang {
  const l = (document.documentElement.lang || "en").toLowerCase();
  if (l.startsWith("pt")) return "pt-BR";
  if (l.startsWith("es")) return "es";
  return "en";
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function initOwlAi(): void {
  if (document.getElementById("owlAiRoot")) return;

  const root = el("div", "owl-ai");
  root.id = "owlAiRoot";
  root.setAttribute("translate", "no");

  const fab = el("button", "owl-ai-fab");
  fab.type = "button";
  fab.setAttribute("aria-expanded", "false");
  fab.setAttribute("aria-controls", "owlAiPanel");
  fab.append(el("span", "owl-ai-fab-icon", "🦉"), el("span", "owl-ai-fab-ring"));

  const panel = el("section", "owl-ai-panel");
  panel.id = "owlAiPanel";
  panel.setAttribute("role", "dialog");
  panel.hidden = true;

  const head = el("header", "owl-ai-head");
  const heading = el("div", "owl-ai-heading");
  const title = el("strong", "owl-ai-title");
  const sub = el("small", "owl-ai-sub");
  heading.append(title, sub);
  const closeBtn = el("button", "owl-ai-close", "✕");
  closeBtn.type = "button";
  head.append(el("span", "owl-ai-avatar", "🦉"), heading, closeBtn);

  const log = el("div", "owl-ai-log");
  log.setAttribute("role", "log");
  log.setAttribute("aria-live", "polite");
  const chips = el("div", "owl-ai-chips");

  const form = el("form", "owl-ai-form");
  form.noValidate = true;
  const input = el("input", "owl-ai-input");
  input.type = "text";
  input.maxLength = MAX_INPUT;
  input.autocomplete = "off";
  const send = el("button", "owl-ai-send");
  send.type = "submit";
  form.append(input, send);
  const note = el("p", "owl-ai-note");

  panel.append(head, log, chips, form, note);
  root.append(fab, panel);
  document.body.appendChild(root);

  const history: { role: "user" | "assistant"; content: string }[] = [];
  let busy = false;
  let lastSent = 0;
  let controller: AbortController | null = null;
  let greeting: HTMLElement | null = null;

  const t = () => T[currentLang()];

  function renderStatic(): void {
    const s = t();
    title.textContent = s.title;
    sub.textContent = s.sub;
    fab.setAttribute("aria-label", s.open);
    fab.title = s.open;
    closeBtn.setAttribute("aria-label", s.close);
    panel.setAttribute("aria-label", `${s.title} — ${s.sub}`);
    input.placeholder = s.placeholder;
    input.setAttribute("aria-label", s.placeholder);
    send.textContent = s.send;
    note.textContent = s.note;
    if (greeting) greeting.textContent = s.hello;
    chips.replaceChildren(...s.chips.map((text) => {
      const b = el("button", "owl-ai-chip", text);
      b.type = "button";
      b.addEventListener("click", () => ask(text));
      return b;
    }));
  }

  function addMsg(role: "user" | "bot", text: string): HTMLElement {
    const m = el("div", `owl-ai-msg ${role}`, text);
    log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return m;
  }

  function setBusy(on: boolean): void {
    busy = on;
    send.disabled = on;
    input.disabled = on;
    log.setAttribute("aria-busy", String(on));
    if (!on) input.focus();
  }

  async function ask(raw: string): Promise<void> {
    const text = raw.trim().slice(0, MAX_INPUT);
    if (!text || busy || Date.now() - lastSent < 1500) return;
    lastSent = Date.now();
    chips.hidden = true;
    input.value = "";
    greeting = null;
    addMsg("user", text);
    history.push({ role: "user", content: text });
    const s = t();
    const bubble = addMsg("bot", s.thinking);
    bubble.classList.add("thinking");
    setBusy(true);
    let answer = "";
    controller = new AbortController();
    const timeout = window.setTimeout(() => controller?.abort(), 100000);
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ lang: currentLang(), messages: history.slice(-MAX_HISTORY) }),
      });
      if (!res.ok || !res.body) {
        const kind = res.status === 429 ? "rate" : res.status === 503 ? ((await res.json().catch(() => ({}))).error === "busy" ? "busy" : "offline") : "error";
        throw new Error(kind);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          try {
            const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta) {
              answer += delta;
              bubble.classList.remove("thinking");
              bubble.textContent = answer;
              log.scrollTop = log.scrollHeight;
            }
          } catch { /* ignore a partial or non-JSON line */ }
        }
      }
      if (!answer.trim()) throw new Error("error");
      history.push({ role: "assistant", content: answer.trim() });
    } catch (err) {
      const kind = err instanceof Error ? err.message : "error";
      const s2 = t();
      const msg = kind === "rate" ? s2.rate : kind === "busy" ? s2.busy : kind === "offline" ? s2.offline : s2.error;
      bubble.classList.remove("thinking");
      bubble.classList.add("error");
      bubble.textContent = answer ? `${answer}\n\n— ${msg}` : msg;
      if (!answer) history.pop(); // drop the failed question so the history stays consistent
      else history.push({ role: "assistant", content: answer.trim() });
    } finally {
      window.clearTimeout(timeout);
      controller = null;
      setBusy(false);
    }
  }

  function setOpen(open: boolean): void {
    panel.hidden = !open;
    root.classList.toggle("open", open);
    fab.setAttribute("aria-expanded", String(open));
    if (open) { if (!greeting && !history.length) { greeting = addMsg("bot", t().hello); } input.focus(); }
    else { controller?.abort(); fab.focus(); }
  }

  fab.addEventListener("click", () => setOpen(Boolean(panel.hidden)));
  closeBtn.addEventListener("click", () => setOpen(false));
  panel.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  form.addEventListener("submit", (e) => { e.preventDefault(); void ask(input.value); });

  renderStatic();
  new MutationObserver(renderStatic).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
}
