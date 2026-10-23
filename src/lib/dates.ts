import type { LocalDate, Timestamp } from '../types/models';

const pad = (value: number) => String(value).padStart(2, '0');

export function toLocalDate(date: Date): LocalDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function timestampToLocalDate(value: Timestamp): LocalDate {
  return toLocalDate(new Date(value));
}

export function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 5) return 'Gute Nacht';
  if (hour < 11) return 'Guten Morgen';
  if (hour < 17) return 'Guten Tag';
  if (hour < 22) return 'Guten Abend';
  return 'Gute Nacht';
}

/** ISO 8601 week number */
export function isoWeek(date: Date): number {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1));
  return Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

/** "09:41" or "09:41:07" */
export function clockParts(date: Date) {
  return { hours: pad(date.getHours()), minutes: pad(date.getMinutes()), seconds: pad(date.getSeconds()) };
}

/** Countdown "mm:ss" (minutes may exceed 59) */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** "1 h 15 min", "40 min" */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

/** "Heute 09:41", "Gestern 18:02", "12.10. 14:30" */
export function formatRelativeStamp(value: Timestamp, now: Date): string {
  const date = new Date(value);
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const day = toLocalDate(date);
  if (day === toLocalDate(now)) return `Heute ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (day === toLocalDate(yesterday)) return `Gestern ${time}`;
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}. ${time}`;
}
