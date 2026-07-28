import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { fr } from "@/locales/fr";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: `Administration — ${fr.common.brand}` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title={fr.placeholders.admin.title}
      body={fr.placeholders.admin.body}
    />
  ),
});
