import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface Option { value: string; label: string }

interface Props { label: string; options: Option[]; value: string[]; onChange: (v: string[]) => void; className?: string; mono?: boolean }

export function MultiSelect({ label, options, value, onChange, className, mono }: Props) {
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9 min-w-0 justify-between gap-1.5", value.length > 0 && "border-foreground/30 bg-muted", className)}>
          <span className="min-w-0 truncate">{label}</span>
          {value.length > 0 && <span className="rounded-full bg-foreground px-1.5 text-[10px] font-bold text-background">{value.length}</span>}
          <ChevronDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <Command>
          <CommandInput placeholder={`Rechercher…`} />
          <CommandList>
            <CommandEmpty>Aucun résultat</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} onSelect={() => toggle(o.value)} className="gap-2">
                  <span className={cn("flex size-4 items-center justify-center rounded-[4px] border", value.includes(o.value) ? "border-primary bg-primary text-primary-foreground" : "border-input")}>
                    {value.includes(o.value) && <Check className="size-3" />}
                  </span>
                  <span className={cn(mono && "font-mono text-xs")}>{o.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {value.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="w-full border-t px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted">
              Effacer la sélection
            </button>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
