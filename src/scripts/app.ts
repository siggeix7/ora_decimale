import {
  DECIMAL_SECONDS_IN_DAY,
  NORMAL_SECONDS_IN_DAY,
  decimalPartsToSeconds,
  decimalSecondsToNormalSeconds,
  formatDecimalTime,
  formatNormalTime,
  getCurrentNormalSeconds,
  getElapsedMilliseconds,
  getLiveDecimalTime,
  getTimeZoneName,
  normalPartsToSeconds,
  normalSecondsToDecimalSeconds,
  pad,
  parseTimeText,
  type RoundingMode,
} from "./time";
import { initI18n, setLang, getLang, t } from "./i18n";

type ClockDisplayMode = "digital" | "analog";
type ConversionDirection = "normal-to-decimal" | "decimal-to-normal";

interface SavedConversion {
  direction: ConversionDirection;
  source: string;
  result: string;
  savedAt: string;
}

const storageKeys = {
  clockDisplay: "ora-decimale:clock-display",
  rounding: "ora-decimale:rounding",
  history: "ora-decimale:history",
};

function query<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (!element) {
    throw new Error(`Elemento mancante: ${selector}`);
  }

  return element;
}

function getStoredValue(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function setStoredValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Le preferenze sono un miglioramento progressivo: se lo storage non e' disponibile, la UI resta utilizzabile.
  }
}

function readInteger(input: HTMLInputElement): number {
  if (input.value.trim() === "") {
    return NaN;
  }

  return Number(input.value);
}

function isRoundingMode(value: string): value is RoundingMode {
  return value === "nearest" || value === "floor" || value === "ceil";
}

function isClockDisplayMode(value: string): value is ClockDisplayMode {
  return value === "digital" || value === "analog";
}

const normalClock = query<HTMLTimeElement>("#normal-clock");
const heroLiveTime = query<HTMLTimeElement>("#hero-live-time");
const normalDate = query<HTMLElement>("#normal-date");
const decimalClock = query<HTMLTimeElement>("#decimal-clock");
const timezoneNote = query<HTMLElement>("#timezone-note");
const dayPercent = query<HTMLElement>("#day-percent");
const dayDecimalFraction = query<HTMLElement>("#day-decimal-fraction");
const dayRemaining = query<HTMLElement>("#day-remaining");
const dayProgressbar = query<HTMLElement>("#day-progressbar");
const dayProgressFill = query<HTMLElement>("#day-progress-fill");
const progressRingFill = query<SVGCircleElement>("#progress-ring-fill");
const normalToDecimalForm = query<HTMLFormElement>("#normal-to-decimal-form");
const decimalToNormalForm = query<HTMLFormElement>("#decimal-to-normal-form");
const normalToDecimalResult = query<HTMLOutputElement>("#normal-to-decimal-result");
const decimalToNormalResult = query<HTMLOutputElement>("#decimal-to-normal-result");
const normalToDecimalError = query<HTMLElement>("#normal-to-decimal-error");
const decimalToNormalError = query<HTMLElement>("#decimal-to-normal-error");
const converterActionStatus = query<HTMLElement>("#converter-action-status");
const roundingMode = query<HTMLSelectElement>("#rounding-mode");
const normalCompactInput = query<HTMLInputElement>("#normal-compact");
const decimalCompactInput = query<HTMLInputElement>("#decimal-compact");
const clockDisplay = query<HTMLSelectElement>("#clock-display");
const langSwitch = query<HTMLSelectElement>("#lang-switch");
const liveSync = query<HTMLInputElement>("#live-sync");
const conversionHistoryList = query<HTMLOListElement>("#conversion-history-list");
const clearHistory = query<HTMLButtonElement>("#clear-history");
const decimalHourHand = query<SVGGElement>("#decimal-hour-hand");
const decimalMinuteHand = query<SVGGElement>("#decimal-minute-hand");
const decimalSecondHand = query<SVGGElement>("#decimal-second-hand");
const normalHourHand = query<SVGGElement>("#normal-hour-hand");
const normalMinuteHand = query<SVGGElement>("#normal-minute-hand");
const normalSecondHand = query<SVGGElement>("#normal-second-hand");

