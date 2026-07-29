import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCoefficients } from "@/lib/admin.functions";
import { BENCHMARKS, type Benchmark } from "@/lib/benchmarks";
import { computeValuation, type Coefficient } from "@/lib/valuation";
import { regions } from "@/lib/regions";

export const Route = createFileRoute("/admin/benchmarks")({
  component: BenchmarksPage,
});

/** Nombre de chambres "canonique" pour normaliser en prix/chambre. */
const CANONICAL_ROOMS = 40;

interface Row {
  bench: Benchmark;
  regionName: string;
  engineLowPerRoom: number;
  engineHighPerRoom: number;
  benchMid: number;
  engineMid: number;
  /** Écart signé sur la médiane, en % du benchmark. Négatif = moteur sous-évalue. */
  midDeltaPct: number;
  /** Score d'erreur : distance de la fourchette moteur à la fourchette benchmark, normalisée. */
  errorScore: number;
  /** État qualitatif */
  status: "aligned" | "low" | "high" | "missing";
}

function scoreScenario(bench: Benchmark, coef: Coefficient | undefined): Row {
  const regionName =
    regions.find((r) => r.slug === bench.regionSlug)?.name ?? bench.regionSlug;
  if (!coef) {
    return {
      bench,
      regionName,
      engineLowPerRoom: 0,
      engineHighPerRoom: 0,
      benchMid: (bench.lowPerRoomEuros + bench.highPerRoomEuros) / 2,
      engineMid: 0,
      midDeltaPct: 0,
      errorScore: 0,
      status: "missing",
    };
  }

  const result = computeValuation(
    {
      regionSlug: bench.regionSlug,
      starRating: bench.starRating,
      roomCount: CANONICAL_ROOMS,
      transactionType: bench.transactionType,
      // Sans EBITDA/CA : moteur bascule sur per_room pur → benchmark direct des coefs
      annualRevenueCents: null,
      ebitdaCents: null,
      occupancyRate: null,
      worksNeeded: null,
      hasRestaurant: false,
      hasLicence4: false,
    },
    coef,
  );

  const engineLowPerRoom = result.valueLowCents / 100 / CANONICAL_ROOMS;
  const engineHighPerRoom = result.valueHighCents / 100 / CANONICAL_ROOMS;
  const benchMid = (bench.lowPerRoomEuros + bench.highPerRoomEuros) / 2;
  const engineMid = (engineLowPerRoom + engineHighPerRoom) / 2;
  const midDeltaPct = ((engineMid - benchMid) / benchMid) * 100;

  // Score d'erreur : combine décalage médian + désalignement de fourchette.
  // 0 = fourchette moteur incluse dans le benchmark ; 100 = moteur totalement disjoint.
  const overlapLow = Math.max(engineLowPerRoom, bench.lowPerRoomEuros);
  const overlapHigh = Math.min(engineHighPerRoom, bench.highPerRoomEuros);
  const overlap = Math.max(0, overlapHigh - overlapLow);
  const benchSpan = bench.highPerRoomEuros - bench.lowPerRoomEuros;
  const overlapRatio = benchSpan > 0 ? overlap / benchSpan : 0;
  const errorScore = Math.min(
    100,
    Math.abs(midDeltaPct) * 0.7 + (1 - overlapRatio) * 40,
  );

  let status: Row["status"];
  if (Math.abs(midDeltaPct) <= 15 && overlapRatio >= 0.5) status = "aligned";
  else if (midDeltaPct < -15) status = "low";
  else status = "high";

  return {
    bench,
    regionName,
    engineLowPerRoom,
    engineHighPerRoom,
    benchMid,
    engineMid,
    midDeltaPct,
    errorScore,
    status,
  };
}

