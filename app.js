const normalClock = document.querySelector("#normal-clock");
const normalDate = document.querySelector("#normal-date");
const decimalClock = document.querySelector("#decimal-clock");
const timezoneNote = document.querySelector("#timezone-note");
const dayPercent = document.querySelector("#day-percent");
const dayDecimalFraction = document.querySelector("#day-decimal-fraction");
const dayRemaining = document.querySelector("#day-remaining");
const dayProgressbar = document.querySelector("#day-progressbar");
const dayProgressFill = document.querySelector("#day-progress-fill");
const normalToDecimalForm = document.querySelector("#normal-to-decimal-form");
const decimalToNormalForm = document.querySelector("#decimal-to-normal-form");
const normalToDecimalResult = document.querySelector("#normal-to-decimal-result");
const decimalToNormalResult = document.querySelector("#decimal-to-normal-result");
const normalToDecimalError = document.querySelector("#normal-to-decimal-error");
const decimalToNormalError = document.querySelector("#decimal-to-normal-error");
const converterActionStatus = document.querySelector("#converter-action-status");
const normalCompactInput = document.querySelector("#normal-compact");
const decimalCompactInput = document.querySelector("#decimal-compact");

const normalInputs = {
  hours: document.querySelector("#normal-hours"),
  minutes: document.querySelector("#normal-minutes"),
  seconds: document.querySelector("#normal-seconds"),
};

const decimalInputs = {
  hours: document.querySelector("#decimal-hours"),
  minutes: document.querySelector("#decimal-minutes"),
  seconds: document.querySelector("#decimal-seconds"),
};

const normalSecondsInDay = 24 * 60 * 60;
const decimalSecondsInDay = 10 * 100 * 100;

const pad = (value, length = 2) => String(value).padStart(length, "0");
const percentFormatter = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});
const fractionFormatter = new Intl.NumberFormat("it-IT", {
  minimumFractionDigits: 5,
  maximumFractionDigits: 5,
});

function getTimeZoneName() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "locale del browser";
}

function formatNormalTime(totalSeconds) {
  if (totalSeconds >= normalSecondsInDay) {
    return "24:00:00";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function formatDecimalTime(totalDecimalSeconds) {
  if (totalDecimalSeconds >= decimalSecondsInDay) {
    return "10:00:00";
  }

  const hours = Math.floor(totalDecimalSeconds / 10000);
  const minutes = Math.floor((totalDecimalSeconds % 10000) / 100);
  const seconds = totalDecimalSeconds % 100;

  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
}

function parseTimeText(value, label) {
  const match = value.trim().match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);

  if (!match) {
    throw new Error(`Usa il formato ${label}, per esempio 12:00:00.`);
  }

  return match.slice(1).map(Number);
}

function readInteger(input) {
  if (input.value.trim() === "") {
    return NaN;
  }

  return Number(input.value);
}

function validateNormalParts(hours, minutes, seconds) {
  if (![hours, minutes, seconds].every(Number.isInteger)) {
    throw new Error("Inserisci solo numeri interi.");
  }

  if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    throw new Error("Usa ore 0-24, minuti 0-59 e secondi 0-59.");
  }

  if (hours === 24 && (minutes !== 0 || seconds !== 0)) {
    throw new Error("Dopo 24:00:00 inizia il giorno successivo.");
  }
}

function validateDecimalParts(hours, minutes, seconds) {
  if (![hours, minutes, seconds].every(Number.isInteger)) {
    throw new Error("Inserisci solo numeri interi.");
  }

  if (hours < 0 || hours > 10 || minutes < 0 || minutes > 99 || seconds < 0 || seconds > 99) {
    throw new Error("Usa ore 0-10, minuti 0-99 e secondi 0-99.");
  }

  if (hours === 10 && (minutes !== 0 || seconds !== 0)) {
    throw new Error("Dopo 10:00:00 decimale inizia il giorno successivo.");
  }
}

function normalPartsToSeconds(hours, minutes, seconds) {
  validateNormalParts(hours, minutes, seconds);
  return (hours * 3600) + (minutes * 60) + seconds;
}

function decimalPartsToSeconds(hours, minutes, seconds) {
  validateDecimalParts(hours, minutes, seconds);
  return (hours * 10000) + (minutes * 100) + seconds;
}

