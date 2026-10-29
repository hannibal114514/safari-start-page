const CONFIG = {
  username: "wenji",
  hostname: "safari",
  branch: "main",
  themeLabel: "Dark Modern",

  defaultEngine: "google",
  searchEngines: {
    google: {
      label: "google",
      aliases: ["g"],
      search: "https://www.google.com/search?q={query}",
    },
    bing: {
      label: "bing",
      aliases: ["b"],
      search: "https://www.bing.com/search?q={query}",
    },
    duckduckgo: {
      label: "duckduckgo",
      aliases: ["ddg", "duck"],
      search: "https://duckduckgo.com/?q={query}",
    },
    baidu: {
      label: "baidu",
      aliases: ["bd"],
      search: "https://www.baidu.com/s?wd={query}",
    },
  },

  prefixes: {
    "!gh": {
      label: "github",
      search: "https://github.com/search?q={query}",
    },
    "!bl": {
      label: "bilibili",
      search: "https://search.bilibili.com/all?keyword={query}",
    },
    "!yt": {
      label: "youtube",
      search: "https://www.youtube.com/results?search_query={query}",
    },
    "!ai": {
      label: "chat",
      open: "https://chatgpt.com/",
    },
  },

  links: {
    github: { label: "GitHub", url: "https://github.com/" },
    bilibili: { label: "Bilibili", url: "https://www.bilibili.com/" },
    youtube: { label: "YouTube", url: "https://www.youtube.com/" },
    chat: { label: "ChatGPT", url: "https://chatgpt.com/" },
  },

  colors: {
    background: "#1F1F1F",
    statusBackground: "#181818",
    text: "#CCCCCC",
    muted: "#6E7681",
    blue: "#4FC1FF",
    username: "#4EC9B0",
    hostname: "#DCDCAA",
    prefix: "#CE9178",
  },
};

const STORAGE_KEY = "wenji-start-page:v2";
const MAX_HISTORY = 50;
const MAX_NOTES = 50;

const colorVariables = {
  background: "--background",
  statusBackground: "--status-background",
  text: "--text",
  muted: "--muted",
  blue: "--blue",
  username: "--username",
  hostname: "--hostname",
  prefix: "--prefix",
};

function createDefaultState() {
  return {
    username: CONFIG.username,
    hostname: CONFIG.hostname,
    branch: CONFIG.branch,
    themeLabel: CONFIG.themeLabel,
    engine: CONFIG.defaultEngine,
    colors: { ...CONFIG.colors },
    customLinks: {},
    history: [],
    notes: [],
  };
}

function loadState() {
  const defaults = createDefaultState();

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || typeof saved !== "object") {
      return defaults;
    }

    const loaded = {
      ...defaults,
      ...saved,
      colors: { ...CONFIG.colors, ...(saved.colors || {}) },
      customLinks: saved.customLinks && typeof saved.customLinks === "object" ? saved.customLinks : {},
      history: Array.isArray(saved.history) ? saved.history.slice(-MAX_HISTORY) : [],
      notes: Array.isArray(saved.notes) ? saved.notes.slice(-MAX_NOTES) : [],
    };

    if (!CONFIG.searchEngines[loaded.engine]) {
      loaded.engine = CONFIG.defaultEngine;
    }

    return loaded;
  } catch {
    return defaults;
  }
}

const state = loadState();
let historyCursor = -1;
let historyDraft = "";

