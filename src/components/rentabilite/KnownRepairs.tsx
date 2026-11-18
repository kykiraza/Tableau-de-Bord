import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Truck } from "@/data/types";

interface Repair { id: string; truckId: string; description: string }
const KEY = "madatrans.known-repairs.v1";
const load = (): Repair[] => { try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as Repair[]) : []; } catch { return []; } };
const store = (r: Repair[]) => { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch { /* stockage indisponible */ } };

export function KnownRepairs({ trucks }: { trucks: Truck[] }) {
  const [items, setItems] = useState<Repair[]>([]);
  useEffect(() => setItems(load()), []);
  const update = (next: Repair[]) => { setItems(next); store(next); };
  const add = () => update([...items, { id: Date.now().toString(36), truckId: trucks[0]?.id ?? "", description: "" }]);
  return (
    <section className="rounded-xl border bg-muted/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold">Réparations connues non chiffrées <span className="font-normal text-muted-foreground">(non incluses)</span></h3>
          <p className="text-xs text-muted-foreground">Travaux à prévoir dont le montant n'est pas encore connu. Ils ne sont pas comptés dans les marges.</p>
        </div>
        <Button size="sm" variant="outline" className="no-print rounded-full bg-card" onClick={add}><Plus /> Ajouter</Button>
      </div>
      {items.length === 0 ? <p className="text-sm text-muted-foreground">Aucune réparation notée.</p> : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="flex flex-wrap items-center gap-2">
              <Select value={it.truckId} onValueChange={(truckId) => update(items.map((x) => (x.id === it.id ? { ...x, truckId } : x)))}>
                <SelectTrigger className="h-9 w-[140px] bg-card font-mono text-xs" aria-label="Camion"><SelectValue /></SelectTrigger>
                <SelectContent>{trucks.map((t) => <SelectItem key={t.id} value={t.id} className="font-mono text-xs">{t.plate}</SelectItem>)}</SelectContent>
              </Select>
              <Input value={it.description} placeholder="Description (ex. embrayage à changer)" aria-label="Description"
                onChange={(e) => update(items.map((x) => (x.id === it.id ? { ...x, description: e.target.value } : x)))} className="h-9 min-w-[200px] flex-1 bg-card" />
              <Button size="icon" variant="ghost" className="no-print size-9" aria-label="Supprimer" onClick={() => update(items.filter((x) => x.id !== it.id))}><Trash2 /></Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
