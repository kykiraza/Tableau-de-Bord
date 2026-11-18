import type { DataSource, WidgetConfig } from "@/data/types";
import { COST_CATEGORIES } from "@/data/types";
import { CATEGORY_MEASURE, DIMENSION_LABEL, IMPLICIT_DIMENSION, MEASURE_META, NO_DIMENSION_TYPES } from "@/data/catalog";
import { downloadCsv, slug } from "@/utils/csv";
import { effectivePeriod, widgetFilters, type WidgetContext } from "./shared";

/** Exporte en CSV les données agrégées d'un widget, avec les filtres en cours. */
export async function exportWidgetCsv(ds: DataSource, cfg: WidgetConfig, ctx: WidgetContext) {
  const filters = widgetFilters(ctx, cfg);
  const measures = cfg.type === "waterfall" ? (["ca_ht", ...COST_CATEGORIES.map((c) => CATEGORY_MEASURE[c]), "marge_ht"] as const) : cfg.measures;
  const implicit = IMPLICIT_DIMENSION[cfg.type];
  const dims = implicit ? [implicit] : NO_DIMENSION_TYPES.has(cfg.type) ? [] : [cfg.dimension, cfg.type === "heatmap" ? cfg.series : null].filter((d): d is NonNullable<typeof d> => !!d);
  const period = effectivePeriod(cfg, ctx.period);
  const r = await ds.query({ measures: [...measures], dimensions: dims, period, filters });
  const rows = dims.length ? r.rows : [{ keys: {}, labels: {}, values: r.totals }];
  downloadCsv(
    `${slug(cfg.title)}-${period.start}_${period.end}`,
    [...dims.map((d) => DIMENSION_LABEL[d]), ...measures.map((m) => MEASURE_META[m].label)],
    rows.map((row) => [...dims.map((d) => row.labels[d] ?? ""), ...measures.map((m) => row.values[m])]),
  );
}
