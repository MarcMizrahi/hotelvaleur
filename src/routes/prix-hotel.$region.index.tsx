import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { fr } from "@/locales/fr";
import { getRegionBySlug } from "@/lib/regions";

export const Route = createFileRoute("/prix-hotel/$region/")({
  loader: ({ params }) => {
    const region = getRegionBySlug(params.region);
    if (!region) throw notFound();
    return { region };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: `Région introuvable — ${fr.common.brand}` },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `Prix de vente d'un hôtel en ${loaderData.region.name} — ${fr.common.brand}`;
    const desc = `Fourchettes de prix indicatives pour un hôtel en ${loaderData.region.name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: RegionPage,
});

function RegionPage() {
  const { region } = Route.useLoaderData();
  return (
    <div className="container-page py-16 md:py-24">
      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl md:text-5xl text-navy">
          {fr.placeholders.region.title(region.name)}
        </h1>
        <p className="mt-6 text-lg text-foreground/80">
          {fr.placeholders.region.body}
        </p>
      </div>
      <h2 className="mt-12 font-serif text-2xl text-navy">Départements</h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {region.departments.map((d: (typeof region.departments)[number]) => (
          <li key={d.code}>
            <Link
              to="/prix-hotel/$region/$departement"
              params={{ region: region.slug, departement: d.slug }}
              className="block rounded-md border border-border bg-card p-4 hover:border-navy transition-colors"
            >
              <span className="font-medium text-navy">{d.name}</span>
              <span className="block text-sm text-muted-foreground mt-1 tabular">
                {d.code}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
