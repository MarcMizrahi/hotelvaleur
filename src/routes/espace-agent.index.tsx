import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { getAgentSpace, updateAgentLeadStatus } from "@/lib/agent-space.functions";
import { Empty, Stat, SectionCard } from "@/components/agent-space-ui";

const STATUSES = [
  { value: "nouveau", label: "Nouveau" },
  { value: "qualifie", label: "Qualifié" },
  { value: "injoignable", label: "Injoignable" },
  { value: "hors_cible", label: "Hors cible" },
  { value: "archive", label: "Archivé" },
] as const;

export const Route = createFileRoute("/espace-agent/")({
  component: AgentDashboard,
});

function AgentDashboard() {
  const queryClient = useQueryClient();
  const fetchSpace = useServerFn(getAgentSpace);

  const { data } = useQuery({
    queryKey: ["agent-space"],
    queryFn: () => fetchSpace(),
    retry: false,
  });

  const saveStatus = useMutation({
    mutationFn: useServerFn(updateAgentLeadStatus),
    onSuccess: () => {
      toast.success("Statut mis à jour.");
      queryClient.invalidateQueries({ queryKey: ["agent-space"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data || !data.isAgent) return null;

  const { estimations, leads } = data;
  const openLeads = leads.filter((l) => l.status === "nouveau").length;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Estimations attribuées" value={estimations.length} />
        <Stat label="Mises en relation" value={leads.length} />
        <Stat label="À traiter" value={openLeads} />
      </div>

      <SectionCard
        title="Mes mises en relation"
        description="Les vendeurs à contacter. Mettez à jour le statut au fil de vos échanges."
      >
        {leads.length === 0 ? (
          <div className="rounded-xl border border-border bg-background">
            <Empty text="Aucune mise en relation ne vous a encore été transmise." />
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((l) => (
              <article
                key={l.id}
                className="rounded-xl border border-border bg-background p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-navy">
                      Demande du {new Date(l.created_at).toLocaleDateString("fr-FR")}
                      {l.confidential && (
                        <span className="ml-2 rounded bg-navy/10 px-2 py-0.5 text-xs text-navy">
                          Confidentiel
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {l.operation_type} · horizon {l.sale_horizon}
                      {l.has_mandate ? " · mandat existant" : ""}
                    </p>
                  </div>
                  <select
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                    value={l.status}
                    onChange={(ev) =>
                      saveStatus.mutate({
                        data: { id: l.id, status: ev.target.value as never },
                      })
                    }
                  >
                    {STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Téléphone</dt>
                    <dd className="text-navy">{l.phone || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Disponibilités</dt>
                    <dd className="text-navy">{l.availability || "—"}</dd>
                  </div>
                </dl>
                {l.message && (
                  <p className="rounded-md bg-surface p-3 text-sm text-navy/80">{l.message}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
