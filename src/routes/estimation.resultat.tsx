import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { fr } from "@/locales/fr";

export const Route = createFileRoute("/estimation/resultat")({
  head: () => ({
    meta: [
      { title: `Résultat — ${fr.common.brand}` },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Résultat de l'estimation." },
      { property: "og:title", content: `Résultat — ${fr.common.brand}` },
      { property: "og:description", content: "Résultat de l'estimation." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title={fr.placeholders.result.title}
      body={fr.placeholders.result.body}
    />
  ),
});
