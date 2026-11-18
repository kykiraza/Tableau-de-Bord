import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";
import { Plate } from "@/components/brand/Plate";
import { trucks } from "@/mocks/rawData";

export const Route = createFileRoute("/camions/$id")({
  head: ({ params }) => {
    const t = trucks.find((x) => x.id === params.id);
    const title = `${t?.plate ?? "Camion"} — Fiche camion MADATRANS`;
    const desc = "Rentabilité, coûts, gasoil et entretien du camion.";
    return { meta: [{ title }, { name: "description", content: desc }, { property: "og:title", content: title }, { property: "og:description", content: desc }] };
  },
  component: TruckPage,
});

function TruckPage() {
  const { id } = Route.useParams();
  const t = trucks.find((x) => x.id === id);
  return (
    <div className="space-y-4">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Tableau de bord</Link>
      {t && <div className="flex items-center gap-3"><Plate plate={t.plate} className="text-sm" /><span className="text-sm text-muted-foreground">{t.model}</span></div>}
      <ComingSoon title="Fiche camion" description="Cet écran arrive bientôt : KPI, évolution mensuelle, gasoil, entretien et historique du camion." />
    </div>
  );
}
