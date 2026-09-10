import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getMyReportUrl, listMyReports } from "@/lib/agent-space.functions";
import { Button } from "@/components/ui/button";
import { Empty, SectionCard, Stat } from "@/components/agent-space-ui";
import { formatEurosRange } from "@/lib/money";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  sent: { label: "Envoyé", className: "bg-emerald-100 text-emerald-800" },
  generated: { label: "Généré", className: "bg-navy/10 text-navy" },
  skipped: { label: "Non envoyé", className: "bg-amber-100 text-amber-800" },
  failed: { label: "Échec", className: "bg-red-100 text-red-800" },
};

export const Route = createFileRoute("/espace-agent/rapports")({
  component: AgentReportsPage,
});

function AgentReportsPage() {
  const fetchReports = useServerFn(listMyReports);
  const fetchUrl = useServerFn(getMyReportUrl);
  const [estimationFilter, setEstimationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["agent-reports"],
    queryFn: () => fetchReports(),
    retry: false,
  });

  const reports = data?.reports ?? [];

  const estimationOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of reports) {
      const e = r.estimation;
      const label = e
        ? `${e.hotel_name || "Hôtel non nommé"}${e.city ? ` — ${e.city}` : ""}`
        : "Estimation indisponible";
      map.set(r.estimation_id, label);
    }
    return Array.from(map, ([id, label]) => ({ id, label }));
  }, [reports]);

  const filtered = reports.filter(
    (r) =>
      (estimationFilter === "all" || r.estimation_id === estimationFilter) &&
      (statusFilter === "all" || r.status === statusFilter),
  );

  async function download(id: string) {
    setPendingId(id);
    try {
      const res = await fetchUrl({ data: { id } });
      window.open(res.url, "_blank", "noopener");
    } catch {
      toast.error("Téléchargement impossible pour ce rapport.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <SectionCard
      title="Rapports reçus"
      description="Rapports PDF de valorisation générés pour vos estimations attribuées."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Rapports" value={reports.length} />
        <Stat label="Envoyés" value={reports.filter((r) => r.status === "sent").length} />
        <Stat label="Affichés" value={filtered.length} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-muted-foreground">Estimation</span>
          <select
            value={estimationFilter}
            onChange={(e) => setEstimationFilter(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">Toutes les estimations</option>
            {estimationOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-muted-foreground">Statut</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(STATUS_LABELS).map(([id, s]) => (
              <option key={id} value={id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-border bg-background overflow-hidden">
        {isLoading ? (
          <Empty text="Chargement des rapports…" />
        ) : filtered.length === 0 ? (
          <Empty text="Aucun rapport ne correspond à ces filtres." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-surface text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Établissement</th>
                  <th className="px-4 py-3 font-medium">Fourchette</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Rapport</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const e = r.estimation;
                  const status = STATUS_LABELS[r.status] ?? {
                    label: r.status,
                    className: "bg-slate-200 text-slate-700",
                  };
                  return (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-4 py-3 text-navy">
                        {e?.hotel_name || "Hôtel non nommé"}
                        <span className="block text-xs text-muted-foreground">
                          {e
                            ? `${e.city ? `${e.city} · ` : ""}${e.department_code} · ${e.room_count} ch. · ${e.star_rating}★`
                            : "Détails indisponibles"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {e ? formatEurosRange(e.value_low_cents, e.value_high_cents) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingId === r.id}
                          onClick={() => download(r.id)}
                        >
                          {pendingId === r.id ? "Ouverture…" : "Télécharger le PDF"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
