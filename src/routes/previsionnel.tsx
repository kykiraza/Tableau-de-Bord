import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/previsionnel")({
  head: () => ({
    meta: [
      { title: "Prévisionnel — MADATRANS" },
      { name: "description", content: "CA, coûts et marge des 3 prochains mois." },
      { property: "og:title", content: "Prévisionnel — MADATRANS" },
      { property: "og:description", content: "CA, coûts et marge des 3 prochains mois." },
    ],
  }),
  component: () => <ComingSoon title="Prévisionnel" description="Cet écran arrive bientôt : CA, coûts et marge des 3 prochains mois." />,
});
