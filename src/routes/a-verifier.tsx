import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/a-verifier")({
  head: () => ({
    meta: [
      { title: "À vérifier — MADATRANS" },
      { name: "description", content: "file des éléments à valider ou corriger." },
      { property: "og:title", content: "À vérifier — MADATRANS" },
      { property: "og:description", content: "file des éléments à valider ou corriger." },
    ],
  }),
  component: () => <ComingSoon title="À vérifier" description="Cet écran arrive bientôt : file des éléments à valider ou corriger." />,
});
