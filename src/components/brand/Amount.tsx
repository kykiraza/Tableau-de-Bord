import { cn } from "@/lib/utils";

/** Montant façon relevé bancaire : centimes et symbole € plus petits et plus clairs. */
export function Amount({ text, className, minorClassName }: { text: string; className?: string; minorClassName?: string }) {
  const m = text.match(/^(.*?)(,\d{2})?(\s?€.*)?$/);
  const main = m?.[1] ?? text, cents = m?.[2] ?? "", unit = m?.[3] ?? "";
  return (
    <span className={cn("tabular", className)}>
      {main}
      {(cents || unit) && <span className={cn("text-[0.6em] font-medium opacity-55", minorClassName)}>{cents}{unit}</span>}
    </span>
  );
}
