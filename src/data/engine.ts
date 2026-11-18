/**
 * Moteur d'agrégation : calcule toutes les mesures à partir des lignes élémentaires.
 * Utilisé par MockDataSource ; une source SQL pourra faire la même chose côté base.
 */
import type { AllocationKey, AnalyticsQuery, AnalyticsResult, AnalyticsRow, Category, DetailLine, DetailQuery, Dimension, FactLine, Measure, QueryFilters } from "./types";
import { MEASURES } from "./types";
import { CATEGORY_LABEL, CATEGORY_MEASURE } from "./catalog";
import { isoWeek, isoWeekEnd, monthEnd, monthShort, periodLength } from "@/utils/period";

export interface EngineContext {
  facts: FactLine[];
  openingBalance: number;
  /** Remboursements d'emprunts et prélèvements mensuels (hors compte de résultat) */
  monthlyDebtService: number;
  firstMonth: string;
  /** Clé de répartition des frais communs (défaut : parts égales) */
  allocationKey?: AllocationKey | undefined;
  label: (dim: Dimension, key: string) => string;
}

const NONE = "__none__";
const TIME_DIMS = new Set<Dimension>(["mois", "semaine"]);
const ENTITY_DIMS = new Set<Dimension>(["camion", "poste", "client", "chauffeur"]);
const COST_CATS: Category[] = ["gasoil", "adblue", "peages", "entretien", "chauffeur", "vehicule", "bureau", "divers"];

const emptyValues = (): Record<Measure, number> => Object.fromEntries(MEASURES.map((m) => [m, 0])) as Record<Measure, number>;
const r2 = (n: number) => Math.round(n * 100) / 100;

function keyOf(f: FactLine, dim: Dimension, date: string): string {
  switch (dim) {
    case "mois": return date.slice(0, 7);
    case "semaine": return isoWeek(date);
    case "camion": return f.truckId ?? NONE;
    case "poste": return f.postId ?? NONE;
    case "client": return f.clientId ?? NONE;
    case "chauffeur": return f.driverId ?? NONE;
    case "categorie": return f.category;
    case "fournisseur": return f.supplierId ?? NONE;
    case "bloc_commun": return f.bloc ?? NONE;
  }
}

/**
 * Répartit chaque frais commun (lignes `bloc`) sur les camions actifs du mois
 * (camions ayant du CA ce mois-là) selon la clé choisie :
 * - "parts_egales" (défaut) : total du bloc ÷ nombre de camions actifs ;
 * - "prorata_ca" : au prorata du CA du mois ;
 * - "prorata_jours" : au prorata des jours roulés du mois.
 */
export function allocateCommon(facts: FactLine[], key: AllocationKey = "parts_egales"): FactLine[] {
  const active = new Map<string, Map<string, { ref: FactLine; ca: number; days: number }>>();
  for (const f of facts) {
    if (f.category !== "ca" || !f.truckId) continue;
    const m = f.date.slice(0, 7);
    if (!active.has(m)) active.set(m, new Map());
    const t = active.get(m)!.get(f.truckId) ?? { ref: f, ca: 0, days: 0 };
    t.ca += f.amountHT; t.days += f.days ?? 0;
    active.get(m)!.set(f.truckId, t);
  }
  const weight = (t: { ca: number; days: number }) => (key === "prorata_ca" ? t.ca : key === "prorata_jours" ? t.days : 1);
  const out: FactLine[] = [];
  for (const f of facts) {
    if (f.truckId || !f.bloc) { out.push(f); continue; }
    const trucks = active.get(f.date.slice(0, 7));
    const total = trucks ? [...trucks.values()].reduce((a, t) => a + weight(t), 0) : 0;
    if (!trucks || !total) { out.push(f); continue; }
    for (const [truckId, t] of trucks) {
      const ref = t.ref;
      out.push({ ...f, id: `${f.id}@${truckId}`, label: `Quote-part — ${f.label}`, truckId, postId: ref.postId, clientId: ref.clientId, driverId: ref.driverId, amountHT: f.amountHT * (weight(t) / total) });
    }
  }
  return out;
}

interface Prepared { facts: FactLine[]; filters: QueryFilters }

