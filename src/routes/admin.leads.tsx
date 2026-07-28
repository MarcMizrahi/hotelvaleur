import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getLead, listLeads, updateLead } from "@/lib/admin.functions";
import { formatEurosRange, formatEuros } from "@/lib/money";
import { regions } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/leads")({
  component: LeadsPage,
});

const INTENT_LABEL: Record<string, string> = {
  moins_1_an: "< 1 an",
  "1_a_2_ans": "1–2 ans",
  "2_a_5_ans": "2–5 ans",
  pas_de_projet: "Pas de projet",
  curiosite: "Curiosité",
};
const STATUS_OPTIONS = ["nouveau", "qualifie", "injoignable", "hors_cible", "archive"] as const;
const QUALIFIED = new Set(["moins_1_an", "1_a_2_ans"]);

function LeadsPage() {
  const fetchLeads = useServerFn(listLeads);
  const [intent, setIntent] = useState("");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("");
  const [days, setDays] = useState<"7" | "30" | "90" | "all">("all");
  const [hasFinancials, setHasFinancials] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [revealedEmails, setRevealedEmails] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-leads", intent, region, status, days, hasFinancials],
    queryFn: () =>
      fetchLeads({
        data: {
          intent: intent || undefined,
          region: region || undefined,
          status: status || undefined,
          days,
          hasFinancials: hasFinancials || undefined,
          limit: 200,
        },
      }),
  });

  const rows = data ?? [];

  function toggleEmail(id: string) {
    setRevealedEmails((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function downloadCsv() {
    const headers = [
      "Date",
      "Région",
      "Département",
      "Chambres",
      "Étoiles",
      "Transaction",
      "Fourchette basse (€)",
      "Fourchette haute (€)",
      "Intention",
      "Statut",
      "Email",
      "Consentement contact",
      "Méthode",
    ];
    const lines = rows.map((r: any) => [
      new Date(r.created_at).toLocaleString("fr-FR"),
      r.region_slug,
      r.department_code,
      r.room_count,
      r.star_rating,
      r.transaction_type,
      Math.round(Number(r.value_low_cents) / 100),
      Math.round(Number(r.value_high_cents) / 100),
      INTENT_LABEL[r.sale_intent] ?? r.sale_intent,
      r.status,
      r.email,
      r.consent_contact ? "oui" : "non",
      r.method_used,
    ]);
    const escape = (v: any) => {
      const s = String(v ?? "");
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv =
      "\uFEFF" +
      [headers, ...lines].map((r) => r.map(escape).join(";")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hotelvaleur-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl text-navy">Leads</h1>
        <Button variant="outline" onClick={downloadCsv} disabled={rows.length === 0}>
          Exporter CSV ({rows.length})
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-background p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <Label htmlFor="f-intent">Intention</Label>
          <select
            id="f-intent"
            className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
          >
            <option value="">Toutes</option>
            {Object.entries(INTENT_LABEL).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="f-region">Région</Label>
          <select
            id="f-region"
            className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
          >
            <option value="">Toutes</option>
            {regions.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="f-status">Statut</Label>
          <select
            id="f-status"
            className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tous</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="f-days">Période</Label>
          <select
            id="f-days"
            className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={days}
            onChange={(e) => setDays(e.target.value as any)}
          >
            <option value="7">7 jours</option>
            <option value="30">30 jours</option>
            <option value="90">90 jours</option>
            <option value="all">Tout</option>
          </select>
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasFinancials}
              onChange={(e) => setHasFinancials(e.target.checked)}
            />
            Avec EBITDA renseigné
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-muted-foreground">
              <tr>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Dép.</th>
                <th className="py-2 px-3">Ch.</th>
                <th className="py-2 px-3">Ét.</th>
                <th className="py-2 px-3">Trans.</th>
                <th className="py-2 px-3">Fourchette</th>
                <th className="py-2 px-3">Intention</th>
                <th className="py-2 px-3">Statut</th>
                <th className="py-2 px-3">Email</th>
                <th className="py-2 px-3">RGPD</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-muted-foreground">
                    Chargement…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-muted-foreground">
                    Aucun lead pour ces filtres.
                  </td>
                </tr>
              )}
              {rows.map((r: any) => {
                const isQualified = QUALIFIED.has(r.sale_intent);
                const outlier =
                  r.calculation_detail && (r.calculation_detail as any).outlier === true;
                return (
                  <tr
                    key={r.id}
                    className="border-t border-border/60 hover:bg-surface cursor-pointer"
                    onClick={() => setOpenId(r.id)}
                  >
                    <td className="py-2 px-3 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-2 px-3">{r.department_code}</td>
                    <td className="py-2 px-3 tabular-nums">{r.room_count}</td>
                    <td className="py-2 px-3 tabular-nums">{r.star_rating}★</td>
                    <td className="py-2 px-3 capitalize">{r.transaction_type}</td>
                    <td className="py-2 px-3 tabular-nums whitespace-nowrap">
                      {formatEurosRange(Number(r.value_low_cents), Number(r.value_high_cents))}
                      {outlier && (
                        <span
                          title="Chiffres implausibles"
                          className="ml-2 inline-block rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 text-xs"
                        >
                          !
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-xs ${
                          isQualified
                            ? "bg-emerald-100 text-emerald-900"
                            : "bg-surface text-muted-foreground"
                        }`}
                      >
                        {INTENT_LABEL[r.sale_intent] ?? r.sale_intent}
                      </span>
                    </td>
                    <td className="py-2 px-3 capitalize">{r.status}</td>
                    <td
                      className="py-2 px-3 font-mono text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEmail(r.id);
                      }}
                    >
                      {revealedEmails.has(r.id) ? r.email : "•••••@••••"}
                    </td>
                    <td className="py-2 px-3 text-xs">
                      {r.consent_contact ? "contact" : "—"}
                      {r.consent_marketing ? " · news" : ""}
                    </td>
                    <td className="py-2 px-3 text-navy underline text-xs">Ouvrir</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {openId && (
        <LeadDetail
          id={openId}
          onClose={() => setOpenId(null)}
          onUpdated={() => refetch()}
        />
      )}
    </div>
  );
}

function LeadDetail({
  id,
  onClose,
  onUpdated,
}: {
  id: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const fetchLead = useServerFn(getLead);
  const updateFn = useServerFn(updateLead);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-lead", id],
    queryFn: () => fetchLead({ data: { id } }),
  });
  const [notes, setNotes] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useMemo(() => {
    if (data?.lead) {
      setNotes(data.lead.internal_notes ?? "");
      setStatus(data.lead.status ?? "nouveau");
    }
  }, [data?.lead?.id]);

  const save = useMutation({
    mutationFn: () =>
      updateFn({ data: { id, status: status as any, internal_notes: notes } }),
    onSuccess: () => {
      setSaved(true);
      onUpdated();
      qc.invalidateQueries({ queryKey: ["admin-lead", id] });
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-background rounded-xl max-w-3xl w-full my-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-serif text-xl text-navy">Détail du lead</h2>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1 hover:bg-surface"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        {isLoading || !data ? (
          <div className="p-6 text-muted-foreground">Chargement…</div>
        ) : (
          <div className="p-6 space-y-6">
            <section>
              <h3 className="font-medium text-navy mb-2">Établissement</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <Row label="Région" value={data.lead.region_slug} />
                <Row label="Département" value={data.lead.department_code} />
                <Row label="Ville" value={data.lead.city ?? "—"} />
                <Row label="Chambres" value={data.lead.room_count} />
                <Row label="Étoiles" value={`${data.lead.star_rating}★`} />
                <Row label="Transaction" value={data.lead.transaction_type} />
                <Row label="Indépendant" value={data.lead.is_independent ? "oui" : "non"} />
                <Row label="Restaurant" value={data.lead.has_restaurant ? "oui" : "non"} />
                <Row label="Licence IV" value={data.lead.has_licence_4 ? "oui" : "non"} />
                <Row label="Travaux" value={data.lead.works_needed ?? "—"} />
              </dl>
            </section>
            <section>
              <h3 className="font-medium text-navy mb-2">Chiffres déclarés</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <Row
                  label="CA annuel"
                  value={
                    data.lead.annual_revenue_cents
                      ? formatEuros(Number(data.lead.annual_revenue_cents))
                      : "non renseigné"
                  }
                />
                <Row
                  label="EBITDA"
                  value={
                    data.lead.ebitda_cents
                      ? formatEuros(Number(data.lead.ebitda_cents))
                      : "non renseigné"
                  }
                />
                <Row
                  label="Taux d'occupation"
                  value={
                    data.lead.occupancy_rate
                      ? `${Number(data.lead.occupancy_rate)}%`
                      : "non renseigné"
                  }
                />
              </dl>
            </section>
            <section>
              <h3 className="font-medium text-navy mb-2">Estimation</h3>
              <div className="text-lg font-serif text-navy">
                {formatEurosRange(
                  Number(data.lead.value_low_cents),
                  Number(data.lead.value_high_cents),
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Méthode : {data.lead.method_used}
              </div>
              {data.lead.calculation_detail && (
                <pre className="mt-3 rounded-md bg-surface p-3 text-xs overflow-x-auto">
                  {JSON.stringify(data.lead.calculation_detail, null, 2)}
                </pre>
              )}
            </section>
            <section>
              <h3 className="font-medium text-navy mb-2">Contact</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <Row
                  label="Nom"
                  value={`${data.lead.first_name ?? ""} ${data.lead.last_name ?? ""}`.trim() || "—"}
                />
                <Row label="Email" value={data.lead.email} />
                <Row label="Téléphone" value={data.lead.phone ?? "—"} />
                <Row label="Intention" value={INTENT_LABEL[data.lead.sale_intent] ?? data.lead.sale_intent} />
                <Row label="Consentement contact" value={data.lead.consent_contact ? "oui" : "non"} />
                <Row label="Consentement news" value={data.lead.consent_marketing ? "oui" : "non"} />
              </dl>
            </section>
            <section>
              <h3 className="font-medium text-navy mb-2">Historique emails</h3>
              {data.emails.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun envoi enregistré.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {data.emails.map((e: any) => (
                    <li key={e.id} className="flex justify-between border-b border-border/60 py-1">
                      <span>{e.template}</span>
                      <span className="text-muted-foreground">
                        {e.status} · {new Date(e.created_at).toLocaleString("fr-FR")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="border-t border-border pt-6 space-y-3">
              <div>
                <Label htmlFor="lead-status">Statut interne</Label>
                <select
                  id="lead-status"
                  className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="lead-notes">Notes internes</Label>
                <textarea
                  id="lead-notes"
                  className="mt-1 w-full min-h-[120px] rounded-md border border-border bg-background p-2 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? "Enregistrement…" : "Enregistrer"}
                </Button>
                {saved && (
                  <span role="status" className="text-emerald-700 text-sm">
                    Enregistré.
                  </span>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{String(value)}</dd>
    </>
  );
}
