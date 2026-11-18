import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pin, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/data/FilterBar";
import { MultiSelect } from "@/components/data/MultiSelect";
import { WidgetFrame } from "@/components/widgets/WidgetFrame";
import { EmptyState, effectivePeriod, widgetFilters } from "@/components/widgets/shared";
import { useDrill } from "@/components/data/DrillDown";
import { dataKeys, useAnalytics, useDataSource, useReferences } from "@/data/DataProvider";
import { cleanFilters, filterSearchSchema, resolveCompare, resolveFilters, resolvePeriod, type FilterSearch } from "@/data/filters";
import { DIMENSIONS, MEASURES, type ChartType, type Dimension, type Measure, type WidgetConfig } from "@/data/types";
import { ANALYSIS_CHART_TYPES, CHART_LABEL, DIMENSION_LABEL, MEASURE_META } from "@/data/catalog";
import { formatValue } from "@/utils/format";
import { downloadCsv, slug } from "@/utils/csv";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explorer")({
  validateSearch: zodValidator(filterSearchSchema),
  head: () => ({
    meta: [
      { title: "Explorer — MADATRANS" },
      { name: "description", content: "Analysez librement vos mesures par camion, client, poste, fournisseur ou période." },
      { property: "og:title", content: "Explorer — MADATRANS" },
      { property: "og:description", content: "Analysez librement vos mesures par camion, client, poste, fournisseur ou période." },
    ],
  }),
  component: Explorer,
});

interface Analysis { title: string; measures: Measure[]; rows: Dimension; cols: Dimension | null; type: ChartType }
const EXAMPLES: Analysis[] = [
  { title: "Gasoil par camion par mois", measures: ["gasoil"], rows: "camion", cols: "mois", type: "heatmap" },
  { title: "Entretien par fournisseur", measures: ["entretien"], rows: "fournisseur", cols: null, type: "bar" },
  { title: "Marge par client", measures: ["ca_ht", "couts_ht", "marge_ht"], rows: "client", cols: null, type: "bar" },
  { title: "CA par poste sur 12 mois", measures: ["ca_ht"], rows: "poste", cols: "mois", type: "heatmap" },
];
const NONE = "__none";

function toWidget(a: Analysis): WidgetConfig {
  const heat = a.cols !== null && a.type === "heatmap";
  return {
    id: `w-${Date.now().toString(36)}`, title: a.title, type: a.type, measures: a.measures,
    dimension: a.type === "kpi" || a.type === "waterfall" ? null : a.rows, series: heat ? a.cols : null,
    filters: {}, sort: a.rows === "mois" || a.rows === "semaine" ? "none" : "desc", topN: null, unit: "eur", layout: { x: 0, y: 999, w: 12, h: 7 },
  };
}

