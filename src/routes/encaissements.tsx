import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/encaissements")({
  head: () => ({
    meta: [
      { title: "Encaissements — MADATRANS" },
      { name: "description", content: "facturé, encaissé et en attente par client." },
      { property: "og:title", content: "Encaissements — MADATRANS" },
      { property: "og:description", content: "facturé, encaissé et en attente par client." },
    ],
  }),
  component: () => <ComingSoon title="Encaissements" description="Cet écran arrive bientôt : facturé, encaissé et en attente par client." />,
});
