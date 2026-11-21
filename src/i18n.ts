export type SiteLanguage = "en" | "pt-BR" | "es";

const dictionaries: Record<Exclude<SiteLanguage, "en">, Record<string, string>> = {
  "pt-BR": {
    "THE UNIVERSE OF AI": "O UNIVERSO DA IA", "EXPLORE": "EXPLORAR", "AI UNIVERSE": "UNIVERSO IA",
    "GAMES": "JOGOS", "TRAILER": "TRAILER", "COMIC": "QUADRINHOS", "LORE": "UNIVERSO", "VIDEO": "VÍDEO", "AI WORLD": "MUNDO IA", "STUDIO": "ESTÚDIO",
    "THE STUDIO": "O ESTÚDIO", "JOIN": "PARTICIPE", "CONNECT WALLET": "CONECTAR CARTEIRA",
    "AI-POWERED WORLDS. HUMAN IMAGINATION.": "MUNDOS COM IA. IMAGINAÇÃO HUMANA.",
    "ONE PLATFORM.": "UMA PLATAFORMA.", "MANY WORLDS.": "MUITOS UNIVERSOS.",
    "Explore the growing universe of AI STUDIO OWL — from games and short-form storytelling to virtual creators, internet culture, crypto and useful AI tools.": "Explore o universo em expansão do AI STUDIO OWL — de games e histórias curtas a criadores virtuais, cultura da internet, cripto e ferramentas úteis de IA.",
    "TIKTOK SERIES": "SÉRIES DO TIKTOK", "AI VIDEOS & MEMES": "VÍDEOS E MEMES DE IA",
    "AI INFLUENCERS": "INFLUENCIADORES DE IA", "CRYPTO & BLOCKCHAIN": "CRIPTO E BLOCKCHAIN", "AI TOOLS & TECHNOLOGY": "FERRAMENTAS E TECNOLOGIA DE IA",
    "PLAYABLE WORLDS, CHARACTERS AND EXPERIMENTS.": "MUNDOS JOGÁVEIS, PERSONAGENS E EXPERIMENTOS.",
    "SHORT EPISODES, ORIGINAL STORIES AND VERTICAL ENTERTAINMENT.": "EPISÓDIOS CURTOS, HISTÓRIAS ORIGINAIS E ENTRETENIMENTO VERTICAL.",
    "GENERATIVE CLIPS, INTERNET HUMOR AND CREATIVE EXPERIMENTS.": "CLIPES GENERATIVOS, HUMOR DA INTERNET E EXPERIMENTOS CRIATIVOS.",
    "VIRTUAL PERSONALITIES, DIGITAL AVATARS AND CREATOR WORLDS.": "PERSONALIDADES VIRTUAIS, AVATARES DIGITAIS E UNIVERSOS DE CRIADORES.",
    "AI, DIGITAL ASSETS AND EMERGING BLOCKCHAIN CULTURE.": "IA, ATIVOS DIGITAIS E CULTURA BLOCKCHAIN EMERGENTE.",
    "DISCOVER USEFUL SYSTEMS, CREATIVE WORKFLOWS AND NEW AI TECHNOLOGY.": "DESCUBRA SISTEMAS ÚTEIS, FLUXOS CRIATIVOS E NOVAS TECNOLOGIAS DE IA.",
    "EXPLORE GAMES": "EXPLORAR GAMES", "COMING SOON": "EM BREVE", "EXPLORE THE AI UNIVERSE": "EXPLORE O UNIVERSO DA IA",
    "FEATURED WORLDS & EXPERIMENTS": "MUNDOS E EXPERIMENTOS EM DESTAQUE", "DISCOVER WHAT'S NEXT": "DESCUBRA O QUE VEM A SEGUIR",
    "WATCH THE": "ASSISTA AO", "THE UNIVERSE": "O UNIVERSO", "THE ARCADE": "OS GAMES",
    "ENTER THE": "ENTRE NO", "PLAYGROUND": "UNIVERSO DE JOGOS", "MORE GAMES": "MAIS GAMES",
    "THE FUTURE COMMUNITY TOKEN": "O FUTURO TOKEN DA COMUNIDADE",
    "AI STUDIO OWL TOKEN": "TOKEN AI STUDIO OWL", "LAUNCH STATUS": "STATUS DO LANÇAMENTO",
    "LAUNCH PLATFORM": "PLATAFORMA DE LANÇAMENTO", "CONTRACT ADDRESS (CA)": "ENDEREÇO DO CONTRATO (CA)",
    "OUR DIRECTIVE": "NOSSA DIRETRIZ", "IDEAS FIRST.": "IDEIAS EM PRIMEIRO LUGAR.",
    "LIMITS LAST.": "LIMITES POR ÚLTIMO.", "GAMES, CREATIVITY AND TECHNOLOGY — ONE OPEN UNIVERSE.": "GAMES, CRIATIVIDADE E TECNOLOGIA — UM UNIVERSO ABERTO.",
    "THE MISSION LOG": "DIÁRIO DA MISSÃO", "QUESTIONS": "PERGUNTAS", "SAFETY": "SEGURANÇA",
    "GOOD TO KNOW": "BOM SABER", "STRAIGHT ANSWERS.": "RESPOSTAS DIRETAS.", "NO HYPE.": "SEM HYPE.",
    "BACK TO HOME": "VOLTAR AO INÍCIO", "OFFICIAL LINKS": "LINKS OFICIAIS", "STAY SAFE.": "MANTENHA-SE SEGURO.",
    "OFFICIAL TRAILER": "TRAILER OFICIAL", "SUBSCRIBE ON YOUTUBE": "INSCREVA-SE NO YOUTUBE", "OPEN FULL PAGE": "ABRIR PÁGINA COMPLETA",
    "READ THE SAGA": "LER A SAGA", "PLAY NOW": "JOGAR AGORA", "WATCH NOW": "ASSISTIR AGORA",
    "THE COMMUNITY TOKEN": "TOKEN DA COMUNIDADE", "DARK MODE": "MODO ESCURO", "LIGHT MODE": "MODO CLARO", "Toggle dark / light mode": "Alternar modo escuro / claro", "DESERT MODE": "MODO DESERTO", "NEON MODE": "MODO NEON", "Switch theme": "Alternar tema", "AI STUDIO OWL MAKES AI-POWERED EXPERIENCES AND CONTENT ACROSS THE DIGITAL UNIVERSE.": "O AI STUDIO OWL CRIA EXPERIÊNCIAS E CONTEÚDOS COM IA EM TODO O UNIVERSO DIGITAL.",
    "WEBSITE": "SITE", "YOUTUBE": "YOUTUBE", "X": "X"
  },
  "es": {
    "THE UNIVERSE OF AI": "EL UNIVERSO DE LA IA", "EXPLORE": "EXPLORAR", "AI UNIVERSE": "UNIVERSO IA",
    "GAMES": "JUEGOS", "TRAILER": "TRÁILER", "COMIC": "CÓMIC", "LORE": "UNIVERSO", "VIDEO": "VÍDEO", "AI WORLD": "MUNDO IA", "STUDIO": "ESTUDIO",
    "THE STUDIO": "EL ESTUDIO", "JOIN": "ÚNETE", "CONNECT WALLET": "CONECTAR BILLETERA",
    "AI-POWERED WORLDS. HUMAN IMAGINATION.": "MUNDOS CON IA. IMAGINACIÓN HUMANA.",
    "ONE PLATFORM.": "UNA PLATAFORMA.", "MANY WORLDS.": "MUCHOS UNIVERSOS.",
    "Explore the growing universe of AI STUDIO OWL — from games and short-form storytelling to virtual creators, internet culture, crypto and useful AI tools.": "Explora el universo en expansión de AI STUDIO OWL: desde juegos e historias breves hasta creadores virtuales, cultura de internet, cripto y herramientas útiles de IA.",
    "TIKTOK SERIES": "SERIES DE TIKTOK", "AI VIDEOS & MEMES": "VÍDEOS Y MEMES DE IA",
    "AI INFLUENCERS": "INFLUENCERS DE IA", "CRYPTO & BLOCKCHAIN": "CRIPTO Y BLOCKCHAIN", "AI TOOLS & TECHNOLOGY": "HERRAMIENTAS Y TECNOLOGÍA DE IA",
    "PLAYABLE WORLDS, CHARACTERS AND EXPERIMENTS.": "MUNDOS JUGABLES, PERSONAJES Y EXPERIMENTOS.",
    "SHORT EPISODES, ORIGINAL STORIES AND VERTICAL ENTERTAINMENT.": "EPISODIOS CORTOS, HISTORIAS ORIGINALES Y ENTRETENIMIENTO VERTICAL.",
    "GENERATIVE CLIPS, INTERNET HUMOR AND CREATIVE EXPERIMENTS.": "CLIPS GENERATIVOS, HUMOR DE INTERNET Y EXPERIMENTOS CREATIVOS.",
    "VIRTUAL PERSONALITIES, DIGITAL AVATARS AND CREATOR WORLDS.": "PERSONALIDADES VIRTUALES, AVATARES DIGITALES Y UNIVERSOS DE CREADORES.",
    "AI, DIGITAL ASSETS AND EMERGING BLOCKCHAIN CULTURE.": "IA, ACTIVOS DIGITALES Y CULTURA BLOCKCHAIN EMERGENTE.",
    "DISCOVER USEFUL SYSTEMS, CREATIVE WORKFLOWS AND NEW AI TECHNOLOGY.": "DESCUBRE SISTEMAS ÚTILES, FLUJOS CREATIVOS Y NUEVAS TECNOLOGÍAS DE IA.",
    "EXPLORE GAMES": "EXPLORAR JUEGOS", "COMING SOON": "MUY PRONTO", "EXPLORE THE AI UNIVERSE": "EXPLORA EL UNIVERSO DE LA IA",
    "FEATURED WORLDS & EXPERIMENTS": "MUNDOS Y EXPERIMENTOS DESTACADOS", "DISCOVER WHAT'S NEXT": "DESCUBRE LO QUE VIENE",
    "WATCH THE": "VER EL", "THE UNIVERSE": "EL UNIVERSO", "THE ARCADE": "LOS JUEGOS",
    "ENTER THE": "ENTRA EN EL", "PLAYGROUND": "UNIVERSO DE JUEGOS", "MORE GAMES": "MÁS JUEGOS",
    "THE FUTURE COMMUNITY TOKEN": "EL FUTURO TOKEN DE LA COMUNIDAD", "DARK MODE": "MODO OSCURO", "LIGHT MODE": "MODO CLARO", "Toggle dark / light mode": "Alternar modo oscuro / claro", "DESERT MODE": "MODO DESIERTO", "NEON MODE": "MODO NEÓN", "Switch theme": "Cambiar tema", "AI STUDIO OWL TOKEN": "TOKEN AI STUDIO OWL",
    "LAUNCH STATUS": "ESTADO DEL LANZAMIENTO", "LAUNCH PLATFORM": "PLATAFORMA DE LANZAMIENTO", "CONTRACT ADDRESS (CA)": "DIRECCIÓN DEL CONTRATO (CA)",
    "OUR DIRECTIVE": "NUESTRA DIRECTRIZ", "IDEAS FIRST.": "LAS IDEAS PRIMERO.", "LIMITS LAST.": "LOS LÍMITES AL FINAL.",
    "GAMES, CREATIVITY AND TECHNOLOGY — ONE OPEN UNIVERSE.": "JUEGOS, CREATIVIDAD Y TECNOLOGÍA: UN UNIVERSO ABIERTO.",
    "THE MISSION LOG": "DIARIO DE MISIÓN", "QUESTIONS": "PREGUNTAS", "SAFETY": "SEGURIDAD",
    "GOOD TO KNOW": "BUENO SABERLO", "STRAIGHT ANSWERS.": "RESPUESTAS DIRECTAS.", "NO HYPE.": "SIN HUMO.",
    "BACK TO HOME": "VOLVER AL INICIO", "OFFICIAL LINKS": "ENLACES OFICIALES", "STAY SAFE.": "MANTENTE A SALVO.",
    "OFFICIAL TRAILER": "TRÁILER OFICIAL", "SUBSCRIBE ON YOUTUBE": "SUSCRÍBETE EN YOUTUBE", "OPEN FULL PAGE": "ABRIR PÁGINA COMPLETA",
    "READ THE SAGA": "LEER LA SAGA", "PLAY NOW": "JUGAR AHORA", "WATCH NOW": "VER AHORA",
    "WEBSITE": "SITIO WEB", "YOUTUBE": "YOUTUBE", "X": "X"
  }
};


