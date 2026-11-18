import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/connexion")({
  head: () => ({
    meta: [
      { title: "Connexion — MADATRANS" },
      { name: "description", content: "page de connexion." },
      { property: "og:title", content: "Connexion — MADATRANS" },
      { property: "og:description", content: "page de connexion." },
    ],
  }),
  component: () => <ComingSoon title="Connexion" description="Cet écran arrive bientôt : page de connexion." />,
});