const elements = {
  form: document.querySelector("#searchForm"),
  input: document.querySelector("#searchInput"),
  inputShell: document.querySelector("#inputShell"),
  inputMirror: document.querySelector("#inputMirror"),
  output: document.querySelector("#terminalOutput"),
  prefixHints: document.querySelector("#prefixHints"),
  network: document.querySelector("#networkStatus"),
  engine: document.querySelector("#engineStatus"),
  clock: document.querySelector("#clock"),
};

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function applyState() {
  document.querySelector("#promptUser").textContent = state.username;
  document.querySelector("#promptHost").textContent = state.hostname;
  document.querySelector("#statusUser").textContent = state.username;
  document.querySelector("#statusBranch").textContent = state.branch;
  document.querySelector("#themeLabel").textContent = state.themeLabel;
  elements.engine.textContent = CONFIG.searchEngines[state.engine].label;

  for (const [name, value] of Object.entries(state.colors)) {
    if (colorVariables[name]) {
      document.documentElement.style.setProperty(colorVariables[name], value);
    }
  }

  elements.prefixHints.replaceChildren(
    ...Object.entries(CONFIG.prefixes).map(([prefix, item]) => {
      const hint = document.createElement("span");
      const key = document.createElement("span");
      key.className = "prefix-key";
      key.textContent = prefix;
      hint.append(key, ` ${item.label}`);
      return hint;
    }),
  );
}

function outputLine({ key = "", text = "", kind = "", index = "" }) {
  const line = document.createElement("div");

  if (index !== "") {
    const indexElement = document.createElement("span");
    indexElement.className = "output-index";
    indexElement.textContent = String(index);
    line.append(indexElement);
  }

  if (key) {
    const keyElement = document.createElement("span");
    keyElement.className = kind ? `output-${kind}` : "output-command";
    keyElement.textContent = key;
    line.append(keyElement, text ? `  ${text}` : "");
  } else {
    line.className = kind ? `output-${kind}` : "";
    line.append(document.createTextNode(text));
  }

  return line;
}

function showOutput(rows) {
  elements.output.replaceChildren(...rows.map((row) => outputLine(typeof row === "string" ? { text: row } : row)));
  elements.output.hidden = false;
  elements.output.scrollTop = 0;
}

function hideOutput() {
  elements.output.hidden = true;
  elements.output.replaceChildren();
}

function updateInputMirror() {
  elements.inputMirror.textContent = elements.input.value;
}

function setInputValue(value) {
  elements.input.value = value;
  updateInputMirror();
  const end = value.length;
  elements.input.setSelectionRange(end, end);
}

function focusInput() {
  elements.input.focus({ preventScroll: true });
  const end = elements.input.value.length;
  elements.input.setSelectionRange(end, end);
}

function clearInput({ keepOutput = false } = {}) {
  setInputValue("");
  historyCursor = -1;
  historyDraft = "";
  if (!keepOutput) {
    hideOutput();
  }
}

function buildUrl(template, query) {
  return template.replace("{query}", encodeURIComponent(query));
}

function looksLikeUrl(value) {
  return value.includes(".") && !/\s/.test(value);
}

function normalizeUrl(value) {
  return /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
}

function navigate(url) {
  window.location.assign(url);
}

function resolveEngine(value) {
  const normalized = value.toLowerCase();
  return Object.entries(CONFIG.searchEngines).find(([name, engine]) => {
    return name === normalized || engine.aliases.includes(normalized);
  })?.[0] || null;
}

function allLinks() {
  return { ...CONFIG.links, ...state.customLinks };
}

function pushHistory(value) {
  if (state.history.at(-1) !== value) {
    state.history.push(value);
    state.history = state.history.slice(-MAX_HISTORY);
  }
  saveState();
  historyCursor = -1;
  historyDraft = "";
}

function showHelp() {
  showOutput([
    "available commands:",
    { key: "engine [name]", text: "list or change the default search engine" },
    { key: "links", text: "list configured shortcuts" },
    { key: "open <name>", text: "open a shortcut" },
    { key: "link add <name> <url>", text: "save a shortcut" },
    { key: "link remove <name>", text: "remove a custom shortcut" },
    { key: "history", text: "show local command and search history" },
    { key: "clear history", text: "delete local history" },
    { key: "note <text>", text: "save a local note" },
    { key: "notes", text: "list local notes" },
    { key: "note remove <n>", text: "remove one note" },
    { key: "note clear", text: "delete all notes" },
    { key: "config", text: "show editable settings" },
    { key: "help", text: "show this list" },
    { key: "Tab / ↑ / ↓", text: "complete commands / browse history" },
  ]);
}

