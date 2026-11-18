import { useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Download, FileSpreadsheet, LayoutDashboard, Plus, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FilterBar } from "@/components/data/FilterBar";
import { DashboardSummary } from "@/components/dashboard/DashboardSummary";
import { RightRail } from "@/components/dashboard/RightRail";
import { DashboardGrid, LayoutSkeleton } from "@/components/widgets/DashboardGrid";
import { DEFAULT_VIEWS } from "@/data/defaultViews";
import { WidgetEditor } from "@/components/widgets/WidgetEditor";
import { ViewsMenu } from "@/components/widgets/ViewsMenu";
import { dataKeys, useDataSource, useReferences } from "@/data/DataProvider";
import { cleanFilters, filterSearchSchema, resolveCompare, resolveFilters, resolvePeriod, type FilterSearch } from "@/data/filters";
import type { SavedView, WidgetConfig } from "@/data/types";
import { downloadCsv } from "@/utils/csv";

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(filterSearchSchema),
  head: () => ({
    meta: [
      { title: "Tableau de bord — MADATRANS" },
      { name: "description", content: "Tableau de bord personnalisable : CA, coûts, marge et trésorerie de MADATRANS." },
      { property: "og:title", content: "Tableau de bord — MADATRANS" },
      { property: "og:description", content: "Tableau de bord personnalisable : CA, coûts, marge et trésorerie de MADATRANS." },
    ],
  }),
  component: Dashboard,
});

const newWidget = (): WidgetConfig => ({
  id: `w-${Date.now().toString(36)}`, title: "Nouveau widget", type: "bar", measures: ["ca_ht"], dimension: "camion", series: null,
  filters: {}, sort: "desc", topN: null, unit: "eur", layout: { x: 0, y: 999, w: 6, h: 6 },
});

