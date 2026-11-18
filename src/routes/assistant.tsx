import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Assistant — MADATRANS" },
      { name: "description", content: "posez vos questions en français sur vos chiffres." },
      { property: "og:title", content: "Assistant — MADATRANS" },
      { property: "og:description", content: "posez vos questions en français sur vos chiffres." },
    ],
  }),
  component: () => <ComingSoon title="Assistant" description="Cet écran arrive bientôt : posez vos questions en français sur vos chiffres." />,
});
