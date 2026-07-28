import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { fr } from "@/locales/fr";
import { Button } from "@/components/ui/button";
import { exportMyData, deleteMyData } from "@/lib/rgpd.functions";
import { useServerFn } from "@tanstack/react-start";

const searchSchema = z.object({
  email: z.string().email().optional(),
  token: z.string().optional(),
});

export const Route = createFileRoute("/mes-donnees/acces")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: `Accès à mes données — ${fr.common.brand}` },
      { name: "description", content: "Voir, exporter ou supprimer mes données." },
      { property: "og:title", content: `Accès à mes données — ${fr.common.brand}` },
      { property: "og:description", content: "Voir, exporter ou supprimer mes données." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AccessPage,
});

function AccessPage() {
  const { email, token } = useSearch({ from: "/mes-donnees/acces" });
  const exportFn = useServerFn(exportMyData);
  const deleteFn = useServerFn(deleteMyData);
  const [rows, setRows] = useState<unknown[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  if (!email || !token) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="font-serif text-3xl">Lien invalide</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Ce lien est incomplet ou a expiré. Refaites une demande depuis la page{" "}
          <a href="/mes-donnees" className="underline">
            mes données
          </a>
          .
        </p>
      </main>
    );
  }

  const handleView = async () => {
    try {
      const r = await exportFn({ data: { email, token } });
      setRows(r.estimations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
    }
  };

  const handleDownload = async () => {
    try {
      const r = await exportFn({ data: { email, token } });
      const blob = new Blob([JSON.stringify(r.estimations, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `hotelvaleur-mes-donnees-${email}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Cette suppression est définitive. Confirmer ?")) return;
    try {
      await deleteFn({ data: { email, token } });
      setDeleted(true);
      setRows([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-serif text-3xl">Mes données</h1>
      <p className="mt-2 text-sm text-muted-foreground">Adresse : {email}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={handleView}>Voir mes estimations</Button>
        <Button variant="outline" onClick={handleDownload}>
          Télécharger en JSON
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          Supprimer toutes mes données
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      {deleted && (
        <p className="mt-6 rounded-md border border-border bg-card p-4 text-sm">
          Toutes les données associées à {email} ont été supprimées et l'adresse a été
          ajoutée à la liste des désabonnements.
        </p>
      )}

      {rows && (
        <div className="mt-8">
          <h2 className="font-serif text-2xl">
            {rows.length} estimation{rows.length > 1 ? "s" : ""} enregistrée
            {rows.length > 1 ? "s" : ""}
          </h2>
          <pre className="mt-4 max-h-[500px] overflow-auto rounded-md border border-border bg-muted p-4 text-xs">
            {JSON.stringify(rows, null, 2)}
          </pre>
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        Vous exercez ici vos droits d'accès, de portabilité et d'effacement prévus par le
        RGPD. Pour toute autre demande : {fr.common.brand}.
      </p>
    </main>
  );
}
