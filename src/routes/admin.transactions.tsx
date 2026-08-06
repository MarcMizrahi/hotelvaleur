import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listDedupLog,
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
        `Veille terminée : ${r.articlesFound} article(s) analysé(s), ${r.transactionsInserted} transaction(s) ajoutée(s), ${r.duplicatesSkipped} doublon(s) écarté(s).`,
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

      <DedupAuditTrail />
    </div>
  );
}

const REASON_LABEL: Record<string, string> = {
  source_url_deja_connue: "Article déjà traité (même URL)",
  empreinte_identique: "Empreinte identique (hôtel + date + chambres + prix + type)",
  nettoyage_manuel: "Nettoyage manuel des doublons historiques",
};

function DedupAuditTrail() {
  const load = useServerFn(listDedupLog);
  const { data, isLoading } = useQuery({
    queryKey: ["dedup-log"],
    queryFn: () => load(),
  });
  const entries = (data?.entries ?? []) as any[];

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-serif text-xl text-navy">Journal de déduplication</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Traçabilité des enregistrements écartés lors de la veille, avec le motif de suppression et
          la fiche conservée.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun doublon écarté pour le moment.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Enregistrement écarté</th>
                <th className="px-3 py-2">Prix</th>
                <th className="px-3 py-2">Motif</th>
                <th className="px-3 py-2">Empreinte</th>
                <th className="px-3 py-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-border align-top">
                  <td className="px-3 py-2 whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-navy">{e.hotel_name ?? e.title ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {[e.city, e.published_at, e.room_count ? `${e.room_count} ch.` : null,
                        e.transaction_type]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {e.price_cents != null ? formatEuros(e.price_cents) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div>{REASON_LABEL[e.reason] ?? e.reason}</div>
                    {e.detail && (
                      <div className="mt-1 max-w-sm text-xs text-muted-foreground">{e.detail}</div>
                    )}
                    {e.kept_transaction_id && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Fiche conservée : {String(e.kept_transaction_id).slice(0, 8)}…
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 max-w-[16rem] break-all text-xs text-muted-foreground">
                    {e.dedup_key ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {e.source_url ? (
                      <a
                        href={e.source_url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="text-gold underline"
                      >
                        {e.source_name ?? "Lien"}
                      </a>
                    ) : (
                      (e.source_name ?? "—")
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
