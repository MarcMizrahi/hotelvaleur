import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  getAgentSpace,
  updateAgentContact,
  updateAgentLeadStatus,
} from "@/lib/agent-space.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Empty, Stat } from "@/components/agent-space-ui";
import { formatEurosRange } from "@/lib/money";

const STATUSES = [
  { value: "nouveau", label: "Nouveau" },
  { value: "qualifie", label: "Qualifié" },
  { value: "injoignable", label: "Injoignable" },
  { value: "hors_cible", label: "Hors cible" },
  { value: "archive", label: "Archivé" },
] as const;

const TABS = [
  { id: "estimations", label: "Mes estimations" },
  { id: "leads", label: "Mes mises en relation" },
  { id: "profil", label: "Mes coordonnées" },
] as const;

export const Route = createFileRoute("/espace-agent/")({
  component: AgentDashboard,
});

function AgentDashboard() {
  const queryClient = useQueryClient();
  const fetchSpace = useServerFn(getAgentSpace);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("estimations");

  const { data } = useQuery({
    queryKey: ["agent-space"],
    queryFn: () => fetchSpace(),
    retry: false,
  });

  const saveContact = useMutation({
    mutationFn: useServerFn(updateAgentContact),
    onSuccess: () => {
      toast.success("Coordonnées mises à jour.");
      queryClient.invalidateQueries({ queryKey: ["agent-space"] });
    },
    onError: (e: Error) => toast.error(e.message),
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

  const { agent, estimations, leads } = data;
  const openLeads = leads.filter((l) => l.status === "nouveau").length;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Estimations attribuées" value={estimations.length} />
        <Stat label="Mises en relation" value={leads.length} />
        <Stat label="À traiter" value={openLeads} />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              tab === t.id
                ? "bg-navy text-navy-foreground"
                : "border border-border text-muted-foreground hover:text-navy"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "estimations" && (
        <section className="rounded-xl border border-border bg-background overflow-hidden">
          {estimations.length === 0 ? (
            <Empty text="Aucune estimation ne vous est attribuée pour le moment." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-surface text-left text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Hôtel</th>
                    <th className="px-4 py-3 font-medium">Localisation</th>
                    <th className="px-4 py-3 font-medium">Chambres</th>
                    <th className="px-4 py-3 font-medium">Fourchette</th>
                    <th className="px-4 py-3 font-medium">Reçue le</th>
                  </tr>
                </thead>
                <tbody>
                  {estimations.map((e) => (
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
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(e.created_at).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "leads" && (
        <section className="space-y-4">
          {leads.length === 0 ? (
            <div className="rounded-xl border border-border bg-background">
              <Empty text="Aucune mise en relation ne vous a encore été transmise." />
            </div>
          ) : (
            leads.map((l) => (
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
            ))
          )}
        </section>
      )}

      {tab === "profil" && (
        <ContactForm
          agent={agent}
          busy={saveContact.isPending}
          onSave={(values) => saveContact.mutate({ data: values })}
        />
      )}
    </div>
  );
}

function ContactForm({
  agent,
  busy,
  onSave,
}: {
  agent: {
    company: string | null;
    phone: string | null;
    bio: string | null;
    monthly_capacity: number;
    is_active: boolean;
    is_public: boolean;
    email: string;
    regions: string[];
  };
  busy: boolean;
  onSave: (v: {
    company: string | null;
    phone: string | null;
    bio: string | null;
    monthly_capacity: number;
    is_active: boolean;
    is_public: boolean;
  }) => void;
}) {
  const [company, setCompany] = useState(agent.company ?? "");
  const [phone, setPhone] = useState(agent.phone ?? "");
  const [bio, setBio] = useState(agent.bio ?? "");
  const [capacity, setCapacity] = useState(String(agent.monthly_capacity));
  const [isActive, setIsActive] = useState(agent.is_active);
  const [isPublic, setIsPublic] = useState(agent.is_public);

  return (
    <form
      className="rounded-xl border border-border bg-background p-6 space-y-5 max-w-2xl"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({
          company: company.trim() || null,
          phone: phone.trim() || null,
          bio: bio.trim() || null,
          monthly_capacity: Number(capacity) || 0,
          is_active: isActive,
          is_public: isPublic,
        });
      }}
    >
      <div>
        <h2 className="font-serif text-xl text-navy">Coordonnées protégées</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Votre email et votre téléphone ne sont jamais affichés publiquement : ils sont
          transmis uniquement aux vendeurs qui vous sont attribués.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Email de contact</Label>
          <Input value={agent.email} readOnly className="bg-surface" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent-phone">Téléphone</Label>
          <Input
            id="agent-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+33 6 12 34 56 78"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent-company">Société</Label>
          <Input
            id="agent-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="agent-capacity">Capacité mensuelle (dossiers)</Label>
          <Input
            id="agent-capacity"
            type="number"
            min={0}
            max={500}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="agent-bio">Présentation</Label>
        <Textarea
          id="agent-bio"
          rows={4}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>

      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Disponible pour recevoir de nouveaux dossiers
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          Afficher ma fiche sur l'annuaire public (sans email ni téléphone)
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Zones couvertes : {agent.regions.length ? agent.regions.join(", ") : "—"} (modifiables
        par l'équipe HotelValeur).
      </p>

      <Button
        type="submit"
        disabled={busy}
        className="bg-navy text-navy-foreground hover:bg-navy/90"
      >
        {busy ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}
