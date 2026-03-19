const elements = {
  input: document.getElementById("phraseInput"),
  generateButton: document.getElementById("generateBtn"),
  clearButton: document.getElementById("clearBtn"),
  themeToggleButton: document.getElementById("themeToggleBtn"),
  constantResult: document.getElementById("constantResult"),
  pascalResult: document.getElementById("pascalResult"),
  camelResult: document.getElementById("camelResult"),
  historyList: document.getElementById("historyList"),
  copyButtons: document.querySelectorAll("[data-copy-target]"),
};

const HISTORY_KEY = "resourcePhraseHistory";
const HISTORY_LIMIT = 6;
const CAMEL_PREFIX = "msgTimeline";
const THEME_KEY = "resourceTheme";

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.body.setAttribute("data-theme", isDark ? "dark" : "light");

  if (elements.themeToggleButton) {
    elements.themeToggleButton.textContent = isDark ? "☀️ Claro" : "🌙 Escuro";
  }

  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (themeColorMeta) {
    themeColorMeta.setAttribute("content", isDark ? "#151c2b" : "#3b5bdb");
  }
}

function resolveInitialTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function toggleTheme() {
  const current = document.body.getAttribute("data-theme") === "dark" ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
}

function sanitizePhrase(rawPhrase) {
  if (!rawPhrase || typeof rawPhrase !== "string") {
    return "";
  }

  // Normaliza o marcador de número antes das demais transformações.
  return rawPhrase
    .replace(/N\s*[°º]/gi, " Num ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordsFromPhrase(phrase) {
  const cleaned = sanitizePhrase(phrase);

  if (!cleaned) {
    return [];
  }

  return cleaned.toLowerCase().split(" ").filter(Boolean);
}

function toPascalCase(words) {
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

function generateKeys(phrase) {
  // Usa uma única fonte de verdade (array de palavras) para evitar inconsistências.
  const words = wordsFromPhrase(phrase);

  if (words.length === 0) {
    return {
      constantCase: "",
      pascalCase: "",
      camelWithPrefix: "",
    };
  }

  const pascalCase = toPascalCase(words);

  return {
    constantCase: words.map((word) => word.toUpperCase()).join("_"),
    pascalCase,
    camelWithPrefix: `${CAMEL_PREFIX}${pascalCase}`,
  };
}

function updateResults() {
  const phrase = elements.input.value;
  const { constantCase, pascalCase, camelWithPrefix } = generateKeys(phrase);

  elements.constantResult.textContent = constantCase || "—";
  elements.pascalResult.textContent = pascalCase || "—";
  elements.camelResult.textContent = camelWithPrefix || "—";

  return { phrase, constantCase, pascalCase, camelWithPrefix };
}

function getHistory() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistoryItem(phrase) {
  const cleanPhrase = phrase.trim();

  if (!cleanPhrase) {
    return;
  }

  // Mantém histórico curto, sem duplicidades, priorizando o item mais recente.
  const deduplicated = getHistory().filter((item) => item !== cleanPhrase);
  const next = [cleanPhrase, ...deduplicated].slice(0, HISTORY_LIMIT);

  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  renderHistory(next);
}

function renderHistory(historyItems = getHistory()) {
  elements.historyList.innerHTML = "";

  if (historyItems.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Nenhuma frase recente.";
    empty.className = "history-empty";
    elements.historyList.append(empty);
    return;
  }

  historyItems.forEach((phrase) => {
    const item = document.createElement("li");
    const button = document.createElement("button");

    button.type = "button";
    button.title = phrase;
    button.textContent = phrase.length > 48 ? `${phrase.slice(0, 48)}…` : phrase;

    button.addEventListener("click", () => {
      elements.input.value = phrase;
      updateResults();
    });

    item.append(button);
    elements.historyList.append(item);
  });
}

async function copyResult(targetId, button) {
  const target = document.getElementById(targetId);

  if (!target) {
    return;
  }

  const value = target.textContent?.trim() || "";

  if (!value || value === "—") {
    return;
  }

  try {
    // Usa Clipboard API para copiar o conteúdo do card selecionado.
    await navigator.clipboard.writeText(value);
    const originalText = button.textContent;

    button.textContent = "Copiado!";
    button.classList.add("is-copied");

    setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove("is-copied");
    }, 1300);
  } catch {
    button.textContent = "Falhou";
    setTimeout(() => {
      button.textContent = "Copiar";
    }, 1300);
  }
}

function handleGenerate() {
  const results = updateResults();
  saveHistoryItem(results.phrase);
}

function handleClear() {
  elements.input.value = "";
  updateResults();
  elements.input.focus();
}

function bindEvents() {
  elements.generateButton.addEventListener("click", handleGenerate);
  elements.clearButton.addEventListener("click", handleClear);
  elements.themeToggleButton?.addEventListener("click", toggleTheme);

  elements.input.addEventListener("input", updateResults);

  elements.copyButtons.forEach((button) => {
    const targetId = button.getAttribute("data-copy-target");

    button.addEventListener("click", () => {
      if (targetId) {
        copyResult(targetId, button);
      }
    });
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Falha silenciosa para não impactar a experiência principal da ferramenta.
    });
  });
}

function init() {
  applyTheme(resolveInitialTheme());
  bindEvents();
  updateResults();
  renderHistory();
  registerServiceWorker();
}

init();
