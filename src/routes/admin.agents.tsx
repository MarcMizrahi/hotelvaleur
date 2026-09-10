import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { regions } from "@/lib/regions";
import { OPERATION_TYPES } from "@/lib/brokerage-matching";
import { listBrokerageLeads, upsertAgent, deleteAgent, getAgentDetail, updateAgentRequestStatus, inviteAgent, revokeAgentAccess } from "@/lib/brokerage.functions";
import { AgentPhotoField } from "@/components/admin/AgentPhotoField";
import { photoUrlForPayload } from "@/lib/agent-photo";


export const Route = createFileRoute("/admin/agents")({
  component: AgentsAdmin,
});

interface AgentForm {
  id?: string | null;
  fullName: string;
  company: string;
  email: string;
  phone: string;
  photoUrl: string;
  bio: string;
  regions: string[];
  starRatings: number[];
  transactionTypes: string[];
  minRooms: string;
  maxRooms: string;
  languages: string;
  transactionsCount: string;
  monthlyCapacity: string;
  isActive: boolean;
  isPublic: boolean;
}

const emptyForm: AgentForm = {
  fullName: "",
  company: "",
  email: "",
  phone: "",
  photoUrl: "",
  bio: "",
  regions: [],
  starRatings: [],
  transactionTypes: [],
  minRooms: "",
  maxRooms: "",
  languages: "Français",
  transactionsCount: "0",
  monthlyCapacity: "10",
  isActive: true,
  isPublic: true,
};

function toFormBase(a: any): AgentForm {
  return {
    id: a.id,
    fullName: a.full_name,
    company: a.company ?? "",
    email: a.email,
    phone: a.phone ?? "",
    photoUrl: a.photo_url ?? "",
    bio: a.bio ?? "",
    regions: a.regions ?? [],
    starRatings: a.star_ratings ?? [],
    transactionTypes: a.transaction_types ?? [],
    minRooms: a.min_rooms != null ? String(a.min_rooms) : "",
    maxRooms: a.max_rooms != null ? String(a.max_rooms) : "",
    languages: (a.languages ?? []).join(", "),
    transactionsCount: String(a.transactions_count ?? 0),
    monthlyCapacity: String(a.monthly_capacity ?? 10),
    isActive: a.is_active,
    isPublic: a.is_public,
  };
}


