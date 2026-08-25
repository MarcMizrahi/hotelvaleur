import { usePersistentState } from "@/hooks/use-persistent-state";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listDedupLog,
  listMarketTransactions,
  runScrapeNow,
  setTransactionStatus,
} from "@/lib/market.functions";
import { formatEuros } from "@/lib/money";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/transactions")({
  component: TransactionsPage,
});

type Tab = "transactions" | "runs" | "dedup";

function TransactionsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMarketTransactions);
  const statusFn = useServerFn(setTransactionStatus);
  const scrapeFn = useServerFn(runScrapeNow);
  const dedupFn = useServerFn(listDedupLog);

  const [tab, setTab] = usePersistentState<Tab>("admin.tx.tab", "transactions");
  const [filter, setFilter] = usePersistentState<string>("admin.tx.filter", "pending");
  const [sort, setSort] = usePersistentState<string>("admin.tx.sort", "date_desc");


  const data = useQuery({
    queryKey: ["admin", "market"],
    queryFn: () => listFn(),
  });
  const dedup = useQuery({
    queryKey: ["admin", "dedup"],
    queryFn: () => dedupFn(),
    enabled: tab === "dedup",
  });

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: "pending" | "validated" | "rejected" }) =>
      statusFn({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "market"] });
      qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const scrape = useMutation({
    mutationFn: () => scrapeFn(),
    onSuccess: (r: any) => {
      toast.success(`Scraping terminé — ${r?.inserted ?? 0} transaction(s) insérée(s)`);
      qc.invalidateQueries({ queryKey: ["admin", "market"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const transactions = ((data.data?.transactions ?? []) as any[]).filter((t) =>
    filter ? t.status === filter : true,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-navy">Transactions marché</h1>
          <p className="text-sm text-muted-foreground">
            Validez les transactions collectées avant qu'elles n'alimentent les comparables.
          </p>
        </div>
        <Button onClick={() => scrape.mutate()} disabled={scrape.isPending}>
          {scrape.isPending ? "Scraping en cours…" : "Lancer un scraping"}
        </Button>
      </div>

      <div className="flex gap-1 border-b border-border text-sm">
        {(
          [
            ["transactions", "Transactions"],
            ["runs", "Exécutions"],
            ["dedup", "Doublons écartés"],
          ] as Array<[Tab, string]>
        ).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`px-3 py-2 ${
              tab === v ? "border-b-2 border-navy text-navy" : "text-muted-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "transactions" && (
        <section className="space-y-4">
          <div className="flex gap-2 text-sm">
            {[
              ["pending", "À valider"],
              ["validated", "Validées"],
              ["rejected", "Rejetées"],
              ["", "Toutes"],
            ].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={`rounded-md border border-border px-3 py-1.5 ${
                  filter === v ? "bg-navy text-navy-foreground" : "hover:bg-muted"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {transactions.map((t) => (
              <article
                key={t.id}
                className="rounded-xl border border-border bg-background p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-navy">
                      {t.hotel_name || t.title || "Transaction sans nom"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {[t.city, t.department_code, t.region_slug].filter(Boolean).join(" · ")}
                      {t.published_at
                        ? ` · ${new Date(t.published_at).toLocaleDateString("fr-FR")}`
                        : ""}
                      {` · confiance ${Math.round(Number(t.confidence) * 100)} %`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={t.status === "validated" ? "default" : "outline"}
                      onClick={() => setStatus.mutate({ id: t.id, status: "validated" })}
                    >
                      Valider
                    </Button>
                    <Button
                      size="sm"
                      variant={t.status === "rejected" ? "default" : "outline"}
                      onClick={() => setStatus.mutate({ id: t.id, status: "rejected" })}
                    >
                      Rejeter
                    </Button>
                  </div>
                </div>
                <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                  <span>{t.room_count ? `${t.room_count} chambres` : "Chambres n.c."}</span>
                  <span>{t.star_rating ? `${t.star_rating}★` : "Catégorie n.c."}</span>
                  <span>{t.transaction_type ?? "Type n.c."}</span>
                  <span>{t.price_cents ? formatEuros(Number(t.price_cents)) : "Prix n.c."}</span>
                  <span>
                    {t.price_per_room_cents
                      ? `${formatEuros(Number(t.price_per_room_cents))} / chambre`
                      : "—"}
                  </span>
                  <a
                    href={t.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-navy underline"
                  >
                    {t.source_name}
                  </a>
                </div>
                {t.excerpt && (
                  <p className="mt-2 text-sm text-muted-foreground">{t.excerpt}</p>
                )}
              </article>
            ))}
            {transactions.length === 0 && !data.isLoading && (
              <p className="text-sm text-muted-foreground">Aucune transaction.</p>
            )}
          </div>
        </section>
      )}

      {tab === "runs" && (
        <section className="rounded-xl border border-border bg-background p-6 overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1">Démarré</th>
                <th className="py-1">Statut</th>
                <th className="py-1 text-right">Sources</th>
                <th className="py-1 text-right">Articles</th>
                <th className="py-1 text-right">Insérées</th>
                <th className="py-1">Erreur</th>
              </tr>
            </thead>
            <tbody>
              {((data.data?.runs ?? []) as any[]).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="py-1.5 whitespace-nowrap">
                    {new Date(r.started_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="py-1.5">{r.status}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.sources_count}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.articles_found}</td>
                  <td className="py-1.5 text-right tabular-nums">{r.transactions_inserted}</td>
                  <td className="py-1.5 text-muted-foreground">{r.error_message ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === "dedup" && (
        <section className="rounded-xl border border-border bg-background p-6 overflow-x-auto">
          <table className="min-w-[760px] w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-1">Date</th>
                <th className="py-1">Établissement</th>
                <th className="py-1">Source</th>
                <th className="py-1">Motif</th>
              </tr>
            </thead>
            <tbody>
              {((dedup.data?.entries ?? []) as any[]).map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="py-1.5 whitespace-nowrap">
                    {new Date(e.created_at).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="py-1.5">{e.hotel_name || e.title || "—"}</td>
                  <td className="py-1.5">{e.source_name ?? "—"}</td>
                  <td className="py-1.5 text-muted-foreground">
                    {e.reason}
                    {e.detail ? ` — ${e.detail}` : ""}
                  </td>
                </tr>
              ))}
              {(dedup.data?.entries ?? []).length === 0 && !dedup.isLoading && (
                <tr>
                  <td colSpan={4} className="py-3 text-muted-foreground">
                    Aucun doublon écarté.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
