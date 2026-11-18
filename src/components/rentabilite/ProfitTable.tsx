import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { AnalyticsRow, Measure, Period, QueryFilters } from "@/data/types";
import { useDrill } from "@/components/data/DrillDown";
import { formatEuro, formatEuroShort, formatPercent } from "@/utils/format";
import { periodLabel } from "@/utils/period";
import { cn } from "@/lib/utils";

export type ColKey = "camion" | "poste" | "ca" | "gasoil" | "adblue" | "peages" | "entretien" | "tv" | "chauffeur" | "vehicule" | "bureau" | "divers" | "tf" | "tc" | "marge" | "margeHx" | "taux";
export interface ProfitRow { key: string; plate: string; post: string; v: Record<Exclude<ColKey, "camion" | "poste">, number> }
type NumKey = keyof ProfitRow["v"];

export const VARIABLE_COLS: NumKey[] = ["gasoil", "adblue", "peages", "entretien"];
export const COL_LABEL: Record<ColKey, string> = {
  camion: "Camion", poste: "Poste", ca: "CA HT", gasoil: "Gasoil", adblue: "AdBlue", peages: "Péages", entretien: "Entretien", tv: "Total variables",
  chauffeur: "Chauffeur", vehicule: "Véhicule", bureau: "Bureau", divers: "Divers", tf: "Total fixes", tc: "Total coûts", marge: "Marge", margeHx: "Marge hors rép. except.", taux: "Taux de marge",
};

/** Construit une ligne du tableau à partir d'une ligne d'agrégation. `avant` = sans véhicule/bureau/divers. */
export function toProfitRow(key: string, plate: string, post: string, x: Record<Measure, number>, avant: boolean): ProfitRow {
  const tv = x.gasoil + x.adblue + x.peages + x.entretien;
  const fixed = avant ? { vehicule: 0, bureau: 0, divers: 0 } : { vehicule: x.vehicule, bureau: x.bureau, divers: x.divers };
  const tf = x.chauffeur + fixed.vehicule + fixed.bureau + fixed.divers;
  const tc = tv + tf;
  const marge = x.ca_ht - tc;
  return { key, plate, post, v: { ca: x.ca_ht, gasoil: x.gasoil, adblue: x.adblue, peages: x.peages, entretien: x.entretien, tv, chauffeur: x.chauffeur, ...fixed, tf, tc, marge, margeHx: marge + x.entretien_exceptionnel, taux: x.ca_ht ? (marge / x.ca_ht) * 100 : 0 } };
}

const DRILL: Record<NumKey, { measure: Measure; filters?: QueryFilters }> = {
  ca: { measure: "ca_ht" }, gasoil: { measure: "gasoil" }, adblue: { measure: "adblue" }, peages: { measure: "peages" }, entretien: { measure: "entretien" },
  tv: { measure: "couts_ht", filters: { categories: ["gasoil", "adblue", "peages", "entretien"] } },
  chauffeur: { measure: "chauffeur" }, vehicule: { measure: "vehicule" }, bureau: { measure: "bureau" }, divers: { measure: "divers" },
  tf: { measure: "couts_ht", filters: { categories: ["chauffeur", "vehicule", "bureau", "divers"] } }, tc: { measure: "couts_ht" },
  marge: { measure: "marge_ht" }, margeHx: { measure: "marge_ht", filters: { excludeExceptional: true } }, taux: { measure: "marge_ht" },
};

interface Props { rows: ProfitRow[]; unassigned: ProfitRow | null; total: ProfitRow; avant: boolean; period: Period; filters: QueryFilters }

