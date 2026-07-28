import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listCoefficients, updateCoefficient } from "@/lib/admin.functions";
import { regions } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeValuation } from "@/lib/valuation";
import { formatEurosRange } from "@/lib/money";

export const Route = createFileRoute("/admin/coefficients")({
  component: CoefficientsPage,
});

type Coef = {
  id: string;
  region_slug: string;
  star_rating: number;
  ebitda_multiple_low: number;
  ebitda_multiple_high: number;
  price_per_room_low_cents: number;
  price_per_room_high_cents: number;
  updated_at: string;
};

function CoefficientsPage() {
  const fetchFn = useServerFn(listCoefficients);
  const updateFn = useServerFn(updateCoefficient);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-coefficients"],
    queryFn: () => fetchFn(),
  });
  const [edits, setEdits] = useState<Record<string, Partial<Coef>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async (row: Coef) => {
      const patch = edits[row.id] ?? {};
      const payload = {
        id: row.id,
        ebitda_multiple_low: Number(patch.ebitda_multiple_low ?? row.ebitda_multiple_low),
        ebitda_multiple_high: Number(patch.ebitda_multiple_high ?? row.ebitda_multiple_high),
        price_per_room_low_cents: Math.round(
          Number(patch.price_per_room_low_cents ?? row.price_per_room_low_cents),
        ),
        price_per_room_high_cents: Math.round(
          Number(patch.price_per_room_high_cents ?? row.price_per_room_high_cents),
        ),
      };
      return updateFn({ data: payload });
    },
    onMutate: (row) => {
      setSavingId(row.id);
      setErrorMsg(null);
    },
    onSuccess: (_r, row) => {
      setEdits((s) => {
        const n = { ...s };
        delete n[row.id];
        return n;
      });
      qc.invalidateQueries({ queryKey: ["admin-coefficients"] });
    },
    onError: (e: Error) => setErrorMsg(e.message),
    onSettled: () => setSavingId(null),
  });

  function setField(id: string, field: keyof Coef, value: string) {
    setEdits((s) => ({
      ...s,
      [id]: {
        ...s[id],
        [field]:
          field.includes("cents") ? Number(value) * 100 : Number(value),
      },
    }));
  }

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-2xl text-navy">Coefficients de valorisation</h1>

      <div
        role="note"
        className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
      >
        Ces valeurs sont des ordres de grandeur de départ. Elles doivent être validées
        par un professionnel de la transaction hôtelière et affinées avec les données
        réelles collectées.
      </div>

      <Simulator coefficients={(data ?? []) as Coef[]} edits={edits} />

      {errorMsg && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {errorMsg}
        </div>
      )}

      <section className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-muted-foreground">
              <tr>
                <th className="py-2 px-3">Région</th>
                <th className="py-2 px-3">Étoiles</th>
                <th className="py-2 px-3">Multiple EBITDA bas</th>
                <th className="py-2 px-3">Multiple EBITDA haut</th>
                <th className="py-2 px-3">Prix / chambre bas (€)</th>
                <th className="py-2 px-3">Prix / chambre haut (€)</th>
                <th className="py-2 px-3">MàJ</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted-foreground">
                    Chargement…
                  </td>
                </tr>
              )}
              {(data ?? []).map((row: Coef) => {
                const e = edits[row.id] ?? {};
                const isDirty = Object.keys(e).length > 0;
                const regionName =
                  regions.find((r) => r.slug === row.region_slug)?.name ?? row.region_slug;
                return (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="py-2 px-3 whitespace-nowrap">{regionName}</td>
                    <td className="py-2 px-3">{row.star_rating}★</td>
                    <td className="py-2 px-3">
                      <NumberCell
                        value={(e.ebitda_multiple_low as number) ?? row.ebitda_multiple_low}
                        step="0.1"
                        onChange={(v) => setField(row.id, "ebitda_multiple_low", v)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <NumberCell
                        value={(e.ebitda_multiple_high as number) ?? row.ebitda_multiple_high}
                        step="0.1"
                        onChange={(v) => setField(row.id, "ebitda_multiple_high", v)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <NumberCell
                        value={Math.round(
                          ((e.price_per_room_low_cents as number) ??
                            row.price_per_room_low_cents) / 100,
                        )}
                        step="1000"
                        onChange={(v) => setField(row.id, "price_per_room_low_cents", v)}
                      />
                    </td>
                    <td className="py-2 px-3">
                      <NumberCell
                        value={Math.round(
                          ((e.price_per_room_high_cents as number) ??
                            row.price_per_room_high_cents) / 100,
                        )}
                        step="1000"
                        onChange={(v) => setField(row.id, "price_per_room_high_cents", v)}
                      />
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(row.updated_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="py-2 px-3">
                      <Button
                        size="sm"
                        variant={isDirty ? "default" : "outline"}
                        disabled={!isDirty || savingId === row.id}
                        onClick={() => save.mutate(row)}
                      >
                        {savingId === row.id ? "…" : "Enregistrer"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function NumberCell({
  value,
  step,
  onChange,
}: {
  value: number;
  step?: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="number"
      step={step ?? "1"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-24 h-9 rounded-md border border-border bg-background px-2 text-sm tabular-nums"
    />
  );
}

function Simulator({
  coefficients,
  edits,
}: {
  coefficients: Coef[];
  edits: Record<string, Partial<Coef>>;
}) {
  const [regionSlug, setRegionSlug] = useState("ile-de-france");
  const [stars, setStars] = useState(3);
  const [rooms, setRooms] = useState(40);
  const [ebitda, setEbitda] = useState<string>("300000");

  const merged = useMemo(
    () =>
      coefficients.map((c) => ({
        ...c,
        ...(edits[c.id] ?? {}),
      })) as Coef[],
    [coefficients, edits],
  );

  const row = merged.find(
    (c) => c.region_slug === regionSlug && c.star_rating === stars,
  );

  const result = row
    ? computeValuation({
        regionSlug,
        starRating: stars,
        roomCount: rooms,
        ebitdaCents: ebitda ? Math.round(Number(ebitda) * 100) : null,
        transactionType: "murs_et_fonds",
        coefficient: {
          ebitda_multiple_low: Number(row.ebitda_multiple_low),
          ebitda_multiple_high: Number(row.ebitda_multiple_high),
          price_per_room_low_cents: Number(row.price_per_room_low_cents),
          price_per_room_high_cents: Number(row.price_per_room_high_cents),
        },
      })
    : null;

  return (
    <section className="rounded-xl border border-border bg-background p-4 md:p-6">
      <h2 className="font-serif text-lg text-navy">Simulateur — avant enregistrement</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div>
          <Label htmlFor="sim-region">Région</Label>
          <select
            id="sim-region"
            className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={regionSlug}
            onChange={(e) => setRegionSlug(e.target.value)}
          >
            {regions.map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="sim-stars">Étoiles</Label>
          <select
            id="sim-stars"
            className="mt-1 w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={stars}
            onChange={(e) => setStars(Number(e.target.value))}
          >
            {[0, 1, 2, 3, 4, 5].map((s) => (
              <option key={s} value={s}>
                {s}★
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="sim-rooms">Chambres</Label>
          <Input
            id="sim-rooms"
            type="number"
            value={rooms}
            onChange={(e) => setRooms(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="sim-ebitda">EBITDA (€)</Label>
          <Input
            id="sim-ebitda"
            type="number"
            value={ebitda}
            onChange={(e) => setEbitda(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-4 rounded-md bg-surface p-3">
        {result ? (
          <>
            <div className="text-lg font-serif text-navy">
              {formatEurosRange(result.valueLowCents, result.valueHighCents)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Méthode : {result.method}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">
            Aucun coefficient pour cette combinaison.
          </div>
        )}
      </div>
    </section>
  );
}