function showConfig() {
  showOutput([
    "current config:",
    { key: "identity", text: `${state.username}@${state.hostname} ~ ${state.branch}`, kind: "value" },
    { key: "engine", text: state.engine, kind: "value" },
    { key: "set user <value>", text: "change the prompt username" },
    { key: "set host <value>", text: "change the prompt hostname" },
    { key: "set branch <value>", text: "change the status branch" },
    { key: "set theme <value>", text: "change the top-left label" },
    { key: "set color <name> <#RRGGBB>", text: "change a theme color" },
    { key: "reset config", text: "restore CONFIG defaults" },
    { text: `colors: ${Object.keys(colorVariables).join(", ")}` },
  ]);
}

function showEngines() {
  showOutput([
    `current engine: ${state.engine}`,
    ...Object.entries(CONFIG.searchEngines).map(([name, engine]) => ({
      key: name,
      text: engine.aliases.length ? `aliases: ${engine.aliases.join(", ")}` : "",
      kind: name === state.engine ? "success" : "command",
    })),
  ]);
}

function showLinks() {
  showOutput([
    "configured links:",
    ...Object.entries(allLinks()).map(([name, item]) => ({ key: name, text: `${item.label} · ${item.url}` })),
  ]);
}

function showHistory() {
  const recent = state.history.slice(-12).reverse();
  showOutput(recent.length
    ? ["recent history:", ...recent.map((item, index) => ({ index: index + 1, text: item }))]
    : [{ text: "history is empty", kind: "error" }]);
}

function showNotes() {
  showOutput(state.notes.length
    ? ["saved notes:", ...state.notes.map((note, index) => ({ index: index + 1, text: note }))]
    : [{ text: "notes are empty", kind: "error" }]);
}

function persistOrReport(successRows) {
  if (saveState()) {
    applyState();
    showOutput(successRows);
  } else {
    showOutput([{ text: "could not save settings in this browser", kind: "error" }]);
  }
}

function handleEngineCommand(tokens) {
  if (tokens.length === 1) {
    showEngines();
    return;
  }

  const engineName = resolveEngine(tokens[1]);
  if (!engineName) {
    showOutput([{ text: `unknown engine: ${tokens[1]}`, kind: "error" }]);
    return;
  }

  state.engine = engineName;
  persistOrReport([{ text: `default engine set to ${engineName}`, kind: "success" }]);
}

function handleLinkCommand(tokens) {
  const action = tokens[1]?.toLowerCase();
  const name = tokens[2]?.toLowerCase();

  if (action === "add" && name && tokens[3]) {
    if (!/^[a-z0-9_-]+$/i.test(name)) {
      showOutput([{ text: "link name may only use letters, numbers, _ and -", kind: "error" }]);
      return;
    }

    const url = normalizeUrl(tokens.slice(3).join(""));
    state.customLinks[name] = { label: name, url };
    persistOrReport([{ text: `saved link: ${name}`, kind: "success" }]);
    return;
  }

  if (action === "remove" && name) {
    if (!state.customLinks[name]) {
      showOutput([{ text: `custom link not found: ${name}`, kind: "error" }]);
      return;
    }

    delete state.customLinks[name];
    persistOrReport([{ text: `removed link: ${name}`, kind: "success" }]);
    return;
  }

  showOutput([{ text: "usage: link add <name> <url> | link remove <name>", kind: "error" }]);
}

