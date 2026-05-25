export type RoundingMode = "nearest" | "floor" | "ceil";

export const NORMAL_SECONDS_IN_DAY = 24 * 60 * 60;
export const DECIMAL_SECONDS_IN_DAY = 10 * 100 * 100;

export interface LiveDecimalTime {
  wholeSeconds: number;
  tenths: number;
  fraction: number;
}

export function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

export function getTimeZoneName(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "locale del browser";
}

export function parseTimeText(value: string, label: string): [number, number, number] {
  const match = value.trim().match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);

  if (!match) {
    throw new Error(`Usa il formato ${label}, per esempio 12:00:00.`);
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

export function validateNormalParts(hours: number, minutes: number, seconds: number): void {
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

export function validateDecimalParts(hours: number, minutes: number, seconds: number): void {
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

export function normalPartsToSeconds(hours: number, minutes: number, seconds: number): number {
  validateNormalParts(hours, minutes, seconds);
  return (hours * 3600) + (minutes * 60) + seconds;
}

export function decimalPartsToSeconds(hours: number, minutes: number, seconds: number): number {
  validateDecimalParts(hours, minutes, seconds);
  return (hours * 10000) + (minutes * 100) + seconds;
}

export function roundConvertedValue(value: number, mode: RoundingMode): number {
  if (mode === "floor") {
    return Math.floor(value);
  }

  if (mode === "ceil") {
    return Math.ceil(value);
  }

  return Math.round(value);
}

export function normalSecondsToDecimalSeconds(normalSeconds: number, mode: RoundingMode): number {
  return roundConvertedValue((normalSeconds / NORMAL_SECONDS_IN_DAY) * DECIMAL_SECONDS_IN_DAY, mode);
}

export function decimalSecondsToNormalSeconds(decimalSeconds: number, mode: RoundingMode): number {
  return roundConvertedValue((decimalSeconds / DECIMAL_SECONDS_IN_DAY) * NORMAL_SECONDS_IN_DAY, mode);
}

export function formatNormalTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.min(NORMAL_SECONDS_IN_DAY, Math.round(totalSeconds)));

  if (safeSeconds >= NORMAL_SECONDS_IN_DAY) {
    return "24:00:00";
  }

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatDecimalTime(totalDecimalSeconds: number, tenths?: number): string {
  const safeSeconds = Math.max(0, Math.min(DECIMAL_SECONDS_IN_DAY, Math.floor(totalDecimalSeconds)));
  const suffix = typeof tenths === "number" ? `.${Math.max(0, Math.min(9, Math.floor(tenths)))}` : "";

  if (safeSeconds >= DECIMAL_SECONDS_IN_DAY) {
    return `10:00:00${typeof tenths === "number" ? ".0" : ""}`;
  }

  const hours = Math.floor(safeSeconds / 10000);
  const minutes = Math.floor((safeSeconds % 10000) / 100);
  const seconds = safeSeconds % 100;

  return `${hours}:${pad(minutes)}:${pad(seconds)}${suffix}`;
}

export function getCurrentNormalSeconds(date = new Date()): number {
  return (date.getHours() * 3600) + (date.getMinutes() * 60) + date.getSeconds();
}

export function getElapsedMilliseconds(date: Date): number {
  const midnight = new Date(date);
  midnight.setHours(0, 0, 0, 0);

  return date.getTime() - midnight.getTime();
}

export function getLiveDecimalTime(date: Date): LiveDecimalTime {
  const dayMilliseconds = NORMAL_SECONDS_IN_DAY * 1000;
  const elapsedMilliseconds = Math.max(0, Math.min(getElapsedMilliseconds(date), dayMilliseconds));
  const fraction = Math.min(elapsedMilliseconds / dayMilliseconds, 1);
  const totalDecimalTenths = Math.min(
    DECIMAL_SECONDS_IN_DAY * 10,
    Math.floor(fraction * DECIMAL_SECONDS_IN_DAY * 10),
  );

  return {
    wholeSeconds: Math.floor(totalDecimalTenths / 10),
    tenths: totalDecimalTenths % 10,
    fraction,
  };
}
