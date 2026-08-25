import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/backoffice.functions";
import { formatEuros } from "@/lib/money";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

function DashboardPage() {
  const fn = useServerFn(getDashboard);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: () => fn(),
  });

  const trend =
    data && data.estimationsPrev30 > 0
      ? (data.estimations30 - data.estimationsPrev30) / data.estimationsPrev30
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl text-navy">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">
          Vue d'ensemble de l'activité sur les 30 derniers jours.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Estimations (30 j)"
          value={data?.estimations30 ?? 0}
          hint={
            trend === null
              ? "Pas d'historique"
              : `${trend >= 0 ? "+" : ""}${(trend * 100).toFixed(0)} % vs 30 j précédents`
          }
          loading={isLoading}
        />
        <Kpi
          label="Leads qualifiés (30 j)"
          value={data?.qualified30 ?? 0}
          hint="Cession < 2 ans"
          loading={isLoading}
        />
        <Kpi
          label="Leads non attribués"
          value={data?.unassignedLeads ?? 0}
          hint="Estimations sans agent"
          loading={isLoading}
        />
        <Kpi
          label="Valeur médiane"
          value={data ? formatEuros(data.medianValueCents) : "—"}
          hint="Milieu de fourchette"
          loading={isLoading}
        />
      </section>

      <section className="rounded-xl border border-border bg-background p-6">
        <h2 className="font-serif text-lg text-navy">Estimations — 30 derniers jours</h2>
        <Sparkline series={data?.series ?? []} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel
          title="Mise en relation"
          rows={[
            ["Demandes (90 j)", data?.brokerageLeads30 ?? 0],
            ["En attente d'attribution", data?.brokerageUnassigned ?? 0],
          ]}
          to="/admin/leads"
          cta="Gérer les leads"
        />
        <Panel
          title="Agents"
          rows={[
            ["Actifs", data?.agentsActive ?? 0],
            ["Total", data?.agentsTotal ?? 0],
          ]}
          to="/admin/agents"
          cta="Gérer les agents"
        />
        <Panel
          title="Transactions marché"
          rows={[
            ["À valider", data?.txPending ?? 0],
            ["Validées", data?.txValidated ?? 0],
          ]}
          to="/admin/transactions"
          cta="Ouvrir la revue"
        />
      </div>

      {data?.lastRun && (
        <p className="text-sm text-muted-foreground">
          Dernier scraping :{" "}
          {new Date(data.lastRun.started_at as string).toLocaleString("fr-FR")} —{" "}
          {String(data.lastRun.status)} ({Number(data.lastRun.transactions_inserted)} transaction(s)
          insérée(s))
        </p>
      )}
    </div>
  );
}

function Sparkline({ series }: { series: Array<{ date: string; count: number }> }) {
  const max = Math.max(1, ...series.map((s) => s.count));
  return (
    <div className="mt-5 flex h-32 items-end gap-1">
      {series.map((s) => (
        <div key={s.date} className="group relative flex-1">
          <div
            className="w-full rounded-t bg-navy/80 transition-colors group-hover:bg-gold"
            style={{ height: `${Math.max(2, (s.count / max) * 120)}px` }}
          />
          <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-navy px-2 py-0.5 text-xs text-navy-foreground group-hover:block">
            {new Date(s.date).toLocaleDateString("fr-FR")} · {s.count}
          </span>
        </div>
      ))}
      {series.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune donnée.</p>
      )}
    </div>
  );
}

function Panel({
  title,
  rows,
  to,
  cta,
}: {
  title: string;
  rows: Array<[string, number]>;
  to: string;
  cta: string;
}) {
  return (
    <section className="rounded-xl border border-border bg-background p-6">
      <h2 className="font-serif text-lg text-navy">{title}</h2>
      <dl className="mt-3 space-y-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <Link to={to} className="mt-4 inline-block text-sm text-navy underline">
        {cta}
      </Link>
    </section>
  );
}

function Kpi({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: number | string;
  hint?: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-serif text-2xl text-navy tabular-nums">
        {loading ? "…" : value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