Object.assign(dictionaries["pt-BR"], {
  "AI WORLD": "MUNDO IA", "VIDEO": "VÍDEO", "THE GRAPHIC NOVEL": "A HQ", "THE SAGA": "A SAGA",
  "EVERY CHOICE IS A THREAD.": "CADA ESCOLHA É UM FIO.", "OPEN FULL PAGE": "ABRIR PÁGINA COMPLETA", "SUBSCRIBE ON YOUTUBE": "INSCREVA-SE NO YOUTUBE",
  "VOL. 01 // THE OBSIDIAN SANCTUM": "VOL. 01 // O SANTUÁRIO OBSIDIANA", "READ VOL. 01": "LER VOL. 01",
  "GET NOTIFIED ON VOL. 02": "AVISE-ME SOBRE O VOL. 02", "MEET THE LEGENDS": "CONHEÇA AS LENDAS",
  "THE SAGA CONTINUES": "A SAGA CONTINUA", "THE VAULT": "O COFRE", "THE DIVINE": "AS DIVINDADES",
  "VIEW IN 3D": "VER EM 3D", "READ BIO": "LER BIOGRAFIA", "CONCEPT ART // PREVIEW ONLY // MINTING IS NOT LIVE": "ARTE CONCEITUAL // APENAS PRÉVIA // MINT AINDA NÃO DISPONÍVEL",
  "WHAT'S NEW": "NOVIDADES", "THE STUDIO LOG": "DIÁRIO DO ESTÚDIO", "SHIPPING": "PUBLICANDO", "IN PUBLIC.": "EM PÚBLICO.",
  "THE COMMUNITY": "A COMUNIDADE", "JOIN": "PARTICIPE", "THE OWL UNIVERSE": "DO UNIVERSO OWL", "NEW IDEAS. NEW WORLDS.": "NOVAS IDEIAS. NOVOS MUNDOS.",
  "BE PART OF WHAT'S NEXT.": "FAÇA PARTE DO QUE VEM A SEGUIR.", "FOLLOW AI STUDIO OWL": "SIGA O AI STUDIO OWL",
  "Follow our official channels for new AI projects, experiments, creator culture, games and platform announcements.": "Acompanhe nossos canais oficiais para conhecer novos projetos de IA, experimentos, cultura de criadores, games e novidades da plataforma.",
  "JOIN THE GRID": "ENTRE NO UNIVERSO", "OFFICIAL LINKS": "LINKS OFICIAIS", "STAY SAFE.": "MANTENHA-SE SEGURO.",
  "QUESTIONS": "PERGUNTAS", "SAFETY": "SEGURANÇA", "THE ARCADE": "OS GAMES", "THE UNIVERSE": "O UNIVERSO",
  "THE FUTURE COMMUNITY TOKEN": "O FUTURO TOKEN DA COMUNIDADE", "AI STUDIO OWL TOKEN": "TOKEN AI STUDIO OWL",
  "The future community token for the AI STUDIO OWL ecosystem. Official launch details will be published on our verified channels.": "O futuro token comunitário do ecossistema AI STUDIO OWL. Os detalhes oficiais do lançamento serão publicados em nossos canais verificados.",
  "The token has not launched. There is no official contract address, market price, liquidity pool, or trading link at this time. Beware of impersonators and unofficial tokens.": "O token ainda não foi lançado. Não há endereço oficial de contrato, preço de mercado, pool de liquidez ou link de negociação neste momento. Cuidado com imitadores e tokens não oficiais.",
  "TICKER": "TICKER", "LAUNCH STATUS": "STATUS DO LANÇAMENTO", "LAUNCH PLATFORM": "PLATAFORMA DE LANÇAMENTO", "CONTRACT ADDRESS (CA)": "ENDEREÇO DO CONTRATO (CA)",
  "CA: COMING SOON": "CA: EM BREVE", "ANNOUNCEMENT COMING SOON": "ANÚNCIO EM BREVE", "PUMP.FUN LAUNCH": "LANÇAMENTO NA PUMP.FUN", "EXPLORE GAMES ↗": "EXPLORAR GAMES ↗",
  "EXPERIMENT": "EXPERIMENTO", "PROTOTYPE": "PROTÓTIPO", "LIVE": "AO VIVO", "COMING SOON": "EM BREVE", "READ NOW": "LER AGORA",
  "The studio's independent platform exploring the universe of artificial intelligence.": "A plataforma independente do estúdio que explora o universo da inteligência artificial.",
  "A snake game with an idle twist. Collect coins to grow, take down rivals, or let the Auto-Bot play while you are away. Opens in a new tab.": "Um jogo de cobrinha com mecânicas idle. Colete moedas para crescer, derrote rivais ou deixe o Auto-Bot jogar enquanto você estiver ausente. Abre em uma nova aba.",
  "An idle auto-battler RPG in the universe of the Grid. Summon Operators, build a 5-slot formation, clear 100 campaign stages, run dungeons and the Ancient Tower, and gear up with Obsidian, Lunar and Thread sets. Opens in a new tab.": "Um RPG auto-battler idle no universo da Grid. Invoque Operadores, monte uma formação de 5 espaços, conclua 100 fases da campanha, explore masmorras e a Torre Antiga e equipe conjuntos Obsidiana, Lunar e Thread. Abre em uma nova aba.",
  "An idle grid bomber. Send your Operators into the field to plant bombs, blow open chests and farm $BOMBERSI while you are away. Manage stamina, speed and luck, and level up legends like Jax and Orion. Opens in a new tab.": "Um bomber de grade com mecânicas idle. Envie seus Operadores para plantar bombas, abrir baús e coletar $BOMBERSI enquanto você estiver ausente. Gerencie energia, velocidade e sorte e evolua lendas como Jax e Orion. Abre em uma nova aba.",
  "Do I need a wallet to play?": "Preciso de uma carteira para jogar?", "No. Games open in your browser. On this site the wallet button is optional, and it only asks to connect. It never requests a signature or a transaction. Some game sites have their own optional wallet features, so always read what a wallet asks you to approve.": "Não. Os games abrem no navegador. Neste site, o botão de carteira é opcional e apenas solicita a conexão. Ele nunca pede assinatura ou transação. Alguns jogos podem ter recursos opcionais de carteira; sempre leia o que está sendo solicitado.",
  "Are the NFT cards for sale?": "As cartas NFT estão à venda?", "Not yet. The cards on this site are concept-art previews and minting is not live. Prices shown are planned values and may change.": "Ainda não. As cartas são prévias de arte conceitual e o mint ainda não está disponível. Os preços exibidos são valores planejados e podem mudar.",
  "Is any of this an investment?": "Isso é um investimento?", "No. AI STUDIO OWL explores artificial intelligence and digital creativity. Nothing here is financial advice or a promise of returns or value, and digital items can lose all of their value. Only spend what you would spend on entertainment.": "Não. O AI STUDIO OWL explora inteligência artificial e criatividade digital. Nada aqui é aconselhamento financeiro ou promessa de retorno ou valorização; itens digitais podem perder todo o valor. Gaste apenas o que gastaria com entretenimento.",
  "Will you ever ask for my seed phrase?": "Vocês pedirão minha frase-semente?", "Never. Do not share your seed phrase or private key with anyone, and be careful with anyone who messages you first asking you to connect a wallet or sign something. The official links are listed in the Join section of this page.": "Nunca. Não compartilhe sua frase-semente ou chave privada. Tenha cuidado com quem enviar mensagens primeiro pedindo conexão de carteira ou assinatura. Os links oficiais estão na seção de comunidade desta página.",
  "What does Experiment or Prototype mean?": "O que significa Experimento ou Protótipo?", "These are early builds. They can have bugs, change quickly, or be reset as we learn what makes them fun.": "São versões iniciais. Podem conter bugs, mudar rapidamente ou ser reiniciadas enquanto descobrimos como torná-las mais divertidas.",
  "Where do I follow updates?": "Onde acompanho as novidades?", "The Studio Log on this page lists what ships. The Join section has the community links and the waitlist as soon as they are open.": "O Diário do Estúdio nesta página lista as novidades. A seção de comunidade reúne os links oficiais e a lista de espera, quando estiver disponível.",
  "Bomber.Idle joins the arcade": "Bomber.Idle chega aos games", "Send your Operators out to blow up blocks and collect coins. A second experiment, now playable right here on the site.": "Envie seus Operadores para explodir blocos e coletar moedas. Um segundo experimento, jogável aqui mesmo no site.",
  "The AI World Owl universe is live": "O universo AI World Owl está no ar", "Read the prologue and open the dossier of every Operator, from Orion to Vex.": "Leia o prólogo e abra o dossiê de cada Operador, de Orion a Vex.",
  "Operator card previews": "Prévia das cartas de Operadores", "Eight collectible concept cards are on display. Minting is not live yet.": "Oito cartas colecionáveis conceituais estão em exibição. O mint ainda não está disponível."
});

