import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAgentSpace, listMyAgentRequests } from "@/lib/agent-space.functions";
import { Empty, Stat } from "@/components/agent-space-ui";
import { getRegionBySlug } from "@/lib/regions";
import { formatEurosRange } from "@/lib/money";

const STATUS_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  qualifie: "Qualifié",
  injoignable: "Injoignable",
  hors_cible: "Hors cible",
  archive: "Archivé",
};

export const Route = createFileRoute("/espace-agent/zones")({
  component: AgentZones,
});

function regionName(slug: string | null | undefined): string {
  if (!slug) return "Zone non précisée";
  return getRegionBySlug(slug)?.name ?? slug;
}

function AgentZones() {
  const fetchSpace = useServerFn(getAgentSpace);
  const fetchRequests = useServerFn(listMyAgentRequests);

  const { data: space } = useQuery({
    queryKey: ["agent-space"],
    queryFn: () => fetchSpace(),
    retry: false,
  });
  const { data: requests } = useQuery({
    queryKey: ["agent-requests"],
    queryFn: () => fetchRequests(),
    retry: false,
    enabled: !!space?.isAgent,
  });

  if (!space || !space.isAgent) return null;

  // Regroupe estimations + demandes par région. Les régions de couverture
  // de l'agent apparaissent même sans activité.
  const zones = new Map<
    string,
    {
      estimations: typeof space.estimations;
      requests: NonNullable<typeof requests>["requests"];
    }
  >();

  const ensure = (slug: string) => {
    if (!zones.has(slug)) zones.set(slug, { estimations: [], requests: [] });
    return zones.get(slug)!;
  };

  for (const r of space.agent.regions ?? []) ensure(r);
  for (const e of space.estimations) ensure(e.region_slug).estimations.push(e);
  for (const req of requests?.requests ?? []) {
    ensure(req.region_slug ?? "autre").requests.push(req);
  }

  const sorted = [...zones.entries()].sort(
    (a, b) =>
      b[1].estimations.length + b[1].requests.length -
      (a[1].estimations.length + a[1].requests.length),
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl text-navy">Tableau de bord par zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Votre activité regroupée par région : estimations attribuées et demandes de
          valorisation envoyées.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-border bg-background">
          <Empty text="Aucune zone d'activité pour le moment." />
        </div>
      ) : (
        sorted.map(([slug, zone]) => {
          const totalLow = zone.estimations.reduce(
            (s, e) => s + (e.value_low_cents ?? 0),
            0,
          );
          const totalHigh = zone.estimations.reduce(
            (s, e) => s + (e.value_high_cents ?? 0),
            0,
          );
          const open = zone.estimations.filter((e) => e.status === "nouveau").length;

          return (
            <section
              key={slug}
              className="rounded-xl border border-border bg-background p-5 space-y-4"
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-serif text-xl text-navy">{regionName(slug)}</h3>
                <p className="text-sm text-muted-foreground">
                  {zone.estimations.length} estimation
                  {zone.estimations.length > 1 ? "s" : ""} · {zone.requests.length} demande
                  {zone.requests.length > 1 ? "s" : ""}
                </p>
              </header>

              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Estimations attribuées" value={zone.estimations.length} />
                <Stat label="À traiter" value={open} />
                <Stat label="Demandes envoyées" value={zone.requests.length} />
              </div>

              {zone.estimations.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Hôtel</th>
                        <th className="py-2 pr-4 font-medium">Ville</th>
                        <th className="py-2 pr-4 font-medium">Fourchette</th>
                        <th className="py-2 pr-4 font-medium">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {zone.estimations.map((e) => (
                        <tr key={e.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-4 text-navy">
                            {e.hotel_name || "Hôtel non nommé"}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">
                            {e.city ?? "—"}
                          </td>
                          <td className="py-2 pr-4 text-navy whitespace-nowrap">
                            {formatEurosRange(e.value_low_cents, e.value_high_cents)}
                          </td>
                          <td className="py-2 pr-4">
                            <span className="rounded bg-navy/10 px-2 py-0.5 text-xs text-navy">
                              {STATUS_LABELS[e.status] ?? e.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="pt-2 text-xs text-muted-foreground">
                    Valeur cumulée des dossiers : {formatEurosRange(totalLow, totalHigh)}
                  </p>
                </div>
              )}

              {zone.requests.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-navy">Demandes de valorisation</p>
                  {zone.requests.map((r) => (
                    <div
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface px-3 py-2 text-sm"
                    >
                      <span className="text-navy">
                        {r.hotel_name}
                        {r.city ? ` · ${r.city}` : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("fr-FR")} ·{" "}
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
