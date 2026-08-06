import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatEurosRange } from "@/lib/money";
import { regions } from "@/lib/regions";
import {
  LEAD_STATUSES,
  statusLabel,
  horizonLabel,
  operationLabel,
} from "@/lib/brokerage-matching";
import { listBrokerageLeads, assignAgent, updateLeadStatus } from "@/lib/brokerage.functions";

export const Route = createFileRoute("/admin/mise-en-relation")({
  component: BrokerageAdmin,
});

function BrokerageAdmin() {
  const load = useServerFn(listBrokerageLeads);
  const assign = useServerFn(assignAgent);
  const setStatus = useServerFn(updateLeadStatus);

  const [leads, setLeads] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [estimationCount, setEstimationCount] = useState(0);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const r = await load();
      setLeads(r.leads);
      setAgents(r.agents);
      setEvents(r.events);
      setEstimationCount(r.estimationCount);
    } catch (e) {
      toast.error("Chargement impossible", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const kpi = useMemo(() => {
    const total = leads.length;
    const conversion = estimationCount ? (total / estimationCount) * 100 : 0;
    const assigned = leads.filter((l) => l.assigned_at);
    const avgDelayH =
      assigned.length === 0
        ? null
        : assigned.reduce(
            (acc, l) =>
              acc +
              (new Date(l.assigned_at).getTime() - new Date(l.created_at).getTime()) / 3600_000,
            0,
          ) / assigned.length;
    const mandates = leads.filter((l) => l.status === "mandat").length;
    const unassigned = leads.filter((l) => !l.agent_id).length;
    return {
      total,
      conversion,
      avgDelayH,
      mandateRate: total ? (mandates / total) * 100 : 0,
      unassigned,
    };
  }, [leads, estimationCount]);

  const filtered = filter ? leads.filter((l) => l.status === filter) : leads;

  function exportCsv() {
    const rows = [
      [
        "date",
        "hotel",
        "ville",
        "region",
        "chambres",
        "etoiles",
        "valo_basse",
        "valo_haute",
        "horizon",
        "operation",
        "mandat",
        "confidentiel",
        "statut",
        "agent",
        "email",
        "telephone",
      ],
      ...filtered.map((l) => {
        const e = l.estimation ?? {};
        const ag = agents.find((a) => a.id === l.agent_id);
        return [
          new Date(l.created_at).toISOString(),
          e.hotel_name ?? "",
          e.city ?? "",
          e.region_slug ?? "",
          e.room_count ?? "",
          e.star_rating ?? "",
          e.value_low_cents ?? "",
          e.value_high_cents ?? "",
          horizonLabel(l.sale_horizon),
          operationLabel(l.operation_type),
          l.has_mandate ? "oui" : "non",
          l.confidential ? "oui" : "non",
          statusLabel(l.status),
          ag?.full_name ?? "",
          e.email ?? "",
          l.phone ?? e.phone ?? "",
        ];
      }),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `mise-en-relation-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-navy">Mise en relation</h1>
          <p className="text-sm text-muted-foreground">
            Demandes de propriétaires souhaitant être accompagnés par un agent.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          Exporter en CSV
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Demandes", String(kpi.total)],
          ["Taux estimation → demande", `${kpi.conversion.toFixed(1)} %`],
          [
            "Délai moyen d'attribution",
            kpi.avgDelayH == null ? "—" : `${kpi.avgDelayH.toFixed(1)} h`,
          ],
          ["Taux de mandat", `${kpi.mandateRate.toFixed(1)} %`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-card p-4">
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-1 font-serif text-2xl tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {kpi.unassigned > 0 && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          {kpi.unassigned} demande(s) sans agent attribué. Attribuez-les manuellement ci-dessous.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter("")}
          className={`rounded-md border px-3 py-1.5 text-sm ${!filter ? "bg-navy text-navy-foreground" : "border-border"}`}
        >
          Tous
        </button>
        {LEAD_STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`rounded-md border px-3 py-1.5 text-sm ${
              filter === s.value ? "bg-navy text-navy-foreground" : "border-border"
            }`}
          >
            {s.label} ({leads.filter((l) => l.status === s.value).length})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Reçue</th>
                <th className="p-3">Établissement</th>
                <th className="p-3">Demande</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Agent</th>
                <th className="p-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => {
                const e = l.estimation ?? {};
                return (
                  <tr key={l.id} className="border-t border-border align-top">
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {new Date(l.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{e.hotel_name ?? "—"}</div>
                      <div className="text-muted-foreground">
                        {e.city ?? ""} ({e.department_code ?? "—"}) ·{" "}
                        {regions.find((r) => r.slug === e.region_slug)?.name ?? e.region_slug}
                      </div>
                      <div className="text-muted-foreground">
                        {e.room_count} ch. · {e.star_rating}★ ·{" "}
                        {e.value_low_cents != null
                          ? formatEurosRange(e.value_low_cents, e.value_high_cents)
                          : "—"}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {horizonLabel(l.sale_horizon)}
                      <br />
                      {operationLabel(l.operation_type)}
                      {l.has_mandate && <div>Mandat existant</div>}
                      {l.confidential && <div>Vente discrète</div>}
                      {l.availability && <div>Dispo : {l.availability}</div>}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {[e.first_name, e.last_name].filter(Boolean).join(" ") || "—"}
                      <br />
                      {e.email}
                      <br />
                      {l.phone ?? e.phone ?? "—"}
                    </td>
                    <td className="p-3">
                      <select
                        value={l.agent_id ?? ""}
                        onChange={async (ev) => {
                          const v = ev.target.value || null;
                          try {
                            await assign({ data: { leadId: l.id, agentId: v } });
                            toast.success("Attribution mise à jour");
                            await refresh();
                          } catch (err) {
                            toast.error("Attribution impossible", {
                              description: err instanceof Error ? err.message : undefined,
                            });
                          }
                        }}
                        className="rounded-md border border-border bg-background px-2 py-1"
                      >
                        <option value="">Non attribué</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.full_name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-3">
                      <select
                        value={l.status}
                        onChange={async (ev) => {
                          try {
                            await setStatus({
                              data: { leadId: l.id, status: ev.target.value as never },
                            });
                            toast.success("Statut mis à jour");
                            await refresh();
                          } catch (err) {
                            toast.error("Mise à jour impossible", {
                              description: err instanceof Error ? err.message : undefined,
                            });
                          }
                        }}
                        className="rounded-md border border-border bg-background px-2 py-1"
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td className="p-6 text-muted-foreground" colSpan={6}>
                    Aucune demande pour ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <section>
        <h2 className="font-serif text-xl text-navy">Journal d'attribution</h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Événement</th>
                <th className="p-3">De → vers</th>
                <th className="p-3">Détail</th>
                <th className="p-3">Auteur</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 60).map((ev) => {
                const agentName = (id: string | null) =>
                  id ? (agents.find((a) => a.id === id)?.full_name ?? id.slice(0, 8)) : "—";
                const isAgentEvent = ev.event_type === "assigned" || ev.event_type === "unassigned";
                return (
                  <tr key={ev.id} className="border-t border-border">
                    <td className="p-3 whitespace-nowrap text-muted-foreground">
                      {new Date(ev.created_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="p-3">{ev.event_type}</td>
                    <td className="p-3 text-muted-foreground">
                      {isAgentEvent
                        ? `${agentName(ev.from_value)} → ${agentName(ev.to_value)}`
                        : `${ev.from_value ? statusLabel(ev.from_value) : "—"} → ${
                            ev.to_value ? statusLabel(ev.to_value) : "—"
                          }`}
                    </td>
                    <td className="p-3 text-muted-foreground">{ev.detail ?? "—"}</td>
                    <td className="p-3 text-muted-foreground">{ev.actor ?? "—"}</td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td className="p-6 text-muted-foreground" colSpan={5}>
                    Aucun événement.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
