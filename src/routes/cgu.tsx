import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { fr } from "@/locales/fr";

export const Route = createFileRoute("/cgu")({
  head: () => ({
    meta: [
      { title: `Conditions d'utilisation — ${fr.common.brand}` },
      { name: "description", content: "Conditions d'utilisation." },
      { property: "og:title", content: `CGU — ${fr.common.brand}` },
      { property: "og:description", content: "Conditions d'utilisation." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title={fr.placeholders.terms.title}
      body={fr.placeholders.terms.body}
    />
  ),
});
