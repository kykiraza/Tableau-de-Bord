import type { ReactNode } from "react";
import type { Dimension, Measure, Period, QueryFilters, WidgetConfig } from "@/data/types";
import { cleanFilters, mergeFilters } from "@/data/filters";
import { periodLength, shiftMonth } from "@/utils/period";
import { cn } from "@/lib/utils";

/** Actions de page que certaines cartes (carte vedette) peuvent déclencher. */
export interface WidgetActions {
  onExport?: (() => void) | undefined;
  compareMode?: "previous" | "lastYear" | "none" | undefined;
  onCompare?: ((mode: "previous" | "lastYear" | "none") => void) | undefined;
}
export interface WidgetContext { period: Period; compare: Period | null; filters: QueryFilters; actions?: WidgetActions | undefined }

export const MEASURE_COLOR: Partial<Record<Measure, string>> = {
  ca_ht: "var(--grey-1)", couts_ht: "var(--grey-5)", marge_ht: "var(--positive)", taux_marge: "var(--grey-3)",
  encaisse: "var(--positive)", en_attente: "var(--amber)", solde: "var(--grey-1)",
};
export const PALETTE = ["var(--grey-1)", "var(--grey-3)", "var(--grey-5)", "var(--grey-2)", "var(--grey-6)", "var(--grey-4)", "var(--grey-7)", "var(--grey-8)"];
export const colorFor = (m: Measure, i: number) => MEASURE_COLOR[m] ?? PALETTE[i % PALETTE.length]!;

const TIME = new Set<Dimension>(["mois", "semaine"]);
export const isTime = (d: Dimension | null) => !!d && TIME.has(d);

/** Pour une évolution dans le temps, on affiche au moins 12 mois jusqu'à la fin de la période. */
export function effectivePeriod(cfg: Pick<WidgetConfig, "dimension" | "series">, p: Period): Period {
  if ((isTime(cfg.dimension) || isTime(cfg.series)) && (periodLength(p) < 6 || p.type === "mois_type")) {
    return { type: "plage", start: shiftMonth(p.end, -11), end: p.end };
  }
  return p;
}
export const widgetFilters = (ctx: WidgetContext, cfg: WidgetConfig) => cleanFilters(mergeFilters(ctx.filters, cfg.filters));

export const axisProps = { tick: { fontSize: 11, fill: "var(--muted-foreground)" }, axisLine: false, tickLine: false } as const;

export function TooltipBox({ title, rows }: { title?: ReactNode; rows: { label: string; value: string; color?: string; strong?: boolean }[] }) {
  return (
    <div className="min-w-[170px] rounded-2xl bg-tip px-3.5 py-2.5 text-xs text-tip-foreground shadow-xl">
      {title && <div className="mb-1.5 font-semibold">{title}</div>}
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 opacity-70">
              {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
              {r.label}
            </span>
            <span className={cn("tabular", r.strong ? "font-semibold" : "font-medium")}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlateTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  const w = 74;
  if (payload?.value === "Non attribué") return <text x={(x ?? 0) - 4} y={(y ?? 0) + 4} textAnchor="end" fontSize={11} fontStyle="italic" fill="var(--muted-foreground)">Non attribué</text>;
  return (
    <g transform={`translate(${(x ?? 0) - w - 4},${(y ?? 0) - 9})`}>
      <rect width={w} height={18} rx={3} fill="var(--plate-bg)" stroke="var(--border)" />
      <rect width={9} height={18} rx={2} fill="var(--plate-band)" />
      <text x={9 + (w - 9) / 2} y={12.5} textAnchor="middle" fontSize={10.5} fontWeight={600} fontFamily="var(--font-mono)" fill="var(--plate-fg)">{payload?.value}</text>
    </g>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="flex h-full min-h-[120px] items-center justify-center rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">{children}</div>;
}

/** Petite pastille noire avec une seule valeur (survol des courbes). */
export function TipPill({ title, value }: { title?: string; value: string }) {
  return (
    <div className="rounded-full bg-tip px-3 py-1.5 text-center text-xs font-semibold text-tip-foreground shadow-xl tabular">
      {title && <span className="mr-1.5 font-normal opacity-70">{title}</span>}{value}
    </div>
  );
}
