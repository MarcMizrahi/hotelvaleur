import { createFileRoute, Link } from "@tanstack/react-router";
import { site } from "@/config/site";
import { regions } from "@/lib/regions";
import { Breadcrumbs, breadcrumbsJsonLd } from "@/components/breadcrumbs";

const TITLE = "Prix de vente d'un hôtel en France par région";
const DESC =
  "Fourchettes de prix indicatives d'un hôtel dans les 13 régions de France métropolitaine, par classement et par département.";

export const Route = createFileRoute("/prix-hotel/")({
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
    links: [{ rel: "canonical", href: "/prix-hotel" }],
    scripts: [
      {
        type: "application/ld+json",
        children: breadcrumbsJsonLd([
          { label: "Accueil", to: "/" },
          { label: "Prix par région" },
        ]),
      },
    ],
  }),
  component: PricesIndex,
});

function PricesIndex() {
  return (
    <div className="container-page py-10 md:py-16">
      <Breadcrumbs items={[{ label: "Accueil", to: "/" }, { label: "Prix par région" }]} />
      <header className="mt-6 max-w-3xl">
        <h1 className="font-serif text-3xl md:text-5xl text-navy">
          Prix de vente d'un hôtel en France
        </h1>
        <p className="mt-6 text-lg text-foreground/80 leading-relaxed">
          Explorez les fourchettes de valeur indicatives d'un hôtel dans les 13 régions
          métropolitaines. Chaque page régionale détaille les prix par chambre et les
          multiples d'EBITDA observés par classement, avec des exemples chiffrés
          calculés par notre moteur de valorisation. Les prix par chambre sont ensuite
          modulés au département.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Ces fourchettes sont des ordres de grandeur du marché français ; elles
          varient selon la localisation précise, l'état du bâti et la qualité
          d'exploitation.
        </p>
      </header>

      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {regions.map((r) => (
          <li key={r.slug}>
            <Link
              to="/prix-hotel/$region"
              params={{ region: r.slug }}
              className="block rounded-md border border-border bg-card p-4 hover:border-navy transition-colors min-h-[64px]"
            >
              <span className="font-medium text-navy">{r.name}</span>
              <span className="block text-sm text-muted-foreground mt-1">
                {r.departments.length} départements · profil {r.profile}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-16 rounded-lg border border-border bg-surface p-8 text-center">
        <h2 className="font-serif text-2xl text-navy">Estimation personnalisée</h2>
        <p className="mt-3 text-foreground/80 max-w-2xl mx-auto">
          Obtenez une fourchette adaptée à votre établissement en 3 minutes, gratuitement
          et sans engagement.
        </p>
        <Link
          to="/estimation"
          className="mt-6 inline-flex h-12 items-center justify-center rounded-md bg-navy px-6 text-sm font-medium text-navy-foreground hover:bg-navy/90"
        >
          Estimer mon hôtel
        </Link>
      </div>
    </div>
  );
}
