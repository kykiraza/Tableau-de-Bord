import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — MADATRANS" },
      { name: "description", content: "forfaits, indexations, TVA, utilisateurs et synchro Qonto." },
      { property: "og:title", content: "Paramètres — MADATRANS" },
      { property: "og:description", content: "forfaits, indexations, TVA, utilisateurs et synchro Qonto." },
    ],
  }),
  component: () => <ComingSoon title="Paramètres" description="Cet écran arrive bientôt : forfaits, indexations, TVA, utilisateurs et synchro Qonto." />,
});