export function ProfitTable({ rows, unassigned, total, avant, period, filters }: Props) {
  const drill = useDrill();
  const [sort, setSort] = useState<{ k: ColKey; dir: 1 | -1 }>({ k: "marge", dir: -1 });
  const fixedCols: NumKey[] = avant ? ["chauffeur", "tf"] : ["chauffeur", "vehicule", "bureau", "divers", "tf"];
  const varCols: NumKey[] = [...VARIABLE_COLS, "tv"];
  const tail: NumKey[] = ["tc", "marge", "margeHx", "taux"];
  const sorted = useMemo(() => [...rows].sort((a, b) => {
    if (sort.k === "camion") return a.plate.localeCompare(b.plate) * sort.dir;
    if (sort.k === "poste") return a.post.localeCompare(b.post) * sort.dir;
    return (a.v[sort.k] - b.v[sort.k]) * sort.dir;
  }), [rows, sort]);
  const toggle = (k: ColKey) => setSort((s) => ({ k, dir: s.k === k && s.dir === -1 ? 1 : -1 }));

  const open = (r: ProfitRow, k: NumKey) => {
    const d = DRILL[k];
    drill({
      title: `${COL_LABEL[k]} — ${r.key === "__total__" ? "Tous les camions" : r.plate}`,
      subtitle: periodLabel(period),
      query: { measure: d.measure, period, filters: { ...filters, ...d.filters }, keys: r.key === "__total__" ? undefined : { camion: r.key } },
    });
  };

  const isStrong = (k: NumKey) => k === "marge" || k === "taux" || k === "tv" || k === "tf" || k === "tc";
  const fixedSet = new Set<NumKey>(fixedCols);
  const varSet = new Set<NumKey>(varCols);
  const groupBg = (k: NumKey) => (varSet.has(k) || fixedSet.has(k) ? "bg-muted/50" : "");
  const signed = (k: NumKey) => k === "marge" || k === "margeHx" || k === "taux";
  const display = (k: NumKey, v: number) => {
    if (k === "taux") return formatPercent(v).replace("-", "−");
    const s = formatEuroShort(Math.abs(v));
    return signed(k) ? `${v > 0 ? "+" : v < 0 ? "−" : ""}${s}` : v < 0 ? `−${s}` : s;
  };
  const exact = (k: NumKey, v: number) => (k === "taux" ? formatPercent(v) : formatEuro(v));

  const Th = ({ k, className }: { k: ColKey; className?: string }) => (
    <th className={cn("sticky top-[25px] z-20 border-b bg-card px-1 py-2 align-bottom font-medium", k === "camion" ? "left-0 z-30 text-left" : k === "poste" ? "text-left" : "text-right", className)}>
      <button type="button" onClick={() => toggle(k)} className={cn("inline-flex max-w-[64px] items-end gap-0.5 leading-tight hover:text-foreground", k !== "camion" && k !== "poste" && "justify-end text-right", sort.k === k && "text-foreground")}>
        {COL_LABEL[k]}{sort.k === k && (sort.dir === 1 ? <ArrowUp className="size-3 shrink-0" /> : <ArrowDown className="size-3 shrink-0" />)}
      </button>
    </th>
  );

  const Row = ({ r, kind }: { r: ProfitRow; kind: "truck" | "none" | "total" }) => (
    <tr className={cn("group", kind === "total" ? "border-t-2 border-foreground/70 font-bold" : "border-b hover:bg-muted/40", kind === "none" && "text-muted-foreground")}>
      <td className={cn("sticky left-0 z-10 whitespace-nowrap bg-card px-1 py-1.5 group-hover:bg-muted", kind === "total" && "bg-card")}>
        {kind === "truck" ? <span className="plate"><span className="px-1.5 py-[3px]">{r.plate}</span></span> : kind === "none" ? <span className="italic">Non attribué</span> : "TOTAL"}
      </td>
      <td className="max-w-[66px] truncate px-1 py-1.5 text-muted-foreground" title={r.post}>{r.post}</td>
      {(["ca", ...varCols, ...fixedCols, ...tail] as NumKey[]).map((k) => {
        const v = r.v[k];
        return (
          <td key={k} className={cn("p-0 text-right", groupBg(k))}>
            <button type="button" title={exact(k, v)} onClick={() => open(r, k)}
              className={cn("w-full whitespace-nowrap px-1 py-1.5 text-right tabular hover:bg-accent", (isStrong(k) || kind === "total") && "font-semibold", (k === "marge" || k === "taux") && "font-bold", signed(k) && (v >= 0 ? "text-positive" : "text-negative"))}>
              {kind === "none" && v === 0 ? "—" : display(k, v)}
            </button>
          </td>
        );
      })}
    </tr>
  );

  return (
    <div className="max-h-[72vh] overflow-auto rounded-lg border">
      <table className="w-full border-separate border-spacing-0 text-[13px]">
        <thead className="text-xs text-muted-foreground">
          <tr className="h-[25px]">
            <th className="sticky left-0 top-0 z-30 bg-card" />
            <th className="sticky top-0 z-20 bg-card" />
            <th className="sticky top-0 z-20 bg-card" />
            <th colSpan={varCols.length} className="sticky top-0 z-20 border-b border-l bg-muted px-1.5 py-1 text-center text-[11px] font-semibold uppercase tracking-wide">Coûts variables</th>
            <th colSpan={fixedCols.length} className="sticky top-0 z-20 border-b border-l bg-muted px-1.5 py-1 text-center text-[11px] font-semibold uppercase tracking-wide">Coûts fixes</th>
            <th colSpan={tail.length} className="sticky top-0 z-20 bg-card" />
          </tr>
          <tr>
            <Th k="camion" /><Th k="poste" /><Th k="ca" />
            {varCols.map((k) => <Th key={k} k={k} className="bg-muted" />)}
            {fixedCols.map((k) => <Th key={k} k={k} className="bg-muted" />)}
            {tail.map((k) => <Th key={k} k={k} />)}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => <Row key={r.key} r={r} kind="truck" />)}
          {unassigned && <Row r={unassigned} kind="none" />}
        </tbody>
        <tfoot className="sticky bottom-0 z-20 bg-card"><Row r={total} kind="total" /></tfoot>
      </table>
    </div>
  );
}
