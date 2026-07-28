import type { Coefficient } from "@/lib/valuation";
import { formatEuros } from "@/lib/money";

const STARS = [0, 1, 2, 3, 4, 5] as const;

export function ValuationTable({ coefficients }: { coefficients: Coefficient[] }) {
  const byStar = new Map(coefficients.map((c) => [c.star_rating, c]));
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="min-w-full text-sm border-separate border-spacing-0">
        <caption className="sr-only">
          Fourchettes indicatives par classement : prix par chambre et multiples d'EBITDA
        </caption>
        <thead>
          <tr className="text-left text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-medium border-b border-border">Classement</th>
            <th scope="col" className="px-4 py-3 font-medium border-b border-border tabular-nums">Prix / chambre</th>
            <th scope="col" className="px-4 py-3 font-medium border-b border-border tabular-nums">Multiple EBITDA</th>
          </tr>
        </thead>
        <tbody>
          {STARS.map((s) => {
            const c = byStar.get(s);
            if (!c) return null;
            const label = s === 0 ? "Non classé" : `${s} étoile${s > 1 ? "s" : ""}`;
            return (
              <tr key={s} className="hover:bg-surface/60">
                <th scope="row" className="px-4 py-3 font-medium text-navy border-b border-border/60">{label}</th>
                <td className="px-4 py-3 tabular-nums border-b border-border/60">
                  {formatEurosCents(c.price_per_room_low_cents)} – {formatEurosCents(c.price_per_room_high_cents)}
                </td>
                <td className="px-4 py-3 tabular-nums border-b border-border/60">
                  {c.ebitda_multiple_low.toFixed(1)}× – {c.ebitda_multiple_high.toFixed(1)}×
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
