import { GripVertical, MoreVertical, Download, Settings2, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useDataSource } from "@/data/DataProvider";
import type { WidgetConfig } from "@/data/types";
import { CHART_LABEL, DIMENSION_LABEL } from "@/data/catalog";
import { WidgetRenderer } from "./WidgetRenderer";
import { exportWidgetCsv } from "./exportWidget";
import { effectivePeriod, type WidgetContext } from "./shared";
import { periodLabel } from "@/utils/period";
import { cn } from "@/lib/utils";
import type { ChartType } from "@/data/types";

const SELF_CONTAINED = new Set<ChartType>(["kpi", "hero", "pastel", "gauge", "section"]);

interface Props {
  config: WidgetConfig; ctx: WidgetContext; editing?: boolean; className?: string;
  onEdit?: () => void; onRemove?: () => void; onDuplicate?: () => void;
}

export function WidgetFrame({ config, ctx, editing, className, onEdit, onRemove, onDuplicate }: Props) {
  const ds = useDataSource();
  const isKpi = SELF_CONTAINED.has(config.type);
  const hero = config.type === "hero" || (config.type === "kpi" && config.layout.w >= 3 && config.measures[0] === "marge_ht");
  const bare = config.type === "hero" || config.type === "pastel" || config.type === "section";
  const exportCsv = () => exportWidgetCsv(ds, config, ctx).then(() => toast.success("Export CSV téléchargé")).catch(() => toast.error("Export impossible"));
  const sub = isKpi || ["monthbars", "spotlight", "watchlist"].includes(config.type) ? null : `${CHART_LABEL[config.type]}${config.dimension ? ` · par ${DIMENSION_LABEL[config.dimension].toLowerCase()}` : ""} · ${periodLabel(effectivePeriod(config, ctx.period))}`;

  const menu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className={cn("no-print size-7 shrink-0", hero && "text-hero-foreground hover:bg-hero-foreground/10")} aria-label="Actions du widget"><MoreVertical /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportCsv}><Download /> Exporter CSV</DropdownMenuItem>
        {onEdit && <DropdownMenuItem onClick={onEdit}><Settings2 /> Configurer</DropdownMenuItem>}
        {onDuplicate && <DropdownMenuItem onClick={onDuplicate}><Copy /> Dupliquer</DropdownMenuItem>}
        {onRemove && (<><DropdownMenuSeparator /><DropdownMenuItem onClick={onRemove} className="text-negative focus:text-negative"><Trash2 /> Retirer</DropdownMenuItem></>)}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <section className={cn("relative flex h-full flex-col overflow-hidden", bare ? "rounded-xl" : "surface", hero && "border-transparent", editing && "ring-2 ring-amber/40", className)}>
      {editing && (
        <div className="drag-handle absolute inset-x-0 top-0 z-10 flex h-6 cursor-move items-center justify-center bg-amber-soft/80 text-amber-foreground">
          <GripVertical className="size-3.5" /> <span className="text-[10px] font-semibold">Glisser</span>
        </div>
      )}
      {isKpi ? (
        <div className={cn("relative h-full", editing && "pt-6")}>
          {(config.type !== "section" || editing) && <div className="absolute right-3 top-3 z-10" style={editing ? { top: 30 } : undefined}>{menu}</div>}
          <WidgetRenderer config={config} ctx={ctx} />
        </div>
      ) : (
        <div className={cn("flex h-full flex-col p-5", editing && "pt-8")}>
          <header className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold tracking-tight">{config.title}</h2>
              {sub && <p className="truncate text-[13px] text-muted-foreground">{sub}</p>}
            </div>
            {menu}
          </header>
          <div className="animate-rise min-h-0 flex-1">
            <WidgetRenderer config={config} ctx={ctx} />
          </div>
        </div>
      )}
    </section>
  );
}