function handleNoteCommand(rawValue, tokens) {
  const action = tokens[1]?.toLowerCase();

  if (!action) {
    showNotes();
    return;
  }

  if (action === "clear") {
    state.notes = [];
    persistOrReport([{ text: "all notes cleared", kind: "success" }]);
    return;
  }

  if (action === "remove") {
    const index = Number(tokens[2]) - 1;
    if (!Number.isInteger(index) || !state.notes[index]) {
      showOutput([{ text: "note number not found", kind: "error" }]);
      return;
    }

    state.notes.splice(index, 1);
    persistOrReport([{ text: `removed note ${index + 1}`, kind: "success" }]);
    return;
  }

  const note = rawValue.slice(rawValue.indexOf(" ") + 1).trim();
  state.notes.push(note);
  state.notes = state.notes.slice(-MAX_NOTES);
  persistOrReport([{ text: "note saved locally", kind: "success" }]);
}

function handleSetCommand(tokens) {
  const setting = tokens[1]?.toLowerCase();
  const value = tokens.slice(2).join(" ").trim();

  if (["user", "host", "branch", "theme"].includes(setting) && value) {
    const stateKey = { user: "username", host: "hostname", branch: "branch", theme: "themeLabel" }[setting];
    state[stateKey] = value.slice(0, 32);
    persistOrReport([{ text: `${setting} updated`, kind: "success" }]);
    return;
  }

  if (setting === "color" && tokens[2] && tokens[3]) {
    const colorName = tokens[2];
    const colorValue = tokens[3];
    if (!colorVariables[colorName] || !/^#[0-9a-f]{6}$/i.test(colorValue)) {
      showOutput([{ text: "usage: set color <name> <#RRGGBB>", kind: "error" }]);
      return;
    }

    state.colors[colorName] = colorValue.toUpperCase();
    persistOrReport([{ text: `${colorName} updated`, kind: "success" }]);
    return;
  }

  showOutput([{ text: "usage: set user|host|branch|theme <value> | set color <name> <#RRGGBB>", kind: "error" }]);
}

function resetConfig() {
  const defaults = createDefaultState();
  state.username = defaults.username;
  state.hostname = defaults.hostname;
  state.branch = defaults.branch;
  state.themeLabel = defaults.themeLabel;
  state.engine = defaults.engine;
  state.colors = defaults.colors;
  persistOrReport([{ text: "config restored to defaults", kind: "success" }]);
}

function handleCommand(rawValue) {
  const tokens = rawValue.split(/\s+/);
  const command = tokens[0].toLowerCase();

  if (command === "help") {
    showHelp();
  } else if (command === "config") {
    showConfig();
  } else if (command === "engine") {
    handleEngineCommand(tokens);
  } else if (command === "links") {
    showLinks();
  } else if (command === "open") {
    const link = allLinks()[tokens[1]?.toLowerCase()];
    if (link) {
      navigate(link.url);
    } else {
      showOutput([{ text: `link not found: ${tokens[1] || ""}`, kind: "error" }]);
    }
  } else if (command === "link") {
    handleLinkCommand(tokens);
  } else if (command === "history") {
    showHistory();
  } else if (rawValue.toLowerCase() === "clear history") {
    state.history = [];
    persistOrReport([{ text: "history cleared", kind: "success" }]);
  } else if (command === "note") {
    handleNoteCommand(rawValue, tokens);
  } else if (command === "notes") {
    showNotes();
  } else if (command === "set") {
    handleSetCommand(tokens);
  } else if (rawValue.toLowerCase() === "reset config") {
    resetConfig();
  } else if (command === "clear") {
    hideOutput();
  } else {
    return false;
  }

  return true;
}

