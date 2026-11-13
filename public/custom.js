(() => {
  "use strict";

  const loginIssue = new URLSearchParams(window.location.search).get("study_error");
  const loginMessages = {
    account_not_invited: "Esta conta ainda não está na lista de convidados. Peça ao responsável para liberar o acesso.",
    email_not_verified: "O Google não confirmou o e-mail desta conta. Verifique sua conta Google e tente novamente.",
  };
  if (window.location.pathname === "/login" && loginMessages[loginIssue]) {
    const showLoginIssue = () => {
      if (document.getElementById("study-login-issue")) return;
      const note = document.createElement("p");
      note.id = "study-login-issue";
      note.setAttribute("role", "alert");
      note.textContent = loginMessages[loginIssue];
      Object.assign(note.style, { position: "fixed", bottom: "24px", left: "5%", width: "90%",
        padding: "16px", borderRadius: "12px", background: "#fff4e5", color: "#512d00", zIndex: "9999" });
      document.body.append(note);
    };
    if (document.body) showLoginIssue();
    else document.addEventListener("DOMContentLoaded", showLoginIssue, { once: true });
  }

  if (document.getElementById("study-ambient")) return;
  const channel = "fatec-study";
  const storageKey = "fatec-study.preferences.v3";
  const assets = new URL(".", document.currentScript.src);
  const root = document.documentElement;
  root.lang = "pt-BR";
  const themes = new Set(["vintage", "castelo", "aracnideo", "cyberpunk", "cafe", "jardim"]);
  const characterIds = new Set(["harry", "hermione", "dumbledore", "voldemort", "spiderman", "miles", "batman", "exterminador", "mccall"]);
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
    mascot: "coruja", mascot_name: "Eva", zdp: "guiadas",
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
    coruja: "Eva", raposa: "Foxi", robo: "Chappie", harry: "Harry", hermione: "Hermione",
    dumbledore: "Dumbledore", voldemort: "Voldemort", spiderman: "Homem-Aranha",
    miles: "Miles Morales", batman: "Batman", exterminador: "Exterminador", mccall: "McCall", oculto: "Companheiro",
  };
  const kinds = {
    coruja: "Coruja", raposa: "Raposa", robo: "Robô", harry: "Harry", hermione: "Hermione",
    dumbledore: "Dumbledore", voldemort: "Voldemort", spiderman: "Homem-Aranha",
    miles: "Miles Morales", batman: "Batman", exterminador: "Exterminador", mccall: "O Protetor", oculto: "Oculto",
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
    cards: "M8 4h11a1 1 0 0 1 1 1v11M5 7h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM8 12h5M8 15h3",
    help: "M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01",
    steps: "M4 20h5v-5h5v-5h6M4 20v-2",
    book: "M5 4.5A1.5 1.5 0 0 1 6.5 3H19v14H6.5A1.5 1.5 0 0 0 5 18.5v-14ZM5 18.5A1.5 1.5 0 0 0 6.5 20H19M9 7h6",
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
    // Só a cena no cartão; o nome segue no rótulo acessível e na dica ao passar o mouse.
    card.setAttribute("aria-label", `${title}: ${description}`);
    card.title = title;
    const art = element("span", "", "study-theme-card__art");
    const check = element("span", "", "study-theme-card__check");
    check.append(icon("check"));
    art.append(check);
    card.append(art);
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
      // Só o nome no cartão; o personagem original continua no rótulo acessível e na dica.
      if (kind.textContent) kind.textContent = "";
      const described = display === kinds[id] || id === "oculto" ? display : `${display}, ${kinds[id]}`;
      if (card.getAttribute("aria-label") !== described) { card.setAttribute("aria-label", described); card.title = described; }
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
    ["tutorial", "Como usar", "help", () => openTutorial()],
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
  }, "study-link-button"), button("Novo por aqui? Veja como funciona", () => openTutorial(), "study-link-button study-tutorial-link"));
  const recentSection = element("section", "", "study-recent");
  const recentTitle = element("h2", "Continuar de onde parou");
  const recentList = element("ul", "", "study-recent__list");
  recentSection.append(recentTitle, recentList);
  recentSection.hidden = true;
  // Revisão do dia: mostra o caderno, não a anotação, para a pessoa tentar lembrar antes de reler.
  const reviewSection = element("section", "", "study-recent study-review");
  const reviewList = element("ul", "", "study-recent__list");
  const reviewMore = button("", () => { buildNotes(); notesPanel.dialog.showModal(); }, "study-link-button");
  reviewSection.append(element("h2", "Revisão do dia"),
    element("p", "Tente lembrar antes de conferir a resposta.", "study-review__lead"), reviewList, reviewMore);
  reviewSection.hidden = true;
  welcome.append(cover, reviewSection, recentSection);

  const reviewKey = "fatec-study.review.v1";
  const reviewMeters = [];
  const reviewLinks = [];
  const cardMeters = [];
  const cardLinks = [];
  let decks = [];
  let cardsJob = null;
  function endOfToday() {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end;
  }
  // Baralhos com cartões vencidos até o fim do dia local.
  function dueDecks() {
    if (!account) return [];
    const end = endOfToday();
    return decks.map((deck) => ({ deck, due: deck.dues.filter((date) => new Date(date) <= end).length }))
      .filter((item) => item.due > 0);
  }
  function reviewIsDue(item) {
    return typeof item?.review_at === "string" && new Date(item.review_at) <= endOfToday();
  }
  function reviewsDone(item) {
    return Number.isSafeInteger(item?.reviews) && item.reviews > 0 ? item.reviews : 0;
  }
  // Revisões vencidas até o fim do dia local, das mais antigas para as mais recentes.
  function dueReviews() {
    if (!account || !profile || !Array.isArray(profile.fichario)) return [];
    return profile.fichario
      .filter((item) => item && typeof item.thread_id === "string" && noteLinks.has(item.thread_id) && reviewIsDue(item))
      .sort((a, b) => new Date(a.review_at) - new Date(b.review_at));
  }
  function notebookName(id) {
    return notebookMetadata.find((item) => item.id === id)?.name || "Caderno sem título";
  }
  // No próprio caderno, a revisão começa na hora; fora dele, o caderno reabre e a revisão segue depois.
  function startReview(threadId) {
    notesPanel.dialog.close();
    if (currentThread === threadId) {
      request("study.review", { thread_id: threadId });
      return;
    }
    try { sessionStorage.setItem(reviewKey, threadId); } catch {}
    location.assign(`/thread/${encodeURIComponent(threadId)}`);
  }
  let reviewWaiting = false;
  function resumePendingReview() {
    let pendingId = null;
    try { pendingId = sessionStorage.getItem(reviewKey); } catch {}
    if (!pendingId || reviewWaiting) return;
    const forget = () => { try { sessionStorage.removeItem(reviewKey); } catch {} };
    if (!location.pathname.endsWith(`/thread/${pendingId}`)) { forget(); return; }
    if (!account || currentThread !== pendingId) return;
    forget();
    reviewWaiting = true;
    // Espera a conversa reaparecer na folha para o pedido não chegar antes da retomada.
    const fire = (tries = 0) => {
      if (!document.querySelector('[data-step-type="assistant_message"]') && tries < 40) {
        setTimeout(() => fire(tries + 1), 250);
        return;
      }
      setTimeout(() => {
        reviewWaiting = false;
        if (currentThread === pendingId) request("study.review", { thread_id: pendingId });
      }, 400);
    };
    fire();
  }
  function renderReviews() {
    const due = dueReviews();
    reviewList.replaceChildren(...due.slice(0, 3).map((item) => {
      const entry = element("li");
      const name = notebookName(item.thread_id);
      const order = `${reviewsDone(item) + 1}ª revisão`;
      const open = button("", () => startReview(item.thread_id), "study-recent__item study-review__item");
      open.append(element("span", name, "study-recent__name"), element("span", order, "study-recent__step"),
        element("span", "Revisar", "study-review__action"));
      open.setAttribute("aria-label", `Revisar ${name}, ${order}`);
      entry.append(open);
      return entry;
    }), ...dueDecks().slice(0, 3).map(({ deck, due: cardsDue }) => {
      // Baralhos com cartões vencidos abrem o painel direto, sem trocar de página.
      const entry = element("li");
      const name = notebookName(deck.thread_id);
      const count = `${cardsDue} ${cardsDue === 1 ? "cartão" : "cartões"}`;
      const open = button("", () => openCards(deck.thread_id), "study-recent__item study-review__item");
      open.append(element("span", `Flash cards · ${name}`, "study-recent__name"),
        element("span", count, "study-recent__step"), element("span", "Estudar", "study-review__action"));
      open.setAttribute("aria-label", `Estudar flash cards de ${name}, ${count} para hoje`);
      entry.append(open);
      return entry;
    }));
    reviewMore.hidden = due.length <= 3;
    reviewMore.textContent = `Ver as ${due.length} revisões no Fichário`;
    reviewSection.hidden = due.length === 0 && dueDecks().length === 0;
    const count = due.length ? String(due.length) : "";
    const label = due.length
      ? `Fichário de descobertas, ${due.length} ${due.length === 1 ? "revisão" : "revisões"} para hoje`
      : "Fichário de descobertas";
    for (const meter of reviewMeters) if (meter.textContent !== count) meter.textContent = count;
    for (const link of reviewLinks) if (link.getAttribute("aria-label") !== label) link.setAttribute("aria-label", label);
    const cardsDue = dueDecks().reduce((sum, item) => sum + item.due, 0);
    const cardsCount = cardsDue ? String(cardsDue) : "";
    const cardsLabel = cardsDue ? `Flash cards, ${cardsDue} ${cardsDue === 1 ? "cartão" : "cartões"} para hoje` : "Flash cards";
    for (const meter of cardMeters) if (meter.textContent !== cardsCount) meter.textContent = cardsCount;
    for (const link of cardLinks) if (link.getAttribute("aria-label") !== cardsLabel) link.setAttribute("aria-label", cardsLabel);
  }

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
  const ladderCaption = element("p", "Cada degrau é um avanço no seu raciocínio; a conversa pode ficar no mesmo degrau até você avançar. Degrau e “subiu sozinho” são avaliações do companheiro.", "study-muted");
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

  // Uma linha por degrau: várias respostas podem acontecer no mesmo degrau até a pessoa avançar.
  function renderLadder(steps) {
    const groups = new Map();
    for (const step of steps) {
      const group = groups.get(step.degrau) || { degrau: step.degrau, replies: 0, hints: 0, solo: false, teach: false };
      group.replies += 1;
      group.hints += step.reveladas;
      group.solo ||= step.sozinho;
      group.teach ||= step.tipo === "ensino";
      groups.set(step.degrau, group);
    }
    const ordered = [...groups.values()].sort((a, b) => a.degrau - b.degrau);
    const current = ordered.at(-1)?.degrau;
    ladderList.replaceChildren(...ordered.map((group) => {
      const item = element("li", "", "study-ladder__step");
      if (group.solo) item.classList.add("study-ladder__step--solo");
      if (group.teach) item.classList.add("study-ladder__step--teach");
      const marks = [group.solo && "subiu sozinho", group.teach && "você ensinou"].filter(Boolean);
      if (!marks.length) marks.push(group.hints ? `${group.hints} ${group.hints === 1 ? "dica aberta" : "dicas abertas"}` : "sem dicas");
      const title = element("strong", `Degrau ${group.degrau}`);
      if (group.degrau === current) {
        item.classList.add("study-ladder__step--current");
        item.setAttribute("aria-current", "step");
        title.append(element("span", "você está aqui", "study-ladder__here"));
      }
      const detail = element("span", marks.join(" · "));
      if (group.replies > 1) detail.append(element("small", ` · ${group.replies} respostas`));
      item.append(title, detail);
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
  const cardsPanel = panel("Flash cards", "Tente responder de memória antes de virar o cartão.");
  cardsPanel.dialog.classList.add("study-dialog--cards");
  const materialsPanel = panel("Materiais", "Apostilas, livros e listas da faculdade em PDF. Só o seu companheiro consulta.");
  // A linha do Foco mostra o tempo restante enquanto a sessão corre.
  const focusMeters = [];
  function toolLinks() {
    const focusLink = navButton("Foco", "clock", () => focusPanel.dialog.showModal());
    const meter = element("span", "", "study-nav__meta");
    focusLink.append(meter);
    focusMeters.push(meter);
    // O Fichário mostra quantas revisões vencem hoje.
    const notesLink = navButton("Fichário de descobertas", "notes", () => { buildNotes(); notesPanel.dialog.showModal(); });
    const reviewMeter = element("span", "", "study-nav__meta");
    notesLink.append(reviewMeter);
    reviewMeters.push(reviewMeter);
    reviewLinks.push(notesLink);
    const cardsLink = navButton("Flash cards", "cards", () => openCards());
    const cardMeter = element("span", "", "study-nav__meta");
    cardsLink.append(cardMeter);
    cardMeters.push(cardMeter);
    cardLinks.push(cardsLink);
    return section("Ferramentas", focusLink, notesLink, cardsLink, navButton("Materiais", "book", () => openMaterials()));
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
      const studyEnded = focusTimer.phase === "study";
      focusNotice = studyEnded ? "Sessão concluída. Hora de uma pausa." : "Pausa concluída. Retome no seu ritmo.";
      if (studyEnded) {
        // Fim do estudo: a pausa começa sozinha e a tela de pausa cobre o site.
        const minutes = breakMinutes();
        focusTimer = { end: Date.now() + minutes * 60000, remaining: minutes * 60000, phase: "break" };
      } else {
        focusTimer = { end: null, remaining: studyMinutes() * 60000, phase: "study" };
      }
      left = focusTimer.end ? focusTimer.end - Date.now() : focusTimer.remaining;
      saveFocus(); render(currentExpression);
      if (!studyEnded) {
        if (breakDialog.open) breakEnded();
        else notify(focusNotice);
      }
      clearTimeout(focusNoticeTimer);
      focusNoticeTimer = setTimeout(() => { focusNotice = ""; render(currentExpression); }, 8000);
    }
    // Pausa correndo significa tela de pausa aberta, inclusive depois de recarregar a página.
    if (focusTimer.phase === "break" && focusTimer.end && !breakDialog.open) showBreak();
    const seconds = Math.ceil(left / 1000);
    const label = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    if (focusClock.textContent !== label) focusClock.textContent = label;
    const meterText = focusTimer.end ? label : "";
    for (const meter of focusMeters) if (meter.textContent !== meterText) meter.textContent = meterText;
    focusStart.textContent = focusTimer.phase === "break" ? "Começar pausa" : focusTimer.end ? "Em foco" : "Começar / retomar";
    focusStart.disabled = !!focusTimer.end; focusPause.disabled = !focusTimer.end;
    focusState.textContent = focusTimer.phase === "study" ? "Uma tarefa de cada vez. Você pode pausar quando precisar." : "Afaste os olhos da tela por alguns instantes, se quiser.";
    if (breakDialog.open && !breakDone) {
      if (breakClock.textContent !== label) breakClock.textContent = label;
      document.title = `Pausa · ${label}`;
    }
    trackPresence();
  }
  function studyMinutes() { return Math.min(120, Math.max(1, Number(focusDuration.value) || 25)); }
  function breakMinutes() { return Math.min(30, Math.max(1, Number(breakDuration.value) || 5)); }

  // Tela de pausa: cobre o site quando o estudo termina, com a opção de cancelar o bloqueio.
  const breakDialog = element("dialog", "", "study-break");
  breakDialog.setAttribute("aria-labelledby", "study-break-title");
  const breakCard = element("div", "", "study-break__card");
  const breakFace = element("span", "", "study-avatar study-break__face");
  breakFace.setAttribute("aria-hidden", "true");
  const breakTitle = element("h2", "Hora de uma pausa");
  breakTitle.id = "study-break-title";
  const breakText = element("p", "", "study-break__text");
  breakText.setAttribute("role", "status");
  const breakClock = element("output", "05:00", "study-break__clock");
  breakClock.setAttribute("role", "timer");
  breakClock.setAttribute("aria-live", "off");
  breakClock.setAttribute("aria-label", "Tempo de pausa restante");
  const breakTips = element("ul", "", "study-break__tips");
  for (const tip of ["Afaste os olhos da tela e olhe para longe.", "Levante e alongue os ombros e as costas.", "Beba um pouco de água."]) {
    breakTips.append(element("li", tip));
  }
  const breakCancel = button("Cancelar o bloqueio", cancelBreak, "study-button");
  const breakBack = button("Voltar a estudar", closeBreak, "study-button study-button--primary");
  const breakActions = element("div", "", "study-break__actions");
  breakActions.append(breakCancel, breakBack);
  breakCard.append(breakFace, breakTitle, breakText, breakClock, breakTips, breakActions);
  breakDialog.append(breakCard);
  // Esc não prende ninguém: durante a pausa cancela o bloqueio; depois dela, só fecha.
  breakDialog.addEventListener("cancel", (event) => { event.preventDefault(); breakDone ? closeBreak() : cancelBreak(); });
  document.body.append(breakDialog);
  let breakDone = false;
  let titleBeforeBreak = document.title;
  function showBreak() {
    breakDone = false;
    titleBeforeBreak = document.title.startsWith("Pausa ·") ? titleBeforeBreak : document.title;
    breakTitle.textContent = "Hora de uma pausa";
    breakText.textContent = `${companionName()} guarda o seu lugar. Descanse alguns minutos e volte com a cabeça leve.`;
    breakClock.hidden = breakTips.hidden = breakCancel.hidden = false;
    breakBack.hidden = true;
    paintAvatar(breakFace, selectedMascot(), "celebrating", "portrait");
    breakFace.hidden = selectedMascot() === "oculto";
    for (const dialog of document.querySelectorAll(".study-dialog[open]")) dialog.close();
    if (!breakDialog.open) breakDialog.showModal();
    breakCancel.focus();
  }
  function breakEnded() {
    breakDone = true;
    breakTitle.textContent = "Pausa concluída";
    breakText.textContent = "Quando quiser, volte ao seu caderno. O Foco está pronto para outra sessão.";
    breakClock.hidden = breakTips.hidden = breakCancel.hidden = true;
    breakBack.hidden = false;
    paintAvatar(breakFace, selectedMascot(), "encouraging", "portrait");
    document.title = titleBeforeBreak;
    breakBack.focus();
  }
  function cancelBreak() {
    focusTimer = { end: null, remaining: studyMinutes() * 60000, phase: "study" };
    focusNotice = "";
    saveFocus();
    closeBreak();
    tickFocus();
    render(currentExpression);
  }
  function closeBreak() {
    breakDone = false;
    if (breakDialog.open) breakDialog.close();
    if (document.title.startsWith("Pausa ·")) document.title = titleBeforeBreak;
  }
  function startBreak() {
    const minutes = breakMinutes();
    focusTimer = { end: Date.now() + minutes * 60000, remaining: minutes * 60000, phase: "break" };
    saveFocus();
    tickFocus();
  }

  // Lembrete de tempo de uso: depois de 50 min seguidos com a aba visível, sugere uma pausa.
  const presenceKey = "fatec-study.presence.v1";
  const NUDGE_AFTER = 50 * 60000, AWAY_RESET = 10 * 60000, SNOOZE = 15 * 60000;
  let presence = { active_ms: 0, last_seen: Date.now(), snooze_until: 0 };
  try {
    const cached = JSON.parse(localStorage.getItem(presenceKey));
    if (cached && Number.isFinite(cached.active_ms) && Number.isFinite(cached.last_seen)) {
      presence = { active_ms: cached.active_ms, last_seen: cached.last_seen,
        snooze_until: Number.isFinite(cached.snooze_until) ? cached.snooze_until : 0 };
    }
  } catch {}
  let presenceSaved = 0;
  const nudgePanel = panel("Que tal uma pausa?");
  nudgePanel.dialog.classList.add("study-dialog--nudge");
  const nudgeFace = element("span", "", "study-avatar study-avatar--large");
  nudgeFace.setAttribute("aria-hidden", "true");
  const nudgeText = element("p", "", "study-nudge__text");
  const nudgeLater = button("Agora não", () => nudgePanel.dialog.close());
  const nudgeBreak = button("", () => {
    nudgeTakingBreak = true;
    nudgePanel.dialog.close();
    startBreak();
  }, "study-button study-button--primary");
  const nudgeActions = element("div", "", "study-form-actions study-nudge__actions");
  nudgeActions.append(nudgeLater, nudgeBreak);
  const nudgeIntro = element("div", "", "study-nudge");
  nudgeIntro.append(nudgeFace, nudgeText);
  nudgePanel.body.append(nudgeIntro, nudgeActions);
  let nudgeTakingBreak = false;
  // Fechar sem escolher a pausa (Esc, X ou "Agora não") adia o lembrete.
  nudgePanel.dialog.addEventListener("close", () => {
    if (nudgeTakingBreak) presence.active_ms = 0;
    else presence.snooze_until = Date.now() + SNOOZE;
    nudgeTakingBreak = false;
    savePresence(true);
  });
  function savePresence(force = false) {
    if (!force && Date.now() - presenceSaved < 10000) return;
    presenceSaved = Date.now();
    try { localStorage.setItem(presenceKey, JSON.stringify(presence)); } catch {}
  }
  function trackPresence() {
    const now = Date.now();
    const gap = now - presence.last_seen;
    if (gap > AWAY_RESET || breakDialog.open) presence.active_ms = 0;
    else if (document.visibilityState === "visible") presence.active_ms += Math.min(gap, 5000);
    presence.last_seen = now;
    savePresence();
    if (presence.active_ms >= NUDGE_AFTER && now >= presence.snooze_until && !focusTimer.end
      && !breakDialog.open && !nudgePanel.dialog.open && !document.querySelector(".study-dialog[open]")) {
      const minutes = Math.floor(presence.active_ms / 60000);
      nudgeText.textContent = `Você está estudando há ${minutes} minutos sem parar. Uma pausa curta ajuda a guardar o que aprendeu.`;
      nudgeBreak.textContent = `Fazer uma pausa de ${breakMinutes()} min`;
      paintAvatar(nudgeFace, selectedMascot(), "encouraging", "portrait");
      nudgeFace.hidden = selectedMascot() === "oculto";
      nudgePanel.dialog.showModal();
      nudgeBreak.focus();
    }
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
      // Com revisão já agendada, reescrever a descoberta mantém a data marcada.
      const reviewLabel = element("label", "", "study-inline-check");
      reviewLabel.append(review, document.createTextNode(review.checked ? "Manter na Revisão do dia" : "Revisar em 3 dias"));
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
    } else notesPanel.body.append(element("p", "Abra um caderno para registrar o que descobriu nele.", "study-muted"));
    const list = element("div", "", "study-discoveries");
    for (const item of entries.slice(0, 100)) {
      const card = element("article", "", "study-discovery");
      card.append(element("p", item.text, "study-discovery__text"));
      // Data, revisão e origem numa linha de metadados discreta.
      const meta = element("div", "", "study-discovery__meta");
      const date = new Date(item.date);
      if (!Number.isNaN(date.getTime())) meta.append(element("time", date.toLocaleDateString("pt-BR")));
      const done = reviewsDone(item);
      if (reviewIsDue(item)) meta.append(element("span", "Revisão para hoje", "study-discovery__due"));
      else if (item.review_at) meta.append(element("span", `Revisar em ${new Date(item.review_at).toLocaleDateString("pt-BR")}`));
      if (done) meta.append(element("span", item.review_at ? `${done} ${done === 1 ? "revisão feita" : "revisões feitas"}` : "Revisões concluídas"));
      if (reviewIsDue(item) && noteLinks.has(item.thread_id)) {
        meta.append(button("Revisar agora", () => startReview(item.thread_id), "study-link-button study-discovery__review"));
      }
      if (noteLinks.has(item.thread_id)) {
        const link = element("a", "Abrir caderno", "study-discovery__link"); link.href = `/thread/${encodeURIComponent(item.thread_id)}`; meta.append(link);
      } else meta.append(element("span", "Caderno de origem indisponível"));
      card.append(meta);
      list.append(card);
    }
    notesPanel.body.append(section("Suas descobertas", list));
    if (!entries.length) list.append(element("p", "Seu fichário ainda está em branco.", "study-muted"));
  }

  // Flash cards: um baralho por caderno, gerado da conversa e revisado em caixas.
  let cardView = { mode: "home" };
  let openDeck = null;
  let rebuildArmed = null;
  let rating = false;
  let lastDeckSignature = "";
  let cardCount = 10;
  try {
    const saved = Number(localStorage.getItem("fatec-study.cards-count.v1"));
    if ([5, 10, 15, 20].includes(saved)) cardCount = saved;
  } catch {}
  function openCards(threadId = null) {
    cardView = { mode: "home" };
    renderCards();
    if (!cardsPanel.dialog.open) cardsPanel.dialog.showModal();
    if (threadId) startDeck(threadId);
  }
  async function startDeck(threadId) {
    cardView = { mode: "loading", threadId };
    renderCards();
    if (!(await request("study.deck", { thread_id: threadId })) && cardView.mode === "loading") {
      cardView = { mode: "home" };
      renderCards();
    }
  }
  // Os cartões chegam numa mensagem própria; a fila da sessão só é montada ao abrir o baralho.
  function receiveDeck(threadId, cards) {
    openDeck = { threadId, cards };
    if (cardView.mode !== "loading" || cardView.threadId !== threadId) return;
    const end = endOfToday();
    const due = cards.filter((card) => new Date(card.due) <= end);
    const queue = (due.length ? due : cards).map((card) => card.id);
    startQueue(threadId, queue);
  }
  function renderCards() {
    if (!account) {
      cardsPanel.body.replaceChildren(element("p", "Entre na sua conta para criar flash cards dos seus cadernos.", "study-muted"));
    } else if (cardView.mode === "loading") {
      cardsPanel.body.replaceChildren(element("p", "Abrindo o baralho…", "study-muted"));
    } else if (cardView.mode === "study") renderStudy();
    else if (cardView.mode === "done") renderDone();
    else renderCardsHome();
  }
  function renderCardsHome() {
    const parts = [];
    if (currentThread) {
      const own = decks.find((deck) => deck.thread_id === currentThread);
      const job = cardsJob?.thread_id === currentThread ? cardsJob : null;
      const generating = job?.status === "generating";
      const status = element("p", "", "study-form-status");
      status.setAttribute("role", "status");
      if (generating) setStatus(status, "", "Preparando cartões a partir desta conversa…");
      else if (job?.status === "error") setStatus(status, "error", job.message || "Não foi possível gerar os cartões.");
      else if (job?.status === "ready") setStatus(status, "ok", "Cartões prontos.");
      const actions = element("div", "", "study-form-actions");
      if (own) {
        const study = button("Estudar", () => startDeck(currentThread), "study-button study-button--primary");
        // Refazer substitui o baralho: o segundo clique confirma.
        const rebuild = button(rebuildArmed === currentThread ? "Confirmar: substituir os cartões" : "Refazer cartões", () => {
          if (rebuildArmed !== currentThread) {
            rebuildArmed = currentThread;
            renderCards();
            cardsPanel.body.querySelector('[data-card-action="rebuild"]')?.focus();
            setTimeout(() => { if (rebuildArmed) { rebuildArmed = null; if (cardView.mode === "home") renderCards(); } }, 6000);
            return;
          }
          rebuildArmed = null;
          createDeck();
        });
        rebuild.dataset.cardAction = "rebuild";
        study.disabled = rebuild.disabled = generating;
        actions.append(study, rebuild);
      } else {
        const create = button("Criar cartões deste caderno", createDeck, "study-button study-button--primary");
        create.disabled = generating;
        actions.append(create);
      }
      const amount = choiceGroup("Quantos cartões?", { 5: "5", 10: "10", 15: "15", 20: "20" }, (id) => {
        cardCount = Number(id);
        try { localStorage.setItem("fatec-study.cards-count.v1", String(cardCount)); } catch {}
        amount.select(String(cardCount));
      });
      amount.select(String(cardCount));
      for (const option of Object.values(amount.buttons)) option.disabled = generating;
      parts.push(section("Este caderno", element("p", own
        ? `${own.total} cartões feitos a partir desta conversa.`
        : "Os cartões saem do que vocês conversaram aqui. Se faltar assunto, completamos com cartões do mesmo tema.", "study-muted"),
      settingRow("Quantos cartões?", "Para criar ou refazer o baralho.", amount.group), actions, status));
    }
    const list = element("div", "", "study-decks");
    const end = endOfToday();
    for (const deck of decks) {
      const due = deck.dues.filter((date) => new Date(date) <= end).length;
      const row = element("div", "", "study-deck");
      const text = element("div", "", "study-deck__text");
      text.append(element("strong", notebookName(deck.thread_id)),
        element("span", `${deck.total} cartões${due ? ` · ${due} para hoje` : ""}`));
      const study = button("Estudar", () => startDeck(deck.thread_id), due ? "study-button study-button--primary" : "study-button");
      study.setAttribute("aria-label", `Estudar ${notebookName(deck.thread_id)}`);
      row.append(text, study);
      list.append(row);
    }
    if (!decks.length) list.append(element("p", "Nenhum baralho ainda. Abra um caderno e crie os primeiros cartões.", "study-muted"));
    parts.push(section("Seus baralhos", list));
    cardsPanel.body.replaceChildren(...parts);
  }
  async function createDeck() {
    const threadId = currentThread;
    cardsJob = { thread_id: threadId, status: "generating" };
    renderCards();
    if (!(await request("study.cards", { thread_id: threadId, count: cardCount }))) {
      cardsJob = null;
      renderCards();
    }
  }
  function currentCard() {
    return openDeck?.threadId === cardView.threadId ? openDeck.cards.find((card) => card.id === cardView.queue[cardView.index]) : null;
  }
  function renderStudy() {
    const card = currentCard();
    if (!card) {
      cardView = { ...cardView, mode: "done" };
      renderDone();
      return;
    }
    const head = element("div", "", "study-flash__head");
    head.append(button("Voltar aos baralhos", () => { cardView = { mode: "home" }; renderCards(); }, "study-link-button"),
      element("span", `${cardView.index + 1} de ${cardView.queue.length}`, "study-flash__progress"));
    // Cartão clássico: a frente traz a pergunta; um clique vira e mostra a resposta no verso.
    const flip = button("", () => {
      cardView.flipped = !cardView.flipped;
      cardView.revealed = true;
      flip.classList.toggle("is-flipped", cardView.flipped);
      flip.setAttribute("aria-pressed", String(cardView.flipped));
      flip.setAttribute("aria-label", cardView.flipped ? "Voltar para a pergunta" : "Virar cartão e ver a resposta");
      rate.hidden = false;
      keys.hidden = false;
      spoken.textContent = cardView.flipped ? `Resposta: ${card.verso}` : `Pergunta: ${card.frente}`;
    }, "study-flip");
    flip.dataset.cardAction = "flip";
    flip.classList.toggle("is-flipped", !!cardView.flipped);
    flip.setAttribute("aria-pressed", String(!!cardView.flipped));
    flip.setAttribute("aria-label", cardView.flipped ? "Voltar para a pergunta" : "Virar cartão e ver a resposta");
    const inner = element("span", "", "study-flip__inner");
    const front = element("span", "", "study-flip__face study-flip__face--front");
    front.setAttribute("aria-hidden", "true");
    const label = element("span", notebookName(cardView.threadId), "study-flash__deck");
    if (card.extra) label.append(element("span", "Complementar", "study-flash__extra"));
    front.append(label,
      element("span", card.frente, "study-flash__front"), element("span", "Toque para virar", "study-flip__hint"));
    const back = element("span", "", "study-flip__face study-flip__face--back");
    back.setAttribute("aria-hidden", "true");
    back.append(element("span", "Resposta", "study-flash__deck"), element("span", card.verso, "study-flash__back"),
      element("span", "Toque para voltar à pergunta", "study-flip__hint"));
    inner.append(front, back);
    flip.append(inner);
    // O leitor de tela ouve a pergunta e, ao virar, a resposta.
    const spoken = element("p", `Pergunta: ${card.frente}`, "study-visually-hidden");
    spoken.setAttribute("aria-live", "polite");
    const rate = element("div", "", "study-flash__rate");
    rate.setAttribute("role", "group");
    rate.setAttribute("aria-label", "Você acertou?");
    rate.hidden = !cardView.revealed;
    for (const [id, text, className] of [["again", "Errei", "study-button"], ["good", "Acertei", "study-button study-button--primary"]]) {
      const option = button(text, () => rateCurrent(id), className);
      option.dataset.rating = id;
      rate.append(option);
    }
    const keys = element("p", "Atalhos: Espaço vira o cartão; 1 = Errei, 2 = Acertei.", "study-muted study-flash__keys");
    const parts = [head, flip, spoken, rate, keys];
    cardsPanel.body.replaceChildren(...parts);
  }
  async function rateCurrent(choice) {
    const card = currentCard();
    if (!card || rating) return;
    rating = true;
    for (const option of cardsPanel.body.querySelectorAll("[data-rating]")) option.disabled = true;
    const saved = await request("study.card", { thread_id: cardView.threadId, card_id: card.id, rating: choice });
    rating = false;
    if (!saved) { renderCards(); return; }
    // O resultado de cada cartão fica para a tela final; os erros podem ser revisados em seguida.
    cardView.results.set(card.id, choice === "good");
    cardView.index += 1;
    cardView.revealed = false;
    cardView.flipped = false;
    renderCards();
    cardsPanel.body.querySelector('[data-card-action="flip"], .study-dialog--cards .study-button--primary')?.focus();
  }
  // "all" guarda o baralho da sessão; revisar só os erros não encolhe o "Tentar todos de novo".
  function startQueue(threadId, queue, all = queue) {
    cardView = { mode: "study", threadId, queue, all, index: 0, revealed: false, flipped: false, results: new Map() };
    renderCards();
    cardsPanel.body.querySelector('[data-card-action="flip"]')?.focus();
  }
  // Resultado da sessão: acertos, cartões errados e o próximo passo sugerido.
  function renderDone() {
    const results = cardView.results || new Map();
    const total = results.size;
    const right = [...results.values()].filter(Boolean).length;
    const percent = total ? Math.round((right / total) * 100) : 0;
    const missed = (openDeck?.cards || []).filter((card) => results.get(card.id) === false);
    const verdict = percent >= 80 ? "Mandou bem!" : percent >= 50 ? "Bom caminho." : "Vale revisar com calma.";
    const meter = element("div", "", "study-score__bar");
    meter.setAttribute("role", "img");
    meter.setAttribute("aria-label", `${percent}% de acertos`);
    const fill = element("span", "", "study-score__fill");
    fill.style.width = `${percent}%`;
    meter.append(fill);
    const summary = element("div", "", "study-score");
    summary.append(element("strong", `${percent}%`, "study-score__percent"),
      element("p", `${verdict} Você acertou ${right} de ${total} ${total === 1 ? "cartão" : "cartões"}.`, "study-flash__summary"), meter);
    const parts = [summary];
    if (missed.length) {
      const list = element("ul", "", "study-score__missed");
      for (const card of missed) list.append(element("li", card.frente));
      parts.push(element("p", "Para revisar:", "study-field-label"), list);
    }
    const actions = element("div", "", "study-form-actions");
    const threadId = cardView.threadId;
    if (missed.length) {
      actions.append(button("Revisar os que errei", () => startQueue(threadId, missed.map((card) => card.id), cardView.all), "study-button study-button--primary"));
    }
    actions.append(button("Tentar todos de novo", () => startQueue(threadId, cardView.all || [...results.keys()]), missed.length ? "study-button" : "study-button study-button--primary"),
      button("Voltar aos baralhos", () => { cardView = { mode: "home" }; renderCards(); }, "study-link-button"));
    parts.push(actions, element("p", "Os cartões errados voltam amanhã na Revisão do dia; os certos, mais tarde.", "study-muted"));
    cardsPanel.body.replaceChildren(section("Resultado", ...parts));
    actions.querySelector("button")?.focus();
  }
  document.addEventListener("keydown", (event) => {
    if (!cardsPanel.dialog.open || cardView.mode !== "study" || event.target.closest?.("textarea, input")) return;
    if (event.key === " " && !event.target.closest?.("button")) {
      event.preventDefault();
      cardsPanel.body.querySelector('[data-card-action="flip"]')?.click();
    } else if (cardView.revealed && ["1", "2"].includes(event.key)) {
      event.preventDefault();
      rateCurrent(event.key === "1" ? "again" : "good");
    }
  });

  // Materiais: PDFs privados da conta, enviados por HTTP e indexados em segundo plano.
  let materials = [];
  let materialsTimer = null;
  let removeArmed = null;
  const materialsInput = element("input");
  materialsInput.type = "file";
  materialsInput.accept = "application/pdf,.pdf";
  materialsInput.hidden = true;
  const materialsStatus = element("p", "", "study-form-status");
  materialsStatus.setAttribute("role", "status");
  const materialsList = element("div", "", "study-decks study-materials");
  const materialsAdd = button("Adicionar PDF", () => materialsInput.click(), "study-button study-button--primary");
  const materialsSwitch = button("", async () => {
    const enabled = materialsSwitch.getAttribute("aria-checked") !== "true";
    materialsSwitch.setAttribute("aria-checked", String(enabled));
    if (!(await request("study.materials", { enabled }))) materialsSwitch.setAttribute("aria-checked", String(!enabled));
  }, "study-switch");
  materialsSwitch.setAttribute("role", "switch");
  materialsSwitch.setAttribute("aria-label", "Usar meus materiais nas respostas");
  materialsSwitch.setAttribute("aria-checked", "true");
  const materialsActions = element("div", "", "study-form-actions");
  materialsActions.append(materialsAdd, materialsInput);
  const materialsAccount = element("p", "Entre na sua conta para enviar materiais.", "study-muted");
  const materialsContent = element("div", "", "study-materials__content");
  materialsContent.append(
    section("Seus PDFs", materialsActions,
      element("p", "Até 20 PDFs com texto selecionável, de até 25 MB e 400 páginas. O arquivo não é guardado: só o texto, em trechos, para consulta.", "study-muted"),
      materialsList),
    section("Nas respostas", settingRow("Usar meus materiais", "O companheiro cita a fonte e transforma exercícios em pistas.", materialsSwitch)));
  materialsPanel.body.append(materialsAccount, materialsContent);
  const materialsFooter = element("div", "", "study-dialog__footer");
  materialsFooter.append(materialsStatus);
  materialsPanel.dialog.append(materialsFooter);
  materialsPanel.dialog.addEventListener("close", () => clearTimeout(materialsTimer));
  function openMaterials() {
    setStatus(materialsStatus, "", "");
    renderMaterials();
    if (!materialsPanel.dialog.open) materialsPanel.dialog.showModal();
    if (account) loadMaterials();
  }
  async function loadMaterials() {
    clearTimeout(materialsTimer);
    try {
      const response = await fetch("/study/materials", { credentials: "same-origin" });
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      materials = Array.isArray(data.materials) ? data.materials.filter((item) => item && typeof item.id === "string"
        && typeof item.name === "string" && ["processing", "ready", "error"].includes(item.status)) : [];
    } catch {
      setStatus(materialsStatus, "error", "Não foi possível carregar seus materiais.");
    }
    renderMaterials();
    // Enquanto algum PDF é processado, a lista se atualiza sozinha.
    if (materialsPanel.dialog.open && materials.some((item) => item.status === "processing")) {
      materialsTimer = setTimeout(loadMaterials, 2000);
    }
  }
  materialsInput.addEventListener("change", async () => {
    const file = materialsInput.files?.[0];
    materialsInput.value = "";
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) { setStatus(materialsStatus, "error", "O arquivo passa de 25 MB."); return; }
    materialsAdd.disabled = true;
    setStatus(materialsStatus, "", `Enviando ${file.name}…`);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/study/materials", { method: "POST", body: form, credentials: "same-origin" });
      if (!response.ok) {
        const detail = (await response.json().catch(() => ({}))).detail;
        setStatus(materialsStatus, "error", typeof detail === "string" ? detail : "Não foi possível enviar o arquivo.");
      } else setStatus(materialsStatus, "ok", "Recebido. Preparando o texto para consulta…");
    } catch {
      setStatus(materialsStatus, "error", "Não foi possível enviar o arquivo. Confira a conexão.");
    }
    materialsAdd.disabled = false;
    loadMaterials();
  });
  async function removeMaterial(item) {
    // Remover é definitivo: o segundo clique confirma.
    if (removeArmed !== item.id) {
      removeArmed = item.id;
      renderMaterials();
      materialsList.querySelector(`[data-material="${item.id}"]`)?.focus();
      setTimeout(() => { if (removeArmed === item.id) { removeArmed = null; renderMaterials(); } }, 6000);
      return;
    }
    removeArmed = null;
    const response = await fetch(`/study/materials/${encodeURIComponent(item.id)}`, { method: "DELETE", credentials: "same-origin" }).catch(() => null);
    setStatus(materialsStatus, response?.ok ? "ok" : "error", response?.ok ? `${item.name} removido.` : "Não foi possível remover o material.");
    loadMaterials();
  }
  function renderMaterials() {
    materialsAccount.hidden = !!account;
    materialsContent.hidden = !account;
    const focused = document.activeElement?.dataset?.material;
    materialsList.replaceChildren(...materials.map((item) => {
      const row = element("div", "", "study-deck");
      const text = element("div", "", "study-deck__text");
      const detail = item.status === "processing" ? "Processando…"
        : item.status === "error" ? (item.error || "Não foi possível ler o PDF.")
          : `${item.pages} ${item.pages === 1 ? "página" : "páginas"} · Pronto`;
      const meta = element("span", detail);
      if (item.status === "error") meta.className = "study-materials__error";
      text.append(element("strong", item.name), meta);
      const remove = button(removeArmed === item.id ? "Confirmar remoção" : "Remover", () => removeMaterial(item), "study-link-button");
      remove.dataset.material = item.id;
      remove.disabled = item.status === "processing";
      remove.setAttribute("aria-label", `${removeArmed === item.id ? "Confirmar remoção de" : "Remover"} ${item.name}`);
      row.append(text, remove);
      return row;
    }));
    if (!materials.length) materialsList.append(element("p", "Nenhum material ainda.", "study-muted"));
    if (focused) materialsList.querySelector(`[data-material="${focused}"]`)?.focus();
  }

  // Tutorial "Como usar": passos curtos sobre cada parte do sistema.
  const tutorialKey = "fatec-study.tutorial.v1";
  const tutorialSteps = [
    ["edit", "Comece um caderno", "Escreva na capa o assunto que quer estudar. O companheiro explica primeiro, com um exemplo, e depois faz uma pergunta para conferir se ficou claro."],
    ["steps", "A Escada de dicas", "Abaixo de cada resposta, as dicas abrem uma por vez, só quando você precisar. Cada degrau é um avanço no seu raciocínio; “subiu sozinho” aparece quando você avançou sem abrir dicas."],
    ["companion", "Guia ou Aprende", "Na barra acima do campo de mensagem, escolha quem conduz. No Guia, o companheiro leva você passo a passo. No Aprende, você explica e ele aponta o que ficou claro e o que faltou."],
    ["notes", "Fichário e Revisão do dia", "Guarde no Fichário o que você descobriu, com suas palavras. A capa lembra o que revisar, e o companheiro pergunta sem mostrar a anotação."],
    ["cards", "Flash cards", "Escolha quantos cartões quer, toque no cartão para virar e marque Acertei ou Errei. No fim, veja seu resultado e revise o que errou."],
    ["book", "Materiais", "Envie os PDFs da faculdade (apostilas, livros, listas). O companheiro consulta, cita a página e transforma exercícios em pistas, sem entregar a resposta."],
    ["clock", "Foco, pausas e visual", "O Foco marca sessões de estudo; quando o tempo acaba, a tela entra em pausa, com opção de cancelar. Em Temas e Companheiros você muda o visual e quem estuda com você."],
  ];
  const tutorialPanel = panel("Como usar o AjudAI", "Um passo de cada vez, como nos cadernos.");
  tutorialPanel.dialog.classList.add("study-dialog--tutorial");
  let tutorialIndex = 0;
  function tutorialSeen() {
    try { return localStorage.getItem(tutorialKey) === "seen"; } catch { return true; }
  }
  function openTutorial(index = 0) {
    try { localStorage.setItem(tutorialKey, "seen"); } catch {}
    tutorialIndex = index;
    renderTutorial();
    if (!tutorialPanel.dialog.open) tutorialPanel.dialog.showModal();
    tutorialPanel.body.querySelector(".study-tutorial__next")?.focus();
  }
  function renderTutorial() {
    const [iconName, title, text] = tutorialSteps[tutorialIndex];
    const last = tutorialIndex === tutorialSteps.length - 1;
    const badge = element("span", "", "study-tutorial__icon");
    badge.append(icon(iconName));
    const card = element("article", "", "study-tutorial__step");
    card.setAttribute("aria-live", "polite");
    card.append(badge, element("span", `Passo ${tutorialIndex + 1} de ${tutorialSteps.length}`, "study-tutorial__count"),
      element("h3", title), element("p", text));
    const dots = element("div", "", "study-tutorial__dots");
    tutorialSteps.forEach(([, label], index) => {
      const dot = button("", () => { tutorialIndex = index; renderTutorial(); dots.children[index]?.focus(); }, "study-tutorial__dot");
      dot.setAttribute("aria-label", `Passo ${index + 1}: ${label}`);
      if (index === tutorialIndex) dot.setAttribute("aria-current", "step");
      dots.append(dot);
    });
    const previous = button("Anterior", () => { tutorialIndex -= 1; renderTutorial(); }, "study-button");
    previous.disabled = tutorialIndex === 0;
    const next = button(last ? "Concluir" : "Próximo", () => {
      if (last) { tutorialPanel.dialog.close(); return; }
      tutorialIndex += 1;
      renderTutorial();
      tutorialPanel.body.querySelector(".study-tutorial__next")?.focus();
    }, "study-button study-button--primary study-tutorial__next");
    const actions = element("div", "", "study-tutorial__actions");
    actions.append(previous, dots, next);
    tutorialPanel.body.replaceChildren(card, actions);
  }
  tutorialPanel.dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowRight" && tutorialIndex < tutorialSteps.length - 1) { tutorialIndex += 1; renderTutorial(); }
    else if (event.key === "ArrowLeft" && tutorialIndex > 0) { tutorialIndex -= 1; renderTutorial(); }
    else return;
    event.preventDefault();
    tutorialPanel.body.querySelector(".study-tutorial__next")?.focus();
  });

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
    if (data?.channel === channel && data.version === 1 && data.direction === "server" && data.type === "study.deck") {
      if (data.session_id === session && /^[0-9a-f-]{36}$/.test(data.thread_id) && Array.isArray(data.cards)) {
        receiveDeck(data.thread_id, data.cards.filter((card) => card && typeof card.id === "string"
          && typeof card.frente === "string" && typeof card.verso === "string" && typeof card.due === "string"));
      }
      return;
    }
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
        for (const { dialog } of [gallery, companionPanel, introPanel, profilePanel, toolsPanel, notesPanel, focusPanel, cardsPanel, materialsPanel, tutorialPanel]) dialog.close();
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
    adaptNotebookPanel();
    adaptUserAvatar();
    // Resumos dos baralhos (datas de cada cartão) e geração em andamento.
    const deckSignature = JSON.stringify([data.decks, data.cards_job, currentThread]);
    decks = Array.isArray(data.decks) ? data.decks.filter((deck) => deck && /^[0-9a-f-]{36}$/.test(deck.thread_id)
      && Number.isSafeInteger(deck.total) && Array.isArray(deck.dues))
      .map((deck) => ({ thread_id: deck.thread_id, total: deck.total, dues: deck.dues.filter((date) => typeof date === "string") })) : [];
    cardsJob = data.cards_job && typeof data.cards_job.thread_id === "string" && typeof data.cards_job.status === "string" ? data.cards_job : null;
    if (cardsPanel.dialog.open && cardView.mode === "home" && deckSignature !== lastDeckSignature) renderCards();
    lastDeckSignature = deckSignature;
    renderReviews();
    const useMaterials = String(profile?.use_materials !== false);
    if (materialsSwitch.getAttribute("aria-checked") !== useMaterials) materialsSwitch.setAttribute("aria-checked", useMaterials);
    resumePendingReview();
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
    // O tutorial abre sozinho uma única vez por navegador, sem cobrir outro painel aberto.
    if (data.confirmed && !tutorialSeen()) {
      setTimeout(() => {
        if (!tutorialSeen() && !document.querySelector(".study-dialog[open], .study-break[open]")) openTutorial();
      }, 1500);
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
