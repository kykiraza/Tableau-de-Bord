import { useState } from "react";
import { Link, useNavigate, useRouterState, useSearch } from "@tanstack/react-router";
import { Bell, RefreshCw, Search, Settings } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAlerts, useReferences } from "@/data/DataProvider";
import { formatDateTime } from "@/utils/format";
import { monthLong } from "@/utils/period";
import { cn } from "@/lib/utils";

/** Sélecteur arrondi du mois affiché (pilote les filtres de l'URL du tableau de bord). */
function PeriodPill() {
  const refs = useReferences();
  const search = useSearch({ strict: false }) as { pt?: string; ps?: string };
  const navigate = useNavigate();
  const last = refs.months.at(-1) ?? "2026-10";
  const value = search.pt && search.pt !== "mois" ? "__custom" : search.ps ?? last;
  return (
    <Select value={value} onValueChange={(m) => navigate({ to: "/", search: (prev) => ({ ...prev, pt: "mois", ps: m, pe: m }), replace: true })}>
      <SelectTrigger className="h-10 w-[170px] rounded-full bg-card capitalize" aria-label="Mois affiché"><SelectValue /></SelectTrigger>
      <SelectContent>
        {value === "__custom" && <SelectItem value="__custom">Période personnalisée</SelectItem>}
        {[...refs.months].reverse().map((m) => <SelectItem key={m} value={m} className="capitalize">{monthLong(m)}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function TopBar() {
  const [syncing, setSyncing] = useState(false);
  const { settings } = useReferences();
  const alerts = (useAlerts().data ?? []).filter((a) => !a.resolved).length;
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const home = pathname === "/";

  const sync = async () => {
    setSyncing(true);
    await qc.invalidateQueries();
    setSyncing(false);
    toast.success("Données rechargées", settings ? { description: `Dernière synchro Qonto : ${formatDateTime(settings.lastSync)}` } : undefined);
  };

  return (
    <header className="no-print flex flex-wrap items-center gap-3 px-3 pb-1 pt-4 md:px-6 md:pt-6">
      <SidebarTrigger className="round-icon size-10" />
      <div className="order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
        {home && <h1 className="truncate text-2xl font-bold tracking-tight md:text-[28px]">Bonjour Philippe 👋</h1>}
      </div>
      <div className="ml-auto flex items-center gap-2">
        {home && <div className="hidden sm:block"><PeriodPill /></div>}
        <Link to="/explorer" className="round-icon" aria-label="Rechercher / explorer"><Search className="size-4" /></Link>
        <Link to="/alertes" className="round-icon relative" aria-label={`Notifications (${alerts})`}>
          <Bell className="size-4" />
          {alerts > 0 && <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-amber text-[10px] font-bold text-amber-foreground">{alerts}</span>}
        </Link>
        <button type="button" className="round-icon" onClick={sync} disabled={syncing} aria-label="Synchroniser"><RefreshCw className={cn("size-4", syncing && "animate-spin")} /></button>
        <Link to="/parametres" className="round-icon" aria-label="Paramètres"><Settings className="size-4" /></Link>
      </div>
      {home && <div className="order-last w-full sm:hidden"><PeriodPill /></div>}
    </header>
  );
}
