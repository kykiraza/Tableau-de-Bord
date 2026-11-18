import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ArrowDown, ArrowUp } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Line, ReferenceLine,
  ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/data/DataProvider";
import { useDrill } from "@/components/data/DrillDown";
import type { AnalyticsRow, Dimension, Measure, WidgetConfig } from "@/data/types";
import { COST_CATEGORIES } from "@/data/types";
import { CATEGORY_MEASURE, DIMENSION_LABEL, MEASURE_META } from "@/data/catalog";
import { formatEuroAxis, formatEuroShort, formatPercent, formatValue } from "@/utils/format";
import { periodLabel, shiftMonth } from "@/utils/period";
import { cn } from "@/lib/utils";
import { GaugeWidget, HeroWidget, MonthBarsWidget, PastelWidget, SectionWidget, SpotlightWidget, WatchlistWidget } from "./MadaWidgets";
import { EmptyState, PlateTick, TipPill, TooltipBox, axisProps, colorFor, effectivePeriod, isTime, widgetFilters, type WidgetContext } from "./shared";

interface Props { config: WidgetConfig; ctx: WidgetContext; compact?: boolean }

/** Affiche n'importe quel widget à partir de sa configuration. */
export function WidgetRenderer({ config, ctx }: Props) {
  switch (config.type) {
    case "kpi": return <KpiWidget config={config} ctx={ctx} />;
    case "waterfall": return <WaterfallWidget config={config} ctx={ctx} />;
    case "heatmap": return <HeatmapWidget config={config} ctx={ctx} />;
    case "hero": return <HeroWidget config={config} ctx={ctx} />;
    case "pastel": return <PastelWidget config={config} ctx={ctx} />;
    case "gauge": return <GaugeWidget config={config} ctx={ctx} />;
    case "monthbars": return <MonthBarsWidget config={config} ctx={ctx} />;
    case "spotlight": return <SpotlightWidget config={config} ctx={ctx} />;
    case "watchlist": return <WatchlistWidget config={config} ctx={ctx} />;
    case "section": return <SectionWidget config={config} ctx={ctx} />;
    default: return <SeriesWidget config={config} ctx={ctx} />;
  }
}

const fmtOf = (m: Measure, unit: WidgetConfig["unit"]) => (unit === "pct" && MEASURE_META[m].format === "euro" ? "percent" : MEASURE_META[m].format);
const signedMeasures = new Set<Measure>(["marge_ht"]);

function Loading() { return <Skeleton className="h-full min-h-[120px] w-full rounded-lg" />; }
function Failed() { return <EmptyState>Impossible de charger ces données.</EmptyState>; }

