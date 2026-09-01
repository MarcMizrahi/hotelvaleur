import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  claimValuationRequest,
  getAgentValuationRequests,
} from "@/lib/agent-space.functions";
import { Button } from "@/components/ui/button";
import { Empty, SectionCard, Stat } from "@/components/agent-space-ui";
import { formatEuros, formatEurosRange } from "@/lib/money";

const FILTERS = [
  { id: "all", label: "Toutes" },
  { id: "open", label: "À prendre" },
  { id: "mine", label: "Les miennes" },
] as const;

export const Route = createFileRoute("/espace-agent/demandes")({
  component: ValuationRequestsPage,
});

function ValuationRequestsPage() {
  const queryClient = useQueryClient();
  const fetchRequests = useServerFn(getAgentValuationRequests);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["agent-valuation-requests"],
    queryFn: () => fetchRequests(),
    retry: false,
  });

  const claim = useMutation({
    mutationFn: useServerFn(claimValuationRequest),
    onSuccess: () => {
      toast.success("Demande attribuée à votre portefeuille.");
      queryClient.invalidateQueries({ queryKey: ["agent-valuation-requests"] });
      queryClient.invalidateQueries({ queryKey: ["agent-space"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const requests = data?.requests ?? [];
  const rows = useMemo(() => {
    if (filter === "mine") return requests.filter((r) => r.mine);
    if (filter === "open") return requests.filter((r) => !r.mine);
    return requests;
  }, [requests, filter]);

  return (
    <SectionCard
      title="Demandes de valorisation"
      description="Dossiers reçus sur vos zones couvertes. Positionnez-vous sur une demande libre pour en devenir l'interlocuteur."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Demandes visibles" value={requests.length} />
        <Stat label="À prendre" value={requests.filter((r) => !r.mine).length} />
        <Stat label="Attribuées à moi" value={requests.filter((r) => r.mine).length} />
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              filter === f.id
                ? "bg-navy text-navy-foreground"
                : "border border-border text-muted-foreground hover:text-navy"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {isLoading ? (
          <Empty text="Chargement des demandes…" />
        ) : rows.length === 0 ? (
          <Empty text="Aucune demande de valorisation pour ce filtre." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="bg-surface text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Hôtel</th>
                  <th className="px-4 py-3 font-medium">Localisation</th>
                  <th className="px-4 py-3 font-medium">Chambres</th>
                  <th className="px-4 py-3 font-medium">Fourchette</th>
                  <th className="px-4 py-3 font-medium">Attente vendeur</th>
                  <th className="px-4 py-3 font-medium">Intention</th>
                  <th className="px-4 py-3 font-medium">Reçue le</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="px-4 py-3 text-navy">
                      {r.mine ? r.hotel_name || "Hôtel non nommé" : "Dossier confidentiel"}
                      <span className="block text-xs text-muted-foreground">
                        {r.star_rating}★ · {r.transaction_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.city || "—"}{" "}
                      <span className="text-muted-foreground">({r.department_code})</span>
                    </td>
                    <td className="px-4 py-3">{r.room_count}</td>
                    <td className="px-4 py-3">
                      {formatEurosRange(r.value_low_cents, r.value_high_cents)}
                    </td>
                    <td className="px-4 py-3">
                      {r.price_expectation_cents
                        ? formatEuros(r.price_expectation_cents)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{r.sale_intent}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.mine ? (
                        <span className="rounded bg-navy/10 px-2 py-1 text-xs text-navy">
                          Attribuée
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={claim.isPending}
                          onClick={() => claim.mutate({ data: { id: r.id } })}
                        >
                          Me positionner
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