function fmtEuros(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function BenchmarksPage() {
  const listFn = useServerFn(listCoefficients);
  const { data: coefficients, isLoading } = useQuery({
    queryKey: ["admin-coefficients"],
    queryFn: () => listFn(),
  });
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<Row["status"] | "">("");

  const rows = useMemo<Row[]>(() => {
    if (!coefficients) return [];
    const coefMap = new Map<string, Coefficient>();
    for (const c of coefficients) {
      coefMap.set(`${c.region_slug}::${c.star_rating}`, c as unknown as Coefficient);
    }
    return BENCHMARKS.map((b) =>
      scoreScenario(b, coefMap.get(`${b.regionSlug}::${b.starRating}`)),
    );
  }, [coefficients]);

  const filtered = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!regionFilter || r.bench.regionSlug === regionFilter) &&
          (!statusFilter || r.status === statusFilter),
      ),
    [rows, regionFilter, statusFilter],
  );

  const summary = useMemo(() => {
    if (rows.length === 0)
      return { total: 0, aligned: 0, low: 0, high: 0, avgAbsDelta: 0, avgScore: 0 };
    let aligned = 0,
      low = 0,
      high = 0,
      sumAbs = 0,
      sumScore = 0;
    for (const r of rows) {
      if (r.status === "aligned") aligned++;
      if (r.status === "low") low++;
      if (r.status === "high") high++;
      sumAbs += Math.abs(r.midDeltaPct);
      sumScore += r.errorScore;
    }
    return {
      total: rows.length,
      aligned,
      low,
      high,
      avgAbsDelta: sumAbs / rows.length,
      avgScore: sumScore / rows.length,
    };
  }, [rows]);

  // Agrégat par région (pour guider les ajustements)
  const byRegion = useMemo(() => {
    const map = new Map<string, { name: string; count: number; sumDelta: number; sumScore: number }>();
    for (const r of rows) {
      const key = r.bench.regionSlug;
      const cur = map.get(key) ?? { name: r.regionName, count: 0, sumDelta: 0, sumScore: 0 };
      cur.count++;
      cur.sumDelta += r.midDeltaPct;
      cur.sumScore += r.errorScore;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([slug, v]) => ({
        slug,
        name: v.name,
        count: v.count,
        avgDelta: v.sumDelta / v.count,
        avgScore: v.sumScore / v.count,
      }))
      .sort((a, b) => b.avgScore - a.avgScore);
  }, [rows]);

  const usedRegionSlugs = Array.from(new Set(BENCHMARKS.map((b) => b.regionSlug)));

  if (isLoading) {
    return <div className="p-6 text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      <header>
        <h1 className="font-serif text-2xl text-navy">Benchmarks marché</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-3xl">
          Pour chaque scénario (région × étoiles × type de transaction), le moteur est
          exécuté sur un hôtel canonique de {CANONICAL_ROOMS} chambres sans EBITDA ni
          options. Le résultat est comparé à la fourchette prix/chambre observée sur le
          marché. Utilisez le score d'erreur pour prioriser les ajustements de
          coefficients.
        </p>
      </header>

      {/* KPIs synthèse */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Scénarios testés" value={String(summary.total)} />
        <Kpi label="Alignés (±15%)" value={`${summary.aligned}`} tone="ok" />
        <Kpi label="Sous-évalués" value={`${summary.low}`} tone="warn" />
        <Kpi label="Sur-évalués" value={`${summary.high}`} tone="warn" />
        <Kpi
          label="Score moyen"
          value={summary.avgScore.toFixed(1)}
          hint={`Écart médian moyen : ${summary.avgAbsDelta.toFixed(1)} %`}
        />
      </section>

      {/* Classement par région */}
      <section>
        <h2 className="font-serif text-lg text-navy mb-3">
          Régions à recalibrer en priorité
        </h2>
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Région</th>
                <th className="px-3 py-2 text-right">Scénarios</th>
                <th className="px-3 py-2 text-right">Écart médian moyen</th>
                <th className="px-3 py-2 text-right">Score moyen</th>
                <th className="px-3 py-2">Recommandation</th>
              </tr>
            </thead>
            <tbody>
              {byRegion.map((r) => {
                const dir =
                  r.avgDelta < -10
                    ? "↑ augmenter les coefficients"
                    : r.avgDelta > 10
                      ? "↓ diminuer les coefficients"
                      : "✓ conserver";
                return (
                  <tr key={r.slug} className="border-t border-border">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
                    <td
                      className={`px-3 py-2 text-right tabular-nums ${
                        Math.abs(r.avgDelta) > 15 ? "text-amber-700 font-medium" : ""
                      }`}
                    >
                      {r.avgDelta > 0 ? "+" : ""}
                      {r.avgDelta.toFixed(1)} %
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.avgScore.toFixed(1)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{dir}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Filtres */}
      <section className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Région</label>
          <select
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
          >
            <option value="">Toutes</option>
            {usedRegionSlugs.map((slug) => (
              <option key={slug} value={slug}>
                {regions.find((r) => r.slug === slug)?.name ?? slug}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Statut</label>
          <select
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Row["status"] | "")}
          >
            <option value="">Tous</option>
            <option value="aligned">Alignés</option>
            <option value="low">Sous-évalués</option>
            <option value="high">Sur-évalués</option>
            <option value="missing">Coefficient manquant</option>
          </select>
        </div>
      </section>

      {/* Détail scénario par scénario */}
      <section>
        <div className="rounded-lg border border-border bg-white overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Région</th>
                <th className="px-3 py-2">★</th>
                <th className="px-3 py-2">Transaction</th>
                <th className="px-3 py-2 text-right">Benchmark €/ch.</th>
                <th className="px-3 py-2 text-right">Moteur €/ch.</th>
                <th className="px-3 py-2 text-right">Écart médian</th>
                <th className="px-3 py-2 text-right">Score</th>
                <th className="px-3 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i} className="border-t border-border align-top">
                  <td className="px-3 py-2">{r.regionName}</td>
                  <td className="px-3 py-2">{r.bench.starRating === 0 ? "NC" : r.bench.starRating}</td>
                  <td className="px-3 py-2 capitalize">
                    {r.bench.transactionType.replace("_", "+")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {fmtEuros(r.bench.lowPerRoomEuros)} – {fmtEuros(r.bench.highPerRoomEuros)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.status === "missing" ? (
                      <span className="text-muted-foreground italic">coef manquant</span>
                    ) : (
                      <>
                        {fmtEuros(r.engineLowPerRoom)} – {fmtEuros(r.engineHighPerRoom)}
                      </>
                    )}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums font-medium ${
                      r.status === "aligned"
                        ? "text-emerald-700"
                        : r.status === "low"
                          ? "text-amber-700"
                          : r.status === "high"
                            ? "text-rose-700"
                            : "text-muted-foreground"
                    }`}
                  >
                    {r.status === "missing"
                      ? "—"
                      : `${r.midDeltaPct > 0 ? "+" : ""}${r.midDeltaPct.toFixed(1)} %`}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <ScoreBadge score={r.errorScore} status={r.status} />
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground max-w-[24ch]">
                    {r.bench.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Le moteur est exécuté sans EBITDA ni CA, ce qui isole les coefficients
          prix/chambre. Les scénarios "fonds" / "murs" incluent en plus les facteurs
          de transaction du moteur. Ajustez ensuite les coefficients dans l'onglet
          <span className="mx-1 font-medium">Coefficients</span>.
        </p>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1 font-serif text-2xl ${
          tone === "ok" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-navy"
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function ScoreBadge({ score, status }: { score: number; status: Row["status"] }) {
  if (status === "missing")
    return <span className="text-muted-foreground">—</span>;
  const color =
    score < 15
      ? "bg-emerald-100 text-emerald-800"
      : score < 35
        ? "bg-amber-100 text-amber-800"
        : "bg-rose-100 text-rose-800";
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${color}`}>
      {score.toFixed(0)}
    </span>
  );
}