function getLocale(): string {
  return getLang() === "en" ? "en-US" : "it-IT";
}

function createFormatters() {
  const locale = getLocale();

  return {
    percent: new Intl.NumberFormat(locale, {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }),
    fraction: new Intl.NumberFormat(locale, {
      minimumFractionDigits: 5,
      maximumFractionDigits: 5,
    }),
    date: new Intl.DateTimeFormat(locale, {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    historyTime: new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

let formatters = createFormatters();

function refreshFormatters(): void {
  formatters = createFormatters();
}

const errorTranslations = {
  "error.format.normal": "error.format.normal",
  "error.format.decimal": "error.format.decimal",
  "error.integer": "error.integer",
  "error.normal.range": "error.normal.range",
  "error.normal.end": "error.normal.end",
  "error.decimal.range": "error.decimal.range",
  "error.decimal.end": "error.decimal.end",
  "error.clipboard": "error.clipboard",
} satisfies Record<string, Parameters<typeof t>[0]>;

function isKnownErrorMessage(message: string): message is keyof typeof errorTranslations {
  return message in errorTranslations;
}

const normalInputs = {
  hours: query<HTMLInputElement>("#normal-hours"),
  minutes: query<HTMLInputElement>("#normal-minutes"),
  seconds: query<HTMLInputElement>("#normal-seconds"),
};

const decimalInputs = {
  hours: query<HTMLInputElement>("#decimal-hours"),
  minutes: query<HTMLInputElement>("#decimal-minutes"),
  seconds: query<HTMLInputElement>("#decimal-seconds"),
};

let conversionHistory: SavedConversion[] = readHistory();

function getRoundingMode(): RoundingMode {
  return isRoundingMode(roundingMode.value) ? roundingMode.value : "nearest";
}

function applyDisplayPreference(persist = true): void {
  document.body.dataset.clockDisplay = clockDisplay.value;

  if (persist) {
    setStoredValue(storageKeys.clockDisplay, clockDisplay.value);
  }

  updateClocks();
}

function parseNormalFields(): number {
  return normalPartsToSeconds(
    readInteger(normalInputs.hours),
    readInteger(normalInputs.minutes),
    readInteger(normalInputs.seconds),
  );
}

function parseDecimalFields(): number {
  return decimalPartsToSeconds(
    readInteger(decimalInputs.hours),
    readInteger(decimalInputs.minutes),
    readInteger(decimalInputs.seconds),
  );
}

function parseNormalCompact(): number {
  return normalPartsToSeconds(...parseTimeText(normalCompactInput.value, "HH:MM:SS"));
}

function parseDecimalCompact(): number {
  return decimalPartsToSeconds(...parseTimeText(decimalCompactInput.value, "H:MM:SS"));
}

function setNormalFields(totalSeconds: number): void {
  if (totalSeconds >= NORMAL_SECONDS_IN_DAY) {
    normalInputs.hours.value = "24";
    normalInputs.minutes.value = "0";
    normalInputs.seconds.value = "0";
    normalCompactInput.value = "24:00:00";
    return;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  normalInputs.hours.value = String(hours);
  normalInputs.minutes.value = String(minutes);
  normalInputs.seconds.value = String(seconds);
  normalCompactInput.value = formatNormalTime(totalSeconds);
}

function setDecimalFields(totalDecimalSeconds: number): void {
  if (totalDecimalSeconds >= DECIMAL_SECONDS_IN_DAY) {
    decimalInputs.hours.value = "10";
    decimalInputs.minutes.value = "0";
    decimalInputs.seconds.value = "0";
    decimalCompactInput.value = "10:00:00";
    return;
  }

  const hours = Math.floor(totalDecimalSeconds / 10000);
  const minutes = Math.floor((totalDecimalSeconds % 10000) / 100);
  const seconds = totalDecimalSeconds % 100;

  decimalInputs.hours.value = String(hours);
  decimalInputs.minutes.value = String(minutes);
  decimalInputs.seconds.value = String(seconds);
  decimalCompactInput.value = formatDecimalTime(totalDecimalSeconds);
}

function showNormalConversion(normalSeconds: number, syncCompact: boolean): void {
  if (syncCompact) {
    normalCompactInput.value = formatNormalTime(normalSeconds);
  }

  normalToDecimalResult.textContent = formatDecimalTime(normalSecondsToDecimalSeconds(normalSeconds, getRoundingMode()));
  normalToDecimalError.textContent = "";
}

function showDecimalConversion(decimalSeconds: number, syncCompact: boolean): void {
  if (syncCompact) {
    decimalCompactInput.value = formatDecimalTime(decimalSeconds);
  }

  decimalToNormalResult.textContent = formatNormalTime(decimalSecondsToNormalSeconds(decimalSeconds, getRoundingMode()));
  decimalToNormalError.textContent = "";
}

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return t("error.invalid");
  }

  return isKnownErrorMessage(error.message)
    ? t(errorTranslations[error.message])
    : error.message;
}

function convertNormalFieldsToDecimal(): void {
  try {
    showNormalConversion(parseNormalFields(), true);
  } catch (error) {
    normalToDecimalResult.textContent = "--:--:--";
    normalToDecimalError.textContent = getErrorMessage(error);
  }
  liveSync.checked = false;
}

function convertNormalCompactToDecimal(): void {
  try {
    const normalSeconds = parseNormalCompact();
    setNormalFields(normalSeconds);
    showNormalConversion(normalSeconds, false);
  } catch (error) {
    normalToDecimalResult.textContent = "--:--:--";
    normalToDecimalError.textContent = getErrorMessage(error);
  }
  liveSync.checked = false;
}

function convertDecimalFieldsToNormal(): void {
  try {
    showDecimalConversion(parseDecimalFields(), true);
  } catch (error) {
    decimalToNormalResult.textContent = "--:--:--";
    decimalToNormalError.textContent = getErrorMessage(error);
  }
  liveSync.checked = false;
}

function convertDecimalCompactToNormal(): void {
  try {
    const decimalSeconds = parseDecimalCompact();
    setDecimalFields(decimalSeconds);
    showDecimalConversion(decimalSeconds, false);
  } catch (error) {
    decimalToNormalResult.textContent = "--:--:--";
    decimalToNormalError.textContent = getErrorMessage(error);
  }
  liveSync.checked = false;
}

function applyNormalPreset(value: string): void {
  const normalSeconds = value === "now"
    ? getCurrentNormalSeconds()
    : normalPartsToSeconds(...parseTimeText(value, "HH:MM:SS"));

  setNormalFields(normalSeconds);
  showNormalConversion(normalSeconds, false);
  if (value === "now") {
    liveSync.checked = true;
    updateClocks();
  } else {
    liveSync.checked = false;
  }
}

function applyDecimalPreset(value: string): void {
  const decimalSeconds = value === "now"
    ? normalSecondsToDecimalSeconds(getCurrentNormalSeconds(), getRoundingMode())
    : decimalPartsToSeconds(...parseTimeText(value, "H:MM:SS"));

  setDecimalFields(decimalSeconds);
  showDecimalConversion(decimalSeconds, false);
  if (value === "now") {
    liveSync.checked = true;
    updateClocks();
  } else {
    liveSync.checked = false;
  }
}

function setActionStatus(message: string): void {
  converterActionStatus.textContent = message;
}

async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error("error.clipboard");
  }

  await navigator.clipboard.writeText(text);
}

async function copyResult(resultId: string): Promise<void> {
  const result = document.querySelector<HTMLOutputElement>(`#${resultId}`);

  if (!result || result.textContent?.includes("--")) {
    setActionStatus(t("converter.status.no_valid_copy"));
    return;
  }

  try {
    await copyText(result.textContent ?? "");
    result.classList.remove("copy-flash");
    void result.offsetWidth;
    result.classList.add("copy-flash");
    setActionStatus(`${t("converter.status.copied")} ${result.textContent}`);
  } catch (error) {
    setActionStatus(getErrorMessage(error));
  }
}

function useResult(target: string): void {
  if (target === "decimal") {
    const value = normalToDecimalResult.textContent ?? "";

    if (value.includes("--")) {
      setActionStatus(t("converter.status.decimal_invalid"));
      return;
    }

    decimalCompactInput.value = value;
    convertDecimalCompactToNormal();
    setActionStatus(t("converter.status.decimal"));
    return;
  }

  const value = decimalToNormalResult.textContent ?? "";

  if (value.includes("--")) {
    setActionStatus(t("converter.status.normal_invalid"));
    return;
  }

  normalCompactInput.value = value;
  convertNormalCompactToDecimal();
  setActionStatus(t("converter.status.normal"));
}

function readHistory(): SavedConversion[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKeys.history) ?? "[]");

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => item && typeof item.source === "string" && typeof item.result === "string")
      .slice(0, 8);
  } catch {
    return [];
  }
}

