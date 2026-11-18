import { fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import type { Category, Period, PeriodType, QueryFilters } from "./types";
import { lastYearPeriod, previousPeriod, shiftMonth } from "@/utils/period";

/** État des filtres globaux, stocké dans l'URL (lien partageable). */
export const filterSearchSchema = z.object({
  pt: fallback(z.string(), "mois").default("mois"),
  ps: fallback(z.string(), "2026-10").default("2026-10"),
  pe: fallback(z.string(), "2026-10").default("2026-10"),
  pn: fallback(z.number(), 12).default(12),
  cmp: fallback(z.string(), "previous").default("previous"),
  tk: fallback(z.array(z.string()), []).default([]),
  cl: fallback(z.array(z.string()), []).default([]),
  cat: fallback(z.array(z.string()), []).default([]),
  fc: fallback(z.string(), "apres").default("apres"),
  hx: fallback(z.boolean(), false).default(false),
  v: fallback(z.string(), "").default(""),
});
export type FilterSearch = z.infer<typeof filterSearchSchema>;

export const DEFAULT_SEARCH: FilterSearch = filterSearchSchema.parse({});
export type CompareMode = "previous" | "lastYear" | "none";

const PERIOD_TYPES: PeriodType[] = ["mois", "trimestre", "annee", "plage", "mois_type"];
const isMonth = (m: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m);

export function resolvePeriod(s: FilterSearch, lastMonth = "2026-10"): Period {
  const type = (PERIOD_TYPES as string[]).includes(s.pt) ? (s.pt as PeriodType) : "mois";
  const ps = isMonth(s.ps) ? s.ps : lastMonth;
  const pe = isMonth(s.pe) ? s.pe : lastMonth;
  switch (type) {
    case "mois": return { type, start: ps, end: ps };
    case "trimestre": {
      const q = Math.floor((Number(ps.slice(5)) - 1) / 3);
      const start = `${ps.slice(0, 4)}-${String(q * 3 + 1).padStart(2, "0")}`;
      return { type, start, end: shiftMonth(start, 2) };
    }
    case "annee": {
      const end = `${ps.slice(0, 4)}-12`;
      return { type, start: `${ps.slice(0, 4)}-01`, end: end > lastMonth ? lastMonth : end };
    }
    case "plage": return ps <= pe ? { type, start: ps, end: pe } : { type, start: pe, end: ps };
    case "mois_type": {
      const n = Math.max(1, Math.min(24, Math.round(s.pn)));
      return { type, start: shiftMonth(pe, -(n - 1)), end: pe };
    }
  }
}

export function resolveCompare(s: FilterSearch, p: Period): Period | null {
  if (s.cmp === "none") return null;
  return s.cmp === "lastYear" ? lastYearPeriod(p) : previousPeriod(p);
}

export function resolveFilters(s: FilterSearch): QueryFilters {
  return {
    trucks: s.tk.length ? s.tk : undefined,
    clients: s.cl.length ? s.cl : undefined,
    categories: s.cat.length ? (s.cat as Category[]) : undefined,
    commonCosts: s.fc === "avant" ? "avant" : "apres",
    excludeExceptional: s.hx || undefined,
  } as QueryFilters;
}

/** Fusionne filtres globaux et filtres propres d'un widget (le widget l'emporte quand il précise une valeur). */
export function mergeFilters(global: QueryFilters, own: QueryFilters): QueryFilters {
  const pick = <T,>(a: T[] | undefined, b: T[] | undefined) => (b && b.length ? b : a);
  return {
    trucks: pick(global.trucks, own.trucks),
    clients: pick(global.clients, own.clients),
    posts: pick(global.posts, own.posts),
    categories: pick(global.categories, own.categories),
    suppliers: pick(global.suppliers, own.suppliers),
    commonCosts: own.commonCosts ?? global.commonCosts,
    excludeExceptional: own.excludeExceptional ?? global.excludeExceptional,
  };
}

/** Supprime les clés undefined (clés de cache stables) */
export function cleanFilters(f: QueryFilters): QueryFilters {
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && !(Array.isArray(v) && v.length === 0))) as QueryFilters;
}
