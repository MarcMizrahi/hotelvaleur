import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listLeads, sendEstimationReport, updateLead } from "@/lib/admin.functions";
import { assignEstimationAgent, listAgentsLite } from "@/lib/backoffice.functions";
import { formatEuros } from "@/lib/money";
import { getRegionBySlug } from "@/lib/regions";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";


export const Route = createFileRoute("/admin/leads")({
  component: LeadsPage,
});

const STATUSES = [
  { value: "nouveau", label: "Nouveau" },
  { value: "qualifie", label: "Qualifié" },
  { value: "injoignable", label: "Injoignable" },
  { value: "hors_cible", label: "Hors cible" },
  { value: "archive", label: "Archivé" },
] as const;

const INTENTS: Record<string, string> = {
  moins_1_an: "< 1 an",
  "1_a_2_ans": "1 à 2 ans",
  plus_2_ans: "> 2 ans",
  curiosite: "Curiosité",
};

function LeadsPage() {
  const qc = useQueryClient();
  const leadsFn = useServerFn(listLeads);
  const agentsFn = useServerFn(listAgentsLite);
  const assignFn = useServerFn(assignEstimationAgent);
  const updateFn = useServerFn(updateLead);

  const [status, setStatus] = usePersistentState<string>("admin.leads.status", "");
  const [intent, setIntent] = usePersistentState<string>("admin.leads.intent", "");
  const [onlyUnassigned, setOnlyUnassigned] = usePersistentState<boolean>(
    "admin.leads.unassigned",
    false,
  );
  const [sort, setSort] = usePersistentState<string>("admin.leads.sort", "date_desc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const leads = useQuery({
    queryKey: ["admin", "leads", status, intent],
    queryFn: () =>
      leadsFn({
        data: {
          days: "all" as const,
          limit: 300,
          ...(status ? { status } : {}),
          ...(intent ? { intent } : {}),
        },
      }),
  });
  const agents = useQuery({ queryKey: ["admin", "agents-lite"], queryFn: () => agentsFn() });

  const rows = useMemo(() => {
    const all = (leads.data ?? []) as any[];
    const filtered = onlyUnassigned ? all.filter((r) => !r.agent_id) : all;
    const mid = (r: any) => (Number(r.value_low_cents) + Number(r.value_high_cents)) / 2;
    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return +new Date(a.created_at) - +new Date(b.created_at);
        case "value_desc":
          return mid(b) - mid(a);
        case "value_asc":
          return mid(a) - mid(b);
        case "rooms_desc":
          return Number(b.room_count) - Number(a.room_count);
        case "name_asc":
          return String(a.hotel_name ?? "").localeCompare(String(b.hotel_name ?? ""), "fr");
        default:
          return +new Date(b.created_at) - +new Date(a.created_at);
      }
    });
    return sorted;
  }, [leads.data, onlyUnassigned, sort]);


  const selected = rows.find((r) => r.id === selectedId) ?? null;

  const assign = useMutation({
    mutationFn: (v: { estimationId: string; agentId: string | null }) =>
      assignFn({ data: v }),
    onSuccess: () => {
      toast.success("Attribution mise à jour");
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: (v: { id: string; status?: any; internal_notes?: string }) =>
      updateFn({ data: v }),
    onSuccess: (res: any) => {
      const r = res?.report;
      if (r?.sentTo && r.ok && !r.reason) {
        toast.success(`Lead validé — rapport envoyé à ${r.sentTo}`);
      } else if (r) {
        toast.success(`Lead mis à jour — ${r.reason ?? "rapport généré"}`);
      } else {
        toast.success("Lead mis à jour");
      }
      qc.invalidateQueries({ queryKey: ["admin", "leads"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reportFn = useServerFn(sendEstimationReport);
  const sendReport = useMutation({
    mutationFn: (id: string) => reportFn({ data: { id, force: true } }),
    onSuccess: (res: any) => {
      if (res?.sentTo && !res.reason) toast.success(`Rapport envoyé à ${res.sentTo}`);
      else toast.success(res?.reason ?? "Rapport généré");
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const agentName = (id: string | null) =>
    (agents.data?.agents ?? []).find((a: any) => a.id === id)?.full_name ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Leads</h1>
        <p className="text-sm text-muted-foreground">
          Qualifiez les demandes d'estimation et attribuez-les à un agent.
        </p>
      </div>

      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5"
            aria-label="Trier les leads"
          >
            <option value="date_desc">Plus récents</option>
            <option value="date_asc">Plus anciens</option>
            <option value="value_desc">Valorisation ↓</option>
            <option value="value_asc">Valorisation ↑</option>
            <option value="rooms_desc">Nb de chambres ↓</option>
            <option value="name_asc">Nom A→Z</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5"
          >
            <option value="">Tous les statuts</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5"
          >
            <option value="">Toutes intentions</option>
            {Object.entries(INTENTS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={onlyUnassigned}
              onChange={(e) => setOnlyUnassigned(e.target.checked)}
            />
            Non attribués
          </label>
          {(status || intent || onlyUnassigned || sort !== "date_desc") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setStatus("");
                setIntent("");
                setOnlyUnassigned(false);
                setSort("date_desc");
              }}
            >
              Réinitialiser
            </Button>
          )}
          <span className="ml-auto text-xs text-muted-foreground">{rows.length} lead(s)</span>
        </div>
      </div>



      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-xl border border-border bg-background p-4 overflow-x-auto">
          <table className="min-w-[680px] w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1">Date</th>
                <th className="py-1">Établissement</th>
                <th className="py-1 text-right">Fourchette</th>
                <th className="py-1">Intention</th>
                <th className="py-1">Statut</th>
                <th className="py-1">Agent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => {
                    setSelectedId(r.id);
                    setNotes(r.internal_notes ?? "");
                  }}
                  className={`cursor-pointer border-t border-border ${
                    selectedId === r.id ? "bg-muted/60" : "hover:bg-muted/30"
                  }`}
                >
                  <td className="py-1.5 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-1.5">
                    {r.hotel_name || r.city || getRegionBySlug(r.region_slug)?.name || r.region_slug}
                    <div className="text-xs text-muted-foreground">
                      {r.room_count} ch. · {r.star_rating}★ · {r.department_code}
                    </div>
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap tabular-nums">
                    {formatEuros(Number(r.value_low_cents))} –{" "}
                    {formatEuros(Number(r.value_high_cents))}
                  </td>
                  <td className="py-1.5">{INTENTS[r.sale_intent] ?? r.sale_intent}</td>
                  <td className="py-1.5">
                    {STATUSES.find((s) => s.value === r.status)?.label ?? r.status}
                  </td>
                  <td className="py-1.5">
                    {agentName(r.agent_id) ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !leads.isLoading && (
                <tr>
                  <td colSpan={6} className="py-3 text-muted-foreground">
                    Aucun lead.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <aside className="rounded-xl border border-border bg-background p-6">
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              Sélectionnez un lead pour voir le détail et l'attribuer.
            </p>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="font-serif text-lg text-navy">
                  {selected.hotel_name || "Établissement non nommé"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selected.city ? `${selected.city} · ` : ""}
                  {getRegionBySlug(selected.region_slug)?.name ?? selected.region_slug} (
                  {selected.department_code})
                </p>
              </div>

              <dl className="space-y-1 text-sm">
                <Row label="Contact" value={selected.email} />
                <Row label="Téléphone" value={selected.phone ?? "—"} />
                <Row
                  label="Nom"
                  value={[selected.first_name, selected.last_name].filter(Boolean).join(" ") || "—"}
                />
                <Row
                  label="Valorisation"
                  value={`${formatEuros(Number(selected.value_low_cents))} – ${formatEuros(
                    Number(selected.value_high_cents),
                  )}`}
                />
                <Row
                  label="Prix souhaité"
                  value={
                    selected.price_expectation_cents
                      ? formatEuros(Number(selected.price_expectation_cents))
                      : "—"
                  }
                />
                <Row label="Méthode" value={selected.method_used} />
              </dl>

              <div className="space-y-2">
                <label className="text-sm font-medium">Agent attribué</label>
                <select
                  value={selected.agent_id ?? ""}
                  onChange={(e) =>
                    assign.mutate({
                      estimationId: selected.id,
                      agentId: e.target.value || null,
                    })
                  }
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Non attribué</option>
                  {(agents.data?.agents ?? [])
                    .filter((a: any) => a.is_active)
                    .map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {a.full_name}
                        {a.company ? ` — ${a.company}` : ""}
                      </option>
                    ))}
                </select>
                {selected.assigned_at && (
                  <p className="text-xs text-muted-foreground">
                    Attribué le {new Date(selected.assigned_at).toLocaleString("fr-FR")}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Statut</label>
                <select
                  value={selected.status}
                  onChange={(e) => save.mutate({ id: selected.id, status: e.target.value })}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Passer le statut à « Qualifié » génère le rapport PDF et l'envoie
                  automatiquement à l'agent attribué.
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => sendReport.mutate(selected.id)}
                  disabled={sendReport.isPending}
                >
                  {sendReport.isPending ? "Envoi…" : "Renvoyer le rapport à l'agent"}
                </Button>
                {!selected.agent_id && (
                  <p className="text-xs text-muted-foreground">
                    Aucun agent attribué : le rapport sera seulement archivé.
                  </p>
                )}
              </div>


              <div className="space-y-2">
                <label className="text-sm font-medium">Notes internes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={5}
                  placeholder="Compte rendu d'appel, contexte…"
                />
                <Button
                  size="sm"
                  onClick={() => save.mutate({ id: selected.id, internal_notes: notes })}
                  disabled={save.isPending}
                >
                  Enregistrer les notes
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right break-all">{value}</dd>
    </div>
  );
}
