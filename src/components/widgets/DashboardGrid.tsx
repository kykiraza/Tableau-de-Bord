import { useEffect, useState } from "react";
import GridLayout, { WidthProvider, type Layout } from "react-grid-layout";
import type { WidgetConfig } from "@/data/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { WidgetFrame } from "./WidgetFrame";
import type { WidgetContext } from "./shared";

const Grid = WidthProvider(GridLayout);
const ROW = 56;
const GAP = 24;

interface Props {
  widgets: WidgetConfig[]; ctx: WidgetContext; editing: boolean;
  onLayout: (layout: Layout[]) => void; onEdit: (w: WidgetConfig) => void; onRemove: (id: string) => void; onDuplicate: (w: WidgetConfig) => void;
}

export function DashboardGrid({ widgets, ctx, editing, onLayout, onEdit, onRemove, onDuplicate }: Props) {
  const [mounted, setMounted] = useState(false);
  const isMobile = useIsMobile();
  useEffect(() => setMounted(true), []);

  if (!mounted) return <LayoutSkeleton widgets={widgets} />;
  if (!widgets.length) return <div className="surface flex h-60 items-center justify-center text-sm text-muted-foreground">Cette vue est vide. Cliquez sur « Personnaliser » puis « Ajouter un widget ».</div>;

  const sorted = [...widgets].sort((a, b) => a.layout.y - b.layout.y || a.layout.x - b.layout.x);
  const actions = (w: WidgetConfig) => (editing ? { onEdit: () => onEdit(w), onRemove: () => onRemove(w.id), onDuplicate: () => onDuplicate(w) } : { onEdit: () => onEdit(w) });

  if (isMobile) {
    const CAROUSEL = new Set<WidgetConfig["type"]>(["kpi", "pastel", "gauge"]);
    const height = (w: WidgetConfig) => (w.type === "section" ? 44 : w.type === "hero" ? undefined : Math.max(300, w.layout.h * ROW));
    const blocks: (WidgetConfig | WidgetConfig[])[] = [];
    for (const w of sorted) {
      const last = blocks.at(-1);
      if (CAROUSEL.has(w.type)) Array.isArray(last) ? last.push(w) : blocks.push([w]);
      else blocks.push(w);
    }
    return (
      <div className="space-y-4">
        {blocks.map((b) => Array.isArray(b) ? (
          <div key={b[0]!.id} className="-mx-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-3 pb-1 [scrollbar-width:none]">
            {b.map((w) => <div key={w.id} className="h-[170px] w-[80%] shrink-0 snap-start"><WidgetFrame config={w} ctx={ctx} {...actions(w)} /></div>)}
          </div>
        ) : (
          <div key={b.id} style={{ height: height(b) }} className={b.type === "hero" ? "min-h-[260px]" : undefined}><WidgetFrame config={b} ctx={ctx} {...actions(b)} /></div>
        ))}
      </div>
    );
  }

  return (
    <Grid
      className={editing ? "-mx-6" : "rgl-static -mx-6"}
      layout={widgets.map((w) => ({ i: w.id, ...w.layout, minW: 2, minH: 2 }))}
      cols={12}
      rowHeight={ROW}
      margin={[GAP, GAP]}
      containerPadding={[GAP, 0]}
      isDraggable={editing}
      isResizable={editing}
      draggableHandle=".drag-handle"
      onLayoutChange={(l) => editing && onLayout(l)}
      compactType="vertical"
    >
      {widgets.map((w) => (
        <div key={w.id}><WidgetFrame config={w} ctx={ctx} editing={editing} {...actions(w)} /></div>
      ))}
    </Grid>
  );
}

/** Skeletons placés exactement comme les widgets : aucun saut au chargement. */
export function LayoutSkeleton({ widgets }: { widgets: WidgetConfig[] }) {
  const rows = Math.max(1, ...widgets.map((w) => w.layout.y + w.layout.h));
  return (
    <>
    <div className="space-y-4 md:hidden">{widgets.slice(0, 6).map((w) => <Skeleton key={w.id} className="h-[170px] rounded-xl" />)}</div>
    <div className="relative hidden md:block" style={{ height: rows * ROW + (rows - 1) * GAP }}>
      {widgets.map((w) => (
        <Skeleton key={w.id} className="absolute rounded-xl" style={{
          left: `calc((100% + ${GAP}px) * ${w.layout.x / 12})`, width: `calc((100% + ${GAP}px) * ${w.layout.w / 12} - ${GAP}px)`,
          top: w.layout.y * (ROW + GAP), height: w.layout.h * ROW + (w.layout.h - 1) * GAP,
        }} />
      ))}
    </div>
    </>
  );
}
