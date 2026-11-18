import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/referentiels")({
  head: () => ({
    meta: [
      { title: "Référentiels — MADATRANS" },
      { name: "description", content: "camions, chauffeurs, clients, postes et affectations." },
      { property: "og:title", content: "Référentiels — MADATRANS" },
      { property: "og:description", content: "camions, chauffeurs, clients, postes et affectations." },
    ],
  }),
  component: () => <ComingSoon title="Référentiels" description="Cet écran arrive bientôt : camions, chauffeurs, clients, postes et affectations." />,
});
