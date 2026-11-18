import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar } from "@/components/data/FilterBar";
import { WidgetFrame } from "@/components/widgets/WidgetFrame";
import { EmptyState } from "@/components/widgets/shared";
import { ProfitTable, toProfitRow, COL_LABEL, type ColKey, type ProfitRow } from "@/components/rentabilite/ProfitTable";
import { KnownRepairs } from "@/components/rentabilite/KnownRepairs";
import { useAnalytics, useReferences } from "@/data/DataProvider";
import { cleanFilters, filterSearchSchema, resolveCompare, resolveFilters, resolvePeriod, type FilterSearch } from "@/data/filters";
import type { Measure, WidgetConfig } from "@/data/types";
import { downloadCsv, slug } from "@/utils/csv";
import { periodLabel } from "@/utils/period";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/rentabilite")({
  validateSearch: zodValidator(filterSearchSchema),
  head: () => ({
    meta: [
      { title: "Rentabilité par camion — MADATRANS" },
      { name: "description", content: "Tableau de rentabilité par camion : CA, coûts variables et fixes, marge et taux de marge." },
      { property: "og:title", content: "Rentabilité par camion — MADATRANS" },
      { property: "og:description", content: "Tableau de rentabilité par camion : CA, coûts variables et fixes, marge et taux de marge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Rentabilite,
});

const MEASURES: Measure[] = ["ca_ht", "gasoil", "adblue", "peages", "entretien", "entretien_exceptionnel", "chauffeur", "vehicule", "bureau", "divers"];
const BARS: WidgetConfig = { id: "rentabilite-bars", title: "Marge par camion", type: "bar", measures: ["marge_ht"], dimension: "camion", series: null, filters: {}, sort: "desc", topN: null, unit: "eur", layout: { x: 0, y: 0, w: 12, h: 7 } };
const NONE = "__none__";

function Rentabilite() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/rentabilite" });
  const setSearch = (patch: Partial<FilterSearch>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const refs = useReferences();
  const period = resolvePeriod(search, refs.months.at(-1));
  const compare = resolveCompare(search, period);
  const filters = useMemo(() => cleanFilters(resolveFilters(search)), [search]);
  const avant = search.fc === "avant";
  const q = useAnalytics({ measures: MEASURES, dimensions: ["camion"], period, filters });

  const table = useMemo(() => {
    if (!q.data) return null;
    const postOf = (truckKey: string) => { const t = refs.trucks.find((x) => x.id === truckKey); return refs.posts.find((p) => p.id === t?.postId)?.name ?? ""; };
    const rows: ProfitRow[] = []; let unassigned: ProfitRow | null = null;
    for (const r of q.data.rows) {
      const key = r.keys.camion ?? NONE;
      if (key === NONE) unassigned = toProfitRow(NONE, "Non attribué", "", r.values, avant);
      else rows.push(toProfitRow(key, r.labels.camion ?? key, postOf(key), r.values, avant));
    }
    return { rows, unassigned, total: toProfitRow("__total__", "TOTAL", "", q.data.totals, avant) };
  }, [q.data, refs.trucks, refs.posts, avant]);

  const cols: ColKey[] = ["camion", "poste", "ca", "gasoil", "adblue", "peages", "entretien", "tv", "chauffeur", ...(avant ? [] : (["vehicule", "bureau", "divers"] as ColKey[])), "tf", "tc", "marge", "margeHx", "taux"];
  const asCells = (r: ProfitRow, name: string) => cols.map((c) => (c === "camion" ? name : c === "poste" ? r.post : Math.round(r.v[c] * 100) / 100));
  const allRows = () => table ? [...table.rows.map((r) => asCells(r, r.plate)), ...(table.unassigned ? [asCells(table.unassigned, "Non attribué")] : []), asCells(table.total, "TOTAL")] : [];
  const fileBase = `rentabilite-${slug(periodLabel(period))}${avant ? "-avant-frais-communs" : ""}`;
  const exportCsv = () => { downloadCsv(fileBase, cols.map((c) => COL_LABEL[c]), allRows()); toast.success("Export CSV téléchargé"); };
  const exportXlsx = async () => {
    try {
      const { default: writeXlsxFile } = await import("write-excel-file/browser");
      const header = cols.map((c) => ({ value: COL_LABEL[c], fontWeight: "bold" as const }));
      const body = allRows().map((row, i, arr) => row.map((v) => typeof v === "number" ? { value: v, type: Number, format: "#,##0.00", ...(i === arr.length - 1 ? { fontWeight: "bold" as const } : {}) } : { value: String(v ?? ""), ...(i === arr.length - 1 ? { fontWeight: "bold" as const } : {}) }));
      await writeXlsxFile([header, ...body]).toFile(`${fileBase}.xlsx`);
      toast.success("Export Excel téléchargé");
    } catch { toast.error("Export Excel impossible"); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rentabilité par camion</h1>
        <p className="mt-1 text-sm text-muted-foreground">Chiffre d'affaires, coûts variables et fixes, marge de chaque camion — {periodLabel(period)}.</p>
      </div>
      <FilterBar search={search} onChange={setSearch} />

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="radiogroup" aria-label="Frais communs" className="no-print inline-flex rounded-full border bg-muted p-0.5 text-xs font-medium">
            {(["avant", "apres"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={search.fc === m} onClick={() => setSearch({ fc: m })}
                className={cn("rounded-full px-3 py-1.5 transition-colors", search.fc === m ? "bg-card text-foreground shadow-none ring-1 ring-border" : "text-muted-foreground hover:text-foreground")}>
                {m === "avant" ? "Avant frais communs" : "Après frais communs"}
              </button>
            ))}
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="rounded-full" onClick={exportXlsx} disabled={!table}><FileSpreadsheet /> Excel</Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={exportCsv} disabled={!table}><FileText /> CSV</Button>
            <Button size="sm" className="rounded-full" onClick={() => window.print()} disabled={!table}><Printer /> PDF</Button>
          </div>
        </div>
        {q.isPending ? <Skeleton className="h-[520px] rounded-lg" /> : q.isError ? <EmptyState>Impossible de charger le tableau.</EmptyState> : !table?.rows.length ? <EmptyState>Aucune donnée sur la période.</EmptyState> : (
          <ProfitTable rows={table.rows} unassigned={table.unassigned} total={table.total} avant={avant} period={period} filters={filters} />
        )}
        <p className="text-xs text-muted-foreground">Montants HT arrondis à l'euro — survolez un montant pour voir les centimes, cliquez pour le détail des lignes. {avant ? "Véhicule, bureau et divers sont exclus." : "Frais communs répartis à parts égales entre les camions actifs."}</p>
      </section>

      <KnownRepairs trucks={refs.trucks} />

      <div className="no-print h-[380px]"><WidgetFrame config={BARS} ctx={{ period, compare, filters }} /></div>
    </div>
  );
}
