const normalClock = document.querySelector("#normal-clock");
const normalDate = document.querySelector("#normal-date");
const decimalClock = document.querySelector("#decimal-clock");

const pad = (value, length = 2) => String(value).padStart(length, "0");

function getDecimalTime(date) {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);

  const elapsedMilliseconds = date.getTime() - midnight.getTime();
  const dayMilliseconds = 24 * 60 * 60 * 1000;
  const decimalSecondsInDay = 10 * 100 * 100;
  const totalDecimalSeconds = Math.floor((elapsedMilliseconds / dayMilliseconds) * decimalSecondsInDay);

  const hours = Math.floor(totalDecimalSeconds / 10000);
  const minutes = Math.floor((totalDecimalSeconds % 10000) / 100);
  const seconds = totalDecimalSeconds % 100;

  return `${hours}:${pad(minutes)}:${pad(seconds)}`;
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

updateClocks();
setInterval(updateClocks, 200);
