import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { fr } from "@/locales/fr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestDataAccess } from "@/lib/rgpd.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/mes-donnees/")({
  head: () => ({
    meta: [
      { title: `Mes données personnelles — ${fr.common.brand}` },
      {
        name: "description",
        content:
          "Accéder, exporter ou supprimer vos données conservées par HotelValeur, sans compte.",
      },
      { property: "og:title", content: `Mes données personnelles — ${fr.common.brand}` },
      {
        property: "og:description",
        content: "Recevez un lien sécurisé par email pour exercer vos droits RGPD.",
      },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: MyDataPage,
});

function MyDataPage() {
  const request = useServerFn(requestDataAccess);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setState("loading");
    try {
      await request({ data: { email } });
    } finally {
      setState("done");
    }
  };

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-serif text-3xl">Mes données personnelles</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Vous pouvez consulter, exporter ou supprimer les informations que nous conservons à
        votre sujet, sans créer de compte. Saisissez votre adresse email pour recevoir un
        lien sécurisé, valable 24 heures.
      </p>

      {state === "done" ? (
        <p className="mt-6 rounded-md border border-border bg-card p-4 text-sm">
          Si nous avons des données associées à cette adresse, un lien vient de vous être
          envoyé. Vérifiez votre boîte de réception.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <Label htmlFor="em">Votre email</Label>
            <Input
              id="em"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={state === "loading"}>
            {state === "loading" ? "Envoi…" : "Recevoir le lien"}
          </Button>
        </form>
      )}
    </main>
  );
}