function writeHistory(): void {
  setStoredValue(storageKeys.history, JSON.stringify(conversionHistory));
}

function renderHistory(): void {
  conversionHistoryList.replaceChildren();

  if (conversionHistory.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.textContent = t("converter.history.empty");
    conversionHistoryList.append(emptyItem);
    return;
  }

  for (const item of conversionHistory) {
    const listItem = document.createElement("li");
    const direction = document.createElement("span");
    const value = document.createElement("span");
    const savedAt = document.createElement("span");

    direction.className = "history-direction";
    value.className = "history-value";
    savedAt.className = "history-time";
    direction.textContent = item.direction === "normal-to-decimal"
      ? t("converter.history.direction.normal")
      : t("converter.history.direction.decimal");
    value.textContent = `${item.source} → ${item.result}`;
    savedAt.textContent = formatters.historyTime.format(new Date(item.savedAt));

    listItem.style.cursor = "pointer";
    listItem.title = t("converter.history.click");
    listItem.addEventListener("click", () => loadHistoryItem(item));

    listItem.append(direction, value, savedAt);
    conversionHistoryList.append(listItem);
  }
}

function saveConversion(direction: ConversionDirection): void {
  const source = direction === "normal-to-decimal" ? normalCompactInput.value : decimalCompactInput.value;
  const result = direction === "normal-to-decimal"
    ? (normalToDecimalResult.textContent ?? "")
    : (decimalToNormalResult.textContent ?? "");

  if (result.includes("--")) {
    setActionStatus(t("converter.status.invalid_save"));
    return;
  }

  conversionHistory = [{ direction, source, result, savedAt: new Date().toISOString() }, ...conversionHistory].slice(0, 8);
  writeHistory();
  renderHistory();
  setActionStatus(t("converter.status.saved"));
}