function Dashboard() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/" });
  const ds = useDataSource();
  const qc = useQueryClient();
  const refs = useReferences();
  const setSearch = (patch: Partial<FilterSearch>) => navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const period = resolvePeriod(search, refs.months.at(-1));
  const compare = resolveCompare(search, period);
  const filters = useMemo(() => cleanFilters(resolveFilters(search)), [search]);
  const exportRef = useRef<() => void>(() => {});
  const cmpMode = (search.cmp === "lastYear" || search.cmp === "none" ? search.cmp : "previous") as "previous" | "lastYear" | "none";
  const ctx = useMemo(() => ({
    period, compare, filters,
    actions: { onExport: () => exportRef.current(), compareMode: cmpMode, onCompare: (m: "previous" | "lastYear" | "none") => setSearch({ cmp: m }) },
  }), [period.start, period.end, period.type, compare?.start, compare?.end, filters, cmpMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const views = useQuery({ queryKey: dataKeys.views, queryFn: () => ds.listViews() });
  const defaultId = useQuery({ queryKey: dataKeys.defaultView, queryFn: () => ds.getDefaultViewId() });
  const current = views.data?.find((v) => v.id === (search.v || defaultId.data)) ?? views.data?.[0];

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WidgetConfig[]>([]);
  const [editorFor, setEditorFor] = useState<WidgetConfig | null>(null);
  const widgets = editing ? draft : current?.widgets ?? [];

  const save = useMutation({
    mutationFn: (v: SavedView) => ds.saveView(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: dataKeys.views }),
    onError: () => toast.error("Enregistrement impossible"),
  });
  const refreshAll = () => { qc.invalidateQueries({ queryKey: dataKeys.views }); qc.invalidateQueries({ queryKey: dataKeys.defaultView }); };

  const startEdit = () => { setDraft(current?.widgets ?? []); setEditing(true); };
  const finishEdit = async () => {
    if (!current) return;
    await save.mutateAsync({ ...current, widgets: draft });
    setEditing(false);
    toast.success(`Vue « ${current.name} » enregistrée`);
  };
  const upsertWidget = (w: WidgetConfig) => {
    if (editing) setDraft((d) => (d.some((x) => x.id === w.id) ? d.map((x) => (x.id === w.id ? w : x)) : [...d, w]));
    else if (current) save.mutate({ ...current, widgets: current.widgets.some((x) => x.id === w.id) ? current.widgets.map((x) => (x.id === w.id ? w : x)) : [...current.widgets, w] });
    setEditorFor(null);
  };

  const exportLines = async () => {
    try {
      const lines = await ds.getDetails({ measure: "marge_ht", period, filters });
      downloadCsv(`lignes-${period.start}_${period.end}`, ["Date", "Libellé", "Source", "Document", "Camion", "Montant HT (signé)"], lines.map((l) => [l.date, l.label, l.source, l.documentRef, l.truck, l.amount]));
      toast.success(`${lines.length} lignes exportées`);
    } catch { toast.error("Export impossible"); }
  };

  exportRef.current = exportLines;

  if (views.isError) return <p className="text-sm text-negative">Impossible de charger les vues du tableau de bord.</p>;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-2xl flex-[1_1_420px]">
          <DashboardSummary period={period} compare={compare} filters={filters} />
        </div>
        <div className="no-print flex flex-wrap gap-2">
          {current && views.data && (
            <ViewsMenu
              views={views.data} current={current} defaultId={defaultId.data ?? "vue-gerant"}
              onSelect={(v) => { setEditing(false); setSearch({ v }); }}
              onCreate={async (name) => { const v = await ds.saveView({ id: `vue-${Date.now().toString(36)}`, name, builtIn: false, widgets: [], updatedAt: "" }); refreshAll(); setSearch({ v: v.id }); }}
              onRename={async (name) => { await ds.saveView({ ...current, name }); refreshAll(); }}
              onDuplicate={async () => { const v = await ds.saveView({ ...current, id: `vue-${Date.now().toString(36)}`, name: `${current.name} (copie)`, builtIn: false }); refreshAll(); setSearch({ v: v.id }); toast.success("Vue dupliquée"); }}
              onDelete={async () => { await ds.deleteView(current.id); refreshAll(); setSearch({ v: "" }); toast.success("Vue supprimée"); }}
              onSetDefault={async () => { await ds.setDefaultViewId(current.id); refreshAll(); toast.success(`« ${current.name} » est la vue par défaut`); }}
            />
          )}
          {editing ? (
            <>
              <Button size="sm" variant="outline" className="h-9 rounded-full" onClick={() => setEditorFor(newWidget())}><Plus /> Ajouter un widget</Button>
              <Button size="sm" variant="ghost" className="h-9 rounded-full" onClick={() => setEditing(false)}><X /> Annuler</Button>
              <Button size="sm" className="h-9 rounded-full" onClick={finishEdit} disabled={save.isPending}><Check /> Terminer</Button>
            </>
          ) : (
            <Button size="sm" variant="outline" className="h-9 rounded-full" onClick={startEdit} disabled={!current}><LayoutDashboard /> Personnaliser</Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button size="sm" className="h-9 rounded-full"><Download /> Exporter</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportLines}><FileSpreadsheet /> Lignes détaillées (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => window.print()}><Printer /> Imprimer / PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <FilterBar search={search} onChange={setSearch} />

      {editing && <p className="no-print rounded-lg bg-amber-soft px-3 py-2 text-xs text-amber-foreground">Mode personnalisation : glissez la bande du haut pour déplacer, tirez le coin en bas à droite pour redimensionner, menu « … » pour configurer ou retirer.</p>}

      {views.isPending || !current ? (
        <LayoutSkeleton widgets={(DEFAULT_VIEWS.find((v) => v.id === (search.v || "vue-gerant")) ?? DEFAULT_VIEWS[0]!).widgets} />
      ) : (
        <DashboardGrid
          widgets={widgets} ctx={ctx} editing={editing}
          onLayout={(l) => setDraft((d) => d.map((w) => { const x = l.find((i) => i.i === w.id); return x ? { ...w, layout: { x: x.x, y: x.y, w: x.w, h: x.h } } : w; }))}
          onEdit={(w) => setEditorFor(w)}
          onRemove={(id) => setDraft((d) => d.filter((w) => w.id !== id))}
          onDuplicate={(w) => setDraft((d) => [...d, { ...w, id: `w-${Date.now().toString(36)}`, title: `${w.title} (copie)`, layout: { ...w.layout, y: 999 } }])}
        />
      )}

      <WidgetEditor open={!!editorFor} initial={editorFor} onClose={() => setEditorFor(null)} onSave={upsertWidget} />
    </div>
    <div className="min-w-0 xl:sticky xl:top-6 xl:self-start"><RightRail period={period} filters={filters} /></div>
    </div>
  );
}
