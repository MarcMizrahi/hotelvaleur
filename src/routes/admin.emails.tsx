import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listEmailLog } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/emails")({
  component: EmailsPage,
});

function maskEmail(email: string) {
  const [user, host] = email.split("@");
  if (!host) return "•••";
  return `${user.slice(0, 2)}•••@${host}`;
}

function EmailsPage() {
  const fetchFn = useServerFn(listEmailLog);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-emails"],
    queryFn: () => fetchFn(),
  });
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const rows = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = rows.filter((r: any) => r.created_at.startsWith(today)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between flex-wrap gap-3">
        <h1 className="font-serif text-2xl text-navy">Journal des envois</h1>
        <div className="text-sm text-muted-foreground">
          Envois aujourd'hui : <span className="font-medium text-foreground">{todayCount}</span>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-muted-foreground">
              <tr>
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Destinataire</th>
                <th className="py-2 px-3">Modèle</th>
                <th className="py-2 px-3">Statut</th>
                <th className="py-2 px-3">Erreur</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Chargement…
                  </td>
                </tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    Aucun envoi enregistré.
                  </td>
                </tr>
              )}
              {rows.map((r: any) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="py-2 px-3 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td
                    className="py-2 px-3 font-mono text-xs cursor-pointer"
                    onClick={() =>
                      setRevealed((s) => {
                        const n = new Set(s);
                        n.has(r.id) ? n.delete(r.id) : n.add(r.id);
                        return n;
                      })
                    }
                  >
                    {revealed.has(r.id) ? r.to_email : maskEmail(r.to_email)}
                  </td>
                  <td className="py-2 px-3">{r.template}</td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs ${
                        r.status === "sent"
                          ? "bg-emerald-100 text-emerald-900"
                          : r.status === "failed"
                            ? "bg-red-100 text-red-900"
                            : "bg-surface text-muted-foreground"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-xs text-red-700">{r.error_message ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