function clearConversionHistory(): void {
  conversionHistory = [];
  writeHistory();
  renderHistory();
  setActionStatus(t("converter.status.history_cleared"));
}

function loadHistoryItem(item: SavedConversion): void {
  if (item.direction === "normal-to-decimal") {
    normalCompactInput.value = item.source;
    convertNormalCompactToDecimal();
    setActionStatus(t("converter.status.reloaded"));
  } else {
    decimalCompactInput.value = item.source;
    convertDecimalCompactToNormal();
    setActionStatus(t("converter.status.reloaded"));
  }
}

function updateDayProgress(date: Date): void {
  const elapsedMilliseconds = getElapsedMilliseconds(date);
  const dayMilliseconds = NORMAL_SECONDS_IN_DAY * 1000;
  const fraction = Math.min(elapsedMilliseconds / dayMilliseconds, 1);
  const percent = fraction * 100;
  const remainingSeconds = Math.max(0, Math.ceil((dayMilliseconds - elapsedMilliseconds) / 1000));

  dayPercent.textContent = `${formatters.percent.format(percent)}%`;
  dayDecimalFraction.textContent = formatters.fraction.format(fraction);
  dayRemaining.textContent = formatNormalTime(remainingSeconds);
  dayProgressbar.setAttribute("aria-valuenow", percent.toFixed(3));
  dayProgressFill.style.width = `${percent}%`;
  progressRingFill.style.strokeDashoffset = String(201.06 * (1 - fraction));
}

function setHandRotation(hand: SVGGElement, angle: number): void {
  hand.style.transform = `rotate(${angle}deg)`;
  hand.style.transformOrigin = "100px 100px";
}

