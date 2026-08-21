import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminMetrics, listLeads } from "@/lib/admin.functions";
import { formatEuros } from "@/lib/money";
import { getRegionBySlug } from "@/lib/regions";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/rapports")({
  component: ReportsPage,
});

type Period = "7" | "30" | "90" | "all";

const PERIODS: Array<{ value: Period; label: string }> = [
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "90", label: "90 jours" },
  { value: "all", label: "Tout" },
];

const STEP_LABELS: Record<string, string> = {
  visite: "Visites",
  "funnel_vendeur.started": "Parcours démarré",
  "estimation.step_1": "Étape 1",
  "estimation.step_2": "Étape 2",
  "estimation.step_3": "Étape 3",
  "estimation.step_4": "Étape 4",
  "estimation.step_5": "Étape 5",
  "estimation.step_6": "Étape 6",
  "estimation.completed": "Estimation terminée",
};

function ReportsPage() {
  const [days, setDays] = useState<Period>("30");
  const metricsFn = useServerFn(getAdminMetrics);
  const leadsFn = useServerFn(listLeads);

  const metrics = useQuery({
    queryKey: ["admin", "metrics", days],
    queryFn: () => metricsFn({ data: { days } }),
  });
  const estimations = useQuery({
    queryKey: ["admin", "estimations", days],
    queryFn: () => leadsFn({ data: { days, limit: 500 } }),
  });

  const rows = estimations.data ?? [];

  const byRegion = useMemo(() => {
    const map = new Map<string, { region: string; count: number; midSum: number }>();
    for (const r of rows as any[]) {
      const cur = map.get(r.region_slug) ?? { region: r.region_slug, count: 0, midSum: 0 };
      cur.count += 1;
      cur.midSum += (Number(r.value_low_cents) + Number(r.value_high_cents)) / 2;
      map.set(r.region_slug, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [rows]);

  function exportCsv() {
    const header = [
      "date",
      "region",
      "departement",
      "chambres",
      "etoiles",
      "operation",
      "valeur_basse_eur",
      "valeur_haute_eur",
      "methode",
      "intention",
      "statut",
      "prix_souhaite_eur",
      "email",
    ];
    const lines = (rows as any[]).map((r) =>
      [
        new Date(r.created_at).toISOString().slice(0, 10),
        r.region_slug,
        r.department_code,
        r.room_count,
        r.star_rating,
        r.transaction_type,
        Math.round(Number(r.value_low_cents) / 100),
        Math.round(Number(r.value_high_cents) / 100),
        r.method_used,
        r.sale_intent,
        r.status,
        r.price_expectation_cents ? Math.round(Number(r.price_expectation_cents) / 100) : "",
        r.email,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rapport-estimations-${days}j.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const m = metrics.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-navy">Rapports</h1>
          <p className="text-sm text-muted-foreground">
            Indicateurs d'activité et détail des estimations réalisées.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setDays(p.value)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  days === p.value ? "bg-navy text-navy-foreground" : "hover:bg-muted"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Indicateurs agrégés */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Estimations (période)" value={m?.periodEstimations ?? 0} loading={metrics.isLoading} />
        <Kpi label="Leads qualifiés (période)" value={m?.periodLeads ?? 0} loading={metrics.isLoading} />
        <Kpi label="Leads ce mois-ci" value={m?.monthLeads ?? 0} loading={metrics.isLoading} />
        <Kpi
          label="Taux de qualification"
          value={m ? `${(m.qualifiedRate * 100).toFixed(1)} %` : "—"}
          loading={metrics.isLoading}
        />
      </section>

      {/* Entonnoir */}
      <section className="rounded-xl border border-border bg-background p-6">
        <h2 className="font-serif text-lg text-navy">Entonnoir de conversion</h2>
        <div className="mt-4 space-y-2">
          {(m?.funnel ?? []).map((f) => {
            const max = Math.max(1, ...(m?.funnel ?? []).map((x) => x.sessions));
            return (
              <div key={f.step} className="flex items-center gap-3 text-sm">
                <div className="w-44 shrink-0 text-muted-foreground">
                  {STEP_LABELS[f.step] ?? f.step}
                </div>
                <div className="flex-1 h-3 rounded bg-muted overflow-hidden">
                  <div
                    className="h-full bg-navy"
                    style={{ width: `${(f.sessions / max) * 100}%` }}
                  />
                </div>
                <div className="w-12 text-right tabular-nums">{f.sessions}</div>
              </div>
            );
          })}
          {!metrics.isLoading && (m?.funnel ?? []).every((f) => f.sessions === 0) && (
            <p className="text-sm text-muted-foreground">Aucune donnée sur la période.</p>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sources */}
        <section className="rounded-xl border border-border bg-background p-6">
          <h2 className="font-serif text-lg text-navy">Sources d'acquisition</h2>
          <table className="mt-4 w-full text-sm">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="py-1">Source</th>
                <th className="py-1 text-right">Estimations</th>
                <th className="py-1 text-right">Qualifiés</th>
              </tr>
            </thead>
            <tbody>
              {(m?.sources ?? []).map((s) => (
                <tr key={s.source} className="border-t border-border">
                  <td className="py-1.5">{s.source}</td>
                  <td className="py-1.5 text-right tabular-nums">{s.estimations}</td>
                  <td className="py-1.5 text-right tabular-nums">{s.qualified}</td>
                </tr>
              ))}
              {(m?.sources ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-muted-foreground">
                    Aucune donnée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Régions */}
        <section className="rounded-xl border border-border bg-background p-6">
          <h2 className="font-serif text-lg text-navy">Répartition par région</h2>
          <table className="mt-4 w-full text-sm">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="py-1">Région</th>
                <th className="py-1 text-right">Estimations</th>
                <th className="py-1 text-right">Valeur moyenne</th>
              </tr>
            </thead>
            <tbody>
              {byRegion.map((r) => (
                <tr key={r.region} className="border-t border-border">
                  <td className="py-1.5">{getRegionBySlug(r.region)?.name ?? r.region}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.count}</td>
                  <td className="py-1.5 text-right tabular-nums">
                    {formatEuros(Math.round(r.midSum / r.count))}
                  </td>
                </tr>
              ))}
              {byRegion.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 text-muted-foreground">
                    Aucune estimation sur la période.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      {/* Détail des estimations */}
      <section className="rounded-xl border border-border bg-background p-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-lg text-navy">Rapports d'estimation</h2>
          <span className="text-sm text-muted-foreground">{rows.length} ligne(s)</span>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left">
              <tr>
                <th className="py-1">Date</th>
                <th className="py-1">Établissement</th>
                <th className="py-1 text-right">Ch.</th>
                <th className="py-1 text-right">★</th>
                <th className="py-1">Opération</th>
                <th className="py-1 text-right">Fourchette</th>
                <th className="py-1 text-right">Prix souhaité</th>
                <th className="py-1">Méthode</th>
                <th className="py-1">Contact</th>
              </tr>
            </thead>
            <tbody>
              {(rows as any[]).map((r) => (
                <tr key={r.id} className="border-t border-border align-top">
                  <td className="py-1.5 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-1.5">
                    {getRegionBySlug(r.region_slug)?.name ?? r.region_slug} ({r.department_code})
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{r.room_count}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.star_rating}</td>
                  <td className="py-1.5">{r.transaction_type}</td>
                  <td className="py-1.5 text-right whitespace-nowrap tabular-nums">
                    {formatEuros(Number(r.value_low_cents))} – {formatEuros(Number(r.value_high_cents))}
                  </td>
                  <td className="py-1.5 text-right whitespace-nowrap tabular-nums">
                    {r.price_expectation_cents
                      ? formatEuros(Number(r.price_expectation_cents))
                      : "—"}
                  </td>
                  <td className="py-1.5">{r.method_used}</td>
                  <td className="py-1.5 break-all">{r.email}</td>
                </tr>
              ))}
              {rows.length === 0 && !estimations.isLoading && (
                <tr>
                  <td colSpan={9} className="py-3 text-muted-foreground">
                    Aucune estimation sur la période.
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

function Kpi({
  label,
  value,
  loading,
}: {
  label: string;
  value: number | string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-2xl text-navy tabular-nums">
        {loading ? "…" : value}
      </div>
    </div>
  );
}
