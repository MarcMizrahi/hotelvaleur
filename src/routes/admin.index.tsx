import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminMetrics } from "@/lib/admin.functions";
import { formatEuros } from "@/lib/money";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type Period = "7" | "30" | "90" | "all";
const PERIODS: { value: Period; label: string }[] = [
  { value: "7", label: "7 jours" },
  { value: "30", label: "30 jours" },
  { value: "90", label: "90 jours" },
  { value: "all", label: "Depuis le lancement" },
];

function AdminDashboard() {
  const [days, setDays] = useState<Period>("30");
  const fetchMetrics = useServerFn(getAdminMetrics);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-metrics", days],
    queryFn: () => fetchMetrics({ data: { days } }),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl text-navy">Tableau de bord</h1>
        <div className="flex gap-1 rounded-md border border-border bg-background p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDays(p.value)}
              className={`px-3 py-1.5 text-sm rounded ${
                days === p.value ? "bg-navy text-navy-foreground" : "hover:bg-surface"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          Erreur de chargement : {(error as Error).message}
        </div>
      )}

      {isLoading || !data ? (
        <div className="text-muted-foreground">Chargement…</div>
      ) : (
        <>
          <HeadlineKpi data={data} />
          <Funnel funnel={data.funnel} />
          <Sources sources={data.sources} />
        </>
      )}
    </div>
  );
}

function HeadlineKpi({ data }: { data: any }) {
  const delta = data.monthLeads - data.prevMonthLeads;
  const ratePct = Math.round(data.qualifiedRate * 1000) / 10;
  const rateColor = ratePct >= 30 ? "text-emerald-700" : "text-foreground";
  return (
    <section className="rounded-xl border border-border bg-background p-6 md:p-8">
      <div className="text-sm text-muted-foreground">
        Leads qualifiés du mois en cours
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-6">
        <div className="font-serif text-6xl md:text-7xl text-navy leading-none">
          {data.monthLeads}
        </div>
        <div className="text-sm text-muted-foreground space-y-0.5">
          <div>
            Cumul depuis lancement :{" "}
            <span className="text-foreground font-medium">{data.totalLeads}</span>
          </div>
          <div>
            Vs mois précédent :{" "}
            <span
              className={
                delta > 0
                  ? "text-emerald-700 font-medium"
                  : delta < 0
                    ? "text-red-700 font-medium"
                    : "text-foreground"
              }
            >
              {delta >= 0 ? "+" : ""}
              {delta}
            </span>{" "}
            ({data.prevMonthLeads} le mois passé)
          </div>
          <div>
            Taux qualifiés / total : <span className={`font-medium ${rateColor}`}>{ratePct}%</span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground border-t border-border pt-4">
        Objectif : 15 leads qualifiés par mois. Seuil de décision : 30 à 50 leads cumulés,
        dont au moins 30 % avec une intention de vente sous deux ans.
      </p>
    </section>
  );
}

function Funnel({ funnel }: { funnel: { step: string; sessions: number }[] }) {
  const labels: Record<string, string> = {
    visite: "Visite",
    "funnel_vendeur.started": "Parcours démarré",
    "estimation.step_1": "Étape 1",
    "estimation.step_2": "Étape 2",
    "estimation.step_3": "Étape 3",
    "estimation.step_4": "Étape 4",
    "estimation.step_5": "Étape 5",
    "estimation.step_6": "Étape 6",
    "estimation.completed": "Estimation envoyée",
  };
  const max = Math.max(...funnel.map((f) => f.sessions), 1);
  let worstDropIdx = -1;
  let worstDropRate = 0;
  for (let i = 1; i < funnel.length; i++) {
    if (funnel[i - 1].sessions === 0) continue;
    const drop = 1 - funnel[i].sessions / funnel[i - 1].sessions;
    if (drop > worstDropRate) {
      worstDropRate = drop;
      worstDropIdx = i;
    }
  }

  const visite = funnel[0]?.sessions ?? 0;
  const started = funnel[1]?.sessions ?? 0;
  const completed = funnel[funnel.length - 1]?.sessions ?? 0;
  const visitToStart = visite > 0 ? (started / visite) * 100 : 0;
  const startToComplete = started > 0 ? (completed / started) * 100 : 0;

  return (
    <section className="rounded-xl border border-border bg-background p-6">
      <h2 className="font-serif text-xl text-navy">Entonnoir de conversion</h2>
      <div className="mt-4 space-y-2">
        {funnel.map((f, i) => {
          const prev = i > 0 ? funnel[i - 1].sessions : null;
          const conv = prev && prev > 0 ? (f.sessions / prev) * 100 : null;
          const drop = prev && prev > 0 ? 100 - conv! : null;
          const width = (f.sessions / max) * 100;
          const isWorst = i === worstDropIdx;
          return (
            <div
              key={f.step}
              className={`rounded-md p-3 ${isWorst ? "bg-amber-50 border border-amber-200" : "bg-surface"}`}
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{labels[f.step] ?? f.step}</span>
                <span className="tabular-nums">
                  {f.sessions.toLocaleString("fr-FR")} sessions
                  {conv !== null && (
                    <span className="ml-3 text-muted-foreground">
                      {conv.toFixed(1)}% ({drop!.toFixed(1)}% perdus)
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-2 h-2 rounded bg-background overflow-hidden">
                <div
                  className="h-full bg-navy"
                  style={{ width: `${Math.max(width, 2)}%` }}
                  aria-hidden
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 text-sm border-t border-border pt-4 text-muted-foreground">
        <div>
          Visite → démarrage :{" "}
          <span className={`font-medium ${visitToStart >= 8 ? "text-emerald-700" : "text-foreground"}`}>
            {visitToStart.toFixed(1)}%
          </span>{" "}
          (objectif ≥ 8 %)
        </div>
        <div>
          Démarrage → email envoyé :{" "}
          <span
            className={`font-medium ${startToComplete >= 40 ? "text-emerald-700" : "text-foreground"}`}
          >
            {startToComplete.toFixed(1)}%
          </span>{" "}
          (objectif ≥ 40 %)
        </div>
      </div>
    </section>
  );
}

function Sources({
  sources,
}: {
  sources: { source: string; estimations: number; qualified: number }[];
}) {
  return (
    <section className="rounded-xl border border-border bg-background p-6">
      <h2 className="font-serif text-xl text-navy">Sources d'acquisition</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground border-b border-border">
            <tr>
              <th className="py-2 pr-4">Source</th>
              <th className="py-2 pr-4 text-right">Estimations</th>
              <th className="py-2 pr-4 text-right">Leads qualifiés</th>
              <th className="py-2 text-right">Taux</th>
            </tr>
          </thead>
          <tbody>
            {sources.length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted-foreground">
                  Aucune donnée sur la période.
                </td>
              </tr>
            )}
            {sources.map((s) => {
              const rate = s.estimations > 0 ? (s.qualified / s.estimations) * 100 : 0;
              return (
                <tr key={s.source} className="border-b border-border/60">
                  <td className="py-2 pr-4 font-medium">{s.source}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{s.estimations}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{s.qualified}</td>
                  <td className="py-2 text-right tabular-nums">{rate.toFixed(1)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
