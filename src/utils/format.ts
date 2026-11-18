const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eur0 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 14 141,60 € */
export const formatEuro = (n: number) => eur.format(n).replace("-", "−");
/** 14 142 € */
export const formatEuroShort = (n: number) => eur0.format(n).replace("-", "−");
/** +1 533,71 € / −862,16 € */
export const formatSignedEuro = (n: number) =>
  (n > 0 ? "+" : n < 0 ? "−" : "") + eur.format(Math.abs(n));
/** Axe : 12 k€ */
export const formatEuroAxis = (n: number) =>
  Math.abs(n) >= 1000 ? `${num1.format(n / 1000).replace(",0", "")} k€` : `${Math.round(n)} €`;
export const formatPercent = (n: number) => `${num1.format(n)} %`;
export const formatSignedPercent = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${num1.format(Math.abs(n))} %`;
export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(iso));

import type { MeasureFormat } from "@/data/catalog";
const int = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

/** Formate une valeur selon le format de la mesure. `compact` = sans centimes. */
export function formatValue(format: MeasureFormat, n: number, opts: { compact?: boolean; signed?: boolean } = {}): string {
  if (format === "percent") return formatPercent(n);
  if (format === "litres") return `${int.format(n)} L`;
  if (format === "days") return `${int.format(n)} j`;
  if (opts.signed) return opts.compact ? (n > 0 ? "+" : n < 0 ? "−" : "") + formatEuroShort(Math.abs(n)) : formatSignedEuro(n);
  return opts.compact ? formatEuroShort(n) : formatEuro(n);
}
export const formatShortDate = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(`${iso}T00:00:00Z`));
