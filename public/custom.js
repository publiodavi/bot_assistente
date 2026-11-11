(() => {
  "use strict";

  if (document.getElementById("study-ambient")) return;
  const channel = "fatec-study";
  const storageKey = "fatec-study.preferences.v3";
  const assets = new URL(".", document.currentScript.src);
  const root = document.documentElement;
  root.lang = "pt-BR";
  const themes = new Set(["vintage", "castelo", "aracnideo", "cyberpunk"]);
  const characterIds = new Set(["harry", "hermione", "dumbledore", "voldemort", "spiderman", "miles"]);
  const mascots = new Set(["coruja", "raposa", "robo", "oculto", ...characterIds]);
  const levels = new Set(["menos", "guiadas", "mais"]);
  const statuses = {
    idle: "Na mesa com você.",
    thinking: "Pensando no próximo degrau…",
    encouraging: "Uma pista de cada vez.",
    celebrating: "Degrau conquistado.",
    unlocked: "Próximo degrau liberado.",
  };

  // Chainlit 2.12 reads localStorage while its bundle loads. If the browser
  // denies that API, keep its storage in memory for this page only.
  try {
    window.localStorage.getItem("userEnv");
  } catch {
    const memory = new Map();
    try {
      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: {
          get length() { return memory.size; },
          key: index => Array.from(memory.keys())[index] ?? null,
          getItem: key => memory.get(String(key)) ?? null,
          setItem: (key, value) => { memory.set(String(key), String(value)); },
          removeItem: key => { memory.delete(String(key)); },
          clear: () => { memory.clear(); },
        },
      });
    } catch {
      // Some browsers may also make the property non-configurable.
    }
  }

  function validPreferences(value) {
    return value && themes.has(value.theme) && mascots.has(value.mascot)
      && levels.has(value.zdp) && typeof value.mascot_name === "string"
      && Array.from(value.mascot_name).length <= 24;
  }

  function readPreferences() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey));
      return validPreferences(value) ? value : null;
    } catch {
      return null;
    }
  }

  const demoPreferences = readPreferences();
  let confirmed = null;
  let visible = {
    theme: "vintage", appearance: "light", animations: "enabled",
    mascot: "coruja", mascot_name: "Lumi", zdp: "guiadas",
  };
  // Escolhas ainda não confirmadas pelo servidor (prévia imediata).
  let desiredPreferences = {};
  root.dataset.studyTheme = visible.theme;

  const preload = document.createElement("link");
  preload.rel = "preload";
  preload.as = "font";
  preload.type = "font/woff2";
  preload.crossOrigin = "anonymous";
  preload.href = new URL("fonts/sourcesans3-400.woff2", assets);
  document.head.append(preload);
  const prepareFonts = () => {
    for (const font of [
      '600 1em "Study Lora"', '600 1em "Study Cinzel"',
      '600 1em "Study Barlow Condensed"', '400 1em "Study Barlow"',
      '700 1em "Study Space Mono"', '400 1em "Study Inter"',
      '400 1em "Study IBM Plex Mono"',
    ]) {
      document.fonts.load(font).catch(() => {});
    }
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(prepareFonts);
  else setTimeout(prepareFonts, 1000);

  const ambient = document.createElement("div");
  ambient.id = "study-ambient";
  ambient.setAttribute("aria-hidden", "true");
  document.body.prepend(ambient);
  const effects = element("div", "", "study-effects");
  effects.setAttribute("aria-hidden", "true");
  effects.append(element("i", "", "study-effects__actor"), element("i", "", "study-effects__actor"));
  document.body.prepend(effects);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  function updateMotion() {
    root.dataset.studyMotion = reducedMotion.matches || document.hidden
      || (desiredPreferences.animations || visible.animations) === "paused" ? "paused" : "enabled";
    motionStatus.textContent = reducedMotion.matches
      ? "Seu sistema está com movimento reduzido. Os efeitos ficam pausados." : "";
  }
  document.addEventListener("visibilitychange", updateMotion);
  reducedMotion.addEventListener("change", updateMotion);

  const widget = document.createElement("aside");
  widget.className = "study-mascot";
  widget.setAttribute("aria-label", "Companheiro de estudos");
  const image = document.createElement("img");
  image.alt = "";
  image.width = 48;
  image.height = 48;
  image.className = "study-mascot__image";
  const character = element("span", "", "study-mascot__character");
  character.hidden = true;
  const details = document.createElement("div");
  details.id = "study-mascot-details";
  details.className = "study-mascot__details";
  const name = document.createElement("strong");
  name.className = "study-mascot__name";
  const status = document.createElement("div");
  status.className = "study-mascot__status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-atomic", "true");
  const toggle = document.createElement("button");
  toggle.className = "study-mascot__toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-controls", details.id);
  details.append(name, status);
  widget.append(image, character, details, toggle);

  let collapsed = false;
  let currentExpression = "idle";
  function render(expression) {
    currentExpression = expression;
    const mascot = desiredPreferences.mascot || visible.mascot;
    widget.hidden = mascot === "oculto";
    if (widget.hidden) return;
    widget.dataset.expression = expression;
    if (name.textContent !== visible.mascot_name) name.textContent = visible.mascot_name;
    if (status.textContent !== statuses[expression]) status.textContent = statuses[expression];
    const isCharacter = characterIds.has(mascot);
    image.hidden = isCharacter;
    character.hidden = !isCharacter;
    if (isCharacter && character.firstElementChild?.dataset.character !== mascot) {
      character.replaceChildren(characterArt(mascot));
    } else if (!isCharacter) {
      const src = new URL(`mascots/${mascot}-${expression}.webp`, assets).href;
      if (image.src !== src) image.src = src;
    }
  }

  function renderToggle() {
    details.hidden = collapsed;
    toggle.textContent = collapsed ? "+" : "−";
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", collapsed ? "Expandir companheiro" : "Recolher companheiro");
  }

  toggle.addEventListener("click", () => {
    collapsed = !collapsed;
    renderToggle();
  });
  renderToggle();

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  }

  function button(text, callback, className = "study-button") {
    const node = element("button", text, className);
    node.type = "button";
    node.addEventListener("click", callback);
    return node;
  }

  function characterArt(id) {
    const art = element("span", "", "study-character");
    art.dataset.character = id;
    art.setAttribute("aria-hidden", "true");
    for (const part of ["broom", "body", "arm", "foot", "face", "hair", "hat",
      "eye-left", "eye-right", "glasses", "scar", "smile", "beard", "web"]) {
      art.append(element("span", "", `study-character__${part}`));
    }
    return art;
  }

  function spiderArt() {
    const art = element("span", "", "study-spider");
    art.setAttribute("aria-hidden", "true");
    for (let leg = 0; leg < 8; leg++) art.append(element("span", "", "study-spider__leg"));
    art.append(element("span", "", "study-spider__body"), element("span", "", "study-spider__head"));
    return art;
  }

  function panel(title) {
    const dialog = element("dialog", "", "study-dialog");
    const heading = element("h2", title);
    heading.id = "study-dialog-" + document.querySelectorAll(".study-dialog").length;
    dialog.setAttribute("aria-labelledby", heading.id);
    const header = element("div", "", "study-dialog__header");
    header.append(heading, button("Fechar", () => dialog.close()));
    const body = element("div", "", "study-dialog__body");
    dialog.append(header, body);
    document.body.append(dialog);
    return { dialog, body };
  }

  const catalog = {
    vintage: ["Caderno Vintage", "Papel, luz quente e anotações"],
    castelo: ["Castelo da Magia", "Biblioteca noturna e dourado"],
    aracnideo: ["Herói Aracnídeo", "Cidade em carmesim e azul-marinho"],
    cyberpunk: ["Cyberpunk", "Estação noturna e luz ciano"],
  };
  const goals = { entender: "Entender um conceito", destravar: "Destravar uma dúvida", praticar: "Praticar um assunto" };
  const barriers = { comecar: "Começar", proximo: "Escolher o próximo passo", conferir: "Conferir meu raciocínio" };
  const notices = element("div", "", "study-notice");
  notices.setAttribute("role", "status");
  document.body.append(notices);
  let noticeTimer;
  function notify(text) {
    const target = document.querySelector(".study-dialog[open]") || document.body;
    if (notices.parentElement !== target) target.append(notices);
    notices.textContent = text;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { notices.textContent = ""; }, 5500);
  }

  const gallery = panel("Temas");
  const themeGrid = element("div", "", "study-theme-grid");
  const themeCards = {};
  for (const [id, [title, description]] of Object.entries(catalog)) {
    const card = button("", () => choosePreferences({ theme: id }), "study-theme-card");
    card.dataset.preview = id;
    card.append(element("span", "", "study-theme-card__art"), element("strong", title),
      element("span", description));
    themeCards[id] = card;
    themeGrid.append(card);
  }
  const appearanceControls = element("div", "", "study-choice-row");
  appearanceControls.setAttribute("role", "group");
  appearanceControls.setAttribute("aria-label", "Aparência");
  const appearanceButtons = {};
  for (const [id, label] of [["light", "Claro"], ["dark", "Escuro"]]) {
    const control = button(label, () => choosePreferences({ appearance: id }));
    appearanceButtons[id] = control;
    appearanceControls.append(control);
  }
  const motionButton = button("Animações ativadas", () => choosePreferences({
    animations: (desiredPreferences.animations || visible.animations) === "enabled" ? "paused" : "enabled",
  }));
  const motionStatus = element("p", "", "study-muted");
  motionStatus.setAttribute("role", "status");
  gallery.body.append(themeGrid, appearanceControls, motionButton, motionStatus);

  const companionPanel = panel("Companheiro");
  companionPanel.body.classList.add("study-companion-grid");
  const companionCards = {};
  for (const [id, title] of Object.entries({
    coruja: "Coruja", raposa: "Raposa", robo: "Robô",
    harry: "Harry", hermione: "Hermione", dumbledore: "Dumbledore", voldemort: "Voldemort",
    spiderman: "Homem-Aranha", miles: "Miles Morales", oculto: "Oculto",
  })) {
    const card = button("", () => choosePreferences({ mascot: id }), "study-companion-card");
    if (characterIds.has(id)) {
      card.append(characterArt(id));
    } else if (id !== "oculto") {
      const preview = element("span", "", "study-companion-preview");
      for (const expression of ["idle", "thinking"]) {
        const img = document.createElement("img");
        img.src = new URL(`mascots/${id}-${expression}.webp`, assets);
        img.alt = "";
        img.width = 96;
        img.height = 96;
        preview.append(img);
      }
      card.append(preview);
    } else card.append(element("span", "Sem companheiro na tela", "study-muted"));
    card.append(element("strong", title));
    companionCards[id] = card;
    companionPanel.body.append(card);
  }

  const profilePanel = panel("Meu perfil");
  const introPanel = panel("Primeiros passos");
  const tools = element("div", "", "study-tools");
  tools.hidden = true;
  tools.append(button("Temas", () => gallery.dialog.showModal()),
    button("Companheiro", () => companionPanel.dialog.showModal()),
    button("Perfil", () => {
      buildProfile();
      profilePanel.dialog.showModal();
    }));

  let profile = null;
  let account = null;
  let lastAutoIntroAccount = null;
  let entryBypassed = false;
  let studyMode = "guia";
  const welcome = element("section", "", "study-welcome");
  const cover = element("div", "", "study-cover");
  const welcomeTitle = element("h1", "Sobre o que é o caderno de hoje?");
  const welcomeText = element("p", "Escreva o assunto na etiqueta. Seu companheiro sobe com você, um degrau de cada vez.");
  const demoBanner = element("p", "", "study-demo-banner");
  cover.append(welcomeTitle, welcomeText, topicForm(), button("Só abrir uma folha em branco", () => {
    entryBypassed = true;
    adaptChainlit();
    document.getElementById("chat-input")?.focus();
  }, "study-link-button"));
  const recentSection = element("section", "", "study-recent");
  const recentTitle = element("h2", "Continuar de onde parou");
  const recentList = element("ul", "", "study-recent__list");
  recentSection.append(recentTitle, recentList);
  recentSection.hidden = true;
  welcome.append(cover, recentSection);

  function renderRecent(items) {
    recentList.replaceChildren(...items.map((item) => {
      const entry = element("li");
      const link = element("a", "", "study-recent__item");
      link.href = `/thread/${encodeURIComponent(item.id)}`;
      link.append(element("span", item.name, "study-recent__name"),
        element("span", item.degrau ? `Degrau ${item.degrau}` : "Ainda no começo", "study-recent__step"));
      entry.append(link);
      return entry;
    }));
    recentSection.hidden = items.length === 0;
  }

  // Mesa de estudos: objetos ao redor da folha (escada, condução e cadernos).
  const desk = element("aside", "", "study-desk");
  desk.setAttribute("aria-label", "Mesa de estudos");
  const ladder = element("section", "", "study-ladder");
  const ladderTitle = element("h2", "Escada");
  const ladderCurrent = element("p", "", "study-ladder__current");
  const ladderList = element("ol", "", "study-ladder__steps");
  const ladderNote = element("p", "Os degraus aparecem quando a conversa começar.", "study-muted");
  ladder.append(ladderTitle, ladderCurrent, ladderList, ladderNote);
  const lead = element("section", "", "study-lead");
  lead.append(element("h2", "Quem conduz?"));
  const leadButtons = {};
  const leadRow = element("div", "", "study-choice-row");
  leadRow.setAttribute("role", "group");
  leadRow.setAttribute("aria-label", "Quem conduz a conversa");
  for (const id of ["guia", "aprendiz"]) {
    const control = button("", async () => {
      if (studyMode === id) return;
      const previous = studyMode;
      studyMode = id;
      renderLead();
      if (!(await request("study.mode", { mode: id }))) {
        studyMode = previous;
        renderLead();
      }
    });
    leadButtons[id] = control;
    leadRow.append(control);
  }
  const leadHint = element("p", "", "study-muted");
  lead.append(leadRow, leadHint);
  const shelf = button("Cadernos", () => document.getElementById("sidebar-trigger-button")?.click(), "study-button study-shelf");
  desk.append(ladder, lead, shelf);

  function renderLead() {
    const companion = visible.mascot_name;
    leadButtons.guia.textContent = `${companion} guia`;
    leadButtons.aprendiz.textContent = `${companion} aprende`;
    for (const [id, control] of Object.entries(leadButtons)) {
      control.setAttribute("aria-pressed", String(id === studyMode));
    }
    leadHint.textContent = studyMode === "guia"
      ? `${companion} dá pistas em degraus. Abra uma dica só quando precisar.`
      : `Você explica e ${companion} tenta aprender, apontando o que ficou claro e o que faltou.`;
  }

  function renderLadder(steps) {
    ladderList.replaceChildren(...steps.map((step) => {
      const help = step.reveladas ? `com ${step.reveladas} ${step.reveladas === 1 ? "dica" : "dicas"}` : "sem dicas";
      const item = element("li", "", "study-ladder__step");
      if (step.sozinho) item.classList.add("study-ladder__step--solo");
      if (step.tipo === "ensino") item.classList.add("study-ladder__step--teach");
      item.append(element("strong", `Degrau ${step.degrau}`),
        element("span", step.tipo === "ensino" ? "você ensinou" : step.sozinho ? "subiu sozinho" : help));
      return item;
    }));
    const top = steps.reduce((highest, step) => Math.max(highest, step.degrau), 0);
    ladderCurrent.textContent = top ? `Você está no degrau ${top}` : "";
    ladderNote.hidden = steps.length > 0;
  }

  function addField(form, label, field) {
    const wrapper = element("label", label);
    wrapper.append(field);
    form.append(wrapper);
  }

  function selectField(options, value) {
    const input = element("select");
    input.append(new Option("Escolha uma opção", ""));
    for (const [id, label] of Object.entries(options)) input.append(new Option(label, id));
    input.value = value;
    return input;
  }

  function buildProfile() {
    const form = element("form", "", "study-form");
    const nameInput = element("input");
    nameInput.value = profile.name;
    nameInput.required = true;
    nameInput.maxLength = 60;
    nameInput.autocomplete = "nickname";
    const goal = selectField(goals, profile.goal);
    const barrier = selectField(barriers, profile.barrier);
    addField(form, "Nome de exibição", nameInput);
    addField(form, "Objetivo de estudo", goal);
    addField(form, "Dificuldade mais comum", barrier);
    const submit = element("button", "Salvar perfil", "study-button study-button--primary");
    submit.type = "submit";
    form.append(submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      if (await request("study.profile", { name: nameInput.value, goal: goal.value, barrier: barrier.value })) {
        profilePanel.dialog.close();
      }
      submit.disabled = false;
    });
    const companion = button("Nome do companheiro e dicas", () => {
      profilePanel.dialog.close();
      document.getElementById("chat-settings-header-button")?.click();
    });
    const themesButton = button("Preferências visuais", () => {
      profilePanel.dialog.close();
      gallery.dialog.showModal();
    });
    const introButton = button("Escolher um assunto", () => {
      profilePanel.dialog.close();
      openIntro();
    });
    profilePanel.body.replaceChildren(form, companion, themesButton, introButton);
  }

  function topicForm() {
    const form = element("form", "", "study-form study-topic-form");
    const topic = element("textarea");
    topic.required = true;
    topic.maxLength = 2000;
    topic.rows = 2;
    topic.placeholder = "fotossíntese, equações, um exercício…";
    addField(form, "Caderno de", topic);
    // Marcadores de página no lugar de uma lista suspensa; escolha opcional.
    const markers = element("fieldset", "", "study-markers");
    markers.append(element("legend", "Marcador (opcional)"));
    for (const [id, label] of Object.entries(goals)) {
      const option = element("label", "", "study-marker");
      const input = element("input");
      input.type = "radio";
      input.name = "goal";
      input.value = id;
      input.addEventListener("click", () => {
        // Clicar de novo no marcador escolhido o remove.
        if (input.dataset.checked === "true") input.checked = false;
        for (const other of markers.querySelectorAll("input")) other.dataset.checked = String(other.checked);
      });
      option.append(input, element("span", label));
      markers.append(option);
    }
    form.append(markers);
    const submit = element("button", "Abrir o caderno", "study-button study-button--primary");
    submit.type = "submit";
    submit.disabled = true;
    form.append(submit);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!topic.value.trim()) return;
      submit.disabled = true;
      const goal = markers.querySelector("input:checked")?.value || "";
      const saved = await request("study.start", { topic: topic.value.trim(), goal });
      submit.disabled = false;
      if (saved) {
        introPanel.dialog.close();
        document.getElementById("chat-input")?.focus();
      }
    });
    return form;
  }

  function openIntro() {
    introPanel.body.replaceChildren(
      element("p", "O que você quer aprender hoje?"),
      topicForm(),
      button("Pular por agora", async () => {
        if (await request("study.intro", { command: "skip" })) introPanel.dialog.close();
      }),
    );
    for (const submit of introPanel.body.querySelectorAll('[type="submit"]')) submit.disabled = false;
    if (!introPanel.dialog.open) introPanel.dialog.showModal();
  }

  function adaptChainlit() {
    const composer = document.getElementById("message-composer");
    if (composer && widget.nextElementSibling !== composer) composer.before(widget);
    placeDesk(composer);
    const header = document.getElementById("header")?.lastElementChild;
    if (header && tools.parentElement !== header) header.prepend(tools);
    const headerRoot = document.getElementById("header");
    if (headerRoot && demoBanner.previousElementSibling !== headerRoot) headerRoot.after(demoBanner);
    const welcomeScreen = document.getElementById("welcome-screen");
    root.dataset.studyEntry = welcomeScreen && !entryBypassed ? "topic" : "chat";
    if (welcomeScreen && !entryBypassed && welcome.parentElement !== welcomeScreen) welcomeScreen.prepend(welcome);
    if ((!welcomeScreen || entryBypassed) && welcome.isConnected) welcome.remove();

    for (const [id, label] of [
      ["chat-settings-header-button", "Configurações do chat"],
      ["chat-submit", "Enviar mensagem"],
      ["stop-button", "Parar resposta"],
    ]) {
      const button = document.getElementById(id);
      if (button && !button.hasAttribute("aria-label")) button.setAttribute("aria-label", label);
    }
    const applyLabel = document.querySelector("#confirm-sidebar > span")?.firstChild;
    if (applyLabel?.nodeType === Node.TEXT_NODE && applyLabel.data !== "Aplicar") {
      applyLabel.data = "Aplicar";
    }

    // A coluna de mensagens vira a folha sobre a mesa.
    const firstStep = document.querySelector(".step");
    const sheet = firstStep?.parentElement;
    if (sheet && !sheet.classList.contains("study-sheet")) {
      document.querySelector(".study-sheet")?.classList.remove("study-sheet");
      sheet.classList.add("study-sheet");
    }
    for (const message of document.querySelectorAll('[data-step-type="assistant_message"] .ai-message:not([data-study-stamp])')) {
      message.dataset.studyStamp = "true";
      message.querySelector(".message-content")?.before(stamp());
    }
    // Copiar e avaliar com polegares são convenções de chat de IA; ações com texto permanecem.
    for (const row of document.querySelectorAll('.ai-message .-ml-1\\.5:not([data-study-row])')) {
      row.dataset.studyRow = "true";
    }
    for (const row of document.querySelectorAll(".ai-message [data-study-row]")) {
      for (const child of row.children) {
        child.classList.toggle("study-hidden", !child.textContent.trim());
      }
    }
  }

  // A coluna de cartões só aparece quando cabe ao lado da folha sem sobrepor o histórico.
  // Larga: coluna fixa no body (ancestrais do Chainlit recortam elementos fixos).
  // Estreita: faixa compacta logo acima do companheiro e do campo de mensagem.
  function placeDesk(composer = document.getElementById("message-composer")) {
    const sidebarOpen = Boolean(document.querySelector('.peer[data-side][data-state="expanded"]'));
    const rem = parseFloat(getComputedStyle(root).fontSize) || 16;
    const wide = Boolean(composer) && window.innerWidth >= (sidebarOpen ? 95 : 80) * rem;
    const value = String(wide);
    if (desk.dataset.wide !== value) desk.dataset.wide = value;
    const layout = wide ? "wide" : "compact";
    if (root.dataset.studyDesk !== layout) root.dataset.studyDesk = layout;
    if (wide && desk.parentElement !== document.body) document.body.append(desk);
    if (!wide && composer && desk.nextElementSibling !== widget) widget.before(desk);
    if (!composer && desk.isConnected) desk.remove();
    const left = sidebarOpen ? "17rem" : "1rem";
    if (desk.style.getPropertyValue("--study-desk-left") !== left) desk.style.setProperty("--study-desk-left", left);
  }
  window.addEventListener("resize", () => placeDesk());
  // Abrir ou recolher o histórico muda apenas atributos, que o observador principal não acompanha.
  new MutationObserver(() => placeDesk()).observe(document.body, {
    subtree: true, attributes: true, attributeFilter: ["data-state"],
  });

  function stamp() {
    const node = element("div", "", "study-stamp");
    node.setAttribute("aria-hidden", "true");
    node.append(element("span", "", "study-stamp__face"), element("span", "", "study-stamp__name"));
    paintStamp(node);
    return node;
  }

  function paintStamp(node) {
    const mascot = desiredPreferences.mascot || visible.mascot;
    const face = node.firstElementChild;
    const label = node.lastElementChild;
    if (label.textContent !== visible.mascot_name) label.textContent = visible.mascot_name;
    if (face.dataset.mascot === mascot) return;
    face.dataset.mascot = mascot;
    if (characterIds.has(mascot)) {
      face.replaceChildren(characterArt(mascot));
    } else if (mascot === "oculto") {
      face.replaceChildren();
    } else {
      const img = document.createElement("img");
      img.alt = "";
      img.width = 28;
      img.height = 28;
      img.src = new URL(`mascots/${mascot}-idle.webp`, assets).href;
      face.replaceChildren(img);
    }
  }
  const appRoot = document.getElementById("root");
  if (appRoot) {
    const observer = new MutationObserver(adaptChainlit);
    observer.observe(document.body, { childList: true, subtree: true });
    adaptChainlit();
  }

  let session = null;
  let revision = 0;
  let expressionTimer;
  let retryTimer;
  let tries = 0;
  const retired = new Set();
  const pending = new Map();
  let sequence = 0;
  let savingPreferences = false;

  function send(data) {
    window.postMessage({ channel, version: 1, direction: "client", session_id: session, ...data },
      window.location.origin);
  }

  function request(type, payload) {
    const requestId = `${session}:${++sequence}`;
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        pending.delete(requestId);
        notify("A alteração não foi confirmada. Tente novamente.");
        resolve(false);
      }, 5000);
      pending.set(requestId, { timeout, resolve });
      send({ type, request_id: requestId, ...payload });
    });
  }

  function paintPreferences() {
    const selected = { ...visible, ...desiredPreferences };
    root.dataset.studyTheme = selected.theme;
    root.dataset.studyAppearance = selected.appearance;
    if (effects.dataset.theme !== selected.theme) {
      effects.dataset.theme = selected.theme;
      const actors = effects.children;
      actors[0].replaceChildren();
      actors[1].replaceChildren();
      if (selected.theme === "castelo") {
        actors[0].append(characterArt("harry"));
        actors[1].append(characterArt("hermione"));
      } else if (selected.theme === "aracnideo") {
        actors[0].append(characterArt("spiderman"));
        actors[1].append(spiderArt());
      }
    }
    for (const [id, card] of Object.entries(themeCards)) {
      card.setAttribute("aria-pressed", String(id === selected.theme));
    }
    for (const [id, card] of Object.entries(companionCards)) {
      card.setAttribute("aria-pressed", String(id === selected.mascot));
    }
    for (const [id, control] of Object.entries(appearanceButtons)) {
      control.setAttribute("aria-pressed", String(id === selected.appearance));
    }
    motionButton.textContent = selected.animations === "enabled" ? "Animações ativadas" : "Animações pausadas";
    motionButton.setAttribute("aria-pressed", String(selected.animations === "enabled"));
    updateMotion();
    render(currentExpression);
    for (const node of document.querySelectorAll(".study-stamp")) paintStamp(node);
    renderLead();
  }

  let wizardVisit = 0;
  effects.addEventListener("animationiteration", (event) => {
    if (root.dataset.studyTheme === "castelo" && event.target.matches(".study-effects__actor")) {
      const wizards = ["harry", "hermione", "dumbledore", "voldemort"];
      event.target.replaceChildren(characterArt(wizards[++wizardVisit % wizards.length]));
    }
  });

  async function choosePreferences(changes) {
    Object.assign(desiredPreferences, changes);
    paintPreferences();
    if (savingPreferences) return;
    savingPreferences = true;
    const origin = session;
    while (Object.keys(desiredPreferences).length && session === origin) {
      const sent = { ...desiredPreferences };
      await request("study.preferences", { preferences: sent });
      for (const [key, value] of Object.entries(sent)) {
        if (desiredPreferences[key] === value) delete desiredPreferences[key];
      }
      paintPreferences();
    }
    savingPreferences = false;
    if (Object.keys(desiredPreferences).length) choosePreferences(desiredPreferences);
  }

  function requestState() {
    send({ type: "study.ready", preferences: account ? null : confirmed || demoPreferences });
    if (++tries < 20) retryTimer = setTimeout(requestState, 750);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const data = event.data;
    if (!data || data.channel !== channel || data.version !== 1
      || data.direction !== "server" || data.type !== "study.state"
      || typeof data.session_id !== "string" || !Number.isSafeInteger(data.revision)
      || !validPreferences(data.preferences) || typeof data.confirmed !== "boolean"
      || !data.profile || !(data.account === null || typeof data.account === "string")
      || !Object.hasOwn(statuses, data.mascot?.expression)
      || !(data.mascot.remaining_ms === null
        || (Number.isInteger(data.mascot.remaining_ms)
          && data.mascot.remaining_ms >= 0 && data.mascot.remaining_ms <= 4000))) return;
    if (retired.has(data.session_id)) return;

    const newSession = session !== data.session_id;
    if (newSession) {
      if (session) {
        for (const field of welcome.querySelectorAll("textarea, select")) field.value = "";
        for (const marker of welcome.querySelectorAll('input[type="radio"]')) {
          marker.checked = false;
          marker.dataset.checked = "false";
        }
      }
      if (session) retired.add(session);
      desiredPreferences = {};
      for (const item of pending.values()) {
        clearTimeout(item.timeout);
        item.resolve(false);
      }
      pending.clear();
      if (account !== data.account) {
        confirmed = null;
        for (const { dialog } of [gallery, companionPanel, introPanel, profilePanel]) dialog.close();
        lastAutoIntroAccount = null;
      }
      account = data.account;
      session = data.session_id;
      entryBypassed = false;
      adaptChainlit();
      revision = 0;
      clearTimeout(expressionTimer);
      render("idle");
    }
    if (data.revision <= revision) return;
    revision = data.revision;

    if (data.confirmed) {
      clearTimeout(retryTimer);
      confirmed = data.preferences;
      try {
        localStorage.setItem(account ? `${storageKey}.${account}` : storageKey, JSON.stringify(confirmed));
      } catch {
        // The current chat still works without browser storage.
      }
    } else if (newSession) {
      clearTimeout(retryTimer);
      tries = 0;
      requestState();
    }

    visible = !data.confirmed && confirmed ? confirmed : data.preferences;
    profile = data.profile;
    if (data.mode === "guia" || data.mode === "aprendiz") studyMode = data.mode;
    if (Array.isArray(data.escada)) {
      renderLadder(data.escada.filter((step) => step && Number.isSafeInteger(step.degrau)
        && Number.isSafeInteger(step.reveladas) && typeof step.tipo === "string").slice(-12));
    }
    if (Array.isArray(data.recent)) {
      renderRecent(data.recent.filter((item) => item && typeof item.id === "string"
        && /^[0-9a-f-]{36}$/.test(item.id) && typeof item.name === "string"
        && (item.degrau === null || Number.isSafeInteger(item.degrau))).slice(0, 3));
    }
    tools.hidden = !data.confirmed;
    demoBanner.textContent = account ? "" : "Modo demonstração · o histórico por conta fica disponível após configurar o login Google.";
    for (const submit of welcome.querySelectorAll('[type="submit"]')) {
      submit.disabled = !data.confirmed || data.mascot.expression === "thinking";
    }
    paintPreferences();
    if (account && data.confirmed && lastAutoIntroAccount !== account) {
      lastAutoIntroAccount = account;
      if (profile.intro === "new") {
        request("study.intro", { command: "begin" });
      }
    }
    const response = pending.get(data.request_id);
    if (response) {
      clearTimeout(response.timeout);
      pending.delete(data.request_id);
      if (data.error) notify(data.error);
      response.resolve(!data.error);
    }
    clearTimeout(expressionTimer);
    render(data.mascot.expression);
    if (data.mascot.remaining_ms > 0) {
      expressionTimer = setTimeout(() => render("idle"), data.mascot.remaining_ms);
    }
  });

  paintPreferences();
  requestState();
})();
