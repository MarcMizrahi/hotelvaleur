import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { fr } from "@/locales/fr";

export const Route = createFileRoute("/mentions-legales")({
  head: () => ({
    meta: [
      { title: `Mentions légales — ${fr.common.brand}` },
      { name: "description", content: "Mentions légales du site." },
      { property: "og:title", content: `Mentions légales — ${fr.common.brand}` },
      { property: "og:description", content: "Mentions légales du site." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title={fr.placeholders.legal.title}
      body={fr.placeholders.legal.body}
    />
  ),
});
