import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Documents — MADATRANS" },
      { name: "description", content: "dépôt et contrôle des proformas et factures." },
      { property: "og:title", content: "Documents — MADATRANS" },
      { property: "og:description", content: "dépôt et contrôle des proformas et factures." },
    ],
  }),
  component: () => <ComingSoon title="Documents" description="Cet écran arrive bientôt : dépôt et contrôle des proformas et factures." />,
});
