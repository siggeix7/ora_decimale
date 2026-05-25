import { translations, type Lang, type I18nKey } from "../i18n/translations";

const STORAGE_KEY = "ora-decimale:lang";
const LANG_ATTR = "data-i18n";
const PLACEHOLDER_ATTR = "data-i18n-placeholder";
const VALUE_ATTR = "data-i18n-value";
const TITLE_ATTR = "data-i18n-title";

let currentLang: Lang = "it";

function detectLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "it" || stored === "en") return stored;
  } catch { /* storage unavailable */ }

  const browser = navigator.language.slice(0, 2);
  return browser === "en" ? "en" : "it";
}

export function getLang(): Lang {
  return currentLang;
}

export function setLang(lang: Lang): void {
  currentLang = lang;
  document.documentElement.lang = lang;
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* */ }
  applyTranslations();
}

function t(key: I18nKey): string {
  return translations[currentLang][key] ?? translations.it[key] ?? key;
}

export { t };

function applyTranslations(): void {
  for (const el of document.querySelectorAll<HTMLElement>(`[${LANG_ATTR}]`)) {
    const key = el.getAttribute(LANG_ATTR) as I18nKey;
    if (key) el.textContent = t(key);
  }

  for (const el of document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[${PLACEHOLDER_ATTR}]`)) {
    const key = el.getAttribute(PLACEHOLDER_ATTR) as I18nKey;
    if (key) el.placeholder = t(key);
  }

  for (const el of document.querySelectorAll<HTMLInputElement>(`[${VALUE_ATTR}]`)) {
    const key = el.getAttribute(VALUE_ATTR) as I18nKey;
    if (key) el.value = t(key);
  }

  for (const el of document.querySelectorAll<HTMLElement>(`[${TITLE_ATTR}]`)) {
    const key = el.getAttribute(TITLE_ATTR) as I18nKey;
    if (key) el.title = t(key);
  }
}

export function initI18n(): void {
  currentLang = detectLang();
  document.documentElement.lang = currentLang;
  applyTranslations();
}
