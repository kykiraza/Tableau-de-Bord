import { useState, type CSSProperties, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronRight, Download, Euro, GitCompareArrows, Percent, TrendingUp, Truck as TruckIcon, type LucideIcon } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plate } from "@/components/brand/Plate";
import { Amount } from "@/components/brand/Amount";
import { useAnalytics, useReferences } from "@/data/DataProvider";
import { useDrill } from "@/components/data/DrillDown";
import type { Measure, WidgetConfig } from "@/data/types";
import { MEASURE_META } from "@/data/catalog";
import { formatEuroAxis, formatPercent, formatValue } from "@/utils/format";
import { monthShort, periodLabel, shiftMonth } from "@/utils/period";
import { cn } from "@/lib/utils";
import { EmptyState, TipPill, widgetFilters, type WidgetContext } from "./shared";

interface Props { config: WidgetConfig; ctx: WidgetContext }

const SIGNED = new Set<Measure>(["marge_ht"]);
const last12 = (end: string, n = 12) => ({ type: "plage" as const, start: shiftMonth(end, -(n - 1)), end });

function delta(value: number, ref: number | undefined, isPct: boolean): number | null {
  if (ref === undefined) return null;
  if (isPct) return value - ref;
  return ref === 0 ? null : ((value - ref) / Math.abs(ref)) * 100;
}

