import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { site } from "@/config/site";
import { getDepartmentBySlug } from "@/lib/regions";
import { Breadcrumbs, breadcrumbsJsonLd } from "@/components/breadcrumbs";
import { ValuationTable } from "@/components/valuation-table";
import { getRegionCoefficients } from "@/lib/coefficients.functions";
import { computeValuation } from "@/lib/valuation";
import { formatEurosRange } from "@/lib/money";

export const Route = createFileRoute("/prix-hotel/$region/$departement")({
  loader: ({ params }) => {
    const match = getDepartmentBySlug(params.region, params.departement);
    if (!match) throw notFound();
    return match;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Département introuvable" }, { name: "robots", content: "noindex" }] };
    }
    const { region, department } = loaderData;
    const title = `Prix de vente d'un hôtel dans le ${department.name}`;
    const desc = `Fourchettes de prix d'un hôtel dans le ${department.name} (${department.code}), en ${region.name}, avec exemples chiffrés et facteurs de variation.`;
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
      links: [{ rel: "canonical", href: `/prix-hotel/${params.region}/${params.departement}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: breadcrumbsJsonLd([
            { label: "Accueil", to: "/" },
            { label: "Prix par région", to: "/prix-hotel" },
            { label: region.name, to: `/prix-hotel/${region.slug}` },
            { label: department.name },
          ]),
        },
      ],
    };
  },
  component: DepartmentPage,
});

function DepartmentPage() {
  const { region, department } = Route.useLoaderData();
  const fetchCoefs = useServerFn(getRegionCoefficients);
  const { data: coefficients = [], isPending } = useQuery({
    queryKey: ["coefficients", region.slug],
    queryFn: () => fetchCoefs({ data: { regionSlug: region.slug } }),
    staleTime: 60 * 60 * 1000,
  });

  const neighbours = region.departments.filter((d) => d.slug !== department.slug).slice(0, 3);
  const coef3 = coefficients.find((c) => c.star_rating === 3);
  const coef2 = coefficients.find((c) => c.star_rating === 2);
  const example3 = coef3
    ? computeValuation(
        { regionSlug: region.slug, starRating: 3, roomCount: 30, transactionType: "murs_fonds" },
        coef3,
      )
    : null;
  const example2 = coef2
    ? computeValuation(
        { regionSlug: region.slug, starRating: 2, roomCount: 18, transactionType: "murs_fonds" },
        coef2,
      )
    : null;

  return (
    <article className="container-page py-10 md:py-16">
      <Breadcrumbs
        items={[
          { label: "Accueil", to: "/" },
          { label: "Prix par région", to: "/prix-hotel" },
          { label: region.name, to: `/prix-hotel/${region.slug}` },
          { label: department.name },
        ]}
      />

      <header className="mt-6 max-w-3xl">
        <h1 className="font-serif text-3xl md:text-5xl text-navy leading-tight">
          Prix de vente d'un hôtel dans le {department.name}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Département {department.code}, région{" "}
          <Link to="/prix-hotel/$region" params={{ region: region.slug }} className="underline hover:text-navy">
            {region.name}
          </Link>
          .
        </p>
        <p className="mt-6 text-lg text-foreground/80 leading-relaxed">
          Les fourchettes ci-dessous s'appliquent à l'ensemble de la région{" "}
          {region.name} et servent de base à l'estimation dans le {department.name}.
          Elles sont modulées, pour un établissement précis, par la commune, l'état du
          bâti et la qualité d'exploitation.
        </p>
      </header>

      <section className="mt-10" aria-labelledby="fourchettes">
        <h2 id="fourchettes" className="font-serif text-2xl text-navy">
          Fourchettes indicatives par classement
        </h2>
        <div className="mt-4">
          {isPending ? (
            <div className="h-40 animate-pulse rounded-md border border-border bg-surface" />
          ) : (
            <ValuationTable coefficients={coefficients} />
          )}
        </div>
      </section>

      {(example2 || example3) && (
        <section className="mt-10" aria-labelledby="exemples">
          <h2 id="exemples" className="font-serif text-2xl text-navy">Exemples chiffrés</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {example2 && (
              <div className="rounded-md border border-border bg-card p-5">
                <div className="font-medium text-navy">Un 2 étoiles de 18 chambres</div>
                <div className="mt-2 text-lg tabular-nums text-navy">
                  {formatEurosRange(example2.valueLowCents, example2.valueHighCents)}
                </div>
              </div>
            )}
            {example3 && (
              <div className="rounded-md border border-border bg-card p-5">
                <div className="font-medium text-navy">Un 3 étoiles de 30 chambres</div>
                <div className="mt-2 text-lg tabular-nums text-navy">
                  {formatEurosRange(example3.valueLowCents, example3.valueHighCents)}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mt-10" aria-labelledby="facteurs">
        <h2 id="facteurs" className="font-serif text-2xl text-navy">
          Particularités du {department.name}
        </h2>
        <p className="mt-3 text-foreground/85">
          Les principaux facteurs de variation en {region.name} — profil {region.profile} —
          s'appliquent au {department.name} :
        </p>
        <ul className="mt-3 space-y-2 text-foreground/85 list-disc pl-5">
          {region.factors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      {neighbours.length > 0 && (
        <section className="mt-10" aria-labelledby="voisins">
          <h2 id="voisins" className="font-serif text-2xl text-navy">
            Autres départements de {region.name}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {neighbours.map((d) => (
              <li key={d.code}>
                <Link
                  to="/prix-hotel/$region/$departement"
                  params={{ region: region.slug, departement: d.slug }}
                  className="block rounded-md border border-border bg-card p-4 hover:border-navy"
                >
                  <span className="font-medium text-navy">{d.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground tabular-nums">({d.code})</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-14 rounded-lg border border-border bg-surface p-8">
        <h2 className="font-serif text-2xl text-navy">Estimation personnalisée dans le {department.name}</h2>
        <p className="mt-3 text-foreground/80 max-w-2xl">
          Renseignez les caractéristiques précises de votre hôtel pour obtenir une
          fourchette calibrée par notre moteur, gratuitement et sans engagement.
        </p>
        <Link
          to="/estimation"
          className="mt-5 inline-flex h-12 items-center justify-center rounded-md bg-navy px-6 text-sm font-medium text-navy-foreground hover:bg-navy/90"
        >
          Estimer mon hôtel
        </Link>
      </div>
    </article>
  );
}
