import { createFileRoute, notFound } from "@tanstack/react-router";
import { fr } from "@/locales/fr";
import { getDepartmentBySlug } from "@/lib/regions";

export const Route = createFileRoute("/prix-hotel/$region/$departement")({
  loader: ({ params }) => {
    const found = getDepartmentBySlug(params.region, params.departement);
    if (!found) throw notFound();
    return found;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: `Département introuvable — ${fr.common.brand}` },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `Prix de vente d'un hôtel dans le ${loaderData.department.name} — ${fr.common.brand}`;
    const desc = `Fourchettes de prix indicatives pour un hôtel dans le département du ${loaderData.department.name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: DepartmentPage,
});

function DepartmentPage() {
  const { department, region } = Route.useLoaderData();
  return (
    <div className="container-page py-16 md:py-24">
      <p className="text-sm text-muted-foreground">
        {region.name} · <span className="tabular">{department.code}</span>
      </p>
      <h1 className="mt-2 font-serif text-3xl md:text-5xl text-navy">
        {fr.placeholders.department.title(department.name)}
      </h1>
      <p className="mt-6 text-lg text-foreground/80 max-w-3xl">
        {fr.placeholders.department.body}
      </p>
    </div>
  );
}
