import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { site } from "@/config/site";
import { getRegionBySlug } from "@/lib/regions";
import { Breadcrumbs, breadcrumbsJsonLd } from "@/components/breadcrumbs";
import { ValuationTable } from "@/components/valuation-table";
import { getRegionCoefficients } from "@/lib/coefficients.functions";
import { computeValuation, type Coefficient } from "@/lib/valuation";
import { formatEurosRange } from "@/lib/money";

const EXAMPLES: Array<{ label: string; stars: number; rooms: number }> = [
  { label: "Un 2 étoiles de 20 chambres", stars: 2, rooms: 20 },
  { label: "Un 3 étoiles de 35 chambres", stars: 3, rooms: 35 },
  { label: "Un 4 étoiles de 60 chambres", stars: 4, rooms: 60 },
];

export const Route = createFileRoute("/prix-hotel/$region/")({
  loader: ({ params }) => {
    const region = getRegionBySlug(params.region);
    if (!region) throw notFound();
    return { region };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Région introuvable" }, { name: "robots", content: "noindex" }] };
    }
    const r = loaderData.region;
    const title = `Prix de vente d'un hôtel en ${r.name}`;
    const desc = `Fourchettes de prix indicatives d'un hôtel en ${r.name} par classement, exemples chiffrés et liens vers les ${r.departments.length} départements.`;
    return {
      meta: [
        { title: `${title} — ${site.name}` },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "index,follow" },
      ],
      links: [{ rel: "canonical", href: `/prix-hotel/${params.region}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: breadcrumbsJsonLd([
            { label: "Accueil", to: "/" },
            { label: "Prix par région", to: "/prix-hotel" },
            { label: r.name },
          ]),
        },
      ],
    };
  },
  component: RegionPage,
});

function RegionPage() {
  const { region } = Route.useLoaderData();
  const fetchCoefs = useServerFn(getRegionCoefficients);
  const { data: coefficients = [], isPending } = useQuery({
    queryKey: ["coefficients", region.slug],
    queryFn: () => fetchCoefs({ data: { regionSlug: region.slug } }),
    staleTime: 60 * 60 * 1000,
  });

  const byStar = new Map(coefficients.map((c) => [c.star_rating, c]));

  return (
    <article className="container-page py-10 md:py-16">
      <Breadcrumbs
        items={[
          { label: "Accueil", to: "/" },
          { label: "Prix par région", to: "/prix-hotel" },
          { label: region.name },
        ]}
      />

      <header className="mt-6 max-w-3xl">
        <h1 className="font-serif text-3xl md:text-5xl text-navy leading-tight">
          Prix de vente d'un hôtel en {region.name}
        </h1>
        <p className="mt-6 text-lg text-foreground/80 leading-relaxed">{region.context}</p>
      </header>

      <section className="mt-12" aria-labelledby="fourchettes">
        <h2 id="fourchettes" className="font-serif text-2xl text-navy">
          Fourchettes indicatives par classement
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Prix par chambre et multiples d'EBITDA appliqués en {region.name}. Ces valeurs
          sont modulées par le département et par les caractéristiques de l'établissement.
        </p>
        <div className="mt-4">
          {isPending ? (
            <div className="h-40 animate-pulse rounded-md border border-border bg-surface" />
          ) : (
            <ValuationTable coefficients={coefficients} />
          )}
        </div>
      </section>

      {coefficients.length > 0 && (
        <section className="mt-12" aria-labelledby="exemples">
          <h2 id="exemples" className="font-serif text-2xl text-navy">
            Exemples chiffrés
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Résultats produits par notre moteur de valorisation pour la région {region.name},
            transaction murs et fonds, sans travaux importants ni ajustement particulier.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {EXAMPLES.map((ex) => (
              <ExampleCard key={ex.label} example={ex} coefficient={byStar.get(ex.stars)} regionSlug={region.slug} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12" aria-labelledby="facteurs">
        <h2 id="facteurs" className="font-serif text-2xl text-navy">
          Ce qui fait varier le prix en {region.name}
        </h2>
        <ul className="mt-4 space-y-2 text-foreground/85 list-disc pl-5">
          {region.factors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="departements">
        <h2 id="departements" className="font-serif text-2xl text-navy">
          Départements de {region.name}
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {region.departments.map((d) => (
            <li key={d.code}>
              <Link
                to="/prix-hotel/$region/$departement"
                params={{ region: region.slug, departement: d.slug }}
                className="block rounded-md border border-border bg-card p-4 hover:border-navy transition-colors min-h-[60px]"
              >
                <span className="font-medium text-navy">{d.name}</span>
                <span className="ml-2 text-sm text-muted-foreground tabular-nums">({d.code})</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 rounded-lg border border-border bg-surface p-8">
        <h2 className="font-serif text-2xl text-navy">Obtenez une fourchette personnalisée</h2>
        <p className="mt-3 text-foreground/80 max-w-2xl">
          Chaque hôtel est unique. Renseignez vos caractéristiques précises pour affiner
          la fourchette et recevoir le détail de la méthode par email.
        </p>
        <Link
          to="/estimation"
          className="mt-5 inline-flex h-12 items-center justify-center rounded-md bg-navy px-6 text-sm font-medium text-navy-foreground hover:bg-navy/90"
        >
          Estimer mon hôtel
        </Link>
      </section>

      <section className="mt-12" aria-labelledby="guides">
        <h2 id="guides" className="font-serif text-2xl text-navy">Aller plus loin</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          <li>
            <Link to="/guides/$slug" params={{ slug: "combien-vaut-mon-hotel" }} className="block rounded-md border border-border bg-card p-4 hover:border-navy">
              <span className="font-medium text-navy">Les méthodes de valorisation</span>
              <span className="block text-sm text-muted-foreground mt-1">Multiple d'EBITDA, prix par chambre, rendement.</span>
            </Link>
          </li>
          <li>
            <Link to="/guides/$slug" params={{ slug: "vendre-son-hotel-etapes" }} className="block rounded-md border border-border bg-card p-4 hover:border-navy">
              <span className="font-medium text-navy">Vendre son hôtel : étapes et calendrier</span>
              <span className="block text-sm text-muted-foreground mt-1">Une cession prend en général 12 à 18 mois.</span>
            </Link>
          </li>
        </ul>
      </section>

      <p className="mt-10 text-xs text-muted-foreground">
        Sources : coefficients internes {site.name} calibrés sur les références du
        marché hôtelier français. Dernière mise à jour de la table de référence :{" "}
        {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}.
      </p>
    </article>
  );
}

function ExampleCard({
  example,
  coefficient,
  regionSlug,
}: {
  example: { label: string; stars: number; rooms: number };
  coefficient?: Coefficient;
  regionSlug: string;
}) {
  if (!coefficient) {
    return (
      <div className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
        {example.label} — donnée indisponible pour ce classement.
      </div>
    );
  }
  const res = computeValuation(
    {
      regionSlug,
      starRating: example.stars,
      roomCount: example.rooms,
      transactionType: "murs_fonds",
    },
    coefficient,
  );
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="font-medium text-navy">{example.label}</div>
      <div className="mt-2 text-lg tabular-nums text-navy">
        {formatEurosRange(res.valueLowCents, res.valueHighCents)}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Méthode : {res.methodUsed === "per_room" ? "prix par chambre" : "mixte"}
      </div>
    </div>
  );
}