function AgentsAdmin() {
  const load = useServerFn(listBrokerageLeads);
  const save = useServerFn(upsertAgent);
  const remove = useServerFn(deleteAgent);
  const invite = useServerFn(inviteAgent);
  const revoke = useServerFn(revokeAgentAccess);

  async function inviteBroker(a: any) {
    try {
      const r: any = await invite({ data: { id: a.id } });
      if (r.alreadyLinked) {
        toast.info("Ce broker a déjà un accès.", { description: r.email });
      } else if (r.tempPassword) {
        toast.success(`Accès créé pour ${r.email}`, {
          description: `Mot de passe provisoire : ${r.tempPassword} (à communiquer au broker)`,
          duration: 30000,
        });
      } else {
        toast.success("Compte existant relié à cette fiche broker.", { description: r.email });
      }
      await refresh();
    } catch (err) {
      toast.error("Invitation impossible", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function revokeBroker(a: any) {
    if (!confirm(`Retirer l'accès espace agent de ${a.full_name} ?`)) return;
    try {
      await revoke({ data: { id: a.id } });
      toast.success("Accès retiré");
      await refresh();
    } catch (err) {
      toast.error("Révocation impossible", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }
  const loadDetail = useServerFn(getAgentDetail);

  const [agents, setAgents] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [form, setForm] = useState<AgentForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [detail, setDetail] = useState<
    | { kind: "loading"; agentId: string }
    | { kind: "ready"; agent: any; estimations: any[]; leads: any[]; requests: any[] }
    | null
  >(null);

  async function openDetail(a: any) {
    setDetail({ kind: "loading", agentId: a.id });
    try {
      const r = await loadDetail({ data: { agentId: a.id } });
      setDetail({
        kind: "ready",
        agent: r.agent,
        estimations: r.estimations,
        leads: r.leads,
        requests: (r as any).requests ?? [],
      });
    } catch (err) {
      setDetail(null);
      toast.error("Fiche agent indisponible", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }


  async function refresh() {
    setLoading(true);
    try {
      const r = await load();
      setAgents(r.agents);
      setLeads(r.leads);
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

  const loadByAgent = useMemo(() => {
    const since = Date.now() - 30 * 24 * 3600_000;
    const m: Record<string, number> = {};
    for (const l of leads) {
      if (!l.agent_id || !l.assigned_at) continue;
      if (new Date(l.assigned_at).getTime() < since) continue;
      m[l.agent_id] = (m[l.agent_id] ?? 0) + 1;
    }
    return m;
  }, [leads]);

  const visibleAgents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return agents.filter((a) => {
      if (statusFilter === "active" && !a.is_active) return false;
      if (statusFilter === "inactive" && a.is_active) return false;
      if (regionFilter !== "all") {
        const rs: string[] = a.regions ?? [];
        if (regionFilter === "national" ? rs.length > 0 : !rs.includes(regionFilter)) return false;
      }
      if (!q) return true;
      return [a.full_name, a.company, a.email, a.phone]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(q));
    });
  }, [agents, search, statusFilter, regionFilter]);

  async function toggleActive(a: any) {
    try {
      await save({
        data: {
          id: a.id,
          fullName: a.full_name,
          company: a.company ?? null,
          email: a.email,
          phone: a.phone ?? null,
          photoUrl: a.photo_url ?? null,
          bio: a.bio ?? null,
          regions: a.regions ?? [],
          starRatings: a.star_ratings ?? [],
          transactionTypes: (a.transaction_types ?? []) as never,
          minRooms: a.min_rooms ?? null,
          maxRooms: a.max_rooms ?? null,
          languages: a.languages ?? [],
          transactionsCount: a.transactions_count ?? 0,
          monthlyCapacity: a.monthly_capacity ?? 10,
          isActive: !a.is_active,
          isPublic: a.is_public,
        },
      });
      toast.success(a.is_active ? "Agent désactivé" : "Agent activé");
      await refresh();
    } catch (err) {
      toast.error("Mise à jour impossible", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }



  function edit(a: any) {
    setForm(toFormBase(a));
  }


  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    try {
      await save({
        data: {
          id: form.id ?? null,
          fullName: form.fullName.trim(),
          company: form.company.trim() || null,
          email: form.email.trim(),
          phone: form.phone.trim() || null,
          photoUrl: photoUrlForPayload(form.photoUrl),
          bio: form.bio.trim() || null,

          regions: form.regions,
          starRatings: form.starRatings,
          transactionTypes: form.transactionTypes as never,
          minRooms: form.minRooms ? Number(form.minRooms) : null,
          maxRooms: form.maxRooms ? Number(form.maxRooms) : null,
          languages: form.languages
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          transactionsCount: Number(form.transactionsCount || 0),
          monthlyCapacity: Number(form.monthlyCapacity || 10),
          isActive: form.isActive,
          isPublic: form.isPublic,
        },
      });
      toast.success("Agent enregistré");
      setForm(null);
      await refresh();
    } catch (err) {
      toast.error("Enregistrement impossible", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl text-navy">Agents partenaires</h1>
          <p className="text-sm text-muted-foreground">
            Les agents actifs reçoivent automatiquement les demandes de mise en relation
            correspondant à leur région et à leur segment.
          </p>
        </div>
        <Button onClick={() => setForm({ ...emptyForm })}>Nouvel agent</Button>
      </div>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Agents", value: agents.length },
          { label: "Actifs", value: agents.filter((a) => a.is_active).length },
          { label: "Publics", value: agents.filter((a) => a.is_public).length },
          {
            label: "Leads attribués 30 j",
            value: Object.values(loadByAgent).reduce((s, n) => s + n, 0),
          },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-border bg-card p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-navy">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1 space-y-1">
          <Label htmlFor="a-search">Rechercher</Label>
          <Input
            id="a-search"
            placeholder="Nom, société, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="a-status">État</Label>
          <select
            id="a-status"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="all">Tous</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="a-region">Région</Label>
          <select
            id="a-region"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
          >
            <option value="all">Toutes</option>
            <option value="national">France entière</option>
            {regions.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Agent</th>
                <th className="p-3">Régions</th>
                <th className="p-3">Segments</th>
                <th className="p-3">Charge 30 j</th>
                <th className="p-3">État</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {visibleAgents.map((a) => (
                <tr key={a.id} className="border-t border-border align-top">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      {a.photo_url ? (
                        <img
                          src={a.photo_url}
                          alt={a.full_name}
                          className="h-10 w-10 rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      <div>
                        <div className="font-medium">{a.full_name}</div>
                        <div className="text-muted-foreground">{a.company ?? "—"}</div>
                        <div className="text-muted-foreground">{a.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="p-3 text-muted-foreground">
                    {(a.regions ?? []).length === 0
                      ? "France entière"
                      : (a.regions ?? [])
                          .map((s: string) => regions.find((r) => r.slug === s)?.name ?? s)
                          .join(", ")}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {(a.star_ratings ?? []).length ? `${(a.star_ratings ?? []).join("/")}★` : "tous"}
                    {" · "}
                    {(a.transaction_types ?? []).length
                      ? (a.transaction_types ?? []).join(", ")
                      : "toutes opérations"}
                    {(a.min_rooms || a.max_rooms) &&
                      ` · ${a.min_rooms ?? 0}-${a.max_rooms ?? "∞"} ch.`}
                  </td>
                  <td className="p-3 tabular-nums">
                    {loadByAgent[a.id] ?? 0} / {a.monthly_capacity}
                  </td>
                  <td className="p-3">
                    {a.is_active ? "Actif" : "Inactif"}
                    {a.is_public ? " · public" : " · masqué"}
                    <div className="text-xs text-muted-foreground">
                      {a.user_id ? "Accès espace agent ✓" : "Sans accès"}
                    </div>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <Button variant="ghost" size="sm" onClick={() => void openDetail(a)}>
                      Détails
                    </Button>
                    {a.user_id ? (
                      <Button variant="ghost" size="sm" onClick={() => void revokeBroker(a)}>
                        Retirer l'accès
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => void inviteBroker(a)}>
                        Inviter
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => edit(a)}>
                      Modifier
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => void toggleActive(a)}>
                      {a.is_active ? "Désactiver" : "Activer"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setForm({ ...emptyForm, ...toFormBase(a), id: null })}
                    >
                      Dupliquer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (!confirm(`Supprimer ${a.full_name} ?`)) return;
                        try {
                          await remove({ data: { id: a.id } });
                          toast.success("Agent supprimé");
                          await refresh();
                        } catch (err) {
                          toast.error("Suppression impossible", {
                            description: err instanceof Error ? err.message : undefined,
                          });
                        }
                      }}
                    >
                      Supprimer
                    </Button>
                  </td>
                </tr>
              ))}
              {visibleAgents.length === 0 && (
                <tr>
                  <td className="p-6 text-muted-foreground" colSpan={6}>
                    {agents.length === 0
                      ? "Aucun agent enregistré."
                      : "Aucun agent ne correspond à ces filtres."}
                  </td>
                </tr>

              )}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <section
          aria-label="Fiche détaillée de l'agent"
          className="space-y-6 rounded-lg border border-border bg-card p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-serif text-xl text-navy">Fiche agent</h2>
            <Button variant="ghost" size="sm" onClick={() => setDetail(null)}>
              Fermer
            </Button>
          </div>

          {detail.kind === "loading" ? (
            <p className="text-muted-foreground">Chargement…</p>
          ) : (
            <AgentDetailView
              agent={detail.agent}
              estimations={detail.estimations}
              leads={detail.leads}
              requests={detail.requests}
              onRefresh={() => void openDetail({ id: detail.agent.id })}
            />
          )}
        </section>
      )}

      {form && (
        <form
          onSubmit={onSave}
          className="space-y-4 rounded-lg border border-border bg-card p-6"
          aria-label="Fiche agent"
        >
          <h2 className="font-serif text-xl text-navy">
            {form.id ? "Modifier l'agent" : "Nouvel agent"}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="a-name">Nom complet</Label>
              <Input
                id="a-name"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-company">Société</Label>
              <Input
                id="a-company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-email">Email</Label>
              <Input
                id="a-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-phone">Téléphone</Label>
              <Input
                id="a-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="a-photo">Photo de l'agent</Label>
              <AgentPhotoField
                value={form.photoUrl}
                onChange={(url: string) =>
                  setForm((f) => (f ? { ...f, photoUrl: url } : f))
                }
              />

            </div>

          </div>


          <div className="space-y-2">
            <Label htmlFor="a-bio">Présentation</Label>
            <Textarea
              id="a-bio"
              rows={3}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium">
              Régions couvertes (aucune = France entière)
            </legend>
            <div className="mt-2 grid gap-1 sm:grid-cols-3">
              {regions.map((r) => (
                <label key={r.slug} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.regions.includes(r.slug)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        regions: e.target.checked
                          ? [...form.regions, r.slug]
                          : form.regions.filter((s) => s !== r.slug),
                      })
                    }
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium">Classements traités (aucun = tous)</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {[0, 1, 2, 3, 4, 5].map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.starRatings.includes(s)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        starRatings: e.target.checked
                          ? [...form.starRatings, s]
                          : form.starRatings.filter((x) => x !== s),
                      })
                    }
                  />
                  {s === 0 ? "Non classé" : `${s}★`}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium">Opérations (aucune = toutes)</legend>
            <div className="mt-2 flex flex-wrap gap-3">
              {OPERATION_TYPES.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.transactionTypes.includes(o.value)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        transactionTypes: e.target.checked
                          ? [...form.transactionTypes, o.value]
                          : form.transactionTypes.filter((x) => x !== o.value),
                      })
                    }
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="a-min">Chambres min.</Label>
              <Input
                id="a-min"
                type="number"
                min={0}
                value={form.minRooms}
                onChange={(e) => setForm({ ...form, minRooms: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-max">Chambres max.</Label>
              <Input
                id="a-max"
                type="number"
                min={0}
                value={form.maxRooms}
                onChange={(e) => setForm({ ...form, maxRooms: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-cap">Capacité / mois</Label>
              <Input
                id="a-cap"
                type="number"
                min={1}
                value={form.monthlyCapacity}
                onChange={(e) => setForm({ ...form, monthlyCapacity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-tx">Transactions réalisées</Label>
              <Input
                id="a-tx"
                type="number"
                min={0}
                value={form.transactionsCount}
                onChange={(e) => setForm({ ...form, transactionsCount: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="a-lang">Langues (séparées par des virgules)</Label>
            <Input
              id="a-lang"
              value={form.languages}
              onChange={(e) => setForm({ ...form, languages: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Actif (reçoit des leads)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isPublic}
                onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
              />
              Affiché sur la page publique
            </label>
          </div>

          <div className="flex gap-3">
            <Button type="submit">Enregistrer</Button>
            <Button type="button" variant="ghost" onClick={() => setForm(null)}>
              Annuler
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function eur(cents: number | null | undefined) {
  if (cents == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR");
}

const LEAD_STATUS: Record<string, string> = {
  nouveau: "Nouveau",
  attribue: "Attribué",
  contacte: "Contacté",
  mandat: "Mandat",
  perdu: "Perdu",
};

const REQUEST_STATUS: Record<string, string> = {
  nouveau: "Nouvelle",
  en_cours: "En cours",
  traite: "Traitée",
  refuse: "Refusée",
};

const ESTIMATION_STATUS: Record<string, string> = {
  nouveau: "Nouveau",
  rapport_envoye: "Rapport envoyé",
  en_cours: "En cours",
  qualifie: "Qualifié",
  converti: "Converti",
  perdu: "Perdu",
  archive: "Archivé",
};

function AgentRequestsTable({
  requests,
  onRefresh,
}: {
  requests: any[];
  onRefresh: () => void;
}) {
  const updateStatus = useServerFn(updateAgentRequestStatus);

  async function change(id: string, status: string) {
    try {
      await updateStatus({ data: { id, status: status as any } });
      toast.success("Statut mis à jour.");
      onRefresh();
    } catch (e) {
      toast.error("Mise à jour impossible", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="font-medium">
        Demandes de valorisation envoyées par l'agent{" "}
        <span className="text-muted-foreground">({requests.length})</span>
      </h3>
      {requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune demande envoyée.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-[720px] w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="p-3">Hôtel</th>
                <th className="p-3">Lieu</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Urgence</th>
                <th className="p-3">Statut</th>
                <th className="p-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="p-3">
                    <div className="font-medium">{r.hotel_name}</div>
                    <div className="text-muted-foreground">
                      {[r.room_count ? `${r.room_count} ch.` : null,
                        r.star_rating != null ? `${r.star_rating}★` : null,
                        r.transaction_type]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                    {r.message && (
                      <div className="mt-1 max-w-md text-muted-foreground">{r.message}</div>
                    )}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {r.city ?? r.region_slug ?? "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    <div>{r.contact_name ?? "—"}</div>
                    <div>{r.contact_email ?? ""}</div>
                    <div>{r.contact_phone ?? ""}</div>
                  </td>
                  <td className="p-3 text-muted-foreground">{r.urgency}</td>
                  <td className="p-3">
                    <select
                      value={r.status}
                      onChange={(e) => void change(r.id, e.target.value)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                    >
                      {Object.entries(REQUEST_STATUS).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AgentDetailView({
  agent,
  estimations,
  leads,
  requests,
  onRefresh,
}: {
  agent: any;
  estimations: any[];
  leads: any[];
  requests: any[];
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Agent</div>
          <div className="mt-1 font-medium">{agent.full_name}</div>
          <div className="text-sm text-muted-foreground">{agent.company ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Coordonnées
          </div>
          <div className="mt-1 text-sm">{agent.email}</div>
          <div className="text-sm text-muted-foreground">{agent.phone ?? "—"}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">État</div>
          <div className="mt-1 text-sm">
            {agent.is_active ? "Actif" : "Inactif"}
            {agent.is_public ? " · public" : " · masqué"}
          </div>
        </div>
      </div>

      <AgentRequestsTable requests={requests} onRefresh={onRefresh} />

      <div className="space-y-3">
        <h3 className="font-medium">
          Estimations attribuées{" "}
          <span className="text-muted-foreground">({estimations.length})</span>
        </h3>
        {estimations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune estimation attribuée.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Hôtel</th>
                  <th className="p-3">Lieu</th>
                  <th className="p-3">Fourchette</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {estimations.map((e) => (
                  <tr key={e.id} className="border-t border-border align-top">
                    <td className="p-3">
                      <div className="font-medium">{e.hotel_name ?? "Hôtel"}</div>
                      <div className="text-muted-foreground">
                        {e.room_count} ch. · {e.star_rating}★
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{e.city ?? e.region_slug}</td>
                    <td className="p-3 tabular-nums">
                      {eur(e.value_low_cents)} – {eur(e.value_high_cents)}
                    </td>
                    <td className="p-3 text-muted-foreground">{e.email}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(e.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-medium">
          Demandes de mise en relation{" "}
          <span className="text-muted-foreground">({leads.length})</span>
        </h3>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune demande attribuée.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-[640px] w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Propriétaire</th>
                  <th className="p-3">Hôtel</th>
                  <th className="p-3">Opération</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-border align-top">
                    <td className="p-3">
                      <div className="font-medium">
                        {[l.estimation?.first_name, l.estimation?.last_name]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </div>
                      <div className="text-muted-foreground">{l.estimation?.email}</div>
                      {l.phone && (
                        <div className="text-muted-foreground">{l.phone}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <div>{l.estimation?.hotel_name ?? "Hôtel"}</div>
                      <div className="text-muted-foreground">
                        {l.estimation?.city} · {eur(l.estimation?.value_low_cents)} –{" "}
                        {eur(l.estimation?.value_high_cents)}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {l.operation_type} · {l.sale_horizon}
                    </td>
                    <td className="p-3">{LEAD_STATUS[l.status] ?? l.status}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
