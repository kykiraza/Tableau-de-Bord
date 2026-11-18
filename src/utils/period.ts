import type { Period } from "@/data/types";

const MONTHS_LONG = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MONTHS_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

const parse = (m: string) => { const [y, mo] = m.split("-").map(Number); return { y: y!, mo: mo! }; };
export const monthKey = (y: number, mo: number) => `${y}-${String(mo).padStart(2, "0")}`;

export function shiftMonth(m: string, delta: number): string {
  const { y, mo } = parse(m);
  const i = y * 12 + (mo - 1) + delta;
  return monthKey(Math.floor(i / 12), (i % 12) + 1);
}

export function monthsBetween(start: string, end: string): string[] {
  const out: string[] = [];
  for (let m = start; m <= end; m = shiftMonth(m, 1)) out.push(m);
  return out;
}

export const periodLength = (p: Period) => monthsBetween(p.start, p.end).length;

export const previousPeriod = (p: Period): Period => {
  const n = periodLength(p);
  return { ...p, start: shiftMonth(p.start, -n), end: shiftMonth(p.end, -n) };
};
export const lastYearPeriod = (p: Period): Period => ({ ...p, start: shiftMonth(p.start, -12), end: shiftMonth(p.end, -12) });

export const monthLong = (m: string) => { const { y, mo } = parse(m); return `${MONTHS_LONG[mo - 1]} ${y}`; };
export const monthShort = (m: string) => { const { y, mo } = parse(m); return `${MONTHS_SHORT[mo - 1]} ${String(y).slice(2)}`; };
export const monthEnd = (m: string) => { const { y, mo } = parse(m); return `${m}-${String(new Date(Date.UTC(y, mo, 0)).getUTCDate()).padStart(2, "0")}`; };

/** Semaine ISO "2026-W43" */
export function isoWeek(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
/** Dimanche de la semaine ISO */
export function isoWeekEnd(week: string): string {
  const [y, w] = week.split("-W").map(Number);
  const jan4 = new Date(Date.UTC(y!, 0, 4));
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - ((jan4.getUTCDay() + 6) % 7) + (w! - 1) * 7);
  monday.setUTCDate(monday.getUTCDate() + 6);
  return monday.toISOString().slice(0, 10);
}

export function periodLabel(p: Period): string {
  const n = periodLength(p);
  if (p.type === "mois_type") return `mois type (moyenne ${n} mois, ${monthShort(p.start)} → ${monthShort(p.end)})`;
  if (n === 1) return monthLong(p.start);
  const { y, mo } = parse(p.start);
  if (p.type === "trimestre" && n === 3) return `T${Math.floor((mo - 1) / 3) + 1} ${y}`;
  if (p.type === "annee" && n === 12 && mo === 1) return `année ${y}`;
  return `${monthShort(p.start)} → ${monthShort(p.end)}`;
}
