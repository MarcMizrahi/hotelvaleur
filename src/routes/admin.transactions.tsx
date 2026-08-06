import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMarketTransactions,
  runScrapeNow,
  setTransactionStatus,
} from "@/lib/market.functions";
import { Button } from "@/components/ui/button";
import { regions } from "@/lib/regions";
import { formatEuros } from "@/lib/money";

export const Route = createFileRoute("/admin/transactions")({
  component: TransactionsPage,
});

type Status = "pending" | "validated" | "rejected";

const STATUS_LABEL: Record<Status, string> = {
  pending: "À valider",
  validated: "Validée",
  rejected: "Rejetée",
};

function regionName(slug: string | null) {
  if (!slug) return "—";
  return regions.find((r) => r.slug === slug)?.name ?? slug;
}

function TransactionsPage() {
  const list = useServerFn(listMarketTransactions);
  const setStatus = useServerFn(setTransactionStatus);
  const runNow = useServerFn(runScrapeNow);
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Status | "all">("pending");
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["market-transactions"],
    queryFn: () => list(),
  });

  const mutate = useMutation({
    mutationFn: (v: { id: string; status: Status }) => setStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["market-transactions"] }),
  });

  const scrape = useMutation({
    mutationFn: () => runNow(),
    onSuccess: (r) => {
      setMessage(
        `Veille terminée : ${r.articlesFound} article(s) analysé(s), ${r.transactionsInserted} transaction(s) ajoutée(s).`,
      );
      qc.invalidateQueries({ queryKey: ["market-transactions"] });
    },
    onError: (e) => setMessage(e instanceof Error ? e.message : "Échec de la veille."),
  });

  const rows = (data?.transactions ?? []).filter(
    (t: any) => filter === "all" || t.status === filter,
  );
  const lastRun = data?.runs?.[0] as any | undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-navy">Transactions marché</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Veille hebdomadaire de la presse hôtelière et des communiqués de conseils. Les
            transactions validées alimentent la page Benchmarks.
          </p>
          {lastRun && (
            <p className="mt-1 text-xs text-muted-foreground">
              Dernière exécution :{" "}
              {new Date(lastRun.started_at).toLocaleString("fr-FR")} — statut {lastRun.status},{" "}
              {lastRun.articles_found} article(s), {lastRun.transactions_inserted} transaction(s).
            </p>
          )}
        </div>
        <Button onClick={() => scrape.mutate()} disabled={scrape.isPending}>
          {scrape.isPending ? "Veille en cours…" : "Lancer la veille maintenant"}
        </Button>
      </div>

      {message && (
        <div className="rounded-md border border-border bg-background p-3 text-sm">{message}</div>
      )}

      <div className="flex gap-2 text-sm">
        {(["pending", "validated", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 border transition-colors ${
              filter === s
                ? "bg-navy text-navy-foreground border-navy"
                : "border-border hover:bg-surface"
            }`}
          >
            {s === "all" ? "Toutes" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune transaction dans ce filtre.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Hôtel</th>
                <th className="px-3 py-2">Région</th>
                <th className="px-3 py-2">★</th>
                <th className="px-3 py-2">Ch.</th>
                <th className="px-3 py-2">Prix</th>
                <th className="px-3 py-2">€/chambre</th>
                <th className="px-3 py-2">Conf.</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t: any) => (
                <tr key={t.id} className="border-t border-border align-top">
                  <td className="px-3 py-2">
                    <div className="font-medium text-navy">{t.hotel_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.city ?? "—"} {t.department_code ? `(${t.department_code})` : ""}
                    </div>
                    {t.excerpt && (
                      <div className="mt-1 max-w-md text-xs italic text-muted-foreground">
                        « {t.excerpt} »
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">{regionName(t.region_slug)}</td>
                  <td className="px-3 py-2">{t.star_rating ?? "—"}</td>
                  <td className="px-3 py-2">{t.room_count ?? "—"}</td>
                  <td className="px-3 py-2">
                    {t.price_cents != null ? formatEuros(t.price_cents) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {t.price_per_room_cents != null ? formatEuros(t.price_per_room_cents) : "—"}
                  </td>
                  <td className="px-3 py-2">{Math.round((t.confidence ?? 0) * 100)} %</td>
                  <td className="px-3 py-2">
                    <a
                      href={t.source_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-gold underline"
                    >
                      {t.source_name}
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={t.status === "validated" ? "default" : "outline"}
                        onClick={() => mutate.mutate({ id: t.id, status: "validated" })}
                      >
                        Valider
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => mutate.mutate({ id: t.id, status: "rejected" })}
                      >
                        Rejeter
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
