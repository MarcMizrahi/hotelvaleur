import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { recomputeEstimation } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { formatEuros } from "@/lib/money";

type Estimation = {
  id: string;
  room_count: number;
  star_rating: number;
  annual_revenue_cents: number | string | null;
  ebitda_cents: number | string | null;
  occupancy_rate: number | string | null;
  works_cost_cents: number | string | null;
  value_low_cents: number | string;
  value_high_cents: number | string;
};

type Result = {
  applied: boolean;
  previous: { valueLowCents: number; valueHighCents: number; methodUsed: string };
  valueLowCents: number;
  valueHighCents: number;
  methodUsed: string;
  formula: string[];
  warnings: string[];
};

/** Euros saisis → centimes. */
const toCents = (v: string) =>
  v.trim() === "" ? null : Math.max(0, Math.round(Number(v.replace(/[^\d.,-]/g, "").replace(",", ".")) * 100));
/** Centimes → euros pour l'affichage du champ. */
const toEuros = (v: number | string | null) =>
  v === null || v === undefined ? "" : String(Math.round(Number(v) / 100));

export function RecomputePanel({ estimation }: { estimation: Estimation }) {
  const qc = useQueryClient();
  const fn = useServerFn(recomputeEstimation);

  const [rooms, setRooms] = useState(String(estimation.room_count));
  const [stars, setStars] = useState(String(estimation.star_rating));
  const [revenue, setRevenue] = useState(toEuros(estimation.annual_revenue_cents));
  const [ebitda, setEbitda] = useState(toEuros(estimation.ebitda_cents));
  const [occupancy, setOccupancy] = useState(
    estimation.occupancy_rate === null ? "" : String(estimation.occupancy_rate),
  );
  const [works, setWorks] = useState(toEuros(estimation.works_cost_cents));
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    setRooms(String(estimation.room_count));
    setStars(String(estimation.star_rating));
    setRevenue(toEuros(estimation.annual_revenue_cents));
    setEbitda(toEuros(estimation.ebitda_cents));
    setOccupancy(estimation.occupancy_rate === null ? "" : String(estimation.occupancy_rate));
    setWorks(toEuros(estimation.works_cost_cents));
    setResult(null);
  }, [estimation.id]);

  const overrides = () => ({
    roomCount: rooms.trim() === "" ? null : Number(rooms),
    starRating: stars.trim() === "" ? null : Number(stars),
    annualRevenueCents: toCents(revenue),
    ebitdaCents: toCents(ebitda),
    occupancyRate: occupancy.trim() === "" ? null : Number(occupancy),
    worksCostCents: toCents(works),
  });

  const run = useMutation({
    mutationFn: (apply: boolean) =>
      fn({ data: { id: estimation.id, apply, overrides: overrides() } }) as Promise<Result>,
    onSuccess: (res) => {
      setResult(res);
      if (res.applied) {
        toast.success("Fourchette recalculée et enregistrée");
        qc.invalidateQueries({ queryKey: ["admin", "leads"] });
      } else {
        toast.success("Simulation calculée");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div>
        <p className="text-sm font-medium">Recalcul automatique de la fourchette</p>
        <p className="text-xs text-muted-foreground">
          Moteur déterministe : prix par chambre (coefficients région × classement), multiple
          d'EBITDA, recentrage sur les transactions validées, ajustements et déduction des travaux.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Chambres" value={rooms} onChange={setRooms} />
        <Field label="Étoiles" value={stars} onChange={setStars} />
        <Field label="CA annuel (€)" value={revenue} onChange={setRevenue} />
        <Field label="EBITDA (€)" value={ebitda} onChange={setEbitda} />
        <Field label="Occupation (%)" value={occupancy} onChange={setOccupancy} />
        <Field label="Travaux (€)" value={works} onChange={setWorks} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={run.isPending} onClick={() => run.mutate(false)}>
          {run.isPending ? "Calcul…" : "Simuler"}
        </Button>
        <Button
          size="sm"
          className="bg-navy text-navy-foreground hover:bg-navy/90"
          disabled={run.isPending}
          onClick={() => run.mutate(true)}
        >
          Appliquer
        </Button>
      </div>

      {result && (
        <div className="space-y-2 rounded-md bg-muted/50 p-3 text-xs">
          <p className="text-sm text-navy font-medium">
            {formatEuros(result.valueLowCents)} – {formatEuros(result.valueHighCents)}
          </p>
          <p className="text-muted-foreground">
            Avant : {formatEuros(result.previous.valueLowCents)} –{" "}
            {formatEuros(result.previous.valueHighCents)} · Méthode : {result.methodUsed}
          </p>
          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
            {result.formula.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
          {result.warnings.map((w) => (
            <p key={w} className="text-amber-700">
              ⚠ {w}
            </p>
          ))}
          {!result.applied && (
            <p className="text-muted-foreground">Simulation — rien n'a encore été enregistré.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="text-xs">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
      />
    </label>
  );
}
