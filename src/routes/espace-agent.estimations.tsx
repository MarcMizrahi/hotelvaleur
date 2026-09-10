import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAgentSpace } from "@/lib/agent-space.functions";
import { Empty, SectionCard } from "@/components/agent-space-ui";
import { formatEurosRange } from "@/lib/money";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  nouveau: { label: "Nouveau", className: "bg-navy/10 text-navy" },
  qualifie: { label: "Qualifié", className: "bg-emerald-100 text-emerald-800" },
  injoignable: { label: "Injoignable", className: "bg-amber-100 text-amber-800" },
  hors_cible: { label: "Hors cible", className: "bg-slate-200 text-slate-700" },
  archive: { label: "Archivé", className: "bg-slate-200 text-slate-500" },
};

export const Route = createFileRoute("/espace-agent/estimations")({
  component: AgentEstimationsPage,
});

function AgentEstimationsPage() {
  const fetchSpace = useServerFn(getAgentSpace);
  const { data } = useQuery({
    queryKey: ["agent-space"],
    queryFn: () => fetchSpace(),
    retry: false,
  });

  if (!data || !data.isAgent) return null;

  const estimations = data.estimations;

  return (
    <SectionCard
      title="Mes estimations attribuées"
      description="Les dossiers que l'équipe HotelValeur vous a confiés, avec leur statut de traitement."
    >
      <section className="rounded-xl border border-border bg-background overflow-hidden">
        {estimations.length === 0 ? (
          <Empty text="Aucune estimation ne vous est attribuée pour le moment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[820px]">
              <thead className="bg-surface text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Hôtel</th>
                  <th className="px-4 py-3 font-medium">Localisation</th>
                  <th className="px-4 py-3 font-medium">Chambres</th>
                  <th className="px-4 py-3 font-medium">Fourchette</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Reçue le</th>
                </tr>
              </thead>
              <tbody>
                {estimations.map((e) => {
                  const status = STATUS_LABELS[e.status] ?? {
                    label: e.status,
                    className: "bg-slate-200 text-slate-700",
                  };
                  return (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-4 py-3 text-navy">
                        {e.hotel_name || "Hôtel non nommé"}
                        <span className="block text-xs text-muted-foreground">
                          {e.star_rating}★ · {e.transaction_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {e.city || "—"}{" "}
                        <span className="text-muted-foreground">({e.department_code})</span>
                      </td>
                      <td className="px-4 py-3">{e.room_count}</td>
                      <td className="px-4 py-3">
                        {formatEurosRange(e.value_low_cents, e.value_high_cents)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(e.created_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SectionCard>
  );
}
