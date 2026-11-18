import { cn } from "@/lib/utils";

/** Plaque d'immatriculation stylisée (bande bleue à gauche, police mono). */
export function Plate({ plate, className }: { plate: string; className?: string }) {
  return (
    <span className={cn("plate", className)}>
      <span className="px-1.5 py-[3px]">{plate}</span>
    </span>
  );
}
