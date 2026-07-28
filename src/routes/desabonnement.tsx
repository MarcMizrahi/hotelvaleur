import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { fr } from "@/locales/fr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { unsubscribeEmail } from "@/lib/rgpd.functions";
import { useServerFn } from "@tanstack/react-start";

const searchSchema = z.object({
  email: z.string().email().optional(),
  token: z.string().optional(),
});

export const Route = createFileRoute("/desabonnement")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: `Désabonnement — ${fr.common.brand}` },
      { name: "description", content: "Retirer votre adresse de nos envois." },
      { property: "og:title", content: `Désabonnement — ${fr.common.brand}` },
      { property: "og:description", content: "Retirer votre adresse de nos envois." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { email, token } = useSearch({ from: "/desabonnement" });
  const unsub = useServerFn(unsubscribeEmail);
  const [reason, setReason] = useState("");
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);

  if (!email || !token) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-serif text-3xl">Lien invalide</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Le lien de désabonnement est incomplet. Utilisez celui reçu dans nos emails.
        </p>
      </main>
    );
  }

  const handleConfirm = async () => {
    try {
      await unsub({ data: { email, token, reason: reason || null } });
      setState("done");
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : "Erreur inconnue.");
    }
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-serif text-3xl">Désabonnement</h1>
      {state === "done" ? (
        <p className="mt-6 rounded-md border border-border bg-card p-4 text-sm">
          Votre adresse <strong>{email}</strong> a bien été retirée de nos envois.
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted-foreground">
            Confirmez le retrait de l'adresse <strong>{email}</strong> de nos envois.
          </p>
          <div className="mt-6 space-y-3">
            <Label htmlFor="reason">Pourquoi ? (facultatif)</Label>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Trop d'emails, contenu peu utile, autre…"
            />
          </div>
          <Button className="mt-6" onClick={handleConfirm}>
            Confirmer le désabonnement
          </Button>
          {state === "error" && msg && (
            <p className="mt-4 text-sm text-destructive">{msg}</p>
          )}
        </>
      )}
    </main>
  );
}
