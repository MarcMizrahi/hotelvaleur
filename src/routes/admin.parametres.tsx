import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AccountSettings } from "@/components/account-settings";

export const Route = createFileRoute("/admin/parametres")({
  component: AdminSettingsPage,
});

function AdminSettingsPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? "");
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-navy">Paramètres du compte</h1>
        <p className="text-sm text-muted-foreground">
          Gérez vos identifiants de connexion à l'espace d'administration.
        </p>
      </div>
      {email === null ? (
        <p className="text-muted-foreground">Chargement…</p>
      ) : (
        <AccountSettings email={email} role="admin" />
      )}
    </div>
  );
}
