import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { fr } from "@/locales/fr";

export const Route = createFileRoute("/guides/")({
  head: () => ({
    meta: [
      { title: `Guides — ${fr.common.brand}` },
      { name: "description", content: "Guides sur la valorisation et la vente d'un hôtel." },
      { property: "og:title", content: `Guides — ${fr.common.brand}` },
      { property: "og:description", content: "Guides sur la valorisation et la vente d'un hôtel." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title={fr.placeholders.guides_index.title}
      body={fr.placeholders.guides_index.body}
    />
  ),
});
