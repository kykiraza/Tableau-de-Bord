import { useState } from "react";
import { Check, ChevronDown, Copy, LayoutGrid, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { SavedView } from "@/data/types";
import { cn } from "@/lib/utils";

interface Props {
  views: SavedView[]; current: SavedView; defaultId: string;
  onSelect: (id: string) => void; onCreate: (name: string) => void; onRename: (name: string) => void;
  onDuplicate: () => void; onDelete: () => void; onSetDefault: () => void;
}

export function ViewsMenu({ views, current, defaultId, onSelect, onCreate, onRename, onDuplicate, onDelete, onSetDefault }: Props) {
  const [dialog, setDialog] = useState<null | "create" | "rename">(null);
  const [name, setName] = useState("");
  const openDialog = (k: "create" | "rename") => { setName(k === "rename" ? current.name : ""); setDialog(k); };
  const submit = () => { if (!name.trim()) return; (dialog === "create" ? onCreate : onRename)(name.trim()); setDialog(null); };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 max-w-[220px]">
            <LayoutGrid /><span className="truncate">{current.name}</span>{current.id === defaultId && <Star className="size-3 fill-amber text-amber" />}<ChevronDown className="opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Vues enregistrées</DropdownMenuLabel>
          {views.map((v) => (
            <DropdownMenuItem key={v.id} onClick={() => onSelect(v.id)}>
              <Check className={cn("size-4", v.id === current.id ? "opacity-100" : "opacity-0")} />
              <span className="flex-1 truncate">{v.name}</span>
              {v.id === defaultId && <Star className="size-3 fill-amber text-amber" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => openDialog("create")}><Plus /> Nouvelle vue vide</DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}><Copy /> Dupliquer « {current.name} »</DropdownMenuItem>
          <DropdownMenuItem onClick={() => openDialog("rename")}><Pencil /> Renommer</DropdownMenuItem>
          <DropdownMenuItem onClick={onSetDefault} disabled={current.id === defaultId}><Star /> Définir par défaut</DropdownMenuItem>
          {!current.builtIn && <DropdownMenuItem onClick={onDelete} className="text-negative focus:text-negative"><Trash2 /> Supprimer</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{dialog === "create" ? "Nouvelle vue" : "Renommer la vue"}</DialogTitle></DialogHeader>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Nom de la vue" />
          <DialogFooter><Button variant="outline" onClick={() => setDialog(null)}>Annuler</Button><Button onClick={submit} disabled={!name.trim()}>Valider</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
