import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/data/MultiSelect";
import { useReferences } from "@/data/DataProvider";
import { CHART_TYPES, COST_CATEGORIES, DIMENSIONS, MEASURES, type Category, type ChartType, type Dimension, type Measure, type WidgetConfig } from "@/data/types";
import { CATEGORY_LABEL, CHART_LABEL, DIMENSION_LABEL, MEASURE_META, NO_DIMENSION_TYPES } from "@/data/catalog";
import type { WidgetTone } from "@/data/types";

const TONES: { value: WidgetTone; label: string }[] = [{ value: "green", label: "Vert" }, { value: "peach", label: "Pêche" }, { value: "blue", label: "Bleu" }, { value: "lilac", label: "Lilas" }];

interface Props { open: boolean; initial: WidgetConfig | null; onClose: () => void; onSave: (w: WidgetConfig) => void }

const NONE = "__none";

export function WidgetEditor({ open, initial, onClose, onSave }: Props) {
  const [w, setW] = useState<WidgetConfig | null>(initial);
  const refs = useReferences();
  useEffect(() => setW(initial), [initial]);
  if (!w) return null;
  const set = (patch: Partial<WidgetConfig>) => setW({ ...w, ...patch });
  const needsDim = !NO_DIMENSION_TYPES.has(w.type);
  const needsSeries = w.type === "heatmap";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Configurer le widget</DialogTitle>
          <DialogDescription>Choisissez ce que le widget mesure et comment il l'affiche.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="wt">Titre</Label>
            <Input id="wt" value={w.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Type de graphique</Label>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {CHART_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => set({ type: t as ChartType, dimension: NO_DIMENSION_TYPES.has(t) ? null : w.dimension ?? "camion", series: t === "heatmap" ? w.series ?? "mois" : w.series })}
                  className={`rounded-md border px-2 py-1.5 text-xs font-medium transition-colors ${w.type === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                  {CHART_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          {(w.type === "pastel" || w.type === "gauge") && (
            <div className="grid gap-1.5">
              <Label>Couleur</Label>
              <div className="flex gap-1.5">
                {TONES.map((t) => (
                  <button key={t.value} type="button" onClick={() => set({ tone: t.value })} className={`tone-${t.value} rounded-full border px-3 py-1 text-xs font-medium ${(w.tone ?? "green") === t.value ? "ring-2 ring-foreground" : ""}`}>{t.label}</button>
                ))}
              </div>
            </div>
          )}
          {w.type !== "waterfall" && w.type !== "section" && (
            <div className="grid gap-1.5">
              <Label>Mesure(s)</Label>
              <MultiSelect label={w.measures.length ? w.measures.map((m) => MEASURE_META[m].label).join(", ").slice(0, 48) : "Choisir…"} className="w-full"
                options={MEASURES.map((m) => ({ value: m, label: MEASURE_META[m].label }))}
                value={w.measures} onChange={(v) => set({ measures: (w.type === "kpi" || w.type === "donut" || w.type === "heatmap" || w.type === "pastel" || w.type === "hero" ? v.slice(-1) : w.type === "gauge"  ? v.slice(-2) : w.type === "scatter" ? v.slice(-2) : v) as Measure[] })} />
              <p className="text-xs text-muted-foreground">
                {w.type === "kpi" || w.type === "donut" || w.type === "heatmap" ? "Une seule mesure pour ce type." : w.type === "scatter" ? "Deux mesures : la 1re en vertical, la 2e en horizontal." : "Plusieurs mesures possibles."}
              </p>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {needsDim && (
              <div className="grid gap-1.5">
                <Label>{needsSeries ? "Lignes" : "Dimension"}</Label>
                <Select value={w.dimension ?? NONE} onValueChange={(v) => set({ dimension: v === NONE ? null : (v as Dimension) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Aucune (total)</SelectItem>
                    {DIMENSIONS.map((d) => <SelectItem key={d} value={d}>{DIMENSION_LABEL[d]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {needsSeries && (
              <div className="grid gap-1.5">
                <Label>Colonnes</Label>
                <Select value={w.series ?? "mois"} onValueChange={(v) => set({ series: v as Dimension })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DIMENSIONS.map((d) => <SelectItem key={d} value={d}>{DIMENSION_LABEL[d]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {needsDim && (
              <>
                <div className="grid gap-1.5">
                  <Label>Tri</Label>
                  <Select value={w.sort} onValueChange={(v) => set({ sort: v as WidgetConfig["sort"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="desc">Décroissant</SelectItem><SelectItem value="asc">Croissant</SelectItem><SelectItem value="none">Naturel</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="topn">Top N (vide = tout)</Label>
                  <Input id="topn" type="number" min={1} value={w.topN ?? ""} onChange={(e) => set({ topN: e.target.value ? Math.max(1, Number(e.target.value)) : null })} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Affichage</Label>
                  <Select value={w.unit} onValueChange={(v) => set({ unit: v as WidgetConfig["unit"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="eur">En euros</SelectItem><SelectItem value="pct">En % du total</SelectItem></SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <fieldset className="grid gap-3 rounded-lg border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">Filtres propres au widget (remplacent les filtres globaux)</legend>
            <div className="flex flex-wrap gap-2">
              <MultiSelect label="Camions" mono options={refs.trucks.map((t) => ({ value: t.id, label: t.plate }))} value={w.filters.trucks ?? []} onChange={(v) => set({ filters: { ...w.filters, trucks: v } })} />
              <MultiSelect label="Clients" options={refs.clients.map((c) => ({ value: c.id, label: c.name }))} value={w.filters.clients ?? []} onChange={(v) => set({ filters: { ...w.filters, clients: v } })} />
              <MultiSelect label="Catégories" options={COST_CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))} value={w.filters.categories ?? []} onChange={(v) => set({ filters: { ...w.filters, categories: v as Category[] } })} />
              <MultiSelect label="Fournisseurs" options={refs.suppliers.map((s) => ({ value: s.id, label: s.name }))} value={w.filters.suppliers ?? []} onChange={(v) => set({ filters: { ...w.filters, suppliers: v } })} />
            </div>
            <div className="flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm"><Switch checked={w.filters.commonCosts === "avant"} onCheckedChange={(c) => set({ filters: { ...w.filters, commonCosts: c ? "avant" : undefined } })} /> Avant frais communs</label>
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!w.filters.excludeExceptional} onCheckedChange={(c) => set({ filters: { ...w.filters, excludeExceptional: c || undefined } })} /> Hors exceptionnel</label>
            </div>
          </fieldset>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave({ ...w, measures: w.measures.length ? w.measures : ["ca_ht"] })} disabled={!w.title.trim()}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
