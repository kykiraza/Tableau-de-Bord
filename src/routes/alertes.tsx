import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/alertes")({
  head: () => ({
    meta: [
      { title: "Alertes — MADATRANS" },
      { name: "description", content: "liste des anomalies détectées." },
      { property: "og:title", content: "Alertes — MADATRANS" },
      { property: "og:description", content: "liste des anomalies détectées." },
    ],
  }),
  component: () => <ComingSoon title="Alertes" description="Cet écran arrive bientôt : liste des anomalies détectées." />,
});