function parseNormalFields() {
  return normalPartsToSeconds(
    readInteger(normalInputs.hours),
    readInteger(normalInputs.minutes),
    readInteger(normalInputs.seconds),
  );
}

function parseDecimalFields() {
  return decimalPartsToSeconds(
    readInteger(decimalInputs.hours),
    readInteger(decimalInputs.minutes),
    readInteger(decimalInputs.seconds),
  );
}

function parseNormalCompact() {
  return normalPartsToSeconds(...parseTimeText(normalCompactInput.value, "HH:MM:SS"));
}

function parseDecimalCompact() {
  return decimalPartsToSeconds(...parseTimeText(decimalCompactInput.value, "H:MM:SS"));
}

function normalSecondsToDecimalSeconds(normalSeconds) {
  return Math.round((normalSeconds / normalSecondsInDay) * decimalSecondsInDay);
}

function decimalSecondsToNormalSeconds(decimalSeconds) {
  return Math.round((decimalSeconds / decimalSecondsInDay) * normalSecondsInDay);
}

function setNormalFields(totalSeconds) {
  if (totalSeconds >= normalSecondsInDay) {
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

function setDecimalFields(totalDecimalSeconds) {
  if (totalDecimalSeconds >= decimalSecondsInDay) {
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

function showNormalConversion(normalSeconds, syncCompact) {
  if (syncCompact) {
    normalCompactInput.value = formatNormalTime(normalSeconds);
  }

  normalToDecimalResult.textContent = formatDecimalTime(normalSecondsToDecimalSeconds(normalSeconds));
  normalToDecimalError.textContent = "";
}

function showDecimalConversion(decimalSeconds, syncCompact) {
  if (syncCompact) {
    decimalCompactInput.value = formatDecimalTime(decimalSeconds);
  }

  decimalToNormalResult.textContent = formatNormalTime(decimalSecondsToNormalSeconds(decimalSeconds));
  decimalToNormalError.textContent = "";
}

function convertNormalFieldsToDecimal() {
  try {
    showNormalConversion(parseNormalFields(), true);
  } catch (error) {
    normalToDecimalResult.textContent = "--:--:--";
    normalToDecimalError.textContent = error.message;
  }
}

function convertNormalCompactToDecimal() {
  try {
    const normalSeconds = parseNormalCompact();

    setNormalFields(normalSeconds);
    showNormalConversion(normalSeconds, false);
  } catch (error) {
    normalToDecimalResult.textContent = "--:--:--";
    normalToDecimalError.textContent = error.message;
  }
}

function convertDecimalFieldsToNormal() {
  try {
    showDecimalConversion(parseDecimalFields(), true);
  } catch (error) {
    decimalToNormalResult.textContent = "--:--:--";
    decimalToNormalError.textContent = error.message;
  }
}

function convertDecimalCompactToNormal() {
  try {
    const decimalSeconds = parseDecimalCompact();

    setDecimalFields(decimalSeconds);
    showDecimalConversion(decimalSeconds, false);
  } catch (error) {
    decimalToNormalResult.textContent = "--:--:--";
    decimalToNormalError.textContent = error.message;
  }
}

function getCurrentNormalSeconds(date = new Date()) {
  return (date.getHours() * 3600) + (date.getMinutes() * 60) + date.getSeconds();
}

function getElapsedMilliseconds(date) {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);

  return date.getTime() - midnight.getTime();
}

function getLiveDecimalTime(date) {
  const elapsedMilliseconds = getElapsedMilliseconds(date);
  const totalDecimalTenths = Math.floor((elapsedMilliseconds / (normalSecondsInDay * 1000)) * decimalSecondsInDay * 10);
  const wholeSeconds = Math.floor(totalDecimalTenths / 10);
  const tenths = totalDecimalTenths % 10;

  if (wholeSeconds >= decimalSecondsInDay) {
    return "10:00:00.0";
  }

  const hours = Math.floor(wholeSeconds / 10000);
  const minutes = Math.floor((wholeSeconds % 10000) / 100);
  const seconds = wholeSeconds % 100;

  return `${hours}:${pad(minutes)}:${pad(seconds)}.${tenths}`;
}

function applyNormalPreset(value) {
  const normalSeconds = value === "now"
    ? getCurrentNormalSeconds()
    : normalPartsToSeconds(...parseTimeText(value, "HH:MM:SS"));

  setNormalFields(normalSeconds);
  showNormalConversion(normalSeconds, false);
}

function applyDecimalPreset(value) {
  const decimalSeconds = value === "now"
    ? normalSecondsToDecimalSeconds(getCurrentNormalSeconds())
    : decimalPartsToSeconds(...parseTimeText(value, "H:MM:SS"));

  setDecimalFields(decimalSeconds);
  showDecimalConversion(decimalSeconds, false);
}

function setActionStatus(message) {
  converterActionStatus.textContent = message;
}

async function copyText(text) {
  if (!navigator.clipboard) {
    throw new Error("Copia automatica non disponibile in questo browser.");
  }

  await navigator.clipboard.writeText(text);
}

async function copyResult(resultId) {
  const result = document.querySelector(`#${resultId}`);

  if (!result || result.textContent.includes("--")) {
    setActionStatus("Nessun risultato valido da copiare.");
    return;
  }

  try {
    await copyText(result.textContent);
    setActionStatus(`Copiato: ${result.textContent}`);
  } catch (error) {
    setActionStatus(error.message);
  }
}

function useResult(target) {
  if (target === "decimal") {
    const value = normalToDecimalResult.textContent;

    if (value.includes("--")) {
      setActionStatus("Il risultato decimale non e' valido.");
      return;
    }

    decimalCompactInput.value = value;
    convertDecimalCompactToNormal();
    setActionStatus("Risultato inserito nel convertitore decimale.");
    return;
  }

  const value = decimalToNormalResult.textContent;

  if (value.includes("--")) {
    setActionStatus("Il risultato classico non e' valido.");
    return;
  }

  normalCompactInput.value = value;
  convertNormalCompactToDecimal();
  setActionStatus("Risultato inserito nel convertitore classico.");
}

function updateDayProgress(date) {
  const elapsedMilliseconds = getElapsedMilliseconds(date);
  const dayMilliseconds = normalSecondsInDay * 1000;
  const fraction = Math.min(elapsedMilliseconds / dayMilliseconds, 1);
  const percent = fraction * 100;
  const remainingSeconds = Math.max(0, Math.ceil((dayMilliseconds - elapsedMilliseconds) / 1000));

  dayPercent.textContent = `${percentFormatter.format(percent)}%`;
  dayDecimalFraction.textContent = fractionFormatter.format(fraction);
  dayRemaining.textContent = formatNormalTime(remainingSeconds);
  dayProgressbar.setAttribute("aria-valuenow", percent.toFixed(3));
  dayProgressFill.style.width = `${percent}%`;
}

function updateClocks() {
  const now = new Date();
  const normalTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const decimalTime = getLiveDecimalTime(now);

  normalClock.textContent = normalTime;
  normalClock.dateTime = normalTime;
  normalDate.textContent = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);

  decimalClock.textContent = decimalTime;
  decimalClock.dateTime = decimalTime;
  updateDayProgress(now);
}

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

for (const button of document.querySelectorAll("[data-normal-preset]")) {
  button.addEventListener("click", () => applyNormalPreset(button.dataset.normalPreset));
}

for (const button of document.querySelectorAll("[data-decimal-preset]")) {
  button.addEventListener("click", () => applyDecimalPreset(button.dataset.decimalPreset));
}

for (const button of document.querySelectorAll("[data-example-normal][data-example-decimal]")) {
  button.addEventListener("click", () => {
    applyNormalPreset(button.dataset.exampleNormal);
    applyDecimalPreset(button.dataset.exampleDecimal);
    setActionStatus("Esempio caricato nei due convertitori.");
  });
}

for (const button of document.querySelectorAll("[data-copy-result]")) {
  button.addEventListener("click", () => copyResult(button.dataset.copyResult));
}

for (const button of document.querySelectorAll("[data-use-result]")) {
  button.addEventListener("click", () => useResult(button.dataset.useResult));
}

timezoneNote.textContent = `Fuso orario: ${getTimeZoneName()}`;
updateClocks();
convertNormalFieldsToDecimal();
convertDecimalFieldsToNormal();

document.body.classList.remove("js-loading");
document.body.classList.add("js-ready");

setInterval(updateClocks, 200);