/* ------------------------------ KPI ------------------------------ */
function KpiWidget({ config, ctx }: Props) {
  const m = config.measures[0] ?? "ca_ht";
  const meta = MEASURE_META[m];
  const filters = widgetFilters(ctx, config);
  const cur = useAnalytics({ measures: [m], dimensions: [], period: ctx.period, filters });
  const cmp = useAnalytics(ctx.compare ? { measures: [m], dimensions: [], period: ctx.compare, filters } : null);
  const spark = useAnalytics({ measures: [m], dimensions: ["mois"], period: { type: "plage", start: shiftMonth(ctx.period.end, -11), end: ctx.period.end }, filters });
  const drill = useDrill();
  if (cur.isPending) return <Loading />;
  if (cur.isError) return <Failed />;
  const value = cur.data.totals[m];
  const ref = cmp.data?.totals[m];
  const delta = ref === undefined ? null : meta.format === "percent" ? value - ref : ref === 0 ? null : ((value - ref) / Math.abs(ref)) * 100;
  const good = delta === null ? true : delta >= 0 === meta.higherIsBetter;
  const data = (spark.data?.rows ?? []).map((r) => ({ k: r.labels.mois, v: r.values[m] }));
  const hero = config.layout.w >= 3 && m === "marge_ht";
  const color = hero ? "var(--amber)" : good ? "var(--positive)" : "var(--negative)";
  return (
    <button
      type="button"
      onClick={() => drill({ title: `${meta.label} — ${periodLabel(ctx.period)}`, query: { measure: m, period: ctx.period, filters } })}
      className={cn("group flex h-full w-full flex-col rounded-[11px] p-4 text-left", hero && "surface-hero")}
    >
      <span className={cn("text-xs font-medium", hero ? "text-hero-foreground/75" : "text-muted-foreground")} title={meta.description}>{config.title}</span>
      <span className={cn("mt-1.5 font-bold tracking-tight tabular", hero ? "text-3xl" : "text-2xl")}>
        {formatValue(meta.format, value, { signed: signedMeasures.has(m) })}
      </span>
      <span className="mt-1.5 flex items-center gap-2">
        {delta !== null ? (
          <span className={cn("inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular",
            hero ? (good ? "bg-positive text-hero-foreground" : "bg-negative text-hero-foreground") : good ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative")}>
            {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {delta >= 0 ? "+" : "−"}{Math.abs(delta).toFixed(1).replace(".", ",")}{meta.format === "percent" ? " pt" : " %"}
          </span>
        ) : ctx.compare ? <span className="text-[11px] text-muted-foreground">pas de référence</span> : null}
        {ctx.compare && <span className={cn("truncate text-[11px]", hero ? "text-hero-foreground/65" : "text-muted-foreground")}>vs {periodLabel(ctx.compare)}</span>}
      </span>
      <span className="mt-auto block h-10 min-h-0 w-full flex-1 pt-2">
        {data.length > 1 && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, bottom: 0, left: 0, right: 0 }}>
              <defs>
                <linearGradient id={`sp-${config.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.75} fill={`url(#sp-${config.id})`} animationDuration={700} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </span>
    </button>
  );
}

/* ---------------------------- Cascade ---------------------------- */
function WaterfallWidget({ config, ctx }: Props) {
  const filters = widgetFilters(ctx, config);
  const measures: Measure[] = ["ca_ht", ...COST_CATEGORIES.map((c) => CATEGORY_MEASURE[c]), "marge_ht"];
  const q = useAnalytics({ measures, dimensions: [], period: ctx.period, filters });
  const drill = useDrill();
  if (q.isPending) return <Loading />;
  if (q.isError) return <Failed />;
  const t = q.data.totals;
  if (!t.ca_ht) return <EmptyState>Aucun chiffre d'affaires sur la période.</EmptyState>;
  let running = t.ca_ht;
  const rows = measures.map((m) => {
    const label = m === "ca_ht" ? "CA" : m === "marge_ht" ? "Marge" : MEASURE_META[m].label;
    if (m === "ca_ht" || m === "marge_ht") return { m, label, base: Math.min(0, t[m]), value: Math.abs(t[m]), raw: t[m], level: t[m] };
    running -= t[m];
    return { m, label, base: running, value: t[m], raw: -t[m], level: running };
  });
  const color = (m: Measure, raw: number) =>
    m === "ca_ht" ? "var(--foreground)" : m === "marge_ht" ? (raw >= 0 ? "var(--positive)" : "var(--negative)") : `var(--grey-${Math.min(7, Math.max(1, measures.indexOf(m)))})`;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ left: -4, right: 4, top: 20 }} barCategoryGap="18%">
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" {...axisProps} interval={0} angle={-35} textAnchor="end" height={52} />
        <YAxis {...axisProps} tickFormatter={formatEuroAxis} width={50} />
        {rows.slice(0, -1).map((r, i) => (
          <ReferenceLine key={r.m} segment={[{ x: r.label, y: r.level }, { x: rows[i + 1]!.label, y: r.level }]} stroke="var(--muted-foreground)" strokeDasharray="3 3" strokeOpacity={0.6} />
        ))}
        <Tooltip cursor={{ fill: "var(--muted)" }} content={({ active, payload }) => {
          if (!active || !payload?.[0]) return null;
          const r = payload[0].payload as (typeof rows)[number];
          return <TooltipBox title={r.label} rows={[{ label: "Montant", value: formatValue("euro", r.raw, { signed: true }), strong: true, color: color(r.m, r.raw) }, { label: "Cliquez pour le détail", value: "" }]} />;
        }} />
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="value" stackId="w" radius={[4, 4, 2, 2]} className="cursor-pointer" onClick={(d) => {
          const r = d as unknown as (typeof rows)[number];
          drill({ title: `${r.label} — ${periodLabel(ctx.period)}`, query: { measure: r.m, period: ctx.period, filters } });
        }}>
          {rows.map((r) => <Cell key={r.m} fill={color(r.m, r.raw)} />)}
          <LabelList dataKey="value" content={(p) => (
            <text x={Number(p.x) + Number(p.width) / 2} y={Number(p.y) - 5} textAnchor="middle" fontSize={10} fontWeight={600} fill="var(--foreground)">
              {(Number(p.value) / 1000).toFixed(1).replace(".", ",")}k
            </text>
          )} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------- Carte de chaleur ------------------------- */
function HeatmapWidget({ config, ctx }: Props) {
  const m = config.measures[0] ?? "marge_ht";
  const rowDim = config.dimension ?? "camion";
  const colDim: Dimension = config.series ?? "mois";
  const period = effectivePeriod(config, ctx.period);
  const filters = widgetFilters(ctx, config);
  const q = useAnalytics({ measures: [m], dimensions: [rowDim, colDim], period, filters });
  const drill = useDrill();
  if (q.isPending) return <Loading />;
  if (q.isError) return <Failed />;
  if (!q.data.rows.length) return <EmptyState>Aucune donnée.</EmptyState>;
  const cols = [...new Map(q.data.rows.map((r) => [r.keys[colDim]!, r.labels[colDim]!])).entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const rowsMap = new Map<string, { label: string; cells: Map<string, number>; total: number }>();
  for (const r of q.data.rows) {
    const k = r.keys[rowDim]!;
    if (!rowsMap.has(k)) rowsMap.set(k, { label: r.labels[rowDim]!, cells: new Map(), total: 0 });
    const e = rowsMap.get(k)!;
    e.cells.set(r.keys[colDim]!, r.values[m]);
    e.total += r.values[m];
  }
  const rows = [...rowsMap.entries()].sort((a, b) => b[1].total - a[1].total);
  const max = Math.max(...q.data.rows.map((r) => Math.abs(r.values[m])), 1);
  const diverging = MEASURE_META[m].higherIsBetter;
  const bg = (v: number) => {
    const pct = Math.round(Math.min(1, Math.abs(v) / max) * 40 + 4);
    const c = !diverging ? "var(--foreground)" : v >= 0 ? "var(--positive)" : "var(--negative)";
    return `color-mix(in oklab, ${c} ${pct}%, var(--card))`;
  };
  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-separate border-spacing-[3px] text-[11px]">
        <thead>
          <tr>
            <th className="sticky left-0 bg-card" />
            {cols.map(([k, l]) => <th key={k} className="px-1 py-1 font-medium text-muted-foreground">{l}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, r]) => (
            <tr key={k}>
              <th className="sticky left-0 bg-card pr-2 text-left font-medium">
                {rowDim === "camion" && k !== "__none__" ? <span className="plate"><span className="px-1.5 py-[3px]">{r.label}</span></span> : r.label}
              </th>
              {cols.map(([ck, cl]) => {
                const v = r.cells.get(ck);
                return (
                  <td key={ck} className="p-0">
                    {v === undefined ? <div className="h-7 rounded bg-muted/40" /> : (
                      <button type="button" title={`${r.label} · ${cl} : ${formatValue(MEASURE_META[m].format, v)}`}
                        onClick={() => drill({ title: `${MEASURE_META[m].label} — ${r.label}, ${cl}`, query: { measure: m, period, filters, keys: { [rowDim]: k, [colDim]: ck } } })}
                        className="flex h-7 w-full min-w-12 items-center justify-center rounded font-semibold tabular text-foreground transition-transform hover:scale-105" style={{ background: bg(v) }}>
                        {formatEuroAxis(v).replace(" €", "")}
                      </button>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------- Barres, lignes, aire, donut, tableau, nuage -------------------- */
function SeriesWidget({ config, ctx }: Props) {
  const dim = config.dimension;
  const period = effectivePeriod(config, ctx.period);
  const filters = widgetFilters(ctx, config);
  const measures = config.measures.length ? config.measures : (["ca_ht"] as Measure[]);
  const q = useAnalytics({ measures, dimensions: dim ? [dim] : [], period, filters });
  const drill = useDrill();

  const rows = useMemo(() => {
    if (!q.data) return [];
    let r: AnalyticsRow[] = dim ? [...q.data.rows] : [{ keys: {}, labels: {}, values: q.data.totals }];
    const first = measures[0]!;
    if (!isTime(dim) && config.sort !== "none") r.sort((a, b) => (config.sort === "desc" ? b.values[first] - a.values[first] : a.values[first] - b.values[first]));
    if (config.topN && config.topN > 0) r = r.slice(0, config.topN);
    return r;
  }, [q.data, dim, config.sort, config.topN, measures]);

  if (q.isPending) return <Loading />;
  if (q.isError) return <Failed />;
  if (!rows.length || rows.every((r) => measures.every((m) => !r.values[m]))) return <EmptyState>Aucune donnée pour ces filtres.</EmptyState>;

  const totals = q.data.totals;
  const value = (r: AnalyticsRow, m: Measure) => (config.unit === "pct" && MEASURE_META[m].format === "euro" ? (totals[m] ? (r.values[m] / totals[m]) * 100 : 0) : r.values[m]);
  const data = rows.map((r) => ({ key: dim ? r.keys[dim]! : "total", label: dim ? r.labels[dim]! : "Total", ...Object.fromEntries(measures.map((m) => [m, value(r, m)])) }));
  type Datum = (typeof data)[number] & Record<string, number | string>;
  // Un taux ne s'additionne pas : le détail d'un taux de marge montre les lignes de la marge.
  const open = (m0: Measure, key: string, label: string) => { const m: Measure = m0 === "taux_marge" ? "marge_ht" : m0; return drill({ title: `${MEASURE_META[m].label} — ${label}`, subtitle: `${periodLabel(period)}${dim ? ` · ${DIMENSION_LABEL[dim]}` : ""}`, query: { measure: m, period, filters, keys: dim && key !== "total" ? { [dim]: key } : undefined } }); };
  const fmt = (m: Measure, v: number, compact = false) => formatValue(fmtOf(m, config.unit), v, { compact, signed: signedMeasures.has(m) && config.unit === "eur" });
  const tick = (v: number) => (config.unit === "pct" ? formatPercent(v) : MEASURE_META[measures[0]!].format === "euro" ? formatEuroAxis(v) : String(Math.round(v)));
  const tooltip = (
    <Tooltip cursor={{ fill: "var(--muted)", radius: 6 } as never} content={({ active, payload }) => {
      if (!active || !payload?.[0]) return null;
      const d = payload[0].payload as Datum;
      return <TooltipBox title={d.label} rows={measures.map((m, i) => ({ label: MEASURE_META[m].label, value: fmt(m, Number(d[m])), color: colorFor(m, i) }))} />;
    }} />
  );

  if (config.type === "table") return <DataTable config={config} rows={rows} measures={measures} dim={dim} fmt={fmt} value={value} onCell={open} totals={totals} />;

  if (config.type === "donut") {
    const m = measures[0]!;
    const slices = data.filter((d) => Number((d as Datum)[m]) > 0).sort((a, b) => Number((b as Datum)[m]) - Number((a as Datum)[m]));
    const sum = slices.reduce((a, d) => a + Math.max(0, Number((d as Datum)[m])), 0);
    const grey = (i: number) => `var(--grey-${Math.min(i, 7) + 1})`;
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-baseline justify-between"><span className="text-xs text-muted-foreground">Total</span><span className="text-sm font-semibold tabular">{formatValue(MEASURE_META[m].format, totals[m])}</span></div>
        <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
          {slices.map((d, i) => <button key={d.key} type="button" title={`${d.label} — ${formatPercent((Number((d as Datum)[m]) / (sum || 1)) * 100)}`} onClick={() => open(m, d.key, d.label)} className="h-full hover:opacity-80" style={{ width: `${(Number((d as Datum)[m]) / (sum || 1)) * 100}%`, background: grey(i) }} />)}
        </div>
        <ul className="min-h-0 flex-1 divide-y overflow-auto text-xs">
          {slices.map((d, i) => (
            <li key={d.key}>
              <button type="button" onClick={() => open(m, d.key, d.label)} className="flex w-full items-center gap-2 px-1 py-1.5 hover:bg-muted">
                <span className="size-2 shrink-0 rounded-full" style={{ background: grey(i) }} />
                <span className="min-w-0 flex-1 truncate text-left">{d.label}</span>
                <span className="tabular font-medium">{formatValue(MEASURE_META[m].format, (Number((d as Datum)[m]) / (sum || 1)) * totals[m])}</span>
                <span className="w-12 text-right tabular text-muted-foreground">{formatPercent((Number((d as Datum)[m]) / (sum || 1)) * 100)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (config.type === "scatter") {
    const [my, mx] = [measures[0]!, measures[1] ?? measures[0]!];
    const pts = data.map((d) => ({ ...d, x: Number((d as Datum)[mx]), y: Number((d as Datum)[my]) }));
    const max = Math.max(...pts.map((p) => Math.max(p.x, p.y)), 1);
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ left: -4, right: 12, top: 12, bottom: 4 }}>
          <CartesianGrid stroke="var(--border)" />
          <XAxis type="number" dataKey="x" name={MEASURE_META[mx].label} {...axisProps} tickFormatter={formatEuroAxis} domain={[0, Math.ceil(max * 1.05)]} label={{ value: MEASURE_META[mx].label, position: "insideBottomRight", offset: -2, fontSize: 11, fill: "var(--muted-foreground)" }} />
          <YAxis type="number" dataKey="y" name={MEASURE_META[my].label} {...axisProps} tickFormatter={formatEuroAxis} width={50} domain={[0, Math.ceil(max * 1.05)]} />
          <ZAxis range={[90, 90]} />
          <ReferenceLine segment={[{ x: 0, y: 0 }, { x: max, y: max }]} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const p = payload[0].payload as (typeof pts)[number];
            return <TooltipBox title={p.label} rows={[{ label: MEASURE_META[my].label, value: fmt(my, p.y) }, { label: MEASURE_META[mx].label, value: fmt(mx, p.x) }, { label: "Écart", value: formatValue("euro", p.y - p.x, { signed: true }), strong: true }]} />;
          }} />
          <Scatter data={pts} className="cursor-pointer" onClick={(p) => { const x = p as unknown as (typeof pts)[number]; open(my, x.key, x.label); }}>
            {pts.map((p) => <Cell key={p.key} fill={p.y >= p.x ? "var(--positive)" : "var(--negative)"} />)}
            <LabelList dataKey="label" content={(lp) => { const pt = pts[Number(lp.index)]; return pt && pt.y < pt.x ? <text x={Number(lp.x) + 8} y={Number(lp.y) + 4} fontSize={10} fontWeight={600} fill="var(--negative)">{pt.label}</text> : null; }} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  // Barres / empilées / ligne / aire
  const horizontal = (config.type === "bar" || config.type === "stacked") && !isTime(dim) && data.length > 5;
  const single = measures.length === 1;
  const signedSingle = single && signedMeasures.has(measures[0]!);
  const catAxis = horizontal ? (
    <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} width={dim === "camion" ? 96 : 110} tick={dim === "camion" ? <PlateTick /> : { fontSize: 11, fill: "var(--foreground)" }} interval={0} />
  ) : <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" tickMargin={8} />;
  const zeroDomain: [(v: number) => number, (v: number) => number] = [(v) => Math.min(0, v), (v) => Math.max(0, v)];
  const nice = (() => {
    if (!horizontal) return null;
    const vals = data.flatMap((d) => measures.map((m) => Number((d as Datum)[m]) || 0));
    const lo = Math.min(0, ...vals), hi = Math.max(0, ...vals);
    const span = (hi - lo) * 1.45 || 1;
    const raw = span / 6, mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((x) => x >= raw) ?? raw;
    const pad = (hi - lo) * 0.22;
    const a = lo < 0 ? Math.floor((lo - pad) / step) * step : 0, b = Math.ceil((hi + pad) / step) * step;
    const ticks: number[] = []; for (let v = a; v <= b + 1e-6; v += step) ticks.push(Math.round(v));
    return { domain: [a, b] as [number, number], ticks };
  })();
  const valAxis = horizontal ? <XAxis type="number" {...axisProps} tickFormatter={(v: number) => config.unit !== "pct" && MEASURE_META[measures[0]!].format === "euro" ? formatEuroShort(v) : tick(v)} domain={nice!.domain} ticks={nice!.ticks} /> : <YAxis {...axisProps} tickFormatter={tick} width={52} domain={zeroDomain} />;
  const marginLine = measures.includes("marge_ht") && measures.length > 1 && !horizontal && config.type === "bar";

  if (config.type === "line" || config.type === "area") {
    const Chart = config.type === "area" ? AreaChart : ComposedChart;
    const clickDot = (m: Measure) => ({ onClick: (_: unknown, e: unknown) => { const pl = (e as { payload: Datum }).payload; open(m, String(pl.key), String(pl.label)); } });
    return (
      <div className="flex h-full flex-col">
        {measures.length > 1 && (
          <div className="-mt-1 mb-2 flex flex-wrap justify-end gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {measures.map((m, i) => <span key={m} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: colorFor(m, i) }} />{MEASURE_META[m].label}</span>)}
          </div>
        )}
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <Chart data={data} margin={{ left: -4, right: 8, top: 34 }}>
              <defs>{measures.map((m, i) => <linearGradient key={m} id={`g-${config.id}-${m}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={colorFor(m, i)} stopOpacity={0.22} /><stop offset="100%" stopColor={colorFor(m, i)} stopOpacity={0} /></linearGradient>)}</defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="4 4" />
              {catAxis}
              <YAxis {...axisProps} tickFormatter={tick} width={60} domain={config.type === "line" && !signedSingle ? ["auto", "auto"] : zeroDomain} />
              <Tooltip cursor={{ stroke: "var(--foreground)", strokeOpacity: 0.35, strokeWidth: 1 }} position={{ y: 0 }} content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload as Datum;
                return measures.length === 1
                  ? <TipPill title={String(d.label)} value={fmt(measures[0]!, Number(d[measures[0]!]))} />
                  : <TooltipBox title={d.label} rows={measures.map((m, i) => ({ label: MEASURE_META[m].label, value: fmt(m, Number(d[m])), color: colorFor(m, i) }))} />;
              }} />
              {measures.map((m, i) => config.type === "area"
                ? <Area key={m} dataKey={m} type="monotone" stroke={colorFor(m, i)} strokeWidth={2.5} fill={`url(#g-${config.id}-${m})`} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2, ...clickDot(m) } as never} />
                : <Line key={m} dataKey={m} type="monotone" stroke={colorFor(m, i)} strokeWidth={i === 0 ? 3 : 2.5} dot={false} activeDot={{ r: 6, stroke: "var(--card)", strokeWidth: 3, ...clickDot(m) } as never} />)}
            </Chart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ left: horizontal ? 0 : -4, right: horizontal ? 56 : 8, top: 14 }} barCategoryGap="24%" barGap={2}>
            <CartesianGrid vertical={horizontal} horizontal={!horizontal} stroke="var(--border)" />
            {catAxis}{valAxis}
            {marginLine && <YAxis yAxisId="r" orientation="right" {...axisProps} tickFormatter={formatEuroAxis} width={48} domain={zeroDomain} tick={{ fontSize: 11, fill: "var(--positive)" }} />}
            {signedSingle && <ReferenceLine {...(horizontal ? { x: 0 } : { y: 0 })} stroke="var(--muted-foreground)" strokeOpacity={0.6} strokeWidth={1} />}
            {tooltip}
            {measures.map((m, i) => marginLine && m === "marge_ht" ? (
              <Line key={m} yAxisId="r" dataKey={m} stroke="var(--positive)" strokeWidth={2.5} type="monotone" dot={{ r: 3, fill: "var(--card)", strokeWidth: 2 }} />
            ) : (
              <Bar key={m} dataKey={m} {...(config.type === "stacked" ? { stackId: "s" } : {})} fill={colorFor(m, i)} maxBarSize={horizontal ? (signedSingle ? 12 : 16) : 24}
                radius={config.type === "stacked" ? (i === measures.length - 1 ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : 0) : 4}
                className="cursor-pointer" onClick={(d) => { const x = d as unknown as Datum; open(m, String(x.key), String(x.label)); }}>
                {signedSingle && data.map((d) => <Cell key={d.key} fill={Number((d as Datum)[m]) >= 0 ? "var(--positive-bar)" : "var(--negative-bar)"} />)}
                {single && horizontal && (
                  <LabelList dataKey={m} content={(p) => {
                    const v = Number(p.value), x0 = Number(p.x), w0 = Number(p.width), x = Math.min(x0, x0 + w0), w = Math.abs(w0), y = Number(p.y), h = Number(p.height);
                    return <text x={v >= 0 ? x + w + 6 : x - 6} y={y + h / 2 + 4} textAnchor={v >= 0 ? "start" : "end"} fontSize={11} fontWeight={600} fill={signedSingle && v < 0 ? "var(--negative)" : "var(--foreground)"}>{fmt(m, v, true)}</text>;
                  }} />
                )}
              </Bar>
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {measures.length > 1 && (
        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {measures.map((m, i) => <span key={m} className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px]" style={{ background: colorFor(m, i) }} />{MEASURE_META[m].label}</span>)}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ Tableau ------------------------------ */
interface TableProps {
  config: WidgetConfig; rows: AnalyticsRow[]; measures: Measure[]; dim: Dimension | null; totals: Record<Measure, number>;
  fmt: (m: Measure, v: number) => string; value: (r: AnalyticsRow, m: Measure) => number; onCell: (m: Measure, key: string, label: string) => void;
}
function DataTable({ rows, measures, dim, fmt, value, onCell, totals, config }: TableProps) {
  const [sort, setSort] = useState<{ m: Measure | "label"; dir: 1 | -1 } | null>(null);
  const sorted = useMemo(() => {
    if (!sort) return rows;
    return [...rows].sort((a, b) => sort.m === "label" ? (a.labels[dim!] ?? "").localeCompare(b.labels[dim!] ?? "") * sort.dir : (value(a, sort.m) - value(b, sort.m)) * sort.dir);
  }, [rows, sort, dim, value]);
  const toggle = (m: Measure | "label") => setSort((s) => ({ m, dir: s?.m === m && s.dir === -1 ? 1 : -1 }));
  const Arrow = ({ m }: { m: Measure | "label" }) => sort?.m === m ? (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : null;
  return (
    <div className="h-full overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-muted text-xs text-muted-foreground">
          <tr>
            {dim && <th className="sticky left-0 bg-muted px-3 py-2 text-left font-medium"><button type="button" className="inline-flex items-center gap-1" onClick={() => toggle("label")}>{DIMENSION_LABEL[dim]}<Arrow m="label" /></button></th>}
            {measures.map((m) => <th key={m} className="whitespace-nowrap px-3 py-2 text-right font-medium"><button type="button" className="inline-flex items-center gap-1" onClick={() => toggle(m)}>{MEASURE_META[m].label}<Arrow m={m} /></button></th>)}
          </tr>
        </thead>
        <tbody className="divide-y">
          {sorted.map((r) => {
            const key = dim ? r.keys[dim]! : "total";
            const label = dim ? r.labels[dim]! : "Total";
            return (
              <tr key={key} className="hover:bg-muted/40">
                {dim && <td className="sticky left-0 bg-card px-3 py-1.5 font-medium">{dim === "camion" && key !== "__none__" ? <span className="plate"><span className="px-1.5 py-[3px]">{label}</span></span> : label}</td>}
                {measures.map((m) => {
                  const v = value(r, m);
                  return (
                    <td key={m} className="p-0 text-right">
                      <button type="button" onClick={() => onCell(m, key, label)} className={cn("w-full px-3 py-1.5 text-right tabular hover:bg-accent", signedMeasures.has(m) && (v >= 0 ? "text-positive" : "text-negative"), m === "marge_ht" && "font-semibold")}>{fmt(m, v)}</button>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        {dim && config.unit === "eur" && (
          <tfoot className="sticky bottom-0 bg-muted font-bold">
            <tr>
              <td className="sticky left-0 bg-muted px-3 py-2">TOTAL</td>
              {measures.map((m) => <td key={m} className={cn("px-3 py-2 text-right tabular", signedMeasures.has(m) && (totals[m] >= 0 ? "text-positive" : "text-negative"))}>{fmt(m, totals[m])}</td>)}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