Object.assign(dictionaries.es, {
  "THE GRAPHIC NOVEL": "LA NOVELA GRÁFICA", "THE SAGA": "LA SAGA", "EVERY CHOICE IS A THREAD.": "CADA ELECCIÓN ES UN HILO.",
  "OPEN FULL PAGE": "ABRIR PÁGINA COMPLETA", "SUBSCRIBE ON YOUTUBE": "SUSCRÍBETE EN YOUTUBE", "VOL. 01 // THE OBSIDIAN SANCTUM": "VOL. 01 // EL SANTUARIO OBSIDIANA",
  "READ VOL. 01": "LEER VOL. 01", "GET NOTIFIED ON VOL. 02": "AVÍSAME DEL VOL. 02", "MEET THE LEGENDS": "CONOCE A LAS LEYENDAS",
  "THE SAGA CONTINUES": "LA SAGA CONTINÚA", "THE VAULT": "LA BÓVEDA", "THE DIVINE": "LO DIVINO", "VIEW IN 3D": "VER EN 3D",
  "READ BIO": "LEER BIOGRAFÍA", "CONCEPT ART // PREVIEW ONLY // MINTING IS NOT LIVE": "ARTE CONCEPTUAL // SOLO VISTA PREVIA // MINT NO DISPONIBLE",
  "WHAT'S NEW": "NOVEDADES", "THE STUDIO LOG": "REGISTRO DEL ESTUDIO", "SHIPPING": "PUBLICANDO", "IN PUBLIC.": "EN PÚBLICO.",
  "THE COMMUNITY": "LA COMUNIDAD", "THE OWL UNIVERSE": "AL UNIVERSO OWL", "NEW IDEAS. NEW WORLDS.": "NUEVAS IDEAS. NUEVOS MUNDOS.",
  "BE PART OF WHAT'S NEXT.": "FORMA PARTE DE LO QUE VIENE.", "FOLLOW AI STUDIO OWL": "SIGUE A AI STUDIO OWL",
  "Follow our official channels for new AI projects, experiments, creator culture, games and platform announcements.": "Sigue nuestros canales oficiales para conocer nuevos proyectos de IA, experimentos, cultura de creadores, juegos y novedades de la plataforma.",
  "The future community token for the AI STUDIO OWL ecosystem. Official launch details will be published on our verified channels.": "El futuro token comunitario del ecosistema AI STUDIO OWL. Los detalles oficiales del lanzamiento se publicarán en nuestros canales verificados.",
  "The token has not launched. There is no official contract address, market price, liquidity pool, or trading link at this time. Beware of impersonators and unofficial tokens.": "El token aún no se ha lanzado. No existe una dirección de contrato oficial, precio de mercado, pool de liquidez ni enlace de negociación. Cuidado con imitadores y tokens no oficiales.",
  "TICKER": "TICKER", "EXPERIMENT": "EXPERIMENTO", "PROTOTYPE": "PROTOTIPO", "LIVE": "EN VIVO", "READ NOW": "LEER AHORA",
  "A snake game with an idle twist. Collect coins to grow, take down rivals, or let the Auto-Bot play while you are away. Opens in a new tab.": "Un juego de serpientes con mecánicas idle. Recoge monedas para crecer, derrota rivales o deja que el Auto-Bot juegue mientras estás fuera. Se abre en una nueva pestaña.",
  "An idle auto-battler RPG in the universe of the Grid. Summon Operators, build a 5-slot formation, clear 100 campaign stages, run dungeons and the Ancient Tower, and gear up with Obsidian, Lunar and Thread sets. Opens in a new tab.": "Un RPG auto-battler idle en el universo de Grid. Invoca Operadores, crea una formación de 5 espacios, supera 100 etapas de campaña, explora mazmorras y la Torre Antigua y equipa conjuntos Obsidiana, Lunar y Thread. Se abre en una nueva pestaña.",
  "An idle grid bomber. Send your Operators into the field to plant bombs, blow open chests and farm $BOMBERSI while you are away. Manage stamina, speed and luck, and level up legends like Jax and Orion. Opens in a new tab.": "Un bomber de cuadrícula con mecánicas idle. Envía a tus Operadores a colocar bombas, abrir cofres y conseguir $BOMBERSI mientras estás fuera. Gestiona energía, velocidad y suerte y mejora leyendas como Jax y Orion. Se abre en una nueva pestaña.",
  "Do I need a wallet to play?": "¿Necesito una billetera para jugar?", "Are the NFT cards for sale?": "¿Las cartas NFT están a la venta?", "Is any of this an investment?": "¿Esto es una inversión?",
  "Will you ever ask for my seed phrase?": "¿Alguna vez pedirán mi frase semilla?", "What does Experiment or Prototype mean?": "¿Qué significa Experimento o Prototipo?", "Where do I follow updates?": "¿Dónde sigo las novedades?",
  "Bomber.Idle joins the arcade": "Bomber.Idle llega a los juegos", "The AI World Owl universe is live": "El universo AI World Owl ya está disponible", "Operator card previews": "Vistas previas de cartas de Operadores"
});

