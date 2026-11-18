import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Download, FileText } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDetails } from "@/data/DataProvider";
import type { DetailLine, DetailQuery } from "@/data/types";
import { MEASURE_META } from "@/data/catalog";
import { formatShortDate, formatValue } from "@/utils/format";
import { downloadCsv, slug } from "@/utils/csv";
import { Plate } from "@/components/brand/Plate";
import { cn } from "@/lib/utils";

export interface DrillRequest { title: string; subtitle?: string; query: DetailQuery }
const DrillContext = createContext<(r: DrillRequest) => void>(() => {});
export const useDrill = () => useContext(DrillContext);

const SOURCE_LABEL: Record<DetailLine["source"], string> = { transaction: "Transaction", proforma: "Proforma", facture: "Facture", saisie: "Saisie" };
type SortKey = "date" | "label" | "amount";

export function DrillProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<DrillRequest | null>(null);
  return (
    <DrillContext.Provider value={setReq}>
      {children}
      <Sheet open={!!req} onOpenChange={(o) => !o && setReq(null)}>
        <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-2xl">
          {req && <DrillBody req={req} />}
        </SheetContent>
      </Sheet>
    </DrillContext.Provider>
  );
}

function DrillBody({ req }: { req: DrillRequest }) {
  const { data, isPending, isError } = useDetails(req.query);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: -1 });
  const fmt = MEASURE_META[req.query.measure].format;
  const rows = useMemo(() => {
    const r = [...(data ?? [])];
    r.sort((a, b) => (sort.key === "amount" ? a.amount - b.amount : a[sort.key].localeCompare(b[sort.key])) * sort.dir);
    return r;
  }, [data, sort]);
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const head = (key: SortKey, label: string, cls = "") => (
    <th className={cn("px-3 py-2 font-medium", cls)}>
      <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))}>
        {label}
        {sort.key === key && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
      </button>
    </th>
  );
  const exportCsv = () =>
    downloadCsv(`detail-${slug(req.title)}`, ["Date", "Libellé", "Source", "Document", "Camion", "Montant"], rows.map((r) => [r.date, r.label, SOURCE_LABEL[r.source], r.documentRef, r.truck, r.amount]));

  return (
    <div className="flex h-full flex-col">
      <SheetHeader className="border-b p-5">
        <SheetTitle>{req.title}</SheetTitle>
        <SheetDescription>{req.subtitle ?? MEASURE_META[req.query.measure].label}</SheetDescription>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl font-bold tracking-tight tabular">{isPending ? "…" : formatValue(fmt, total)}</div>
            <div className="text-xs text-muted-foreground">{rows.length} lignes d'origine</div>
          </div>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}><Download /> Exporter CSV</Button>
        </div>
      </SheetHeader>
      <div className="flex-1 overflow-auto">
        {isPending ? (
          <div className="space-y-2 p-5">{Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}</div>
        ) : isError ? (
          <p className="p-5 text-sm text-negative">Impossible de charger le détail. Réessayez.</p>
        ) : rows.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Aucune ligne pour ce montant sur la période.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-left text-xs text-muted-foreground shadow-[0_1px_0_var(--border)]">
              <tr>{head("date", "Date")}{head("label", "Libellé")}<th className="px-3 py-2 font-medium">Source</th>{head("amount", "Montant", "text-right")}</tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-muted/50">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground tabular">{formatShortDate(r.date)}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.label}</div>
                    <div className="mt-0.5 flex items-center gap-2">{r.truck && <Plate plate={r.truck} />}</div>
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div>{SOURCE_LABEL[r.source]}</div>
                    {r.documentRef && <span className="inline-flex items-center gap-1 text-muted-foreground"><FileText className="size-3" />{r.documentRef}</span>}
                  </td>
                  <td className={cn("whitespace-nowrap px-3 py-2 text-right font-semibold tabular", r.amount < 0 && "text-negative")}>{formatValue(fmt, r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
