import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAgentNotifications } from "@/lib/agent-space.functions";
import { Button } from "@/components/ui/button";
import { Empty, SectionCard, Stat } from "@/components/agent-space-ui";
import { usePersistentState } from "@/hooks/use-persistent-state";

const LABELS: Record<string, string> = {
  estimation: "Estimation",
  lead: "Mise en relation",
  transaction: "Veille marché",
};

export const Route = createFileRoute("/espace-agent/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const fetchNotifications = useServerFn(getAgentNotifications);
  const [readIds, setReadIds] = usePersistentState<string[]>(
    "agent-notifications-read",
    [],
  );

  const { data, isLoading } = useQuery({
    queryKey: ["agent-notifications"],
    queryFn: () => fetchNotifications(),
    retry: false,
  });

  const items = data?.items ?? [];
  const unread = useMemo(
    () => items.filter((i) => !readIds.includes(i.id)),
    [items, readIds],
  );

  return (
    <SectionCard
      title="Notifications"
      description="Activité récente de votre portefeuille : nouvelles estimations attribuées, mises en relation et transactions de marché à valider."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Notifications (90 j)" value={items.length} />
        <Stat label="Non lues" value={unread.length} />
        <Stat label="Lues" value={items.length - unread.length} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={unread.length === 0}
          onClick={() => setReadIds(items.map((i) => i.id))}
        >
          Tout marquer comme lu
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={readIds.length === 0}
          onClick={() => setReadIds([])}
        >
          Réinitialiser
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-background divide-y divide-border">
        {isLoading ? (
          <Empty text="Chargement des notifications…" />
        ) : items.length === 0 ? (
          <Empty text="Aucune activité sur les 90 derniers jours." />
        ) : (
          items.map((item) => {
            const isRead = readIds.includes(item.id);
            return (
              <article
                key={item.id}
                className={`flex flex-wrap items-start justify-between gap-3 p-4 ${
                  isRead ? "opacity-60" : ""
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {!isRead && <span className="h-2 w-2 rounded-full bg-gold" />}
                    <span className="rounded bg-surface px-2 py-0.5 text-xs text-muted-foreground">
                      {LABELS[item.type] ?? item.type}
                    </span>
                  </div>
                  <p className="font-medium text-navy">{item.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.detail}
                    {item.detail ? " · " : ""}
                    {new Date(item.at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setReadIds(
                      isRead
                        ? readIds.filter((id) => id !== item.id)
                        : [...readIds, item.id],
                    )
                  }
                >
                  {isRead ? "Marquer non lu" : "Marquer lu"}
                </Button>
              </article>
            );
          })
        )}
      </div>
    </SectionCard>
  );
}
