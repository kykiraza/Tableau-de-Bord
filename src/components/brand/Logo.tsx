import { Truck } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="logo-mark flex size-9 shrink-0 items-center justify-center rounded-[10px] text-primary-foreground">
        <Truck className="size-[18px]" strokeWidth={2.25} />
      </div>
      <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
        <div className="text-[14px] font-extrabold tracking-[0.12em] text-sidebar-primary">MADATRANS</div>
        <div className="text-[11px] text-sidebar-foreground">Pilotage financier</div>
      </div>
    </div>
  );
}