const originalText = new WeakMap<Text, { original: string; rendered: string }>();
const originalAttributes = new WeakMap<Element, Map<string, { original: string; rendered: string }>>();
let activeLanguage: SiteLanguage = "en";
let observer: MutationObserver | null = null;
const textAttributes = ["aria-label", "title", "placeholder"] as const;

function translateTree(root: ParentNode): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    let state = originalText.get(node);
    if (!state) {
      const value = node.nodeValue ?? "";
      state = { original: value, rendered: value };
      originalText.set(node, state);
    } else if (node.nodeValue !== state.rendered) {
      // Another component updated this text node; adopt the new source before translating it.
      state.original = node.nodeValue ?? "";
    }
    const original = state.original;
    const trimmed = original.trim();
    const translated = activeLanguage === "en" ? trimmed : (dictionaries[activeLanguage][trimmed] ?? trimmed);
    const start = trimmed ? original.indexOf(trimmed) : -1;
    const target = start >= 0 ? original.slice(0, start) + translated + original.slice(start + trimmed.length) : original;
    if (node.nodeValue !== target) node.nodeValue = target;
    state.rendered = target;
  }
  if (root instanceof Element) {
    const elements = [root, ...root.querySelectorAll("*")];
    for (const el of elements) {
      let saved = originalAttributes.get(el);
      if (!saved) { saved = new Map(); originalAttributes.set(el, saved); }
      for (const attr of textAttributes) {
        const value = el.getAttribute(attr);
        if (value === null) continue;
        let state = saved.get(attr);
        if (!state) { state = { original: value, rendered: value }; saved.set(attr, state); }
        else if (value !== state.rendered) state.original = value;
        const translated = activeLanguage === "en" ? state.original : (dictionaries[activeLanguage][state.original] ?? state.original);
        if (translated !== value) el.setAttribute(attr, translated);
        state.rendered = translated;
      }
    }
  }
}

