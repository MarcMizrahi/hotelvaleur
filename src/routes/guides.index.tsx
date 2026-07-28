import { createFileRoute, Link } from "@tanstack/react-router";
import { site } from "@/config/site";
import { guides } from "@/content/guides";
import { Breadcrumbs, breadcrumbsJsonLd } from "@/components/breadcrumbs";

const TITLE = "Guides pour propriétaires d'hôtels";
const DESC =
  "Méthodes de valorisation, étapes d'une cession, indicateurs à suivre : nos guides pour préparer sereinement un projet de vente hôtelière.";

export const Route = createFileRoute("/guides/")({
  head: () => ({
    meta: [
      { title: `${TITLE} — ${site.name}` },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "/guides" }],
    scripts: [
      {
        type: "application/ld+json",
        children: breadcrumbsJsonLd([{ label: "Accueil", to: "/" }, { label: "Guides" }]),
      },
    ],
  }),
  component: GuidesIndex,
});

function GuidesIndex() {
  return (
    <div className="container-page py-10 md:py-16">
      <Breadcrumbs items={[{ label: "Accueil", to: "/" }, { label: "Guides" }]} />
      <header className="mt-6 max-w-3xl">
        <h1 className="font-serif text-3xl md:text-5xl text-navy">Guides</h1>
        <p className="mt-6 text-lg text-foreground/80 leading-relaxed">
          Trois articles de fond pour comprendre comment un hôtel est valorisé, comment
          se déroule une cession, et quels indicateurs suivre pour piloter votre
          établissement.
        </p>
      </header>

      <ul className="mt-10 grid gap-6 md:grid-cols-2">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link
              to="/guides/$slug"
              params={{ slug: g.slug }}
              className="block rounded-md border border-border bg-card p-6 hover:border-navy transition-colors"
            >
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {g.readingMinutes} min de lecture
              </div>
              <h2 className="mt-2 font-serif text-xl text-navy">{g.title}</h2>
              <p className="mt-2 text-foreground/80">{g.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
