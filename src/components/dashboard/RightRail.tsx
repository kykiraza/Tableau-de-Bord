import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, Banknote, Building2, Fuel, Landmark, Receipt, Truck, Wrench, type LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAnalytics, useDataSource } from "@/data/DataProvider";
import { useDrill } from "@/components/data/DrillDown";
import type { Period, QueryFilters, Transaction } from "@/data/types";
import { Amount } from "@/components/brand/Amount";
import { formatEuro, formatSignedEuro, formatShortDate } from "@/utils/format";
import { periodLabel, shiftMonth } from "@/utils/period";
import { cn } from "@/lib/utils";

const ICON: Partial<Record<Transaction["category"], LucideIcon>> = {
  gasoil: Fuel, adblue: Fuel, peages: Truck, entretien: Wrench, chauffeur: Banknote, vehicule: Truck,
  bureau: Building2, divers: Receipt, encaissement: ArrowDownLeft, virement: Landmark,
};
const CAT: Partial<Record<Transaction["category"], string>> = {
  gasoil: "Gasoil", adblue: "AdBlue", peages: "Péages", entretien: "Entretien", chauffeur: "Chauffeur", vehicule: "Véhicule",
  bureau: "Bureau", divers: "Divers", encaissement: "Encaissement", virement: "Virement",
};

interface Props { period: Period; filters: QueryFilters }

function RailCard({ title, period, scope, onScope, children }: { title: string; period: Period; scope: "p" | "3m"; onScope: (s: "p" | "3m") => void; children: React.ReactNode }) {
  return (
    <section className="surface p-5">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        <Select value={scope} onValueChange={(v) => onScope(v as "p" | "3m")}>
          <SelectTrigger className="h-8 w-auto gap-1 rounded-full px-3 text-xs" aria-label={`Période ${title}`}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="p" className="capitalize">{periodLabel(period)}</SelectItem>
            <SelectItem value="3m">3 derniers mois</SelectItem>
          </SelectContent>
        </Select>
      </header>
      {children}
    </section>
  );
}

const widen = (p: Period, scope: "p" | "3m"): Period => (scope === "p" ? p : { type: "plage", start: shiftMonth(p.end, -2), end: p.end });

function Transactions({ period }: { period: Period }) {
  const ds = useDataSource();
  const [scope, setScope] = useState<"p" | "3m">("p");
  const p = widen(period, scope);
  const q = useQuery({ queryKey: ["transactions", p], queryFn: () => ds.listTransactions(p) });
  const list = [...(q.data ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  return (
    <RailCard title="Transactions" period={period} scope={scope} onScope={setScope}>
      {q.isPending ? <div className="space-y-2">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-11 rounded-xl" />)}</div>
        : q.isError ? <p className="text-sm text-negative">Transactions indisponibles.</p>
        : !list.length ? <p className="text-sm text-muted-foreground">Aucune transaction.</p>
        : (
          <ul className="divide-y divide-border">
            {list.map((t) => {
              const Icon = ICON[t.category];
              const inflow = t.amountTTC > 0;
              return (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">{Icon ? <Icon className="size-4" /> : t.label.charAt(0).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 break-words text-sm font-medium leading-5" title={t.label}>{t.label}</span>
                    <span className="block text-xs text-muted-foreground">{formatShortDate(t.date)} · {CAT[t.category] ?? t.category}</span>
                  </span>
                  <Amount className={cn("shrink-0 whitespace-nowrap text-sm font-semibold", inflow ? "text-positive" : "text-foreground")} text={formatSignedEuro(t.amountTTC)} />
                </li>
              );
            })}
          </ul>
        )}
    </RailCard>
  );
}

function Receivables({ period, filters }: Props) {
  const [scope, setScope] = useState<"p" | "3m">("p");
  const p = widen(period, scope);
  const q = useAnalytics({ measures: ["en_attente", "encaisse"], dimensions: ["client"], period: p, filters });
  const drill = useDrill();
  const rows = (q.data?.rows ?? []).filter((r) => r.values.en_attente > 0 || r.values.encaisse > 0).sort((a, b) => b.values.en_attente - a.values.en_attente);
  return (
    <RailCard title="Encaissements" period={period} scope={scope} onScope={setScope}>
      {q.isPending ? <Skeleton className="h-48 rounded-2xl" /> : q.isError ? <p className="text-sm text-negative">Indisponible.</p> : !rows.length ? <p className="text-sm text-muted-foreground">Rien en attente.</p> : (
        <ul className="divide-y divide-border">
          {rows.map((r) => {
            const billed = r.values.encaisse + r.values.en_attente;
            const pct = billed ? (r.values.encaisse / billed) * 100 : 0;
            return (
              <li key={r.keys.client}>
                <button type="button" className="block w-full py-3 text-left transition-colors hover:bg-muted/40"
                  onClick={() => drill({ title: `En attente — ${r.labels.client}`, query: { measure: "en_attente", period: p, filters, keys: { client: r.keys.client! } } })}>
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium" title={r.labels.client}>{r.labels.client}</span>
                    <Amount className="text-sm font-semibold" text={formatEuro(r.values.en_attente)} />
                  </span>
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-foreground/40" style={{ width: `${pct}%` }} /></span>
                  <span className="mt-1.5 flex justify-between text-xs text-muted-foreground"><span>Encaissé {Math.round(pct)} %</span><span className="tabular">{formatEuro(r.values.encaisse)} / {formatEuro(billed)}</span></span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </RailCard>
  );
}

/** Colonne de droite du tableau de bord : dernières transactions Qonto et créances clients. */
export function RightRail(props: Props) {
  return (
    <aside className="space-y-6">
      <Transactions period={props.period} />
      <Receivables {...props} />
    </aside>
  );
}