function updateAnalogClock(wholeSeconds: number, tenths: number): void {
  const decimalSecondValue = Math.min(wholeSeconds + (tenths / 10), DECIMAL_SECONDS_IN_DAY);
  const hourAngle = (decimalSecondValue / DECIMAL_SECONDS_IN_DAY) * 360;
  const minuteAngle = ((decimalSecondValue % 10000) / 10000) * 360;
  const secondAngle = ((decimalSecondValue % 100) / 100) * 360;

  setHandRotation(decimalHourHand, hourAngle);
  setHandRotation(decimalMinuteHand, minuteAngle);
  setHandRotation(decimalSecondHand, secondAngle);
}

function updateNormalAnalogClock(date: Date): void {
  const hours = date.getHours() % 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const millis = date.getMilliseconds();

  const hourAngle = hours * 30 + minutes * 0.5 + seconds * (0.5 / 60) + millis * (0.5 / 60000);
  const minuteAngle = minutes * 6 + seconds * 0.1 + millis * (0.1 / 1000);
  const secondAngle = seconds * 6 + millis * 0.006;

  setHandRotation(normalHourHand, hourAngle);
  setHandRotation(normalMinuteHand, minuteAngle);
  setHandRotation(normalSecondHand, secondAngle);
}

function updateClocks(): void {
  const now = new Date();
  const normalTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const decimalTime = getLiveDecimalTime(now);
  const decimalText = formatDecimalTime(decimalTime.wholeSeconds, decimalTime.tenths);

  normalClock.textContent = normalTime;
  normalClock.dateTime = normalTime;
  heroLiveTime.textContent = normalTime;
  heroLiveTime.dateTime = normalTime;
  normalDate.textContent = formatters.date.format(now);
  decimalClock.textContent = decimalText;
  decimalClock.dateTime = formatDecimalTime(decimalTime.wholeSeconds);

  updateAnalogClock(decimalTime.wholeSeconds, decimalTime.tenths);
  updateNormalAnalogClock(now);
  updateDayProgress(now);

  if (liveSync.checked) {
    const ns = getCurrentNormalSeconds();
    setNormalFields(ns);
    showNormalConversion(ns, false);
    const ds = normalSecondsToDecimalSeconds(ns, getRoundingMode());
    setDecimalFields(ds);
    showDecimalConversion(ds, false);
  }
}

function initializePreferences(): void {
  const storedClockDisplay = getStoredValue(storageKeys.clockDisplay, "digital");
  const storedRounding = getStoredValue(storageKeys.rounding, "nearest");

  clockDisplay.value = isClockDisplayMode(storedClockDisplay) ? storedClockDisplay : "digital";
  roundingMode.value = isRoundingMode(storedRounding) ? storedRounding : "nearest";

  applyDisplayPreference(false);
}

