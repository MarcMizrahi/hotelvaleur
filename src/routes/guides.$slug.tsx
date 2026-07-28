import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { fr } from "@/locales/fr";

export const Route = createFileRoute("/guides/$slug")({
  head: () => ({
    meta: [
      { title: `Guide — ${fr.common.brand}` },
      { name: "description", content: "Guide en cours de rédaction." },
      { property: "og:title", content: `Guide — ${fr.common.brand}` },
      { property: "og:description", content: "Guide en cours de rédaction." },
    ],
  }),
  component: () => (
    <PlaceholderPage
      title={fr.placeholders.guide.title}
      body={fr.placeholders.guide.body}
    />
  ),
});
