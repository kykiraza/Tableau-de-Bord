import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { useAlerts, useAnalytics } from "@/data/DataProvider";
import type { Period, QueryFilters } from "@/data/types";
import { Plate } from "@/components/brand/Plate";
import { formatPercent, formatSignedEuro } from "@/utils/format";
import { periodLabel } from "@/utils/period";
import { cn } from "@/lib/utils";

const link = "font-semibold underline decoration-dotted decoration-1 underline-offset-4 hover:decoration-solid";

/** Phrase de synthèse calculée à partir des données filtrées. */
export function DashboardSummary({ period, compare, filters }: { period: Period; compare: Period | null; filters: QueryFilters }) {
  const cur = useAnalytics({ measures: ["marge_ht", "taux_marge"], dimensions: [], period, filters });
  const prev = useAnalytics(compare ? { measures: ["marge_ht"], dimensions: [], period: compare, filters } : null);
  const trucks = useAnalytics({ measures: ["marge_ht"], dimensions: ["camion"], period, filters });
  const alerts = useAlerts();
  if (cur.isPending || trucks.isPending) return <Skeleton className="mt-2 h-5 w-full max-w-2xl" />;
  if (cur.isError || trucks.isError) return <p className="mt-2 text-sm text-negative">Synthèse indisponible.</p>;
  const marge = cur.data.totals.marge_ht;
  const ref = prev.data?.totals.marge_ht;
  const delta = ref ? ((marge - ref) / Math.abs(ref)) * 100 : null;
  const losers = trucks.data.rows.filter((r) => r.keys.camion !== "__none__" && r.values.marge_ht < 0).sort((a, b) => a.values.marge_ht - b.values.marge_ht);
  const priority = (alerts.data ?? []).filter((a) => !a.resolved && a.severity === "haute").length;
  const label = periodLabel(period);
  return (
    <p className="max-w-4xl text-sm leading-7 text-muted-foreground">
      <span className="font-medium text-foreground">{label.charAt(0).toUpperCase() + label.slice(1)}</span> : marge de{" "}
      <Link to="/rentabilite" className={cn(link, marge >= 0 ? "text-positive" : "text-negative")}>{formatSignedEuro(marge)}</Link> ({formatPercent(cur.data.totals.taux_marge)})
      {delta !== null && <>, en {delta < 0 ? "baisse" : "hausse"} de <span className={cn("font-semibold", delta < 0 ? "text-negative" : "text-positive")}>{formatPercent(Math.abs(delta))}</span></>}.{" "}
      {losers.length > 0 ? (
        <>
          <span className="font-medium text-foreground">{losers.length} camion{losers.length > 1 ? "s" : ""} dans le rouge</span> :{" "}
          {losers.map((l, i) => (
            <span key={l.keys.camion}>
              <Link to="/camions/$id" params={{ id: l.keys.camion! }} className="inline-block align-middle transition-transform hover:-translate-y-px"><Plate plate={l.labels.camion!} /></Link>
              {i < losers.length - 1 ? ", " : ". "}
            </span>
          ))}
        </>
      ) : <span className="font-medium text-positive">Tous les camions sont rentables. </span>}
      {priority > 0 && <Link to="/alertes" className={cn(link, "text-foreground")}>{priority} alerte{priority > 1 ? "s" : ""} à traiter en priorité</Link>}
      {priority > 0 && "."}
    </p>
  );
}