function prepare(ctx: EngineContext, filters: QueryFilters = {}, dims: Dimension[] = [], keys?: Partial<Record<Dimension, string>>): Prepared {
  const mode = filters.commonCosts ?? "apres";
  const needsAlloc = mode === "apres" && (dims.some((d) => ENTITY_DIMS.has(d)) || Object.keys(keys ?? {}).some((d) => ENTITY_DIMS.has(d as Dimension)) || !!filters.trucks?.length || !!filters.clients?.length || !!filters.posts?.length);
  let facts = ctx.facts;
  if (mode === "avant") facts = facts.filter((f) => !f.bloc);
  else if (needsAlloc) facts = allocateCommon(facts, ctx.allocationKey);
  facts = facts.filter((f) => {
    if (filters.trucks?.length && !(f.truckId && filters.trucks.includes(f.truckId))) return false;
    if (filters.clients?.length && !(f.clientId && filters.clients.includes(f.clientId))) return false;
    if (filters.posts?.length && !(f.postId && filters.posts.includes(f.postId))) return false;
    if (f.category !== "ca") {
      // Catégories et fournisseurs ne filtrent que les coûts (le CA reste visible).
      if (filters.categories?.length && !filters.categories.includes(f.category)) return false;
      if (filters.suppliers?.length && !(f.supplierId && filters.suppliers.includes(f.supplierId))) return false;
      if (filters.excludeExceptional && f.exceptional) return false;
    }
    return true;
  });
  return { facts, filters };
}

function finalize(v: Record<Measure, number>, divisor: number): Record<Measure, number> {
  v.couts_ht = COST_CATS.reduce((a, c) => a + v[CATEGORY_MEASURE[c]], 0);
  v.marge_ht = v.ca_ht - v.couts_ht;
  for (const m of MEASURES) {
    if (m === "taux_marge" || m === "solde" || m === "en_attente") continue;
    v[m] = r2(v[m] / divisor);
  }
  v.taux_marge = v.ca_ht ? Math.round((v.marge_ht / v.ca_ht) * 1000) / 10 : 0;
  v.solde = r2(v.solde);
  v.en_attente = r2(v.en_attente);
  return v;
}

export function runQuery(ctx: EngineContext, q: AnalyticsQuery): AnalyticsResult {
  const dims = q.dimensions.filter((d, i, a) => a.indexOf(d) === i);
  const { facts } = prepare(ctx, q.filters, dims);
  const { start, end } = q.period;
  const startDate = `${start}-01`, endDate = monthEnd(end);
  const divisor = q.period.type === "mois_type" ? periodLength(q.period) : 1;
  const wantStock = q.measures.some((m) => m === "solde" || m === "en_attente");
  const groups = new Map<string, { keys: Partial<Record<Dimension, string>>; values: Record<Measure, number> }>();

  const groupFor = (f: FactLine, date: string) => {
    const keys: Partial<Record<Dimension, string>> = {};
    for (const d of dims) keys[d] = keyOf(f, d, date);
    const id = dims.map((d) => keys[d]).join("¦");
    let g = groups.get(id);
    if (!g) { g = { keys, values: emptyValues() }; groups.set(id, g); }
    return g.values;
  };

  for (const f of facts) {
    const inRange = f.date >= startDate && f.date <= endDate;
    if (inRange) {
      const v = groupFor(f, f.date);
      v[CATEGORY_MEASURE[f.category]] += f.amountHT;
      if (f.exceptional) v.entretien_exceptionnel += f.amountHT;
      if (f.litres) v.litres += f.litres;
      if (f.days) v.jours_roules += f.days;
    }
    if (f.category === "ca" && f.paidDate && f.paidDate >= startDate && f.paidDate <= endDate) {
      groupFor(f, f.paidDate).encaisse += f.amountHT * (1 + f.vatRate);
    }
  }

  // Mesures de stock : calculées à la fin de chaque groupe (fin de mois / semaine / période)
  if (wantStock) {
    const timeDim = dims.find((d) => TIME_DIMS.has(d));
    if (timeDim && groups.size === 0) { /* rien */ }
    for (const g of groups.values()) {
      const tk = timeDim ? g.keys[timeDim]! : null;
      const cutoff = tk ? (timeDim === "mois" ? monthEnd(tk) : isoWeekEnd(tk)) : endDate;
      let pending = 0, cash = ctx.openingBalance;
      for (const f of facts) {
        if (dims.some((d) => !TIME_DIMS.has(d) && keyOf(f, d, f.date) !== g.keys[d])) continue;
        if (f.category === "ca") {
          if (f.date <= cutoff && (!f.paidDate || f.paidDate > cutoff)) pending += f.amountHT * (1 + f.vatRate);
          if (f.paidDate && f.paidDate <= cutoff) cash += f.amountHT;
        } else if (f.date <= cutoff) cash -= f.amountHT;
      }
      // TVA neutre en trésorerie ; on retire les remboursements d'emprunts (société entière uniquement)
      if (!dims.some((d) => !TIME_DIMS.has(d)) && !q.filters?.trucks?.length && !q.filters?.clients?.length) {
        const months = Math.max(0, (Number(cutoff.slice(0, 4)) - Number(ctx.firstMonth.slice(0, 4))) * 12 + Number(cutoff.slice(5, 7)) - Number(ctx.firstMonth.slice(5, 7)) + 1);
        cash -= months * ctx.monthlyDebtService;
      }
      g.values.en_attente = pending;
      g.values.solde = cash;
    }
  }

  const rows: AnalyticsRow[] = [...groups.values()].map((g) => ({
    keys: g.keys,
    labels: Object.fromEntries(dims.map((d) => [d, labelFor(ctx, d, g.keys[d]!)])) as Partial<Record<Dimension, string>>,
    values: finalize(g.values, divisor),
  }));
  const time = dims.find((d) => TIME_DIMS.has(d));
  if (time) rows.sort((a, b) => a.keys[time]!.localeCompare(b.keys[time]!));

  let totals: Record<Measure, number>;
  if (dims.length === 0) totals = rows[0]?.values ?? finalize(emptyValues(), 1);
  else {
    const t = runQuery(ctx, { ...q, dimensions: [] });
    totals = t.totals;
    if (!wantStock) { /* ok */ }
  }
  if (dims.length === 0 && wantStock && rows.length === 0) totals = finalize(emptyValues(), 1);
  return { rows, totals };
}