export function setSiteLanguage(language: SiteLanguage): void {
  activeLanguage = language;
  document.documentElement.lang = language === "pt-BR" ? "pt-BR" : language;
  try { if (language === "en") sessionStorage.removeItem("aiowl-language"); else sessionStorage.setItem("aiowl-language", language); } catch { /* storage may be disabled */ }
  translateTree(document.body);
  document.querySelectorAll<HTMLButtonElement>("[data-language]").forEach((button) => {
    const selected = button.dataset.language === language;
    button.classList.toggle("is-active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

export function initLanguageSwitcher(): void {
  let initial: SiteLanguage = "en";
  try {
    const saved = sessionStorage.getItem("aiowl-language");
    if (saved === "pt-BR" || saved === "es") initial = saved;
  } catch { /* fresh session falls back to English */ }
  document.querySelectorAll<HTMLButtonElement>("[data-language]").forEach((button) => {
    button.addEventListener("click", () => {
      const language = button.dataset.language;
      if (language === "pt-BR" || language === "es" || language === "en") setSiteLanguage(language);
    });
  });
  setSiteLanguage(initial);
  if (!observer) {
    observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "childList") record.addedNodes.forEach((n) => { if (n instanceof Element) translateTree(n); else if (n instanceof Text && n.parentElement) translateTree(n.parentElement); });
        else if (record.type === "characterData" && record.target instanceof Text) translateTree(record.target.parentElement ?? document.body);
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  }
}
