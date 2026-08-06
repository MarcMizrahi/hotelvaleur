import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { site } from "@/config/site";
import { regions } from "@/lib/regions";
import { operationLabel } from "@/lib/brokerage-matching";
import { listPublicAgents } from "@/lib/brokerage.functions";
import { Button } from "@/components/ui/button";

const agentsQuery = queryOptions({
  queryKey: ["public-agents"],
  queryFn: () => listPublicAgents(),
});

export const Route = createFileRoute("/experts")({
  loader: ({ context }) => context.queryClient.ensureQueryData(agentsQuery),
  head: () => ({
    meta: [
      { title: `Nos experts en cession hôtelière — ${site.name}` },
      {
        name: "description",
        content:
          "Agents spécialisés dans la vente d'hôtels en France : régions couvertes, segments traités et transactions réalisées.",
      },
      { property: "og:title", content: `Nos experts en cession hôtelière — ${site.name}` },
      {
        property: "og:description",
        content:
          "Un réseau d'agents spécialisés hôtellerie, sélectionnés par région et par segment.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  errorComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="font-serif text-3xl">Liste momentanément indisponible</h1>
      <p className="mt-3 text-muted-foreground">Réessayez dans quelques instants.</p>
    </main>
  ),
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="font-serif text-3xl">Page introuvable</h1>
    </main>
  ),
  component: ExpertsPage,
});

function ExpertsPage() {
  const { data } = useSuspenseQuery(agentsQuery);
  const [region, setRegion] = useState<string>("");

  const agents = useMemo(() => {
    if (!region) return data.agents;
    return data.agents.filter(
      (a) => (a.regions ?? []).length === 0 || (a.regions ?? []).includes(region),
    );
  }, [data.agents, region]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
        Les experts qui vendent des hôtels
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        Après votre estimation, nous vous mettons en relation avec un agent spécialisé hôtellerie,
        choisi selon votre région, la taille et le classement de votre établissement.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label htmlFor="region-filter" className="text-sm text-muted-foreground">
          Filtrer par région
        </label>
        <select
          id="region-filter"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">Toutes les régions</option>
          {regions.map((r) => (
            <option key={r.slug} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {agents.length === 0 ? (
        <p className="mt-10 rounded-lg border border-border bg-card p-6 text-muted-foreground">
          Aucun agent affiché pour cette région pour le moment. Lancez une estimation : nous
          identifions l'interlocuteur adapté à votre dossier.
        </p>
      ) : (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2">
          {agents.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start gap-4">
                {a.photo_url ? (
                  <img
                    src={a.photo_url}
                    alt={`Portrait de ${a.full_name}`}
                    loading="lazy"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-muted font-serif text-xl"
                  >
                    {a.full_name.slice(0, 1)}
                  </div>
                )}
                <div>
                  <h2 className="font-serif text-xl">{a.full_name}</h2>
                  {a.company && (
                    <p className="text-sm text-muted-foreground">{a.company}</p>
                  )}
                  {a.transactions_count > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {a.transactions_count} transactions accompagnées
                    </p>
                  )}
                </div>
              </div>
              {a.bio && <p className="mt-4 text-sm text-muted-foreground">{a.bio}</p>}
              <dl className="mt-4 space-y-1 text-sm">
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Régions :</dt>
                  <dd>
                    {(a.regions ?? []).length === 0
                      ? "France entière"
                      : (a.regions ?? [])
                          .map((s: string) => regions.find((r) => r.slug === s)?.name ?? s)
                          .join(", ")}
                  </dd>
                </div>
                {(a.star_ratings ?? []).length > 0 && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Classements :</dt>
                    <dd>{(a.star_ratings ?? []).join(", ")} étoiles</dd>
                  </div>
                )}
                {(a.transaction_types ?? []).length > 0 && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Opérations :</dt>
                    <dd>
                      {(a.transaction_types ?? [])
                        .map((t: string) => operationLabel(t))
                        .join(", ")}
                    </dd>
                  </div>
                )}
                {(a.languages ?? []).length > 0 && (
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Langues :</dt>
                    <dd>{(a.languages ?? []).join(", ")}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-12 rounded-xl border border-border bg-card p-8">
        <h2 className="font-serif text-2xl">Comment se passe la mise en relation</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Vous réalisez votre estimation en ligne (6 étapes, 3 minutes).</li>
          <li>Vous précisez votre intention et vos disponibilités.</li>
          <li>Un agent spécialisé de votre région vous contacte sous 48 heures ouvrées.</li>
        </ol>
        <Button asChild className="mt-6">
          <Link to="/estimation">Estimer mon hôtel</Link>
        </Button>
      </div>
    </main>
  );
}
