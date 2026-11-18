import type { ReactNode } from "react";
import { Calendar, GitCompareArrows, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "./MultiSelect";
import { useReferences } from "@/data/DataProvider";
import { DEFAULT_SEARCH, resolveCompare, resolvePeriod, type FilterSearch } from "@/data/filters";
import { CATEGORY_LABEL } from "@/data/catalog";
import { COST_CATEGORIES } from "@/data/types";
import { monthLong, monthShort, periodLabel } from "@/utils/period";

interface Props { search: FilterSearch; onChange: (patch: Partial<FilterSearch>) => void; actions?: ReactNode }

export function FilterBar({ search, onChange, actions }: Props) {
  const refs = useReferences();
  const months = [...refs.months].reverse();
  const years = [...new Set(months.map((m) => m.slice(0, 4)))];
  const quarters = [...new Set(months.map((m) => `${m.slice(0, 4)}-${String(Math.floor((Number(m.slice(5)) - 1) / 3) * 3 + 1).padStart(2, "0")}`))];
  const period = resolvePeriod(search, refs.months.at(-1));
  const compare = resolveCompare(search, period);

  const chips: { key: string; label: string; clear: () => void }[] = [
    ...search.tk.map((id) => ({ key: `tk-${id}`, label: refs.trucks.find((t) => t.id === id)?.plate ?? id, clear: () => onChange({ tk: search.tk.filter((x) => x !== id) }) })),
    ...search.cl.map((id) => ({ key: `cl-${id}`, label: refs.clients.find((c) => c.id === id)?.name ?? id, clear: () => onChange({ cl: search.cl.filter((x) => x !== id) }) })),
    ...search.cat.map((id) => ({ key: `cat-${id}`, label: CATEGORY_LABEL[id as keyof typeof CATEGORY_LABEL] ?? id, clear: () => onChange({ cat: search.cat.filter((x) => x !== id) }) })),
    ...(search.fc === "avant" ? [{ key: "fc", label: "Avant frais communs", clear: () => onChange({ fc: "apres" }) }] : []),
    ...(search.hx ? [{ key: "hx", label: "Hors réparations exceptionnelles", clear: () => onChange({ hx: false }) }] : []),
  ];
  const isDefault = chips.length === 0 && search.pt === DEFAULT_SEARCH.pt && search.ps === DEFAULT_SEARCH.ps && search.cmp === DEFAULT_SEARCH.cmp;

  const monthSelect = (value: string, onValue: (v: string) => void, aria: string) => (
    <Select value={value} onValueChange={onValue}>
      <SelectTrigger className="h-9 rounded-full w-[150px]" aria-label={aria}><SelectValue /></SelectTrigger>
      <SelectContent>{months.map((m) => <SelectItem key={m} value={m}>{monthLong(m)}</SelectItem>)}</SelectContent>
    </Select>
  );

  return (
    <div className="no-print space-y-3 rounded-xl border bg-card p-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="size-4 text-muted-foreground" />
          <Select value={search.pt} onValueChange={(pt) => onChange({ pt })}>
            <SelectTrigger className="h-9 rounded-full w-[130px]" aria-label="Type de période"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="mois">Mois</SelectItem>
              <SelectItem value="trimestre">Trimestre</SelectItem>
              <SelectItem value="annee">Année</SelectItem>
              <SelectItem value="plage">Plage</SelectItem>
              <SelectItem value="mois_type">Mois type</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {search.pt === "mois" && monthSelect(search.ps, (ps) => onChange({ ps }), "Mois")}
        {search.pt === "trimestre" && (
          <Select value={`${search.ps.slice(0, 4)}-${String(Math.floor((Number(search.ps.slice(5)) - 1) / 3) * 3 + 1).padStart(2, "0")}`} onValueChange={(ps) => onChange({ ps })}>
            <SelectTrigger className="h-9 rounded-full w-[120px]" aria-label="Trimestre"><SelectValue /></SelectTrigger>
            <SelectContent>{quarters.map((q) => <SelectItem key={q} value={q}>T{Math.floor((Number(q.slice(5)) - 1) / 3) + 1} {q.slice(0, 4)}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {search.pt === "annee" && (
          <Select value={search.ps.slice(0, 4)} onValueChange={(y) => onChange({ ps: `${y}-01` })}>
            <SelectTrigger className="h-9 rounded-full w-[100px]" aria-label="Année"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        )}
        {search.pt === "plage" && (<>{monthSelect(search.ps, (ps) => onChange({ ps }), "Début")}<span className="text-xs text-muted-foreground">→</span>{monthSelect(search.pe, (pe) => onChange({ pe }), "Fin")}</>)}
        {search.pt === "mois_type" && (
          <>
            <Select value={String(search.pn)} onValueChange={(v) => onChange({ pn: Number(v) })}>
              <SelectTrigger className="h-9 rounded-full w-[150px]" aria-label="Nombre de mois"><SelectValue /></SelectTrigger>
              <SelectContent>{[3, 6, 12].map((n) => <SelectItem key={n} value={String(n)}>Moyenne {n} mois</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">jusqu'à</span>
            {monthSelect(search.pe, (pe) => onChange({ pe }), "Dernier mois")}
          </>
        )}

        <div className="flex items-center gap-1.5">
          <GitCompareArrows className="size-4 text-muted-foreground" />
          <Select value={search.cmp} onValueChange={(cmp) => onChange({ cmp })}>
            <SelectTrigger className="h-9 rounded-full w-[190px]" aria-label="Comparer à"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="previous">vs période précédente</SelectItem>
              <SelectItem value="lastYear">vs même période N−1</SelectItem>
              <SelectItem value="none">Sans comparaison</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <MultiSelect label="Camions" mono options={refs.trucks.map((t) => ({ value: t.id, label: t.plate }))} value={search.tk} onChange={(tk) => onChange({ tk })} />
        <MultiSelect label="Clients" options={refs.clients.map((c) => ({ value: c.id, label: c.name }))} value={search.cl} onChange={(cl) => onChange({ cl })} />
        <MultiSelect label="Catégories" options={COST_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} value={search.cat} onChange={(cat) => onChange({ cat })} />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9"><SlidersHorizontal /> Options</Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3" align="start">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="opt-fc" className="text-sm">Après frais communs</Label>
              <Switch id="opt-fc" checked={search.fc !== "avant"} onCheckedChange={(c) => onChange({ fc: c ? "apres" : "avant" })} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="opt-hx" className="text-sm">Hors réparations exceptionnelles</Label>
              <Switch id="opt-hx" checked={search.hx} onCheckedChange={(hx) => onChange({ hx })} />
            </div>
          </PopoverContent>
        </Popover>
        <div className="ml-auto flex items-center gap-2">{actions}</div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">
          <span className="font-medium text-foreground">{periodLabel(period)}</span>
          {compare && <> · comparé à {periodLabel(compare)}</>}
          {period.type !== "mois" && period.type !== "mois_type" && <> ({monthShort(period.start)} → {monthShort(period.end)})</>}
        </span>
        {chips.map((c) => (
          <span key={c.key} className="inline-flex items-center gap-1 rounded-full bg-secondary py-0.5 pl-2 pr-1 font-medium">
            {c.label}
            <button type="button" onClick={c.clear} aria-label={`Retirer ${c.label}`} className="rounded-full p-0.5 hover:bg-muted"><X className="size-3" /></button>
          </span>
        ))}
        {!isDefault && (
          <button type="button" onClick={() => onChange({ ...DEFAULT_SEARCH, v: search.v })} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
            <RotateCcw className="size-3" /> Réinitialiser
          </button>
        )}
      </div>
    </div>
  );
}
