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
  function paintAvatar(node, mascot, expression = "idle") {
    if (node.dataset.mascot === mascot && node.dataset.expression === expression) return;
    node.dataset.mascot = mascot || "";
    node.dataset.expression = expression;
    if (characterIds.has(mascot)) {
      if (node.firstElementChild?.dataset.character !== mascot) node.replaceChildren(characterArt(mascot));
    } else if (mascots.has(mascot) && mascot !== "oculto") {
      const img = node.querySelector("img") || document.createElement("img");
      img.alt = "";
      img.width = 48;
      img.height = 48;
      const src = new URL(`mascots/${mascot}-${expression}.webp`, assets).href;
      if (img.src !== src) img.src = src;
      if (img.parentElement !== node) node.replaceChildren(img);
    } else {
      node.replaceChildren();
    }
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
  function render(expression) {
    currentExpression = expression;
    const mascot = selectedMascot();
    bar.dataset.expression = expression;
    bar.dataset.mascot = mascot;
    paintAvatar(avatar, mascot, expression);
    const label = companionName();
    if (name.textContent !== label) name.textContent = label;
    if (status.textContent !== statuses[expression]) status.textContent = statuses[expression];
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
    const close = button("×", () => dialog.close(), "study-dialog__close");
    close.setAttribute("aria-label", "Fechar");
    header.append(heading, close);
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

  const gallery = panel("Temas");
  const themeGrid = element("div", "", "study-theme-grid");
  const themeCards = {};
  for (const [id, [title, description]] of Object.entries(catalog)) {
    const card = button("", () => choosePreferences({ theme: id }), "study-theme-card");
    card.dataset.preview = id;
    const text = element("span", "", "study-theme-card__text");
    text.append(element("strong", title), element("span", description));
    card.append(element("span", "", "study-theme-card__art"), text);
    themeCards[id] = card;
    themeGrid.append(card);
  }
  const appearance = choiceGroup("Aparência", { light: "Claro", dark: "Escuro" },
    (id) => choosePreferences({ appearance: id }));
  const motion = choiceGroup("Animações", { enabled: "Ativadas", paused: "Pausadas" },
    (id) => choosePreferences({ animations: id }));
  const motionStatus = element("p", "", "study-muted");
  motionStatus.setAttribute("role", "status");
  const visualOptions = element("div", "", "study-option-row");
  visualOptions.append(section("Aparência", appearance.group), section("Animações", motion.group, motionStatus));
  const accentChoice = choiceGroup("Cor de destaque", { "1": "Original", "2": "Variação 2", "3": "Variação 3", "4": "Variação 4" }, (id) => choosePreferences({ accent: id }));
  const intensityChoice = choiceGroup("Intensidade do cenário", { suave: "Suave", normal: "Normal", vivo: "Vivo" }, (id) => choosePreferences({ scene_intensity: id }));
  const sizeChoice = choiceGroup("Tamanho do texto", { normal: "Normal", grande: "Grande", extra: "Extra" }, (id) => choosePreferences({ text_size: id }));
  gallery.body.append(section("Ambiente", themeGrid), visualOptions,
    section("Ajustes", element("p", "Cor de destaque", "study-field-label"), accentChoice.group,
      element("p", "Intensidade do cenário", "study-field-label"), intensityChoice.group,
      element("p", "Tamanho do texto", "study-field-label"), sizeChoice.group));

  const companionPanel = panel("Companheiros");
  const companionGrid = element("div", "", "study-companion-grid");
  const companionCards = {};
  for (const id of Object.keys(kinds)) {
    const card = button("", () => choosePreferences({ mascot: id }), "study-companion-card");
    card.dataset.mascot = id;
    const art = element("span", "", "study-companion-card__art");
    art.setAttribute("aria-hidden", "true");
    if (characterIds.has(id)) art.append(characterArt(id));
    else if (id !== "oculto") paintAvatar(art, id);
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
    nicknameStatus.textContent = "Salvando…";
    const saved = await request("study.nickname", { mascot, name: value });
    nicknameSave.disabled = false;
    nicknameStatus.textContent = saved ? "Apelido salvo." : "Não foi possível salvar o apelido.";
    nicknameStatus.dataset.state = saved ? "ok" : "error";
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

  const profilePanel = panel("Meu perfil");
  const introPanel = panel("Primeiros passos");
  const tools = element("div", "", "study-tools");
  tools.hidden = true;
  tools.append(button("Temas", () => gallery.dialog.showModal()),
    button("Companheiros", () => {
      nicknameStatus.textContent = "";
      renderCompanions(true);
      companionPanel.dialog.showModal();
    }),
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

  const levelLabels = { menos: "Menos dicas", guiadas: "Dicas guiadas", mais: "Mais apoio" };
  const support = choiceGroup("Nível de apoio", levelLabels, (id) => choosePreferences({ zdp: id }));

  function buildProfile() {
    const form = element("form", "", "study-form study-profile");
    const nameInput = element("input");
    nameInput.id = "study-profile-name";
    nameInput.value = profile.name;
    nameInput.required = true;
    nameInput.maxLength = 60;
    nameInput.autocomplete = "nickname";
    const nameLabel = element("label", "Nome de exibição");
    nameLabel.htmlFor = nameInput.id;
    const nameHint = element("p", "É assim que o companheiro chama você.", "study-muted");
    const goal = radioChips("profile-goal", "Objetivo de estudo", goals, profile.goal);
    const barrier = radioChips("profile-barrier", "Dificuldade mais comum", barriers, profile.barrier);
    const submit = element("button", "Salvar perfil", "study-button study-button--primary");
    submit.type = "submit";
    const formStatus = element("p", "", "study-form-status");
    formStatus.setAttribute("role", "status");
    const actions = element("div", "", "study-form-actions");
    actions.append(submit, formStatus);
    const supportHint = element("p", "Vale a partir da próxima resposta.", "study-muted");
    form.append(
      section("Sobre você", nameLabel, nameInput, nameHint),
      section("Como você estuda", goal.fieldset, barrier.fieldset,
        element("p", "Nível de apoio", "study-field-label"), support.group, supportHint),
      actions,
    );
    support.select(desiredPreferences.zdp || visible.zdp);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      submit.disabled = true;
      formStatus.dataset.state = "";
      formStatus.textContent = "Salvando…";
      const saved = await request("study.profile", { name: nameInput.value, goal: goal.value(), barrier: barrier.value() });
      formStatus.dataset.state = saved ? "ok" : "error";
      formStatus.textContent = saved ? "Perfil salvo." : "Não foi possível salvar o perfil.";
      submit.disabled = false;
    });
    profilePanel.body.replaceChildren(form);
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

  // A alça nativa alterna o painel; esta mantém o gesto de clique e acrescenta arraste.
  const sidebarSizeKey = "fatec-study.sidebar-width.v1";
  let sidebarHandle;
  function adaptSidebar() {
    const rail = document.querySelector('[data-sidebar="rail"]');
    const wrapper = rail?.closest('.group\\/sidebar-wrapper');
    if (!rail || !wrapper) return;
    if (!sidebarHandle || sidebarHandle.parentElement !== rail.parentElement) {
      sidebarHandle?.remove();
      sidebarHandle = element("button", "", "study-sidebar-handle");
      sidebarHandle.type = "button";
      sidebarHandle.setAttribute("role", "separator");
      sidebarHandle.setAttribute("aria-label", "Largura dos cadernos; use as setas para ajustar");
      sidebarHandle.setAttribute("aria-orientation", "vertical");
      let drag = null;
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
        if (drag && !drag.moved) rail.click();
        drag = null;
      });
      sidebarHandle.addEventListener("pointercancel", () => { drag = null; });
      sidebarHandle.addEventListener("dblclick", () => resize(16 * parseFloat(getComputedStyle(root).fontSize)));
      sidebarHandle.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "Enter", " "].includes(event.key)) return;
        event.preventDefault();
        const rem = parseFloat(getComputedStyle(root).fontSize);
        if (event.key === "Home") resize(16 * rem);
        else if (event.key.startsWith("Arrow")) resize(current() + (event.key === "ArrowRight" ? rem : -rem));
        else rail.click();
      });
      window.addEventListener("resize", () => { if (innerWidth >= 768) resize(current()); });
      rail.after(sidebarHandle);
    }
    sidebarHandle.hidden = innerWidth < 768 || !!rail.closest('[data-state="collapsed"]');
  }

  function adaptChainlit() {
    adaptSidebar();
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
