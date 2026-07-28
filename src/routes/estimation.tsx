import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { fr } from "@/locales/fr";

export const Route = createFileRoute("/estimation")({
  head: () => ({
    meta: [
      { title: `Estimation — ${fr.common.brand}` },
      { name: "description", content: "Formulaire d'estimation de la valeur de votre hôtel." },
      { property: "og:title", content: `Estimation — ${fr.common.brand}` },
      { property: "og:description", content: "Formulaire d'estimation de la valeur de votre hôtel." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title={fr.placeholders.estimation.title}
      body={fr.placeholders.estimation.body}
    />
  ),
});
