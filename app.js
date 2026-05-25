const normalClock = document.querySelector("#normal-clock");
const normalDate = document.querySelector("#normal-date");
const decimalClock = document.querySelector("#decimal-clock");
const normalToDecimalForm = document.querySelector("#normal-to-decimal-form");
const decimalToNormalForm = document.querySelector("#decimal-to-normal-form");
const normalToDecimalResult = document.querySelector("#normal-to-decimal-result");
const decimalToNormalResult = document.querySelector("#decimal-to-normal-result");
const normalToDecimalError = document.querySelector("#normal-to-decimal-error");
const decimalToNormalError = document.querySelector("#decimal-to-normal-error");

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

function readInteger(input) {
  if (input.value.trim() === "") {
    return NaN;
  }

  return Number(input.value);
}

function parseNormalInput() {
  const hours = readInteger(normalInputs.hours);
  const minutes = readInteger(normalInputs.minutes);
  const seconds = readInteger(normalInputs.seconds);

  if (![hours, minutes, seconds].every(Number.isInteger)) {
    throw new Error("Inserisci solo numeri interi.");
  }

  if (hours < 0 || hours > 24 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
    throw new Error("Usa ore 0-24, minuti 0-59 e secondi 0-59.");
  }

  if (hours === 24 && (minutes !== 0 || seconds !== 0)) {
    throw new Error("Dopo 24:00:00 inizia il giorno successivo.");
  }

  return (hours * 3600) + (minutes * 60) + seconds;
}

function parseDecimalInput() {
  const hours = readInteger(decimalInputs.hours);
  const minutes = readInteger(decimalInputs.minutes);
  const seconds = readInteger(decimalInputs.seconds);

  if (![hours, minutes, seconds].every(Number.isInteger)) {
    throw new Error("Inserisci solo numeri interi.");
  }

  if (hours < 0 || hours > 10 || minutes < 0 || minutes > 99 || seconds < 0 || seconds > 99) {
    throw new Error("Usa ore 0-10, minuti 0-99 e secondi 0-99.");
  }

  if (hours === 10 && (minutes !== 0 || seconds !== 0)) {
    throw new Error("Dopo 10:00:00 decimale inizia il giorno successivo.");
  }

  return (hours * 10000) + (minutes * 100) + seconds;
}

function convertNormalToDecimal() {
  try {
    const normalSeconds = parseNormalInput();
    const decimalSeconds = Math.round((normalSeconds / normalSecondsInDay) * decimalSecondsInDay);

    normalToDecimalResult.textContent = formatDecimalTime(decimalSeconds);
    normalToDecimalError.textContent = "";
  } catch (error) {
    normalToDecimalResult.textContent = "--:--:--";
    normalToDecimalError.textContent = error.message;
  }
}

function convertDecimalToNormal() {
  try {
    const decimalSeconds = parseDecimalInput();
    const normalSeconds = Math.round((decimalSeconds / decimalSecondsInDay) * normalSecondsInDay);

    decimalToNormalResult.textContent = formatNormalTime(normalSeconds);
    decimalToNormalError.textContent = "";
  } catch (error) {
    decimalToNormalResult.textContent = "--:--:--";
    decimalToNormalError.textContent = error.message;
  }
}

function getDecimalTime(date) {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);

  const elapsedMilliseconds = date.getTime() - midnight.getTime();
  const dayMilliseconds = normalSecondsInDay * 1000;
  const totalDecimalSeconds = Math.floor((elapsedMilliseconds / dayMilliseconds) * decimalSecondsInDay);

  return formatDecimalTime(totalDecimalSeconds);
}

function updateClocks() {
  const now = new Date();
  const normalTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const decimalTime = getDecimalTime(now);

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
}

normalToDecimalForm.addEventListener("input", convertNormalToDecimal);
decimalToNormalForm.addEventListener("input", convertDecimalToNormal);
normalToDecimalForm.addEventListener("submit", (event) => event.preventDefault());
decimalToNormalForm.addEventListener("submit", (event) => event.preventDefault());

updateClocks();
convertNormalToDecimal();
convertDecimalToNormal();
setInterval(updateClocks, 200);
