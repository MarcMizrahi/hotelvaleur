import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { fr } from "@/locales/fr";

export const Route = createFileRoute("/confidentialite")({
  head: () => ({
    meta: [
      { title: `Confidentialité — ${fr.common.brand}` },
      { name: "description", content: "Politique de confidentialité." },
      { property: "og:title", content: `Confidentialité — ${fr.common.brand}` },
      { property: "og:description", content: "Politique de confidentialité." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title={fr.placeholders.privacy.title}
      body={fr.placeholders.privacy.body}
    />
  ),
});
