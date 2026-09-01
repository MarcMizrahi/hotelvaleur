import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAgentPendingTransactions } from "@/lib/agent-space.functions";
import { Empty, SectionCard, Stat } from "@/components/agent-space-ui";
import { formatEuros } from "@/lib/money";

export const Route = createFileRoute("/espace-agent/transactions")({
  component: PendingTransactionsPage,
});

function PendingTransactionsPage() {
  const fetchTx = useServerFn(getAgentPendingTransactions);
  const [onlyMyRegions, setOnlyMyRegions] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["agent-pending-transactions"],
    queryFn: () => fetchTx(),
    retry: false,
  });

  const all = data?.transactions ?? [];
  const rows = useMemo(
    () => (onlyMyRegions ? all.filter((t) => t.inMyRegion) : all),
    [all, onlyMyRegions],
  );

  return (
    <SectionCard
      title="Transactions en attente"
      description="Transactions détectées par la veille de marché et en attente de validation par l'équipe HotelValeur. Elles n'alimentent pas encore le moteur de valorisation."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="En attente" value={all.length} />
        <Stat label="Sur mes zones" value={all.filter((t) => t.inMyRegion).length} />
        <Stat
          label="Confiance moyenne"
          value={
            all.length
              ? `${Math.round(
                  (all.reduce((s, t) => s + Number(t.confidence ?? 0), 0) / all.length) * 100,
                )} %`
              : "—"
          }
        />
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={onlyMyRegions}
          onChange={(e) => setOnlyMyRegions(e.target.checked)}
        />
        Limiter à mes zones couvertes
      </label>

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {isLoading ? (
          <Empty text="Chargement des transactions…" />
        ) : rows.length === 0 ? (
          <Empty text="Aucune transaction en attente de validation." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead className="bg-surface text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Hôtel</th>
                  <th className="px-4 py-3 font-medium">Localisation</th>
                  <th className="px-4 py-3 font-medium">Chambres</th>
                  <th className="px-4 py-3 font-medium">Prix</th>
                  <th className="px-4 py-3 font-medium">Prix / chambre</th>
                  <th className="px-4 py-3 font-medium">Publiée le</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-3 text-navy">
                      {t.hotel_name || t.title || "Sans nom"}
                      <span className="block text-xs text-muted-foreground">
                        {t.star_rating ? `${t.star_rating}★ · ` : ""}
                        {t.transaction_type || "type inconnu"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.city || "—"}{" "}
                      <span className="text-muted-foreground">
                        {t.department_code ? `(${t.department_code})` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3">{t.room_count ?? "—"}</td>
                    <td className="px-4 py-3">
                      {t.price_cents ? formatEuros(t.price_cents) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {t.price_per_room_cents ? formatEuros(t.price_per_room_cents) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {t.published_at
                        ? new Date(t.published_at).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={t.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-navy underline underline-offset-2"
                      >
                        {t.source_name}
                      </a>
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
