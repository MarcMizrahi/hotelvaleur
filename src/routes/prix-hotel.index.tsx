import { createFileRoute, Link } from "@tanstack/react-router";
import { fr } from "@/locales/fr";
import { regions } from "@/lib/regions";

export const Route = createFileRoute("/prix-hotel/")({
  head: () => ({
    meta: [
      { title: `Prix de vente d'un hôtel par région — ${fr.common.brand}` },
      {
        name: "description",
        content:
          "Les prix de vente indicatifs d'un hôtel dans les 13 régions de France métropolitaine.",
      },
      { property: "og:title", content: `Prix par région — ${fr.common.brand}` },
      {
        property: "og:description",
        content: "Les prix de vente indicatifs d'un hôtel par région.",
      },
    ],
  }),
  component: PricesIndex,
});

function PricesIndex() {
  return (
    <div className="container-page py-16 md:py-24">
      <div className="max-w-3xl">
        <h1 className="font-serif text-3xl md:text-5xl text-navy">
          {fr.placeholders.prices_index.title}
        </h1>
        <p className="mt-6 text-lg text-foreground/80">
          {fr.placeholders.prices_index.body}
        </p>
      </div>
      <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {regions.map((r) => (
          <li key={r.slug}>
            <Link
              to="/prix-hotel/$region"
              params={{ region: r.slug }}
              className="block rounded-md border border-border bg-card p-4 hover:border-navy transition-colors"
            >
              <span className="font-medium text-navy">{r.name}</span>
              <span className="block text-sm text-muted-foreground mt-1">
                {r.departments.length} départements
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
