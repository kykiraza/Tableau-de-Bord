import { Construction } from "lucide-react";
import { PageHeader } from "./PageHeader";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <div className="flex flex-col items-center justify-center surface border-dashed px-6 py-20 text-center">
        <Construction className="mb-3 size-8 text-muted-foreground" />
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
