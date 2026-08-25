import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { listCoefficients, updateCoefficient } from "@/lib/admin.functions";
import { getRegionBySlug } from "@/lib/regions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/coefficients")({
  component: CoefficientsPage,
});

type Draft = {
  ebitda_multiple_low: string;
  ebitda_multiple_high: string;
  price_per_room_low_eur: string;
  price_per_room_high_eur: string;
};

function CoefficientsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCoefficients);
  const updateFn = useServerFn(updateCoefficient);
  const [region, setRegion] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const coefs = useQuery({ queryKey: ["admin", "coefficients"], queryFn: () => listFn() });

  useEffect(() => {
    const rows = (coefs.data ?? []) as any[];
    if (rows.length === 0) return;
    setDrafts(
      Object.fromEntries(
        rows.map((r) => [
          r.id,
          {
            ebitda_multiple_low: String(r.ebitda_multiple_low),
            ebitda_multiple_high: String(r.ebitda_multiple_high),
            price_per_room_low_eur: String(Math.round(Number(r.price_per_room_low_cents) / 100)),
            price_per_room_high_eur: String(Math.round(Number(r.price_per_room_high_cents) / 100)),
          },
        ]),
      ),
    );
    if (!region) setRegion(rows[0].region_slug);
  }, [coefs.data]);

  const save = useMutation({
    mutationFn: (v: any) => updateFn({ data: v }),
    onSuccess: () => {
      toast.success("Coefficient enregistré");
      qc.invalidateQueries({ queryKey: ["admin", "coefficients"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (coefs.data ?? []) as any[];
  const regions = Array.from(new Set(rows.map((r) => r.region_slug)));
  const visible = rows.filter((r) => r.region_slug === region);

  function patch(id: string, key: keyof Draft, value: string) {
    setDrafts((d) => ({ ...d, [id]: { ...(d[id] as Draft), [key]: value } }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Coefficients de valorisation</h1>
        <p className="text-sm text-muted-foreground">
          Multiples d'EBITDA et prix par chambre utilisés par le moteur, par région et catégorie.
        </p>
      </div>

      <select
        value={region}
        onChange={(e) => setRegion(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm"
      >
        {regions.map((r) => (
          <option key={r} value={r}>
            {getRegionBySlug(r)?.name ?? r}
          </option>
        ))}
      </select>

      <section className="rounded-xl border border-border bg-background p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-2">Catégorie</th>
              <th className="py-2">Multiple EBITDA bas</th>
              <th className="py-2">Multiple EBITDA haut</th>
              <th className="py-2">€ / chambre bas</th>
              <th className="py-2">€ / chambre haut</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const d = drafts[r.id];
              if (!d) return null;
              return (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-2 whitespace-nowrap">
                    {r.star_rating === 0 ? "Non classé" : `${r.star_rating}★`}
                  </td>
                  {(
                    [
                      "ebitda_multiple_low",
                      "ebitda_multiple_high",
                      "price_per_room_low_eur",
                      "price_per_room_high_eur",
                    ] as Array<keyof Draft>
                  ).map((k) => (
                    <td key={k} className="py-2 pr-2">
                      <Input
                        value={d[k]}
                        onChange={(e) => patch(r.id, k, e.target.value)}
                        inputMode="decimal"
                        className="w-28"
                      />
                    </td>
                  ))}
                  <td className="py-2">
                    <Button
                      size="sm"
                      disabled={save.isPending}
                      onClick={() =>
                        save.mutate({
                          id: r.id,
                          ebitda_multiple_low: Number(d.ebitda_multiple_low),
                          ebitda_multiple_high: Number(d.ebitda_multiple_high),
                          price_per_room_low_cents: Math.round(
                            Number(d.price_per_room_low_eur) * 100,
                          ),
                          price_per_room_high_cents: Math.round(
                            Number(d.price_per_room_high_eur) * 100,
                          ),
                        })
                      }
                    >
                      Enregistrer
                    </Button>
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && !coefs.isLoading && (
              <tr>
                <td colSpan={6} className="py-3 text-muted-foreground">
                  Aucun coefficient pour cette région.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