export function DeltaPill({ d, good, pts, className }: { d: number | null; good: boolean; pts?: boolean; className?: string }) {
  if (d === null) return null;
  return (
    <span className={cn("inline-flex items-center gap-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold tabular", good ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative", className)}>
      {d >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
      {d >= 0 ? "+" : "−"}{Math.abs(d).toFixed(1).replace(".", ",")}{pts ? " pt" : " %"}
    </span>
  );
}

function Spark({ id, data, color, height = 40 }: { id: string; data: { k: string; v: number }[]; color: string; height?: number }) {
  if (data.length < 2) return null;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
          <defs>
            <linearGradient id={`sk-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.12} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sk-${id})`} dot={false} animationDuration={700} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Valeur courante, comparaison et série 12 mois d'une mesure (ou d'un ratio m0/m1). */
function useMetric(config: WidgetConfig, ctx: WidgetContext) {
  const ms = (config.measures.length ? config.measures : ["ca_ht"]) as Measure[];
  const ratio = ms.length >= 2;
  const measures = ratio ? ms.slice(0, 2) : ms.slice(0, 1);
  const filters = widgetFilters(ctx, config);
  const cur = useAnalytics({ measures, dimensions: [], period: ctx.period, filters });
  const cmp = useAnalytics(ctx.compare ? { measures, dimensions: [], period: ctx.compare, filters } : null);
  const ser = useAnalytics({ measures, dimensions: ["mois"], period: last12(ctx.period.end), filters });
  const calc = (v: Record<Measure, number>) => (ratio ? (v[measures[1]!] ? v[measures[0]!] / v[measures[1]!] : 0) : v[measures[0]!]);
  const m = measures[0]!;
  const meta = MEASURE_META[m];
  const format = ratio ? "euro" : meta.format;
  const value = cur.data ? calc(cur.data.totals) : 0;
  const ref = cmp.data ? calc(cmp.data.totals) : undefined;
  const d = delta(value, ref, format === "percent");
  const good = d === null ? true : d >= 0 === meta.higherIsBetter;
  const series = (ser.data?.rows ?? []).map((r) => ({ k: r.labels.mois ?? "", v: calc(r.values) }));
  return { m, meta, format, value, d, good, series, filters, ratio, pending: cur.isPending, error: cur.isError };
}

/* ------------------------- Carte vedette sombre ------------------------- */
export function HeroWidget({ config, ctx }: Props) {
  const k = useMetric(config, ctx);
  const drill = useDrill();
  const a = ctx.actions;
  if (k.pending) return <Skeleton className="h-full w-full rounded-xl" />;
  const pill = "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors";
  return (
    <div className="surface-hero grid h-full grid-cols-1 gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:p-6">
      <div className="flex min-w-0 flex-col justify-between gap-3">
        <div className="text-sm text-hero-foreground/70">{config.title} · <span className="capitalize">{periodLabel(ctx.period)}</span></div>
        <button type="button" className="text-left" onClick={() => drill({ title: `${k.meta.label} — ${periodLabel(ctx.period)}`, query: { measure: k.m, period: ctx.period, filters: k.filters } })}>
          <Amount className="block text-4xl font-semibold tracking-tight sm:text-5xl" text={formatValue(k.format, k.value, { signed: SIGNED.has(k.m) })} />
        </button>
        <div className="no-print flex flex-wrap gap-2">
          {a?.onExport && <button type="button" onClick={a.onExport} className={cn(pill, "bg-hero-foreground text-hero")}><Download className="size-4" /> Exporter</button>}
          {a?.onCompare && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={cn(pill, "border border-hero-foreground/25 text-hero-foreground hover:bg-hero-foreground/10")}><GitCompareArrows className="size-4" /> Comparer</button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {([["previous", "Période précédente"], ["lastYear", "Même période l'an dernier"], ["none", "Sans comparaison"]] as const).map(([v, l]) => (
                  <DropdownMenuItem key={v} onClick={() => a.onCompare?.(v)} className={cn(a.compareMode === v && "font-semibold")}>{l}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <div className="flex min-w-0 flex-col items-start justify-between gap-2 sm:w-[240px] sm:items-end">
        <div className="flex items-center gap-2">
          <DeltaPill d={k.d} good={k.good} className="bg-hero-foreground/10 text-hero-foreground" />
          {ctx.compare && <span className="text-xs text-hero-foreground/60">vs {periodLabel(ctx.compare)}</span>}
        </div>
        <div className="w-full"><Spark id={config.id} data={k.series} color="var(--positive)" height={72} /></div>
      </div>
    </div>
  );
}

/* ----------------------------- Carte pastel ----------------------------- */
export function PastelWidget({ config, ctx }: Props) {
  const k = useMetric(config, ctx);
  const drill = useDrill();
  if (k.pending) return <Skeleton className="h-full w-full rounded-xl" />;
  if (k.error) return <EmptyState>Indisponible</EmptyState>;
  return (
    <button type="button" title={k.meta.description}
      onClick={() => drill({ title: `${k.meta.label} — ${periodLabel(ctx.period)}`, query: { measure: k.m, period: ctx.period, filters: k.filters } })}
      className="flex h-full w-full flex-col justify-between rounded-xl border bg-card p-5 text-left transition-colors hover:bg-muted/40" style={{ "--tone": `var(--tone-${config.tone ?? "green"})` } as CSSProperties}>
      <span className="flex items-start justify-between gap-3 pr-7">
        <span className="flex items-center gap-2 text-[13px] text-muted-foreground"><span className="size-2 rounded-full" style={{ background: "var(--tone)" }} />{config.title}</span>
        <span className="w-24 shrink-0"><Spark id={config.id} data={k.series} color="var(--tone)" height={34} /></span>
      </span>
      <span className="flex flex-wrap items-end justify-between gap-2">
        <Amount className="text-[26px] font-semibold leading-none tracking-tight" text={formatValue(k.format, k.value, { signed: SIGNED.has(k.m) })} />
        <DeltaPill d={k.d} good={k.good} pts={k.format === "percent"} />
      </span>
    </button>
  );
}

/* ------------------------- Jauge en bâtonnets ------------------------- */
const GAUGE_ICON: Partial<Record<Measure, LucideIcon>> = { jours_roules: CalendarDays, taux_marge: Percent, couts_ht: Euro, ca_ht: TrendingUp };
export function GaugeWidget({ config, ctx }: Props) {
  const k = useMetric(config, ctx);
  if (k.pending) return <Skeleton className="h-full w-full rounded-xl" />;
  const Icon = GAUGE_ICON[k.m] ?? TrendingUp;
  const max = Math.max(...k.series.map((s) => Math.abs(s.v)), Math.abs(k.value), 1);
  const level = Math.max(0, Math.min(1, k.value / max));
  const N = 40;
  const lit = Math.round(level * N);
  return (
    <div className="flex h-full flex-col justify-between p-5" style={{ "--tone": `var(--tone-${config.tone ?? "blue"})` } as CSSProperties}>
      <div className="flex items-center gap-2 pr-8">
        <span className="flex size-8 items-center justify-center rounded-full bg-muted"><Icon className="size-4 text-muted-foreground" /></span>
        <span className="text-[13px] text-muted-foreground" title={k.ratio ? "Coûts HT ÷ jours roulés" : k.meta.description}>{config.title}</span>
      </div>
      <div className="flex items-center gap-2">
        <Amount className="text-[26px] font-semibold leading-none tracking-tight" text={formatValue(k.format, k.value, { compact: k.ratio })} />
        <DeltaPill d={k.d} good={k.good} pts={k.format === "percent"} />
      </div>
      <div>
        <div className="flex h-9 items-end gap-[3px]" aria-label={`Niveau ${Math.round(level * 100)} % du maximum sur 12 mois`}>
          {Array.from({ length: N }, (_, i) => (
            <span key={i} className="animate-rise flex-1 rounded-full" style={{ height: `${55 + ((i * 37) % 45)}%`, background: i < lit ? "var(--foreground)" : "var(--muted)", animationDelay: `${i * 12}ms` }} />
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{ctx.compare ? `vs ${periodLabel(ctx.compare)}` : "Niveau par rapport au maximum des 12 derniers mois"}</p>
      </div>
    </div>
  );
}

/* --------------------- Barres par mois (mois choisi hachuré) --------------------- */
interface BarShape { x?: number; y?: number; width?: number; height?: number; payload?: { key: string } }
export function MonthBarsWidget({ config, ctx }: Props) {
  const [n, setN] = useState<6 | 12>(12);
  const m = (config.measures[0] ?? "marge_ht") as Measure;
  const filters = widgetFilters(ctx, config);
  const period = last12(ctx.period.end, n);
  const q = useAnalytics({ measures: [m], dimensions: ["mois"], period, filters });
  const byTruck = useAnalytics({ measures: [m], dimensions: ["camion"], period: ctx.period, filters });
  const drill = useDrill();
  if (q.isPending) return <Skeleton className="h-full w-full rounded-lg" />;
  if (q.isError) return <EmptyState>Impossible de charger ces données.</EmptyState>;
  const data = q.data.rows.map((r) => ({ key: r.keys.mois!, label: monthShort(r.keys.mois!).split(" ")[0]!, full: monthShort(r.keys.mois!), v: r.values[m] }));
  const trucks = (byTruck.data?.rows ?? []).filter((r) => r.keys.camion !== "__none__");
  const winners = trucks.filter((r) => r.values[m] >= 0).length;
  const share = trucks.length ? Math.round((winners / trucks.length) * 100) : 0;
  const sel = ctx.period.end;
  const hid = `hatch-${config.id}`;
  const shape = (p: BarShape) => {
    const x = p.x ?? 0, w = p.width ?? 0, h0 = p.height ?? 0;
    const y = h0 < 0 ? (p.y ?? 0) + h0 : p.y ?? 0;
    const h = Math.max(Math.abs(h0), 2);
    const r = Math.min(10, w / 2, h / 2);
    const selected = p.payload?.key === sel;
    if (!selected) return <rect x={x} y={y} width={w} height={h} rx={r} fill="var(--muted)" className="cursor-pointer transition-opacity hover:opacity-70" />;
    const cid = `${hid}-clip`;
    return (
      <g className="cursor-pointer">
        <clipPath id={cid}><rect x={x} y={y} width={w} height={h} rx={r} /></clipPath>
        <rect x={x} y={y} width={w} height={h} rx={r} fill="var(--amber)" />
        <rect x={x} y={y} width={w} height={Math.max(14, h * 0.38)} fill={`url(#${hid})`} clipPath={`url(#${cid})`} />
      </g>
    );
  };
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-positive" />Rentables <b className="text-foreground tabular">{share} %</b></span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-negative" />Déficitaires <b className="text-foreground tabular">{trucks.length ? 100 - share : 0} %</b></span>
        </div>
        <div className="no-print flex rounded-full bg-muted p-0.5">
          {([6, 12] as const).map((v) => <button key={v} type="button" onClick={() => setN(v)} className={cn("rounded-full px-2.5 py-1 font-medium", n === v ? "bg-card" : "text-muted-foreground")}>{v} mois</button>)}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 22, left: 0, right: 0, bottom: 0 }} barCategoryGap="18%">
            <defs>
              <pattern id={hid} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="7" height="7" fill="var(--amber)" />
                <line x1="0" y1="0" x2="0" y2="7" stroke="var(--card)" strokeOpacity="0.6" strokeWidth="3" />
              </pattern>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <YAxis axisLine={false} tickLine={false} width={44} tickCount={4} tickFormatter={formatEuroAxis} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" minTickGap={4} tickMargin={6} />
            <Tooltip cursor={false} content={({ active, payload }) => active && payload?.[0] ? <TipPill title={String((payload[0].payload as (typeof data)[number]).full)} value={formatValue("euro", Number(payload[0].value), { signed: SIGNED.has(m), compact: true })} /> : null} />
            <Bar dataKey="v" shape={shape as never} onClick={(d) => { const x = d as unknown as (typeof data)[number]; drill({ title: `${MEASURE_META[m].label} — ${x.label}`, query: { measure: m, period: { type: "mois", start: x.key, end: x.key }, filters } }); }}>
              {data.map((d) => <Cell key={d.key} />)}
              <LabelList dataKey="v" content={(p) => { const d = data[Number(p.index)]; if (!d || d.key !== sel) return null; const x = Number(p.x) + Number(p.width) / 2, y = Math.min(Number(p.y), Number(p.y) + Number(p.height)); return <text x={x} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={600} fill="var(--foreground)">{formatValue("euro", d.v, { signed: SIGNED.has(m), compact: true })}</text>; }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------- Camion du mois / À surveiller ------------------------- */
function useTruckRows(config: WidgetConfig, ctx: WidgetContext) {
  const filters = widgetFilters(ctx, config);
  const q = useAnalytics({ measures: ["marge_ht", "ca_ht", "taux_marge"], dimensions: ["camion"], period: ctx.period, filters });
  const refs = useReferences();
  const rows = (q.data?.rows ?? []).filter((r) => r.keys.camion && r.keys.camion !== "__none__").map((r) => {
    const t = refs.trucks.find((x) => x.id === r.keys.camion);
    return {
      id: r.keys.camion!, plate: r.labels.camion ?? "", marge: r.values.marge_ht, taux: r.values.taux_marge,
      post: refs.posts.find((p) => p.id === t?.postId)?.name ?? "—",
      drivers: (t?.driverIds ?? []).map((d) => refs.drivers.find((x) => x.id === d)?.name).filter(Boolean).join(", ") || "—",
    };
  }).sort((a, b) => b.marge - a.marge);
  return { rows, pending: q.isPending, error: q.isError };
}

function Status({ ok }: { ok: boolean }) {
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", ok ? "bg-positive-soft text-positive" : "bg-negative-soft text-negative")}>{ok ? "Rentable" : "À surveiller"}</span>;
}

function Row({ children, to }: { children: ReactNode; to: string }) {
  return <Link to="/camions/$id" params={{ id: to }} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted">{children}</Link>;
}

export function SpotlightWidget({ config, ctx }: Props) {
  const { rows, pending, error } = useTruckRows(config, ctx);
  if (pending) return <Skeleton className="h-full w-full rounded-lg" />;
  if (error || !rows.length) return <EmptyState>Aucun camion sur la période.</EmptyState>;
  const best = rows[0]!;
  const others = [...rows.slice(1, 3), ...rows.slice(-2)].filter((r, i, a) => a.findIndex((x) => x.id === r.id) === i && r.id !== best.id);
  return (
    <div className="flex h-full flex-col gap-3">
      <Link to="/camions/$id" params={{ id: best.id }} className="block rounded-2xl bg-muted p-4 transition-colors hover:bg-accent">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-full bg-card"><TruckIcon className="size-4" /></span><Plate plate={best.plate} /></span>
          <Status ok={best.marge >= 0} />
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
          <dt className="text-muted-foreground">Poste</dt><dd className="truncate text-right font-medium">{best.post}</dd>
          <dt className="text-muted-foreground">Chauffeur</dt><dd className="truncate text-right font-medium">{best.drivers}</dd>
          <dt className="text-muted-foreground">Marge du mois</dt><dd className="text-right font-bold text-positive tabular">{formatValue("euro", best.marge, { signed: true })}</dd>
        </dl>
      </Link>
      <div className="min-h-0 flex-1 overflow-auto">
        {others.map((r) => (
          <Row key={r.id} to={r.id}>
            <Plate plate={r.plate} />
            <span className={cn("min-w-0 flex-1 truncate text-right text-xs font-semibold tabular", r.marge >= 0 ? "text-positive" : "text-negative")}>{formatValue("euro", r.marge, { signed: true, compact: true })}</span>
            <Status ok={r.marge >= 0} />
          </Row>
        ))}
      </div>
      <Link to="/rentabilite" className="no-print inline-flex items-center gap-1 self-end text-xs font-semibold hover:underline">Voir tout <ChevronRight className="size-3.5" /></Link>
    </div>
  );
}

export function WatchlistWidget({ config, ctx }: Props) {
  const { rows, pending, error } = useTruckRows(config, ctx);
  if (pending) return <Skeleton className="h-full w-full rounded-lg" />;
  if (error) return <EmptyState>Impossible de charger ces données.</EmptyState>;
  const red = rows.filter((r) => r.marge < 0).sort((a, b) => a.marge - b.marge);
  if (!red.length) return <EmptyState>Aucun camion dans le rouge sur la période.</EmptyState>;
  const worst = Math.abs(red[0]!.marge) || 1;
  return (
    <div className="flex h-full flex-col">
      <p className="mb-2 text-xs text-muted-foreground"><b className="text-negative">{red.length} camion{red.length > 1 ? "s" : ""}</b> dans le rouge sur {rows.length}</p>
      <div className="min-h-0 flex-1 space-y-1 overflow-auto">
        {red.map((r) => (
          <Row key={r.id} to={r.id}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted"><TruckIcon className="size-4 text-muted-foreground" /></span>
            <span className="min-w-0 flex-1">
              <Plate plate={r.plate} />
              <span className="mt-1 block truncate text-[11px] text-muted-foreground">{r.post} · {r.drivers}</span>
              <span className="mt-1 block h-1 rounded-full bg-muted"><span className="block h-full rounded-full bg-negative-bar" style={{ width: `${(Math.abs(r.marge) / worst) * 100}%` }} /></span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-bold text-negative tabular">{formatValue("euro", r.marge, { signed: true, compact: true })}</span>
              <span className="block text-[11px] text-muted-foreground tabular">{formatPercent(r.taux)}</span>
            </span>
          </Row>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Titre de section ------------------------------ */
export function SectionWidget({ config, ctx }: Props) {
  return (
    <div className="flex h-full items-end justify-between gap-3 pb-1 pr-9">
      <h2 className="text-lg font-semibold tracking-tight">{config.title}</h2>
      <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium capitalize text-muted-foreground">{periodLabel(ctx.period)}</span>
    </div>
  );
}
