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
const liveSync = query<HTMLInputElement>("#live-sync");
const conversionHistoryList = query<HTMLOListElement>("#conversion-history-list");
const clearHistory = query<HTMLButtonElement>("#clear-history");
const decimalHourHand = query<SVGGElement>("#decimal-hour-hand");
const decimalMinuteHand = query<SVGGElement>("#decimal-minute-hand");
const decimalSecondHand = query<SVGGElement>("#decimal-second-hand");
const normalHourHand = query<SVGGElement>("#normal-hour-hand");
const normalMinuteHand = query<SVGGElement>("#normal-minute-hand");
const normalSecondHand = query<SVGGElement>("#normal-second-hand");

const percentFormatter = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const fractionFormatter = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 5,
  maximumFractionDigits: 5,
});
const dateFormatter = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});
const historyTimeFormatter = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

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
  return error instanceof Error ? error.message : "Valore non valido.";
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
  if (value !== "now") liveSync.checked = false;
}

function applyDecimalPreset(value: string): void {
  const decimalSeconds = value === "now"
    ? normalSecondsToDecimalSeconds(getCurrentNormalSeconds(), getRoundingMode())
    : decimalPartsToSeconds(...parseTimeText(value, "H:MM:SS"));

  setDecimalFields(decimalSeconds);
  showDecimalConversion(decimalSeconds, false);
  if (value !== "now") liveSync.checked = false;
}

function setActionStatus(message: string): void {
  converterActionStatus.textContent = message;
}

async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard) {
    throw new Error("Copia automatica non disponibile in questo browser.");
  }

  await navigator.clipboard.writeText(text);
}

async function copyResult(resultId: string): Promise<void> {
  const result = document.querySelector<HTMLOutputElement>(`#${resultId}`);

  if (!result || result.textContent?.includes("--")) {
    setActionStatus("Nessun risultato valido da copiare.");
    return;
  }

  try {
    await copyText(result.textContent ?? "");
    setActionStatus(`Copiato: ${result.textContent}`);
  } catch (error) {
    setActionStatus(getErrorMessage(error));
  }
}

function useResult(target: string): void {
  if (target === "decimal") {
    const value = normalToDecimalResult.textContent ?? "";

    if (value.includes("--")) {
      setActionStatus("Il risultato decimale non e' valido.");
      return;
    }

    decimalCompactInput.value = value;
    convertDecimalCompactToNormal();
    setActionStatus("Risultato inserito nel convertitore decimale.");
    return;
  }

  const value = decimalToNormalResult.textContent ?? "";

  if (value.includes("--")) {
    setActionStatus("Il risultato classico non e' valido.");
    return;
  }

  normalCompactInput.value = value;
  convertNormalCompactToDecimal();
  setActionStatus("Risultato inserito nel convertitore classico.");
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
    emptyItem.textContent = "Nessuna conversione salvata.";
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
    direction.textContent = item.direction === "normal-to-decimal" ? "Classico" : "Decimale";
    value.textContent = `${item.source} -> ${item.result}`;
    savedAt.textContent = historyTimeFormatter.format(new Date(item.savedAt));

    listItem.style.cursor = "pointer";
    listItem.title = "Clicca per ricaricare questa conversione";
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
    setActionStatus("Non posso salvare una conversione non valida.");
    return;
  }

  conversionHistory = [{ direction, source, result, savedAt: new Date().toISOString() }, ...conversionHistory].slice(0, 8);
  writeHistory();
  renderHistory();
  setActionStatus("Conversione salvata nello storico locale.");
}

function clearConversionHistory(): void {
  conversionHistory = [];
  writeHistory();
  renderHistory();
  setActionStatus("Storico conversioni svuotato.");
}

function loadHistoryItem(item: SavedConversion): void {
  if (item.direction === "normal-to-decimal") {
    normalCompactInput.value = item.source;
    convertNormalCompactToDecimal();
    setActionStatus("Conversione ricaricata dallo storico.");
  } else {
    decimalCompactInput.value = item.source;
    convertDecimalCompactToNormal();
    setActionStatus("Conversione ricaricata dallo storico.");
  }
}

function updateDayProgress(date: Date): void {
  const elapsedMilliseconds = getElapsedMilliseconds(date);
  const dayMilliseconds = NORMAL_SECONDS_IN_DAY * 1000;
  const fraction = Math.min(elapsedMilliseconds / dayMilliseconds, 1);
  const percent = fraction * 100;
  const remainingSeconds = Math.max(0, Math.ceil((dayMilliseconds - elapsedMilliseconds) / 1000));

  dayPercent.textContent = `${percentFormatter.format(percent)}%`;
  dayDecimalFraction.textContent = fractionFormatter.format(fraction);
  dayRemaining.textContent = formatNormalTime(remainingSeconds);
  dayProgressbar.setAttribute("aria-valuenow", percent.toFixed(3));
  dayProgressFill.style.width = `${percent}%`;
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
  normalDate.textContent = dateFormatter.format(now);
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
    convertNormalFieldsToDecimal();
    convertDecimalFieldsToNormal();
    setActionStatus("Precisione aggiornata.");
  });
  clockDisplay.addEventListener("change", applyDisplayPreference);

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
      setActionStatus("Esempio caricato nei due convertitori.");
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

  function activateTab(tab: string): void {
    for (const b of buttons) b.classList.toggle("active", b.dataset.tab === tab);
    for (const p of panels) p.classList.toggle("active", p.dataset.panel === tab);
  }

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const tab = button.dataset.tab;
      if (!tab) return;

      activateTab(tab);
      history.replaceState(null, "", `#${tab}`);
    });
  }

  const hashTab = location.hash.replace("#", "");
  const validTabs = ["orologio", "storia", "convertitore"];
  activateTab(validTabs.includes(hashTab) ? hashTab : "orologio");

  window.addEventListener("hashchange", () => {
    const hash = location.hash.replace("#", "");
    if (validTabs.includes(hash)) activateTab(hash);
  });
}

initializePreferences();
initializeEventListeners();
initializeTabs();
renderHistory();
timezoneNote.textContent = `Fuso orario: ${getTimeZoneName()}`;
updateClocks();
convertNormalFieldsToDecimal();
convertDecimalFieldsToNormal();
registerServiceWorker();

document.body.classList.remove("js-loading");
document.body.classList.add("js-ready");

setInterval(updateClocks, 200);