function handleSubmit(event) {
  event.preventDefault();
  const rawValue = elements.input.value.trim();

  if (!rawValue) {
    return;
  }

  pushHistory(rawValue);

  if (handleCommand(rawValue)) {
    clearInput({ keepOutput: true });
    return;
  }

  const [firstToken, ...rest] = rawValue.split(/\s+/);
  const prefix = CONFIG.prefixes[firstToken.toLowerCase()];

  if (prefix) {
    if (prefix.open) {
      navigate(prefix.open);
      return;
    }

    const query = rest.join(" ").trim();
    if (query) {
      navigate(buildUrl(prefix.search, query));
    } else {
      showOutput([{ text: `${firstToken} needs a search query`, kind: "error" }]);
      clearInput({ keepOutput: true });
    }
    return;
  }

  if (looksLikeUrl(rawValue)) {
    navigate(normalizeUrl(rawValue));
    return;
  }

  const engine = CONFIG.searchEngines[state.engine];
  navigate(buildUrl(engine.search, rawValue));
}

function commonPrefix(values) {
  if (!values.length) {
    return "";
  }

  let prefix = values[0];
  for (const value of values.slice(1)) {
    while (!value.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
    }
  }
  return prefix;
}

function completionCandidates(value) {
  const normalized = value.toLowerCase();
  const links = Object.keys(allLinks());
  const engines = Object.keys(CONFIG.searchEngines);

  if (normalized.startsWith("engine ")) {
    return engines.map((name) => `engine ${name}`);
  }
  if (normalized.startsWith("open ")) {
    return links.map((name) => `open ${name}`);
  }
  if (normalized.startsWith("link remove ")) {
    return Object.keys(state.customLinks).map((name) => `link remove ${name}`);
  }

  return [
    "help", "config", "engine", "links", "open", "link add", "link remove",
    "history", "clear history", "note", "notes", "note remove", "note clear",
    "set user", "set host", "set branch", "set theme", "set color", "reset config", "clear",
    ...Object.keys(CONFIG.prefixes),
  ];
}

function autocomplete() {
  const value = elements.input.value.trimStart();
  if (!value) {
    return;
  }

  const matches = completionCandidates(value).filter((candidate) => candidate.startsWith(value.toLowerCase()));
  if (!matches.length) {
    return;
  }

  const completion = commonPrefix(matches);
  if (completion.length > value.length) {
    setInputValue(completion);
  } else if (matches.length === 1) {
    setInputValue(matches[0]);
  } else {
    showOutput(matches.map((match) => ({ key: match })));
  }
}

function navigateHistory(direction) {
  if (!state.history.length) {
    return;
  }

  if (historyCursor === -1) {
    historyDraft = elements.input.value;
    historyCursor = state.history.length;
  }

  historyCursor = Math.max(0, Math.min(state.history.length, historyCursor + direction));
  const value = historyCursor === state.history.length ? historyDraft : state.history[historyCursor];
  setInputValue(value);
}

function updateNetworkStatus() {
  const online = navigator.onLine;
  elements.network.textContent = online ? "online" : "offline";
  elements.network.className = online ? "status-online" : "status-offline";
}

function updateClock() {
  const now = new Date();
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  elements.clock.textContent = `${weekdays[now.getDay()]}  ${day} ${months[now.getMonth()]}  ${hours}:${minutes}`;
  elements.clock.dateTime = now.toISOString();
}

elements.form.addEventListener("submit", handleSubmit);
elements.input.addEventListener("input", () => {
  historyCursor = -1;
  historyDraft = "";
  hideOutput();
  updateInputMirror();
});
elements.input.addEventListener("focus", () => elements.inputShell.classList.add("is-focused"));
elements.input.addEventListener("blur", () => elements.inputShell.classList.remove("is-focused"));
elements.input.addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    autocomplete();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    navigateHistory(-1);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    navigateHistory(1);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== elements.input) {
    event.preventDefault();
    focusInput();
  }

  if (event.key === "Escape") {
    clearInput();
    focusInput();
  }
});

document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".status-bar")) {
    focusInput();
  }
});

window.addEventListener("online", updateNetworkStatus);
window.addEventListener("offline", updateNetworkStatus);
window.addEventListener("load", focusInput);

applyState();
updateInputMirror();
updateNetworkStatus();
updateClock();
setInterval(updateClock, 1000);