function Explorer() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/explorer" });
  const setSearch = (patch: Partial<FilterSearch>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const refs = useReferences();
  const period = resolvePeriod(search, refs.months.at(-1));
  const compare = resolveCompare(search, period);
  const filters = useMemo(() => cleanFilters(resolveFilters(search)), [search]);
  const ctx = useMemo(() => ({ period, compare, filters }), [period.start, period.end, period.type, compare?.start, compare?.end, filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const [a, setA] = useState<Analysis>(EXAMPLES[0]!);
  const widget = useMemo(() => toWidget(a), [a]);
  const [pinOpen, setPinOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Explorer</h1>
        <p className="mt-1 text-sm text-muted-foreground">Choisissez des mesures, une dimension en lignes et éventuellement une en colonnes.</p>
      </div>
      <FilterBar search={search} onChange={setSearch} />

      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="size-4 text-amber" />
        {EXAMPLES.map((e) => (
          <button key={e.title} type="button" onClick={() => setA(e)} className={cn("rounded-full border px-3 py-1 text-xs font-medium transition-colors", a.title === e.title ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>{e.title}</button>
        ))}
      </div>

      <div className="surface grid gap-4 p-4 md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:items-end">
        <div className="grid gap-1.5">
          <Label>Mesures</Label>
          <MultiSelect className="w-full" label={a.measures.map((m) => MEASURE_META[m].label).join(", ").slice(0, 40) || "Choisir…"} options={MEASURES.map((m) => ({ value: m, label: MEASURE_META[m].label }))} value={a.measures} onChange={(v) => v.length && setA({ ...a, measures: v as Measure[], title: "Analyse personnalisée" })} />
        </div>
        <div className="grid gap-1.5">
          <Label>En lignes</Label>
          <Select value={a.rows} onValueChange={(v) => setA({ ...a, rows: v as Dimension, title: "Analyse personnalisée" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{DIMENSIONS.map((d) => <SelectItem key={d} value={d}>{DIMENSION_LABEL[d]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>En colonnes (optionnel)</Label>
          <Select value={a.cols ?? NONE} onValueChange={(v) => setA({ ...a, cols: v === NONE ? null : (v as Dimension), type: v === NONE ? (a.type === "heatmap" ? "bar" : a.type) : "heatmap", title: "Analyse personnalisée" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value={NONE}>Aucune</SelectItem>{DIMENSIONS.filter((d) => d !== a.rows).map((d) => <SelectItem key={d} value={d}>{DIMENSION_LABEL[d]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Visualisation</Label>
          <Select value={a.type} onValueChange={(v) => setA({ ...a, type: v as ChartType })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ANALYSIS_CHART_TYPES.map((t) => <SelectItem key={t} value={t}>{CHART_LABEL[t]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={() => setPinOpen(true)}><Pin /> Épingler au tableau de bord</Button>
      </div>

      <div className="h-[440px]"><WidgetFrame config={widget} ctx={ctx} /></div>
      <PivotTable analysis={a} widget={widget} ctx={ctx} />
      <PinDialog open={pinOpen} onClose={() => setPinOpen(false)} widget={widget} />
    </div>
  );
}

function PivotTable({ analysis, widget, ctx }: { analysis: Analysis; widget: WidgetConfig; ctx: Parameters<typeof widgetFilters>[0] }) {
  const period = effectivePeriod({ dimension: analysis.rows, series: analysis.cols }, ctx.period);
  const filters = widgetFilters(ctx, widget);
  const dims = analysis.cols ? [analysis.rows, analysis.cols] : [analysis.rows];
  const q = useAnalytics({ measures: analysis.measures, dimensions: dims, period, filters });
  const drill = useDrill();
  if (q.isPending) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (q.isError) return <EmptyState>Impossible de calculer le tableau.</EmptyState>;
  if (!q.data.rows.length) return <EmptyState>Aucune donnée pour ces filtres.</EmptyState>;

  const m0 = analysis.measures[0]!;
  const fmt = (m: Measure, v: number) => formatValue(MEASURE_META[m].format, v);
  const rowKeys = [...new Map(q.data.rows.map((r) => [r.keys[analysis.rows]!, r.labels[analysis.rows]!])).entries()];
  const colKeys = analysis.cols ? [...new Map(q.data.rows.map((r) => [r.keys[analysis.cols!]!, r.labels[analysis.cols!]!])).entries()].sort((x, y) => x[0].localeCompare(y[0])) : [];
  const cell = (rk: string, ck?: string) => q.data.rows.find((r) => r.keys[analysis.rows] === rk && (!ck || r.keys[analysis.cols!] === ck));
  const rowTotal = (rk: string, m: Measure) => q.data.rows.filter((r) => r.keys[analysis.rows] === rk).reduce((s, r) => s + r.values[m], 0);
  rowKeys.sort((x, y) => (analysis.rows === "mois" || analysis.rows === "semaine" ? x[0].localeCompare(y[0]) : rowTotal(y[0], m0) - rowTotal(x[0], m0)));

  const headers = analysis.cols ? [DIMENSION_LABEL[analysis.rows], ...colKeys.map(([, l]) => l), "Total"] : [DIMENSION_LABEL[analysis.rows], ...analysis.measures.map((m) => MEASURE_META[m].label)];
  const body = rowKeys.map(([rk, rl]) => analysis.cols ? [rl, ...colKeys.map(([ck]) => cell(rk, ck)?.values[m0] ?? 0), rowTotal(rk, m0)] : [rl, ...analysis.measures.map((m) => cell(rk)?.values[m] ?? 0)]);
  const open = (m: Measure, keys: Partial<Record<Dimension, string>>, title: string) => drill({ title: `${MEASURE_META[m].label} — ${title}`, query: { measure: m, period, filters, keys } });

  return (
    <section className="surface overflow-hidden">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">Tableau croisé</h2>
          <p className="text-xs text-muted-foreground">{analysis.cols ? `${MEASURE_META[m0].label} · ${DIMENSION_LABEL[analysis.rows]} × ${DIMENSION_LABEL[analysis.cols]}` : `${DIMENSION_LABEL[analysis.rows]} × mesures`} · cliquez une cellule pour le détail</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => downloadCsv(slug(analysis.title), headers, body)}><Download /> CSV</Button>
      </header>
      <div className="max-h-[480px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
            <tr>{headers.map((h, i) => <th key={h + i} className={cn("whitespace-nowrap px-3 py-2 font-medium", i === 0 ? "sticky left-0 bg-muted text-left" : "text-right")}>{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {rowKeys.map(([rk, rl]) => (
              <tr key={rk} className="hover:bg-muted/40">
                <td className="sticky left-0 whitespace-nowrap bg-card px-3 py-1.5 font-medium">{rl}</td>
                {analysis.cols
                  ? <>{colKeys.map(([ck, cl]) => { const v = cell(rk, ck)?.values[m0]; return <td key={ck} className="p-0 text-right">{v === undefined ? <span className="px-3 text-muted-foreground">—</span> : <button type="button" onClick={() => open(m0, { [analysis.rows]: rk, [analysis.cols!]: ck }, `${rl}, ${cl}`)} className="w-full px-3 py-1.5 text-right tabular hover:bg-accent">{fmt(m0, v)}</button>}</td>; })}
                      <td className="px-3 py-1.5 text-right font-semibold tabular">{fmt(m0, rowTotal(rk, m0))}</td></>
                  : analysis.measures.map((m) => <td key={m} className="p-0 text-right"><button type="button" onClick={() => open(m, { [analysis.rows]: rk }, rl)} className={cn("w-full px-3 py-1.5 text-right tabular hover:bg-accent", m === "marge_ht" && ((cell(rk)?.values[m] ?? 0) >= 0 ? "text-positive" : "text-negative"))}>{fmt(m, cell(rk)?.values[m] ?? 0)}</button></td>)}
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 bg-muted font-bold">
            <tr>
              <td className="sticky left-0 bg-muted px-3 py-2">TOTAL</td>
              {analysis.cols
                ? <>{colKeys.map(([ck]) => <td key={ck} className="px-3 py-2 text-right tabular">{fmt(m0, q.data.rows.filter((r) => r.keys[analysis.cols!] === ck).reduce((s, r) => s + r.values[m0], 0))}</td>)}<td className="px-3 py-2 text-right tabular">{fmt(m0, q.data.totals[m0])}</td></>
                : analysis.measures.map((m) => <td key={m} className="px-3 py-2 text-right tabular">{fmt(m, q.data.totals[m])}</td>)}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function PinDialog({ open, onClose, widget }: { open: boolean; onClose: () => void; widget: WidgetConfig }) {
  const ds = useDataSource();
  const qc = useQueryClient();
  const views = useQuery({ queryKey: dataKeys.views, queryFn: () => ds.listViews() });
  const def = useQuery({ queryKey: dataKeys.defaultView, queryFn: () => ds.getDefaultViewId() });
  const [viewId, setViewId] = useState<string>("");
  const [title, setTitle] = useState(widget.title);
  const navigate = useNavigate();
  const target = viewId || def.data || "vue-gerant";
  useEffect(() => { if (open) setTitle(widget.title); }, [open, widget.title]);
  const pin = async () => {
    const v = views.data?.find((x) => x.id === target);
    if (!v) return;
    const y = v.widgets.reduce((mx, w) => Math.max(mx, w.layout.y + w.layout.h), 0);
    await ds.saveView({ ...v, widgets: [...v.widgets, { ...widget, title, layout: { ...widget.layout, y } }] });
    await qc.invalidateQueries({ queryKey: dataKeys.views });
    onClose();
    toast.success(`Épinglé dans « ${v.name} »`, { action: { label: "Voir", onClick: () => navigate({ to: "/", search: (p) => ({ ...p, v: v.id }) }) } });
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Épingler au tableau de bord</DialogTitle><DialogDescription>L'analyse devient un widget, que vous pourrez ensuite configurer.</DialogDescription></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label htmlFor="pt">Titre du widget</Label><Input id="pt" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid gap-1.5">
            <Label>Vue</Label>
            <Select value={target} onValueChange={setViewId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{(views.data ?? []).map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Annuler</Button><Button onClick={pin} disabled={!title.trim()}><Pin /> Épingler</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