function labelFor(ctx: EngineContext, d: Dimension, key: string): string {
  if (key === NONE) return "Non attribué";
  if (d === "mois") return monthShort(key);
  if (d === "semaine") return key.replace("-W", " · S");
  if (d === "categorie") return CATEGORY_LABEL[key as Category];
  if (d === "bloc_commun") return key === "bureau" ? "Bureau" : "Divers";
  return ctx.label(d, key);
}

const MEASURE_CATS: Partial<Record<Measure, Category[]>> = {
  ca_ht: ["ca"], gasoil: ["gasoil"], adblue: ["adblue"], peages: ["peages"], entretien: ["entretien"], entretien_exceptionnel: ["entretien"],
  chauffeur: ["chauffeur"], vehicule: ["vehicule"], bureau: ["bureau"], divers: ["divers"], litres: ["gasoil"], jours_roules: ["ca"],
  couts_ht: COST_CATS, marge_ht: ["ca", ...COST_CATS], taux_marge: ["ca", ...COST_CATS],
};

export function runDetails(ctx: EngineContext, q: DetailQuery): DetailLine[] {
  const dims = Object.keys(q.keys ?? {}) as Dimension[];
  const { facts } = prepare(ctx, q.filters, dims, q.keys);
  const startDate = `${q.period.start}-01`, endDate = monthEnd(q.period.end);
  const match = (f: FactLine, date: string) => dims.every((d) => keyOf(f, d, date) === q.keys![d]);
  const truckLabel = (f: FactLine) => (f.truckId ? ctx.label("camion", f.truckId) : null);
  const out: DetailLine[] = [];

  if (q.measure === "encaisse") {
    for (const f of facts) if (f.category === "ca" && f.paidDate && f.paidDate >= startDate && f.paidDate <= endDate && match(f, f.paidDate))
      out.push({ id: f.id, date: f.paidDate, label: `Règlement — ${f.label}`, source: "transaction", documentRef: f.documentRef, truck: truckLabel(f), amount: r2(f.amountHT * (1 + f.vatRate)) });
  } else if (q.measure === "en_attente") {
    for (const f of facts) if (f.category === "ca" && f.date <= endDate && (!f.paidDate || f.paidDate > endDate) && match(f, f.date))
      out.push({ id: f.id, date: f.date, label: f.label, source: f.source, documentRef: f.documentRef, truck: truckLabel(f), amount: r2(f.amountHT * (1 + f.vatRate)) });
  } else if (q.measure === "solde") {
    for (const f of facts) if (f.date >= startDate && f.date <= endDate && match(f, f.date)) {
      const sign = f.category === "ca" ? 1 : -1;
      out.push({ id: f.id, date: f.date, label: f.label, source: f.source, documentRef: f.documentRef, truck: truckLabel(f), amount: r2(sign * f.amountHT * (1 + f.vatRate)) });
    }
  } else {
    const cats = MEASURE_CATS[q.measure] ?? [];
    for (const f of facts) {
      if (!cats.includes(f.category) || f.date < startDate || f.date > endDate || !match(f, f.date)) continue;
      if (q.measure === "entretien_exceptionnel" && !f.exceptional) continue;
      const signed = (q.measure === "marge_ht" || q.measure === "taux_marge") && f.category !== "ca" ? -f.amountHT : f.amountHT;
      const amount = q.measure === "litres" ? f.litres ?? 0 : q.measure === "jours_roules" ? f.days ?? 0 : signed;
      out.push({ id: f.id, date: f.date, label: f.label, source: f.source, documentRef: f.documentRef, truck: truckLabel(f), amount: r2(amount) });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
