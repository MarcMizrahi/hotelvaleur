import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  applyCalibration,
  listCalibrationRuns,
  previewCalibration,
} from "@/lib/calibration.functions";
import { getRegionBySlug } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { MAX_MOVE, type CalibrationProposal } from "@/lib/calibration";

export const Route = createFileRoute("/admin/calibrage")({
  component: CalibragePage,
});

function eur(cents: number) {
  return `${Math.round(cents / 100).toLocaleString("fr-FR")} €`;
}

function pct(v: number) {
  const s = (v * 100).toFixed(1);
  return `${v > 0 ? "+" : ""}${s} %`;
}

function CalibragePage() {
  const qc = useQueryClient();
  const previewFn = useServerFn(previewCalibration);
  const applyFn = useServerFn(applyCalibration);
  const runsFn = useServerFn(listCalibrationRuns);

  const preview = useQuery({ queryKey: ["admin", "calibration", "preview"], queryFn: () => previewFn() });
  const runs = useQuery({ queryKey: ["admin", "calibration", "runs"], queryFn: () => runsFn() });

  const apply = useMutation({
    mutationFn: () => applyFn(),
    onSuccess: (r: any) => {
      toast.success(`${r.segmentsAdjusted} segment(s) recalibré(s)`);
      qc.invalidateQueries({ queryKey: ["admin", "calibration"] });
      qc.invalidateQueries({ queryKey: ["admin", "coefficients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const proposals = ((preview.data as any)?.proposals ?? []) as CalibrationProposal[];
  const adjusted = proposals.filter((p) => p.status === "adjusted");
  const stable = proposals.filter((p) => p.status === "stable").length;
  const insufficient = proposals.filter((p) => p.status === "insufficient_data").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Calibrage continu</h1>
        <p className="text-sm text-muted-foreground">
          Rapproche automatiquement les prix par chambre du moteur des transactions validées.
          Le déplacement est amorti et plafonné à ±{Math.round(MAX_MOVE * 100)} % par exécution.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: "Transactions utilisées", value: (preview.data as any)?.transactionsUsed ?? 0 },
          { label: "Segments à ajuster", value: adjusted.length },
          { label: "Segments stables", value: stable },
          { label: "Données insuffisantes", value: insufficient },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-background p-4">
            <div className="text-xs text-muted-foreground">{k.label}</div>
            <div className="font-serif text-2xl text-navy">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => apply.mutate()}
          disabled={apply.isPending || adjusted.length === 0}
        >
          {apply.isPending ? "Calibrage…" : `Appliquer le calibrage (${adjusted.length})`}
        </Button>
        <Button
          variant="outline"
          onClick={() => qc.invalidateQueries({ queryKey: ["admin", "calibration", "preview"] })}
        >
          Recalculer la simulation
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-background p-4 overflow-x-auto">
        <h2 className="font-serif text-lg text-navy mb-3">Propositions</h2>
        <table className="min-w-[860px] w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2">Région</th>
              <th className="py-2">Catégorie</th>
              <th className="py-2">Échantillon</th>
              <th className="py-2">Médiane marché</th>
              <th className="py-2">Fourchette actuelle</th>
              <th className="py-2">Fourchette proposée</th>
              <th className="py-2">Écart marché</th>
              <th className="py-2">Mouvement</th>
            </tr>
          </thead>
          <tbody>
            {proposals.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="py-2 whitespace-nowrap">
                  {getRegionBySlug(p.region_slug)?.name ?? p.region_slug}
                </td>
                <td className="py-2 whitespace-nowrap">
                  {p.star_rating === 0 ? "Non classé" : `${p.star_rating}★`}
                </td>
                <td className="py-2 whitespace-nowrap">
                  {p.sampleSize > 0
                    ? `${p.sampleSize} (${p.scope === "segment" ? "segment" : "région"})`
                    : "—"}
                </td>
                <td className="py-2 whitespace-nowrap">
                  {p.observedMedianCents ? eur(p.observedMedianCents) : "—"}
                </td>
                <td className="py-2 whitespace-nowrap">
                  {eur(p.currentLowCents)} – {eur(p.currentHighCents)}
                </td>
                <td className="py-2 whitespace-nowrap">
                  {p.status === "adjusted"
                    ? `${eur(p.proposedLowCents)} – ${eur(p.proposedHighCents)}`
                    : "inchangée"}
                </td>
                <td className="py-2 whitespace-nowrap">
                  {p.sampleSize > 0 ? pct(p.deltaRatio) : "—"}
                </td>
                <td
                  className={`py-2 whitespace-nowrap ${
                    p.status === "adjusted" ? "text-navy font-medium" : "text-muted-foreground"
                  }`}
                >
                  {p.status === "insufficient_data" ? "—" : pct(p.moveRatio)}
                </td>
              </tr>
            ))}
            {proposals.length === 0 && !preview.isLoading && (
              <tr>
                <td colSpan={8} className="py-3 text-muted-foreground">
                  Aucune donnée de calibrage.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-border bg-background p-4 overflow-x-auto">
        <h2 className="font-serif text-lg text-navy mb-3">Historique des exécutions</h2>
        <table className="min-w-[640px] w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2">Date</th>
              <th className="py-2">Mode</th>
              <th className="py-2">Appliqué</th>
              <th className="py-2">Segments ajustés</th>
              <th className="py-2">Transactions</th>
            </tr>
          </thead>
          <tbody>
            {(((runs.data as any)?.runs ?? []) as any[]).map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="py-2 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString("fr-FR")}
                </td>
                <td className="py-2">{r.mode === "auto" ? "Automatique" : "Manuel"}</td>
                <td className="py-2">{r.applied ? "Oui" : "Simulation"}</td>
                <td className="py-2">{r.segments_adjusted}</td>
                <td className="py-2">{r.transactions_used}</td>
              </tr>
            ))}
            {((runs.data as any)?.runs ?? []).length === 0 && !runs.isLoading && (
              <tr>
                <td colSpan={5} className="py-3 text-muted-foreground">
                  Aucune exécution enregistrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
