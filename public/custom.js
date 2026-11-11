(() => {
  "use strict";

  if (document.getElementById("study-ambient")) return;
  const channel = "fatec-study";
  const storageKey = "fatec-study.preferences.v3";
  const assets = new URL(".", document.currentScript.src);
  const root = document.documentElement;
  root.lang = "pt-BR";
  const themes = new Set(["vintage", "castelo", "aracnideo", "cyberpunk", "cafe", "jardim"]);
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

  // O Chainlit 2.12 consulta o armazenamento no carregamento. Quando bloqueado,
  // manter uma alternativa em memória apenas durante esta página.
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
      // Alguns navegadores também impedem redefinir a propriedade.
    }
  }

  function validPreferences(value) {
    return value && themes.has(value.theme) && mascots.has(value.mascot)
      && levels.has(value.zdp) && typeof value.mascot_name === "string"
      && Array.from(value.mascot_name).length <= 24
      && ["light", "dark"].includes(value.appearance)
      && ["enabled", "paused"].includes(value.animations)
      && (value.accent === undefined || ["1", "2", "3", "4"].includes(value.accent))
      && (value.scene_intensity === undefined || ["suave", "normal", "vivo"].includes(value.scene_intensity))
      && (value.text_size === undefined || ["normal", "grande", "extra"].includes(value.text_size));
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
    accent: "1", scene_intensity: "normal", text_size: "normal",
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

  // Nomes resolvidos pelo servidor: apelido do personagem ou nome padrão.
  const defaultNames = {
    coruja: "Lumi", raposa: "Raposa", robo: "Robô", harry: "Harry", hermione: "Hermione",
    dumbledore: "Dumbledore", voldemort: "Voldemort", spiderman: "Homem-Aranha",
    miles: "Miles Morales", oculto: "Companheiro",
  };
  const kinds = {
    coruja: "Coruja", raposa: "Raposa", robo: "Robô", harry: "Harry", hermione: "Hermione",
    dumbledore: "Dumbledore", voldemort: "Voldemort", spiderman: "Homem-Aranha",
    miles: "Miles Morales", oculto: "Oculto",
  };
  let companionNames = { ...defaultNames };
  let authors = {};
  const selectedMascot = () => desiredPreferences.mascot || visible.mascot;
  const companionName = () => companionNames[selectedMascot()] || visible.mascot_name;

  // Miniatura contida: imagem do companheiro ou rosto do personagem desenhado.
  function paintAvatar(node, mascot, expression = "idle", pose = "portrait") {
    if (node.dataset.mascot === mascot && node.dataset.expression === expression && node.dataset.pose === pose) return;
    node.dataset.mascot = mascot || "";
    node.dataset.expression = expression;
    node.dataset.pose = pose;
    node.replaceChildren();
    if (mascots.has(mascot) && mascot !== "oculto") node.append(characterArt(mascot, expression, pose));
  }

  // Barra de estudo: companheiro, degrau atual e quem conduz, logo acima do campo.
  const bar = element("section", "", "study-bar");
  bar.setAttribute("aria-label", "Seu estudo agora");
  const who = element("div", "", "study-bar__who");
  const avatar = element("span", "", "study-avatar study-avatar--bar");
  avatar.setAttribute("aria-hidden", "true");
  const identity = element("div", "", "study-bar__identity");
  const name = element("strong", "", "study-bar__name");
  const status = element("span", "", "study-bar__status");
  status.setAttribute("role", "status");
  status.setAttribute("aria-atomic", "true");
  identity.append(name, status);
  who.append(avatar, identity);

  let currentExpression = "idle";
  let focusNotice = "";
  let focusNoticeTimer;
  function render(expression) {
    currentExpression = expression;
    const mascot = selectedMascot();
    bar.dataset.expression = expression;
    bar.dataset.mascot = mascot;
    paintAvatar(avatar, mascot, expression);
    const label = companionName();
    if (name.textContent !== label) name.textContent = label;
    const stateText = focusNotice || statuses[expression];
    if (status.textContent !== stateText) status.textContent = stateText;
  }

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

  // Ícones de traço simples desenhados no próprio projeto, sem biblioteca adicional.
  const iconPaths = {
    palette: "M12 3a9 9 0 1 0 0 18c.9 0 1.5-.6 1.5-1.4 0-.4-.1-.7-.4-1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-8-9-8ZM7.5 11.5h.01M10 7.5h.01M14.5 7.5h.01M17 11h.01",
    companion: "M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M8.5 14.5s1.3 1.5 3.5 1.5 3.5-1.5 3.5-1.5M9 9.5h.01M15 9.5h.01",
    user: "M8 8a4 4 0 1 0 8 0 4 4 0 1 0-8 0M5 20a7 7 0 0 1 14 0",
    tools: "M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4",
    clock: "M3 13a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 8v5l3 2M10 2h4",
    notes: "M6 3h10a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3V4a1 1 0 0 1 1-1ZM5 18a3 3 0 0 1 3-3h11M9 7h6",
    heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z",
    edit: "M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3ZM14 8l2.9 2.9",
    search: "M5 11a6 6 0 1 0 12 0 6 6 0 1 0-12 0M20 20l-4.3-4.3",
    close: "M6 6l12 12M18 6 6 18",
    check: "m5 12.5 4.5 4.5L19 7.5",
    alert: "M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 7.5v5.5M12 16.5h.01",
  };
  function icon(name) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", "study-icon");
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", iconPaths[name]);
    svg.append(path);
    return svg;
  }

  // Navegação: ícone e rótulo, sem contorno permanente; o rótulo segue como nome acessível.
  function navButton(text, iconName, callback, className = "") {
    const node = button("", callback, `study-nav ${className}`.trim());
    node.append(icon(iconName), element("span", text, "study-nav__label"));
    return node;
  }

  // Confirmação e erro com ícone e texto, sem depender apenas da cor.
  function setStatus(node, state, text) {
    node.dataset.state = state;
    node.replaceChildren();
    if (!text) return;
    if (state === "ok" || state === "error") node.append(icon(state === "ok" ? "check" : "alert"));
    node.append(element("span", text));
  }

  function characterArt(id, expression = "idle", pose = "full") {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 200 200");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("study-character-art");
    svg.dataset.character = id;
    const use = document.createElementNS(ns, "use");
    use.setAttribute("href", new URL(`characters/sprite.svg#${id}-${pose}-${expression}`, assets).href);
    use.setAttribute("width", "200");
    use.setAttribute("height", "200");
    svg.append(use);
    return svg;
  }

  function spiderArt() {
    const art = element("span", "", "study-spider");
    art.setAttribute("aria-hidden", "true");
    for (let leg = 0; leg < 8; leg++) art.append(element("span", "", "study-spider__leg"));
    art.append(element("span", "", "study-spider__body"), element("span", "", "study-spider__head"));
    return art;
  }

  function panel(title, description = "") {
    const dialog = element("dialog", "", "study-dialog");
    const heading = element("h2", title);
    heading.id = "study-dialog-" + document.querySelectorAll(".study-dialog").length;
    dialog.setAttribute("aria-labelledby", heading.id);
    const header = element("div", "", "study-dialog__header");
    const headingGroup = element("div", "", "study-dialog__heading");
    headingGroup.append(heading);
    if (description) {
      const text = element("p", description, "study-dialog__description");
      text.id = heading.id + "-description";
      dialog.setAttribute("aria-describedby", text.id);
      headingGroup.append(text);
    }
    const close = button("", () => dialog.close(), "study-icon-button study-dialog__close");
    close.append(icon("close"));
    close.setAttribute("aria-label", "Fechar");
    header.append(headingGroup, close);
    const body = element("div", "", "study-dialog__body");
    dialog.append(header, body);
    // Clique no fundo escurecido fecha o painel, sem perder o rascunho do campo de mensagem.
    dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
    document.body.append(dialog);
    return { dialog, body };
  }

  function section(title, ...children) {
    const node = element("section", "", "study-section");
    node.append(element("h3", title, "study-section__title"), ...children);
    return node;
  }

  // Grupo de escolha compacta (botões com aria-pressed), usado em temas, perfil e barra.
  function choiceGroup(label, options, onChoose, className = "study-segmented") {
    const group = element("div", "", className);
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", label);
    const buttons = {};
    for (const [id, text] of Object.entries(options)) {
      const control = button(text, () => onChoose(id), "study-chip");
      control.dataset.value = id;
      buttons[id] = control;
      group.append(control);
    }
    return { group, buttons, select(value) {
      for (const [id, control] of Object.entries(buttons)) control.setAttribute("aria-pressed", String(id === value));
    } };
  }

  const catalog = {
    vintage: ["Caderno Vintage", "Papel, luz quente e anotações"],
    castelo: ["Castelo da Magia", "Biblioteca noturna e dourado"],
    aracnideo: ["Herói Aracnídeo", "Cidade em carmesim e azul-marinho"],
    cyberpunk: ["Cyberpunk", "Estação noturna e luz ciano"],
    cafe: ["Café Lo-fi", "Chuva na janela e uma pausa quente"],
    jardim: ["Jardim / Estufa", "Verde, terracota e luz filtrada"],
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

  // Linha de configuração: rótulo e explicação curta à esquerda, controle à direita.
  function settingRow(label, hint, control) {
    const row = element("div", "", "study-setting");
    const text = element("div", "", "study-setting__text");
    text.append(element("span", label, "study-setting__label"));
    if (hint) text.append(element("span", hint, "study-setting__hint"));
    row.append(text, control);
    return row;
  }

  const gallery = panel("Temas", "Ambiente, aparência e leitura. As mudanças valem na hora.");
  gallery.dialog.classList.add("study-dialog--themes");
  const themeGrid = element("div", "", "study-theme-grid");
  const themeCards = {};
  for (const [id, [title, description]] of Object.entries(catalog)) {
    const card = button("", () => choosePreferences({ theme: id }), "study-theme-card");
    card.dataset.preview = id;
    const text = element("span", "", "study-theme-card__text");
    text.append(element("strong", title), element("span", description));
    const art = element("span", "", "study-theme-card__art");
    const check = element("span", "", "study-theme-card__check");
    check.append(icon("check"));
    art.append(check);
    card.append(art, text);
    themeCards[id] = card;
    themeGrid.append(card);
  }
  const appearance = choiceGroup("Aparência", { light: "Claro", dark: "Escuro" },
    (id) => choosePreferences({ appearance: id }));
  // Chave liga/desliga: o estado fica em aria-checked e a fila de preferências continua a mesma.
  const motionSwitch = button("", () => choosePreferences({
    animations: motionSwitch.getAttribute("aria-checked") === "true" ? "paused" : "enabled",
  }), "study-switch");
  motionSwitch.setAttribute("role", "switch");
  motionSwitch.setAttribute("aria-label", "Animações do cenário");
  const motion = { select(value) { motionSwitch.setAttribute("aria-checked", String(value === "enabled")); } };
  const motionStatus = element("p", "", "study-muted");
  motionStatus.setAttribute("role", "status");
  const accentNames = { "1": "Original", "2": "Variação 2", "3": "Variação 3", "4": "Variação 4" };
  const accentChoice = choiceGroup("Cor de destaque", accentNames, (id) => choosePreferences({ accent: id }), "study-swatches");
  for (const [id, swatch] of Object.entries(accentChoice.buttons)) {
    swatch.className = "study-swatch";
    swatch.textContent = "";
    swatch.title = accentNames[id];
    swatch.setAttribute("aria-label", accentNames[id]);
  }
  const intensityChoice = choiceGroup("Intensidade do cenário", { suave: "Suave", normal: "Normal", vivo: "Vivo" }, (id) => choosePreferences({ scene_intensity: id }));
  const sizeChoice = choiceGroup("Tamanho do texto", { normal: "Normal", grande: "Grande", extra: "Extra" }, (id) => choosePreferences({ text_size: id }));
  gallery.body.append(section("Ambiente", themeGrid),
    section("Aparência",
      settingRow("Modo", "Claro ou escuro, em qualquer ambiente.", appearance.group),
      settingRow("Animações", "Movimento discreto nas margens do cenário.", motionSwitch),
      motionStatus),
    section("Ajustes",
      settingRow("Cor de destaque", "Botões, seleção e marcadores.", accentChoice.group),
      settingRow("Intensidade do cenário", null, intensityChoice.group),
      settingRow("Tamanho do texto", "Leitura da folha e campo de mensagem.", sizeChoice.group)));
  const preferenceStatus = element("p", "", "study-form-status");
  preferenceStatus.setAttribute("role", "status");
  const galleryFooter = element("div", "", "study-dialog__footer");
  galleryFooter.append(preferenceStatus);
  gallery.dialog.append(galleryFooter);

  const companionPanel = panel("Companheiros", "Quem acompanha você na folha de estudo.");
  const companionGrid = element("div", "", "study-companion-grid");
  const companionCards = {};
  for (const id of Object.keys(kinds)) {
    const card = button("", () => choosePreferences({ mascot: id }), "study-companion-card");
    card.dataset.mascot = id;
    const art = element("span", "", "study-companion-card__art");
    art.setAttribute("aria-hidden", "true");
    if (id !== "oculto") paintAvatar(art, id, "thinking", "full");
    else art.append(element("span", "Sem companheiro na tela", "study-muted"));
    card.append(art, element("strong", "", "study-companion-card__name"),
      element("span", "", "study-companion-card__kind"));
    companionCards[id] = card;
    companionGrid.append(card);
  }
  // Apelido individual do companheiro atual; vazio restaura o nome padrão.
  const nicknameForm = element("form", "", "study-form study-nickname");
  const nicknameAvatar = element("span", "", "study-avatar study-avatar--large");
  nicknameAvatar.setAttribute("aria-hidden", "true");
  const nicknameInput = element("input");
  nicknameInput.id = "study-nickname-input";
  nicknameInput.maxLength = 24;
  nicknameInput.autocomplete = "off";
  const nicknameLabel = element("label", "Apelido");
  nicknameLabel.htmlFor = nicknameInput.id;
  const nicknameHint = element("p", "", "study-muted");
  const nicknameSave = element("button", "Salvar apelido", "study-button study-button--primary");
  nicknameSave.type = "submit";
  const nicknameReset = button("Usar nome padrão", () => saveNickname(""), "study-link-button");
  const nicknameStatus = element("p", "", "study-form-status");
  nicknameStatus.setAttribute("role", "status");
  const nicknameFields = element("div", "", "study-nickname__fields");
  const nicknameRow = element("div", "", "study-nickname__row");
  nicknameRow.append(nicknameInput, nicknameSave);
  nicknameFields.append(nicknameLabel, nicknameRow, nicknameHint, nicknameReset, nicknameStatus);
  nicknameForm.append(nicknameAvatar, nicknameFields);
  nicknameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveNickname(nicknameInput.value);
  });
  async function saveNickname(value) {
    const mascot = selectedMascot();
    nicknameSave.disabled = true;
    setStatus(nicknameStatus, "", "Salvando…");
    const saved = await request("study.nickname", { mascot, name: value });
    nicknameSave.disabled = false;
    setStatus(nicknameStatus, saved ? "ok" : "error", saved ? "Apelido salvo." : "Não foi possível salvar o apelido.");
    renderCompanions(true);
  }
  let nicknameFor = null;
  function renderCompanions(refreshInput = false) {
    const mascot = selectedMascot();
    if (nicknameFor !== mascot) {
      // Outro personagem: o campo e a mensagem de status passam a ser os dele.
      nicknameFor = mascot;
      refreshInput = true;
      nicknameStatus.textContent = "";
    }
    for (const [id, card] of Object.entries(companionCards)) {
      card.setAttribute("aria-pressed", String(id === mascot));
      const label = card.querySelector(".study-companion-card__name");
      const kind = card.querySelector(".study-companion-card__kind");
      const display = companionNames[id] || defaultNames[id];
      if (label.textContent !== display) label.textContent = display;
      const kindText = display === kinds[id] ? "" : kinds[id];
      if (kind.textContent !== kindText) kind.textContent = kindText;
    }
    paintAvatar(nicknameAvatar, mascot);
    nicknameForm.hidden = mascot === "oculto";
    nicknameHint.textContent = `Nome padrão: ${defaultNames[mascot]}. Cada companheiro guarda o próprio apelido.`;
    if (refreshInput || document.activeElement !== nicknameInput) {
      nicknameInput.value = companionNames[mascot] || defaultNames[mascot];
    }
  }
  companionPanel.body.append(section("Seu companheiro", nicknameForm), section("Escolher companheiro", companionGrid));

  const profilePanel = panel("Meu perfil", "Como você aparece e como prefere receber ajuda.");
  const introPanel = panel("Primeiros passos", "O que você quer aprender hoje?");
  const toolsPanel = panel("Ferramentas", "Apoios para a sessão de hoje.");
  toolsPanel.dialog.classList.add("study-dialog--tools");
  const tools = element("div", "", "study-tools");
  tools.hidden = true;
  const openProfile = () => {
    buildProfile();
    profilePanel.dialog.showModal();
  };
  // Com conta, Ferramentas e Perfil também ficam na lateral; o CSS evita a entrada duplicada.
  for (const [id, label, iconName, open] of [
    ["temas", "Temas", "palette", () => gallery.dialog.showModal()],
    ["companheiros", "Companheiros", "companion", () => {
      nicknameStatus.textContent = "";
      renderCompanions(true);
      companionPanel.dialog.showModal();
    }],
    ["ferramentas", "Ferramentas", "tools", () => toolsPanel.dialog.showModal()],
    ["perfil", "Perfil", "user", openProfile],
  ]) {
    const control = navButton(label, iconName, open);
    control.dataset.tool = id;
    control.title = label;
    tools.append(control);
  }

  let profile = null;
  let currentThread = null;
  let notebookMetadata = [];
  let statistics = {};
  let noteLinks = new Set();
  let mood = null;
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

  // Escada sob demanda: o botão da barra abre a lista de degraus num painel suspenso.
  const ladderButton = button("", () => setLadderOpen(ladderPanel.hidden), "study-bar__step");
  const ladderPanel = element("div", "", "study-bar__ladder");
  ladderPanel.id = "study-ladder-panel";
  ladderPanel.hidden = true;
  ladderButton.setAttribute("aria-controls", ladderPanel.id);
  ladderButton.setAttribute("aria-expanded", "false");
  const ladderList = element("ol", "", "study-ladder__steps");
  const ladderNote = element("p", "Os degraus aparecem quando a conversa começar.", "study-muted");
  const ladderCaption = element("p", "Degrau e “subiu sozinho” são avaliações do companheiro.", "study-muted");
  ladderPanel.append(element("h3", "Escada desta conversa", "study-section__title"), ladderList, ladderNote, ladderCaption);
  function setLadderOpen(open) {
    ladderPanel.hidden = !open;
    ladderButton.setAttribute("aria-expanded", String(open));
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !ladderPanel.hidden) {
      setLadderOpen(false);
      ladderButton.focus();
    }
  });
  document.addEventListener("pointerdown", (event) => {
    if (!ladderPanel.hidden && !bar.contains(event.target)) setLadderOpen(false);
  });

  const lead = choiceGroup("Quem conduz a conversa", { guia: "Guia", aprendiz: "Aprende" }, async (id) => {
    if (studyMode === id) return;
    const previous = studyMode;
    studyMode = id;
    renderLead();
    if (!(await request("study.mode", { mode: id }))) {
      studyMode = previous;
      renderLead();
    }
  }, "study-segmented study-bar__lead");
  bar.append(who, ladderButton, lead.group, ladderPanel);

  function renderLead() {
    const companion = companionName();
    lead.select(studyMode);
    lead.buttons.guia.title = `${companion} dá pistas em degraus; abra uma dica só quando precisar.`;
    lead.buttons.aprendiz.title = `Você explica e ${companion} tenta aprender, apontando o que ficou claro e o que faltou.`;
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
    ladderButton.textContent = top ? `Degrau ${top}` : "Escada";
    ladderButton.setAttribute("aria-label", top ? `Degrau ${top}. Ver a escada desta conversa` : "Ver a escada desta conversa");
    ladderNote.hidden = steps.length > 0;
  }
  renderLadder([]);

  function addField(form, label, field) {
    const wrapper = element("label", label);
    wrapper.append(field);
    form.append(wrapper);
  }

  // Opções em pílulas que funcionam como rádio: um clique escolhe, outro desmarca.
  function radioChips(name, legend, options, value) {
    const fieldset = element("fieldset", "", "study-chip-field");
    fieldset.append(element("legend", legend));
    const row = element("div", "", "study-chip-row");
    for (const [id, label] of Object.entries(options)) {
      const option = element("label", "", "study-chip-option");
      const input = element("input");
      input.type = "radio";
      input.name = name;
      input.value = id;
      input.checked = id === value;
      input.dataset.checked = String(input.checked);
      input.addEventListener("click", () => {
        if (input.dataset.checked === "true") input.checked = false;
        for (const other of row.querySelectorAll("input")) other.dataset.checked = String(other.checked);
      });
      option.append(input, element("span", label));
      row.append(option);
    }
    fieldset.append(row);
    return { fieldset, value: () => row.querySelector("input:checked")?.value || "" };
  }

  // Ferramentas locais e registros escritos pelo estudante.
  const focusPanel = panel("Sessão de foco", "Um bloco de estudo seguido de pausa. O tempo continua mesmo com o painel fechado.");
  const notesPanel = panel("Fichário de descobertas", "Registre com suas palavras o que passou a fazer sentido.");
  const moodPanel = panel("Como você chega hoje?", "Opcional. Orienta só a próxima resposta e não fica salvo no perfil.");
  // A linha do Foco mostra o tempo restante enquanto a sessão corre.
  const focusMeters = [];
  function toolLinks() {
    const focusLink = navButton("Foco", "clock", () => focusPanel.dialog.showModal());
    const meter = element("span", "", "study-nav__meta");
    focusLink.append(meter);
    focusMeters.push(meter);
    return section("Ferramentas", focusLink,
      navButton("Fichário de descobertas", "notes", () => { buildNotes(); notesPanel.dialog.showModal(); }),
      navButton("Check-in de ânimo", "heart", () => { buildMood(); moodPanel.dialog.showModal(); }));
  }
  toolsPanel.body.append(toolLinks());
  const sidebarTools = toolLinks();
  sidebarTools.classList.add("study-sidebar-tools");
  // Atalhos da lateral: acionam os botões nativos do Chainlit, sem substituir busca e nova conversa.
  const sidebarNav = element("nav", "", "study-sidebar-nav");
  sidebarNav.setAttribute("aria-label", "Ações dos cadernos");
  const nativeSidebarAction = (id) => document.querySelector(`[data-sidebar="sidebar"] [id="${id}"]`)?.click();
  sidebarNav.append(navButton("Novo caderno", "edit", () => nativeSidebarAction("new-chat-button")),
    navButton("Buscar cadernos", "search", () => nativeSidebarAction("search-chats-button")));
  // Rodapé da lateral: a pessoa e o acesso ao perfil, como nas ferramentas de referência.
  const sidebarProfile = button("", openProfile, "study-nav study-sidebar-profile");
  const sidebarProfileFace = element("span", "", "study-user-avatar");
  sidebarProfileFace.setAttribute("aria-hidden", "true");
  const sidebarProfileText = element("span", "", "study-sidebar-profile__text");
  const sidebarProfileName = element("strong");
  const sidebarProfileLine = element("span");
  sidebarProfileText.append(sidebarProfileName, sidebarProfileLine);
  sidebarProfile.append(sidebarProfileFace, sidebarProfileText);
  const focusDuration = element("input");
  focusDuration.type = "number"; focusDuration.min = "1"; focusDuration.max = "120"; focusDuration.value = "25";
  const breakDuration = element("input");
  breakDuration.type = "number"; breakDuration.min = "1"; breakDuration.max = "30"; breakDuration.value = "5";
  const focusClock = element("output", "25:00", "study-focus-clock");
  focusClock.setAttribute("aria-label", "Tempo restante");
  focusClock.setAttribute("role", "timer"); focusClock.setAttribute("aria-live", "off");
  const focusState = element("p", "Prepare uma tarefa pequena para esta sessão.", "study-muted");
  let focusTimer = { end: null, remaining: 25 * 60000, phase: "study" };
  try {
    const cached = JSON.parse(localStorage.getItem("fatec-study.focus.v1"));
    if (cached && ["study", "break"].includes(cached.phase)
      && Number.isFinite(cached.remaining) && cached.remaining >= 0 && cached.remaining <= 7200000
      && (cached.end === null || Number.isFinite(cached.end))) focusTimer = cached;
  } catch {}
  const saveFocus = () => { try { localStorage.setItem("fatec-study.focus.v1", JSON.stringify(focusTimer)); } catch {} };
  const focusStart = button("Começar", () => {
    focusNotice = "";
    if (!focusTimer.end) {
      if (!focusTimer.remaining) focusTimer.remaining = Math.min(focusTimer.phase === "study" ? 120 : 30,
        Math.max(1, Number(focusTimer.phase === "study" ? focusDuration.value : breakDuration.value) || 1)) * 60000;
      focusTimer.end = Date.now() + focusTimer.remaining;
    }
    saveFocus(); tickFocus();
  }, "study-button study-button--primary");
  const focusPause = button("Pausar", () => {
    if (!focusTimer.end) return;
    focusTimer.remaining = Math.max(0, focusTimer.end - Date.now()); focusTimer.end = null;
    saveFocus(); tickFocus();
  });
  const focusReset = button("Reiniciar", () => {
    focusTimer = { end: null, remaining: Math.min(120, Math.max(1, Number(focusDuration.value) || 25)) * 60000, phase: "study" };
    focusNotice = ""; saveFocus(); tickFocus(); render(currentExpression);
  });
  function tickFocus() {
    let left = focusTimer.end ? Math.max(0, focusTimer.end - Date.now()) : focusTimer.remaining;
    if (focusTimer.end && left === 0) {
      focusNotice = focusTimer.phase === "study" ? "Sessão concluída. Que tal uma pausa?" : "Pausa concluída. Retome no seu ritmo.";
      focusTimer.phase = focusTimer.phase === "study" ? "break" : "study";
      focusTimer.end = null;
      focusTimer.remaining = Math.min(focusTimer.phase === "study" ? 120 : 30,
        Math.max(1, Number(focusTimer.phase === "study" ? focusDuration.value : breakDuration.value) || 1)) * 60000;
      left = focusTimer.remaining; saveFocus(); render(currentExpression); notify(focusNotice);
      clearTimeout(focusNoticeTimer);
      focusNoticeTimer = setTimeout(() => { focusNotice = ""; render(currentExpression); }, 8000);
    }
    const seconds = Math.ceil(left / 1000);
    const label = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    if (focusClock.textContent !== label) focusClock.textContent = label;
    const meterText = focusTimer.end ? label : "";
    for (const meter of focusMeters) if (meter.textContent !== meterText) meter.textContent = meterText;
    focusStart.textContent = focusTimer.phase === "break" ? "Começar pausa" : focusTimer.end ? "Em foco" : "Começar / retomar";
    focusStart.disabled = !!focusTimer.end; focusPause.disabled = !focusTimer.end;
    focusState.textContent = focusTimer.phase === "study" ? "Uma tarefa de cada vez. Você pode pausar quando precisar." : "Afaste os olhos da tela por alguns instantes, se quiser.";
  }
  const focusFields = element("div", "", "study-form study-option-row study-focus-fields");
  addField(focusFields, "Estudo (minutos)", focusDuration);
  addField(focusFields, "Pausa (minutos)", breakDuration);
  focusDuration.addEventListener("change", () => { if (!focusTimer.end && focusTimer.phase === "study") focusReset.click(); });
  const focusActions = element("div", "", "study-form-actions"); focusActions.append(focusStart, focusPause, focusReset);
  focusPanel.body.append(focusClock, focusState, focusFields, focusActions);
  setInterval(tickFocus, 1000); document.addEventListener("visibilitychange", tickFocus); tickFocus();

  function buildNotes() {
    notesPanel.body.replaceChildren();
    if (!account) { notesPanel.body.append(element("p", "Entre na sua conta para guardar descobertas entre conversas.", "study-muted")); return; }
    const entries = Array.isArray(profile.fichario) ? profile.fichario : [];
    if (currentThread) {
      const form = element("form", "", "study-form");
      const text = element("textarea"); text.rows = 4; text.maxLength = 1000; text.required = true;
      text.value = entries.find(item => item.thread_id === currentThread)?.text || "";
      addField(form, "O que eu descobri neste caderno", text);
      const review = element("input"); review.type = "checkbox";
      review.checked = !!entries.find(item => item.thread_id === currentThread)?.review_at;
      const reviewLabel = element("label", "", "study-inline-check"); reviewLabel.append(review, document.createTextNode("Revisar em 3 dias"));
      const submit = element("button", "Guardar descoberta", "study-button study-button--primary"); submit.type = "submit";
      const savedStatus = element("p", "", "study-form-status"); savedStatus.setAttribute("role", "status");
      const actions = element("div", "", "study-form-actions");
      actions.append(reviewLabel, submit);
      form.append(actions, savedStatus);
      form.addEventListener("submit", async event => {
        event.preventDefault(); submit.disabled = true;
        const saved = await request("study.note", { thread_id: currentThread, text: text.value, review: review.checked });
        submit.disabled = false;
        setStatus(savedStatus, saved ? "ok" : "error", saved ? "Descoberta guardada." : "Não foi possível guardar. Confira o limite de 100 notas e tente novamente.");
        if (saved) { buildNotes(); notify("Descoberta guardada."); }
      });
      notesPanel.body.append(form);
    } else notesPanel.body.append(element("p", "Comece uma conversa para registrar sua primeira descoberta.", "study-muted"));
    const list = element("div", "", "study-discoveries");
    for (const item of entries.slice(0, 100)) {
      const card = element("article", "", "study-discovery");
      card.append(element("p", item.text, "study-discovery__text"));
      // Data, revisão e origem numa linha de metadados discreta.
      const meta = element("div", "", "study-discovery__meta");
      const date = new Date(item.date);
      if (!Number.isNaN(date.getTime())) meta.append(element("time", date.toLocaleDateString("pt-BR")));
      if (item.review_at) meta.append(element("span", `Revisar em ${new Date(item.review_at).toLocaleDateString("pt-BR")}`));
      if (noteLinks.has(item.thread_id)) {
        const link = element("a", "Abrir caderno", "study-discovery__link"); link.href = `/thread/${encodeURIComponent(item.thread_id)}`; meta.append(link);
      } else meta.append(element("span", "Caderno de origem indisponível"));
      card.append(meta);
      list.append(card);
    }
    notesPanel.body.append(section("Suas descobertas", list));
    if (!entries.length) list.append(element("p", "Seu fichário ainda está em branco.", "study-muted"));
  }
  let breathingInterval;
  moodPanel.dialog.addEventListener("close", () => clearInterval(breathingInterval));
  function buildMood() {
    clearInterval(breathingInterval);
    const moodStatus = element("p", mood ? "Check-in pronto para a próxima resposta." : "Escolha como você está chegando.", "study-form-status");
    moodStatus.setAttribute("role", "status");
    const choices = choiceGroup("Como você está", { curioso: "Curioso", cansado: "Cansado", travado: "Travado", ansioso: "Ansioso" }, async id => {
      if (await request("study.checkin", { mood: id })) { choices.select(id); moodStatus.textContent = "O companheiro vai considerar isso na próxima resposta."; }
    });
    choices.select(mood);
    const breathText = element("p", "Se quiser, respire no seu ritmo por um minuto.", "study-muted");
    const breathe = button("Fazer uma pausa de 1 minuto", () => {
      clearInterval(breathingInterval); const end = Date.now() + 60000;
      breathText.textContent = "Respire confortavelmente, sem forçar. 60 segundos.";
      breathingInterval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
        breathText.textContent = remaining ? `Respire no seu ritmo. ${remaining} segundos.` : "Sua pausa terminou. Volte quando quiser.";
        if (!remaining) clearInterval(breathingInterval);
      }, 1000);
    });
    const clear = button("Não usar check-in", async () => { if (await request("study.checkin", { mood: null })) { choices.select(null); moodStatus.textContent = "Check-in removido."; } }, "study-link-button");
    moodPanel.body.replaceChildren(section("Hoje estou", choices.group, moodStatus, clear),
      section("Pausa curta", breathText, breathe));
  }

  let fallbackHistory = null;
  let historyReturnFocus = null;
  const historyBackdrop = button("", closeFallbackHistory, "study-history-backdrop");
  historyBackdrop.setAttribute("aria-label", "Fechar cadernos"); historyBackdrop.hidden = true;
  document.body.append(historyBackdrop);
  function closeFallbackHistory() {
    root.dataset.studyMobileHistory = "closed"; historyBackdrop.hidden = true;
    if (fallbackHistory) {
      fallbackHistory.removeAttribute("role"); fallbackHistory.removeAttribute("aria-modal");
      fallbackHistory.parentElement.classList.remove("study-mobile-sidebar-fallback");
      fallbackHistory.parentElement.parentElement.classList.remove("study-mobile-sidebar-shell");
    }
    fallbackHistory = null;
    historyReturnFocus?.focus();
  }
  function openFallbackHistory(sidebar) {
    if (fallbackHistory) { closeFallbackHistory(); return; }
    historyReturnFocus = document.activeElement;
    fallbackHistory = sidebar;
    root.dataset.studyMobileHistory = "open"; historyBackdrop.hidden = false;
    sidebar.setAttribute("role", "dialog"); sidebar.setAttribute("aria-modal", "true"); sidebar.setAttribute("aria-label", "Meus cadernos");
    sidebar.parentElement.classList.add("study-mobile-sidebar-fallback");
    sidebar.parentElement.parentElement.classList.add("study-mobile-sidebar-shell");
    sidebar.querySelector("button")?.focus();
  }
  document.addEventListener("keydown", event => {
    if (!fallbackHistory || document.querySelector(".study-dialog[open]")) return;
    if (event.key === "Escape") { event.preventDefault(); closeFallbackHistory(); }
    if (event.key === "Tab") {
      const nodes = [...fallbackHistory.querySelectorAll('button,a,input,[tabindex="0"]')].filter(e => e.getBoundingClientRect().width > 0 && !e.disabled);
      if (!nodes.length) return;
      if (event.shiftKey && document.activeElement === nodes[0]) { event.preventDefault(); nodes.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === nodes.at(-1)) { event.preventDefault(); nodes[0].focus(); }
    }
  });
  document.addEventListener("click", event => {
    if (fallbackHistory && event.target.closest('#sidebar-trigger-button') && fallbackHistory.contains(event.target)) {
      event.preventDefault(); event.stopPropagation(); closeFallbackHistory();
    }
  }, true);
  window.addEventListener("resize", () => { if (innerWidth >= 768 && fallbackHistory) closeFallbackHistory(); });

  let mobileNotebookButton;
  function adaptNotebookPanel() {
    const header = document.querySelector("#header > div:first-child");
    if (header && account) {
      if (!mobileNotebookButton) {
        mobileNotebookButton = button("☰", () => {
          const desktop = document.querySelector('[data-sidebar="sidebar"]:not([data-mobile])');
          if (desktop) openFallbackHistory(desktop);
          else window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true, bubbles: true }));
        }, "study-button study-mobile-notebooks");
        mobileNotebookButton.setAttribute("aria-label", "Abrir cadernos");
      }
      if (mobileNotebookButton.parentElement !== header) header.append(mobileNotebookButton);
    } else mobileNotebookButton?.remove();
    const sidebar = document.querySelector('[data-sidebar="sidebar"]');
    if (!sidebar) return;
    const content = sidebar.querySelector('[data-sidebar="content"]') || sidebar;
    if (!sidebar.querySelector(".study-notebook-title")) content.prepend(element("h2", "Meus cadernos", "study-notebook-title"));
    const title = sidebar.querySelector(".study-notebook-title");
    if (sidebarNav.nextElementSibling !== title) title.before(sidebarNav);
    if (sidebarTools.parentElement !== content) content.append(sidebarTools);
    if (account && profile) {
      if (sidebarTools.nextElementSibling !== sidebarProfile) sidebarTools.after(sidebarProfile);
      paintUserAvatar(sidebarProfileFace, profile.avatar, profile.name);
      const profileName = profile.name || "Estudante";
      const profileLine = profile.tagline || "Meu perfil";
      if (sidebarProfileName.textContent !== profileName) sidebarProfileName.textContent = profileName;
      if (sidebarProfileLine.textContent !== profileLine) sidebarProfileLine.textContent = profileLine;
      const profileLabel = `Meu perfil: ${profileName}`;
      if (sidebarProfile.getAttribute("aria-label") !== profileLabel) sidebarProfile.setAttribute("aria-label", profileLabel);
    } else if (sidebarProfile.isConnected) sidebarProfile.remove();
    for (const link of sidebar.querySelectorAll('a[href^="/thread/"]')) {
      link.classList.add("study-notebook-link");
      const id = link.getAttribute("href").split("/").pop();
      const metadata = notebookMetadata.find(item => item.id === id);
      const badge = link.querySelector(".study-notebook-level");
      if (metadata?.degrau) {
        const level = badge || element("span", "", "study-notebook-level");
        const label = `Degrau ${metadata.degrau}`;
        if (level.textContent !== label) level.textContent = label;
        if (!badge) link.append(level);
      } else badge?.remove();
    }
  }

  const levelLabels = { menos: "Menos dicas", guiadas: "Dicas guiadas", mais: "Mais apoio" };
  const support = choiceGroup("Nível de apoio", levelLabels, (id) => choosePreferences({ zdp: id }));

  const userFaceVersions = new WeakMap();
  function paintUserAvatar(node, selected, username) {
    const value = selected || { kind: "initials", color: "terra" };
    const signature = JSON.stringify([value, username]);
    if (userFaceVersions.get(node) === signature) return;
    userFaceVersions.set(node, signature);
    node.replaceChildren();
    node.dataset.avatarKind = value.kind;
    node.dataset.avatarColor = value.color || "terra";
    if (value.kind === "illustration") {
      if (/^student-[1-8]$/.test(value.id)) {
        const img = element("img"); img.alt = ""; img.src = new URL(`characters/${value.id}.svg`, assets); node.append(img);
      } else if (mascots.has(value.id) && value.id !== "oculto") node.append(characterArt(value.id, "idle", "portrait"));
    } else if (value.kind === "upload" && typeof value.data === "string" && value.data.startsWith("data:image/webp;base64,")) {
      const img = element("img"); img.alt = ""; img.src = value.data; node.append(img);
    } else {
      node.textContent = String(username || "Estudante").trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join("").toUpperCase();
    }
  }
  function adaptUserAvatar() {
    if (!profile) return;
    const nav = document.getElementById("user-nav-button");
    if (nav) {
      let face = nav.querySelector(".study-header-avatar");
      if (!face) { face = element("span", "", "study-user-avatar study-header-avatar"); face.setAttribute("aria-hidden", "true"); nav.prepend(face); }
      paintUserAvatar(face, profile.avatar, profile.name);
    }
    for (const step of document.querySelectorAll('[data-step-type="user_message"]')) {
      let face = step.querySelector(".study-user-stamp");
      const content = step.querySelector(".message-content");
      if (content && !face) { face = element("span", "", "study-user-avatar study-user-stamp"); face.setAttribute("aria-hidden", "true"); content.before(face); }
      if (face) paintUserAvatar(face, profile.avatar, profile.name);
    }
  }

  function buildProfile() {
    const form = element("form", "", "study-form study-profile");
    let selectedAvatar = structuredClone(profile.avatar || { kind: "initials", color: "terra" });
    const portrait = element("span", "", "study-user-avatar study-profile-portrait");
    const nameInput = element("input");
    nameInput.id = "study-profile-name"; nameInput.value = profile.name;
    nameInput.required = true; nameInput.maxLength = 60; nameInput.autocomplete = "nickname";
    const tagline = element("input"); tagline.maxLength = 120; tagline.value = profile.tagline || "";
    tagline.placeholder = "Estudando para…";
    const profileCard = element("div", "", "study-student-card");
    const cardText = element("div");
    const cardName = element("strong", profile.name);
    const cardLine = element("p", profile.tagline || "Um passo de cada vez.", "study-muted");
    cardText.append(element("span", "Cartão de estudante", "study-eyebrow"), cardName, cardLine);
    profileCard.append(portrait, cardText);
    const updatePortrait = () => {
      paintUserAvatar(portrait, selectedAvatar, nameInput.value);
      cardName.textContent = nameInput.value || "Estudante";
      cardLine.textContent = tagline.value || "Um passo de cada vez.";
    };
    nameInput.addEventListener("input", updatePortrait); tagline.addEventListener("input", updatePortrait);
    const avatarOptions = element("div", "", "study-avatar-picker");
    const avatarModes = choiceGroup("Tipo de avatar", { illustration: "Ilustração", initials: "Iniciais", upload: "Minha imagem" }, id => {
      selectedAvatar = id === "illustration" ? { kind: id, id: "student-1" }
        : id === "initials" ? { kind: id, color: "terra" } : { kind: "initials", color: "terra" };
      showAvatarOptions(id); updatePortrait();
    });
    let uploadPending = false;
    function showAvatarOptions(kind) {
      avatarModes.select(kind); avatarOptions.replaceChildren();
      if (kind === "initials") {
        const colors = choiceGroup("Cor das iniciais", { terra: "Terra", verde: "Verde", azul: "Azul", ameixa: "Ameixa" }, color => {
          selectedAvatar = { kind: "initials", color }; colors.select(color); updatePortrait();
        });
        colors.select(selectedAvatar.color || "terra"); avatarOptions.append(colors.group);
      } else if (kind === "illustration") {
        const grid = element("div", "", "study-avatar-grid");
        const illustrations = [...Array.from({ length: 8 }, (_, i) => `student-${i + 1}`), ...Object.keys(kinds).filter(id => id !== "oculto")];
        for (const id of illustrations) {
          const pick = button("", () => {
            selectedAvatar = { kind: "illustration", id }; updatePortrait();
            for (const item of grid.children) item.setAttribute("aria-pressed", String(item === pick));
          });
          pick.setAttribute("aria-label", id.startsWith("student-") ? `Estudante ${id.split("-")[1]}` : kinds[id]);
          pick.setAttribute("aria-pressed", String(selectedAvatar.id === id));
          const face = element("span", "", "study-user-avatar");
          paintUserAvatar(face, { kind: "illustration", id }, nameInput.value); pick.append(face); grid.append(pick);
        }
        avatarOptions.append(grid);
      } else {
        const upload = element("input"); upload.type = "file"; upload.accept = "image/png,image/jpeg,image/webp";
        const uploadStatus = element("p", "A imagem será recortada em quadrado e enviada apenas ao salvar o perfil.", "study-muted");
        uploadStatus.setAttribute("role", "status");
        upload.addEventListener("change", async () => {
          const file = upload.files?.[0]; if (!file) return;
          uploadPending = true; submit.disabled = true;
          try {
            if (file.size > 8 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Escolha PNG, JPEG ou WebP de até 8 MB.");
            const bitmap = await createImageBitmap(file);
            const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
            const ctx = canvas.getContext("2d");
            const side = Math.min(bitmap.width, bitmap.height);
            ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 256, 256); bitmap.close();
            const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", .82));
            if (!blob || blob.type !== "image/webp" || blob.size > 80 * 1024) throw new Error("Não foi possível preparar uma imagem de até 80 KB.");
            const reader = new FileReader();
            const source = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(blob); });
            selectedAvatar = { kind: "upload", data: source }; updatePortrait();
            uploadStatus.textContent = "Imagem pronta. Salve o perfil para confirmar.";
          } catch (error) { uploadStatus.textContent = error.message || "Não foi possível abrir a imagem."; }
          finally { uploadPending = false; submit.disabled = false; }
        });
        addField(avatarOptions, "Escolher imagem", upload); avatarOptions.append(uploadStatus);
      }
    }
    const goal = radioChips("profile-goal", "Objetivo de estudo", goals, profile.goal);
    const barrier = radioChips("profile-barrier", "Dificuldade mais comum", barriers, profile.barrier);
    const submit = element("button", "Salvar perfil", "study-button study-button--primary"); submit.type = "submit";
    const formStatus = element("p", "", "study-form-status"); formStatus.setAttribute("role", "status");
    const fields = element("div", "", "study-form");
    addField(fields, "Nome de exibição", nameInput); addField(fields, "Sua frase (opcional)", tagline);
    // Ações fixas no rodapé do formulário: status à esquerda, salvar como ação principal.
    const profileActions = element("div", "", "study-form-actions study-sticky-actions");
    profileActions.append(formStatus, button("Rever introdução", openIntro), submit);
    const stats = element("dl", "", "study-stats");
    for (const [key, label] of Object.entries({ cadernos: "Cadernos", degraus: "Degraus alcançados", sozinho: "Subiu sozinho", ensino: "Ensinou o companheiro" })) {
      const item = element("div"); item.append(element("dt", label), element("dd", String(Number.isSafeInteger(statistics[key]) ? statistics[key] : 0))); stats.append(item);
    }
    form.append(profileCard, section("Sobre você", fields), section("Seu avatar", avatarModes.group, avatarOptions),
      section("Como você estuda", goal.fieldset, barrier.fieldset, element("p", "Nível de apoio", "study-field-label"), support.group,
        element("p", "Vale a partir da próxima resposta.", "study-muted")),
      section("Sua caminhada", stats, element("p", account ? "Degraus e autonomia são avaliações do companheiro sobre respostas existentes, não uma medida comprovada de aprendizagem." : "Entre na conta para acompanhar os registros dos seus cadernos.", "study-muted")),
      profileActions);
    support.select(desiredPreferences.zdp || visible.zdp);
    form.addEventListener("submit", async event => {
      event.preventDefault(); if (uploadPending) return;
      submit.disabled = true; setStatus(formStatus, "", "Salvando…");
      const saved = await request("study.profile", { name: nameInput.value, tagline: tagline.value, avatar: selectedAvatar, goal: goal.value(), barrier: barrier.value() });
      setStatus(formStatus, saved ? "ok" : "error", saved ? "Perfil salvo." : "Não foi possível salvar o perfil.");
      submit.disabled = false;
    });
    profilePanel.body.replaceChildren(form); showAvatarOptions(selectedAvatar.kind); updatePortrait();
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
      topicForm(),
      button("Pular por agora", async () => {
        if (await request("study.intro", { command: "skip" })) introPanel.dialog.close();
      }, "study-link-button"),
    );
    for (const submit of introPanel.body.querySelectorAll('[type="submit"]')) submit.disabled = false;
    if (!introPanel.dialog.open) introPanel.dialog.showModal();
  }

  // A alça nativa alterna o painel; esta mantém o gesto de clique e acrescenta arraste.
  const sidebarSizeKey = "fatec-study.sidebar-width.v1";
  let sidebarHandle;
  function adaptSidebar() {
    const rail = document.querySelector('[data-sidebar="rail"]');
    const wrapper = rail?.closest('.group\\/sidebar-wrapper');
    if (!rail || !wrapper) return;
    if (rail.getAttribute("aria-label") !== "Alternar cadernos") rail.setAttribute("aria-label", "Alternar cadernos");
    if (!sidebarHandle || sidebarHandle.parentElement !== rail.parentElement) {
      sidebarHandle?.remove();
      sidebarHandle = element("button", "", "study-sidebar-handle");
      sidebarHandle.type = "button";
      sidebarHandle.setAttribute("role", "separator");
      sidebarHandle.setAttribute("aria-label", "Largura dos cadernos; use as setas para ajustar");
      sidebarHandle.setAttribute("aria-orientation", "vertical");
      let drag = null;
      let sidebarClickTimer;
      const resize = (pixels) => {
        const rem = parseFloat(getComputedStyle(root).fontSize);
        const width = Math.max(14 * rem, Math.min(pixels, 28 * rem, innerWidth * .4));
        wrapper.style.setProperty("--sidebar-width", `${width}px`);
        sidebarHandle.setAttribute("aria-valuemin", String(Math.round(14 * rem)));
        sidebarHandle.setAttribute("aria-valuemax", String(Math.round(Math.min(28 * rem, innerWidth * .4))));
        sidebarHandle.setAttribute("aria-valuenow", String(Math.round(width)));
        try { localStorage.setItem(sidebarSizeKey, String(width / rem)); } catch {}
      };
      const current = () => parseFloat(getComputedStyle(wrapper).getPropertyValue("--sidebar-width")) *
        (getComputedStyle(wrapper).getPropertyValue("--sidebar-width").includes("rem") ? parseFloat(getComputedStyle(root).fontSize) : 1);
      let saved;
      try { saved = Number(localStorage.getItem(sidebarSizeKey)); } catch {}
      if (saved && Number.isFinite(saved)) resize(saved * parseFloat(getComputedStyle(root).fontSize));
      sidebarHandle.addEventListener("pointerdown", (event) => {
        if (event.button !== 0) return;
        clearTimeout(sidebarClickTimer);
        drag = { x: event.clientX, width: current(), moved: false };
        sidebarHandle.setPointerCapture(event.pointerId);
      });
      sidebarHandle.addEventListener("pointermove", (event) => {
        if (!drag) return;
        const delta = event.clientX - drag.x;
        if (Math.abs(delta) > 4) drag.moved = true;
        if (drag.moved) resize(drag.width + delta);
      });
      sidebarHandle.addEventListener("pointerup", () => {
        if (drag && !drag.moved) sidebarClickTimer = setTimeout(() => rail.click(), 260);
        drag = null;
      });
      sidebarHandle.addEventListener("pointercancel", () => { drag = null; });
      sidebarHandle.addEventListener("dblclick", () => { clearTimeout(sidebarClickTimer); resize(16 * parseFloat(getComputedStyle(root).fontSize)); });
      sidebarHandle.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "Enter", " "].includes(event.key)) return;
        event.preventDefault();
        const rem = parseFloat(getComputedStyle(root).fontSize);
        if (event.key === "Home") resize(16 * rem);
        else if (event.key.startsWith("Arrow")) resize(current() + (event.key === "ArrowRight" ? rem : -rem));
        else rail.click();
      });
      window.addEventListener("resize", () => { if (innerWidth >= 768) resize(current()); });
      if (innerWidth >= 768) resize(current());
      rail.after(sidebarHandle);
    }
    sidebarHandle.hidden = innerWidth < 768 || !!rail.closest('[data-state="collapsed"]');
  }

  function adaptChainlit() {
    adaptSidebar();
    adaptNotebookPanel();
    adaptUserAvatar();
    const composer = document.getElementById("message-composer");
    if (composer && bar.nextElementSibling !== composer) composer.before(bar);
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
      ["sidebar-trigger-button", "Conversas"],
      ["search-chats-button", "Buscar cadernos"],
      ["new-chat-button", "Novo caderno"],
    ]) {
      for (const control of document.querySelectorAll(`[id="${id}"]`)) {
        if (control.getAttribute("aria-label") !== label) control.setAttribute("aria-label", label);
      }
    }
    const applyLabel = document.querySelector("#confirm-sidebar > span")?.firstChild;
    if (applyLabel?.nodeType === Node.TEXT_NODE && applyLabel.data !== "Aplicar") {
      applyLabel.data = "Aplicar";
    }

    // A folha pertence ao viewport de rolagem, incluindo o espaçador nativo após a última resposta.
    // A árvore React e o elemento de scroll permanecem os mesmos, preservando a navegação do Chainlit.
    const firstStep = document.querySelector(".step");
    const sheetContent = firstStep?.parentElement;
    const sheetViewport = sheetContent?.parentElement;
    if (sheetViewport && sheetContent) {
      for (const old of document.querySelectorAll(".study-sheet")) {
        if (old !== sheetViewport) old.classList.remove("study-sheet");
      }
      if (!sheetViewport.classList.contains("study-sheet")) sheetViewport.classList.add("study-sheet");
      if (sheetViewport.getAttribute("tabindex") !== "0") sheetViewport.setAttribute("tabindex", "0");
      if (sheetViewport.getAttribute("aria-label") !== "Caderno da conversa") sheetViewport.setAttribute("aria-label", "Caderno da conversa");
      if (!sheetContent.classList.contains("study-sheet-content")) sheetContent.classList.add("study-sheet-content");
    } else {
      const oldViewport = document.querySelector(".study-sheet");
      oldViewport?.classList.remove("study-sheet");
      oldViewport?.removeAttribute("tabindex");
      oldViewport?.removeAttribute("aria-label");
      document.querySelector(".study-sheet-content")?.classList.remove("study-sheet-content");
    }
    for (const message of document.querySelectorAll('[data-step-type="assistant_message"] .ai-message:not([data-study-stamp])')) {
      message.dataset.studyStamp = "true";
      const node = stamp();
      message.querySelector(".message-content")?.before(node);
      paintStamp(node);
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

  function stamp() {
    const node = element("div", "", "study-stamp");
    node.setAttribute("aria-hidden", "true");
    node.append(element("span", "", "study-avatar study-avatar--stamp"), element("span", "", "study-stamp__name"));
    return node;
  }

  // O selo mostra quem assinou cada resposta: nome gravado como autor da mensagem
  // e personagem informado pelo servidor. Trocar de companheiro não altera respostas antigas.
  function paintStamp(node) {
    const message = node.closest(".ai-message");
    const stepId = message?.closest('[id^="step-"]')?.id.slice(5);
    const entry = authors[stepId];
    // O nome vem do autor gravado na mensagem; o avatar do Chainlit é só um recurso
    // de reserva, pois não é renderizado em todas as larguras de tela.
    const author = entry?.name || message?.querySelector('img[alt^="Avatar for "]')?.alt.slice("Avatar for ".length);
    // Sem registro do personagem (respostas antigas), não se deduz o desenho pelo nome.
    const mascot = entry?.mascot || "";
    const label = author || (mascot ? companionNames[mascot] : "Companheiro");
    const nameNode = node.lastElementChild;
    if (nameNode.textContent !== label) nameNode.textContent = label;
    const face = node.firstElementChild;
    face.dataset.initial = label.slice(0, 1).toUpperCase();
    paintAvatar(face, mascot || "", "idle");
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
  let preferenceStatusTimer;

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
    root.dataset.studyAccent = selected.accent || "1";
    root.dataset.studyIntensity = selected.scene_intensity || "normal";
    root.dataset.studyTextSize = selected.text_size || "normal";
    accentChoice.select(selected.accent || "1");
    intensityChoice.select(selected.scene_intensity || "normal");
    sizeChoice.select(selected.text_size || "normal");
    if (effects.dataset.theme !== selected.theme) {
      effects.dataset.theme = selected.theme;
      const actors = effects.children;
      actors[0].replaceChildren();
      actors[1].replaceChildren();
      if (selected.theme === "castelo") {
        actors[0].append(characterArt("harry", "idle", "broom"));
        actors[1].append(characterArt("hermione", "idle", "broom"));
      } else if (selected.theme === "aracnideo") {
        actors[0].append(characterArt("spiderman"));
        actors[1].append(spiderArt());
      }
    }
    for (const [id, card] of Object.entries(themeCards)) {
      card.setAttribute("aria-pressed", String(id === selected.theme));
    }
    appearance.select(selected.appearance);
    motion.select(selected.animations);
    support.select(selected.zdp);
    updateMotion();
    render(currentExpression);
    for (const node of document.querySelectorAll(".study-stamp")) paintStamp(node);
    renderCompanions();
    renderLead();
  }

  let wizardVisit = 0;
  effects.addEventListener("animationiteration", (event) => {
    if (root.dataset.studyTheme === "castelo" && event.target.matches(".study-effects__actor")) {
      const wizards = ["harry", "hermione", "dumbledore", "voldemort"];
      event.target.replaceChildren(characterArt(wizards[++wizardVisit % wizards.length], "idle", "broom"));
    }
  });

  async function choosePreferences(changes) {
    Object.assign(desiredPreferences, changes);
    paintPreferences();
    if (savingPreferences) return;
    savingPreferences = true;
    const origin = session;
    let failed = false;
    setStatus(preferenceStatus, "", "Salvando…");
    while (Object.keys(desiredPreferences).length && session === origin) {
      const sent = { ...desiredPreferences };
      if (!(await request("study.preferences", { preferences: sent }))) failed = true;
      for (const [key, value] of Object.entries(sent)) {
        if (desiredPreferences[key] === value) delete desiredPreferences[key];
      }
      paintPreferences();
    }
    savingPreferences = false;
    setStatus(preferenceStatus, failed ? "error" : "ok",
      failed ? "Não foi possível salvar. Tente de novo." : "Preferências salvas.");
    clearTimeout(preferenceStatusTimer);
    preferenceStatusTimer = setTimeout(() => setStatus(preferenceStatus, "", ""), failed ? 8000 : 3000);
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
        for (const { dialog } of [gallery, companionPanel, introPanel, profilePanel, toolsPanel, notesPanel, moodPanel, focusPanel]) dialog.close();
        lastAutoIntroAccount = null;
      }
      closeFallbackHistory();
      account = data.account;
      root.dataset.studyAccount = account ? "authenticated" : "demo";
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
        // A conversa continua funcionando sem armazenamento do navegador.
      }
    } else if (newSession) {
      clearTimeout(retryTimer);
      tries = 0;
      requestState();
    }

    visible = !data.confirmed && confirmed ? confirmed : data.preferences;
    profile = data.profile;
    currentThread = typeof data.thread_id === "string" ? data.thread_id : null;
    statistics = data.statistics || {};
    notebookMetadata = Array.isArray(data.notebooks) ? data.notebooks : [];
    noteLinks = new Set(Array.isArray(data.note_links) ? data.note_links : []);
    mood = data.mood || null;
    adaptNotebookPanel();
    adaptUserAvatar();
    if (data.mode === "guia" || data.mode === "aprendiz") studyMode = data.mode;
    if (data.companions && typeof data.companions === "object") {
      const names = { ...defaultNames };
      for (const id of Object.keys(defaultNames)) {
        const value = data.companions[id];
        if (typeof value === "string" && value.trim() && Array.from(value).length <= 24) names[id] = value;
      }
      companionNames = names;
    }
    if (data.authors && typeof data.authors === "object") {
      authors = Object.fromEntries(Object.entries(data.authors)
        .filter(([id, entry]) => /^[0-9a-f-]{36}$/.test(id) && entry && typeof entry.name === "string"
          && (entry.mascot === null || mascots.has(entry.mascot)))
        .map(([id, entry]) => [id, { name: entry.name.slice(0, 40), mascot: entry.mascot }]));
    }
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
