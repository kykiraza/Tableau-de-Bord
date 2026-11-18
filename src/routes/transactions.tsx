import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/layout/ComingSoon";

export const Route = createFileRoute("/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions — MADATRANS" },
      { name: "description", content: "toutes les transactions Qonto, filtrables et classables." },
      { property: "og:title", content: "Transactions — MADATRANS" },
      { property: "og:description", content: "toutes les transactions Qonto, filtrables et classables." },
    ],
  }),
  component: () => <ComingSoon title="Transactions" description="Cet écran arrive bientôt : toutes les transactions Qonto, filtrables et classables." />,
});