function initializeEventListeners(): void {
  for (const input of Object.values(normalInputs)) {
    input.addEventListener("input", convertNormalFieldsToDecimal);
  }

  for (const input of Object.values(decimalInputs)) {
    input.addEventListener("input", convertDecimalFieldsToNormal);
  }

  normalCompactInput.addEventListener("input", convertNormalCompactToDecimal);
  decimalCompactInput.addEventListener("input", convertDecimalCompactToNormal);
  normalToDecimalForm.addEventListener("submit", (event) => event.preventDefault());
  decimalToNormalForm.addEventListener("submit", (event) => event.preventDefault());
  roundingMode.addEventListener("change", () => {
    setStoredValue(storageKeys.rounding, roundingMode.value);
    if (liveSync.checked) {
      updateClocks();
    } else {
      convertNormalFieldsToDecimal();
      convertDecimalFieldsToNormal();
    }
    setActionStatus(t("converter.status.precision"));
  });
  clockDisplay.addEventListener("change", applyDisplayPreference);
  liveSync.addEventListener("change", () => {
    if (liveSync.checked) {
      updateClocks();
    }
  });

  for (const button of document.querySelectorAll<HTMLElement>("[data-normal-preset]")) {
    button.addEventListener("click", () => applyNormalPreset(button.dataset.normalPreset ?? "00:00:00"));
  }

  for (const button of document.querySelectorAll<HTMLElement>("[data-decimal-preset]")) {
    button.addEventListener("click", () => applyDecimalPreset(button.dataset.decimalPreset ?? "0:00:00"));
  }

  for (const button of document.querySelectorAll<HTMLElement>("[data-example-normal][data-example-decimal]")) {
    button.addEventListener("click", () => {
      applyNormalPreset(button.dataset.exampleNormal ?? "12:00:00");
      applyDecimalPreset(button.dataset.exampleDecimal ?? "5:00:00");
      liveSync.checked = false;
      setActionStatus(t("converter.status.example"));
    });
  }

  for (const button of document.querySelectorAll<HTMLElement>("[data-copy-result]")) {
    button.addEventListener("click", () => copyResult(button.dataset.copyResult ?? ""));
  }

  for (const button of document.querySelectorAll<HTMLElement>("[data-use-result]")) {
    button.addEventListener("click", () => useResult(button.dataset.useResult ?? ""));
  }

  for (const button of document.querySelectorAll<HTMLElement>("[data-save-result]")) {
    button.addEventListener("click", () => {
      const direction = button.dataset.saveResult;

      if (direction === "normal-to-decimal" || direction === "decimal-to-normal") {
        saveConversion(direction);
      }
    });
  }

  clearHistory.addEventListener("click", clearConversionHistory);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      updateClocks();
    }
  });
}

function registerServiceWorker(): void {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}

function initializeTabs(): void {
  const buttons = document.querySelectorAll<HTMLElement>(".tab-button");
  const panels = document.querySelectorAll<HTMLElement>(".tab-panel");
  const buttonList = Array.from(buttons);

  function activateTab(tab: string): void {
    for (const b of buttons) {
      const isActive = b.dataset.tab === tab;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-selected", String(isActive));
    }
    for (const p of panels) {
      const isActive = p.dataset.panel === tab;
      p.classList.toggle("active", isActive);
      p.hidden = !isActive;
    }
  }

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      if (!tab) return;

      activateTab(tab);
      history.replaceState(null, "", `#${tab}`);
    });

    button.addEventListener("keydown", (event) => {
      const currentIndex = buttonList.indexOf(button);
      let nextIndex = currentIndex;

      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % buttonList.length;
      else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + buttonList.length) % buttonList.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = buttonList.length - 1;
      else return;

      event.preventDefault();
      const nextButton = buttonList[nextIndex];
      const tab = nextButton.dataset.tab;
      if (!tab) return;

      activateTab(tab);
      history.replaceState(null, "", `#${tab}`);
      nextButton.focus();
    });
  }

  const hashTab = location.hash.replace("#", "");
  const validTabs = ["orologio", "storia", "convertitore"];
  activateTab(validTabs.includes(hashTab) ? hashTab : "orologio");

  window.addEventListener("hashchange", () => {
    const hash = location.hash.replace("#", "");
    if (validTabs.includes(hash)) activateTab(hash);
  });

  document.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement || e.target instanceof HTMLTextAreaElement) return;
    const keyMap: Record<string, string> = { "1": "orologio", "2": "storia", "3": "convertitore" };
    const tab = keyMap[e.key];
    if (tab) {
      activateTab(tab);
      history.replaceState(null, "", `#${tab}`);
    }
  });
}

initializePreferences();
initializeEventListeners();
initializeTabs();
initI18n();
refreshFormatters();

langSwitch.value = getLang();
langSwitch.addEventListener("change", () => {
  setLang(langSwitch.value as "it" | "en");
  refreshFormatters();
  renderHistory();
  timezoneNote.textContent = getTimeZoneName() || t("clock.timezone.browser");
  updateClocks();
});

renderHistory();
timezoneNote.textContent = getTimeZoneName() || t("clock.timezone.browser");
updateClocks();
if (liveSync.checked) {
  applyNormalPreset("now");
  applyDecimalPreset("now");
} else {
  convertNormalFieldsToDecimal();
  convertDecimalFieldsToNormal();
}
registerServiceWorker();

document.body.classList.remove("js-loading");
document.body.classList.add("js-ready");

setInterval(updateClocks, 200);
